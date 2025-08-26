/**
 * Scheduled function to run AI validation on scraped articles
 * Runs hourly to process articles that need deeper validation
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase function
async function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length) {
    db = admin.firestore();
    firebaseInitialized = true;
    return true;
  }
  
  try {
    // Try to fetch from GitHub Gist first (for production)
    const gistUrl = 'https://gist.githubusercontent.com/HelyeFab/4a363e7fabaa387b67fa80b5c8cb87d4/raw/firebase-config.json';
    
    console.log('🔄 Fetching Firebase credentials from secure source...');
    const response = await fetch(gistUrl);
    
    if (response.ok) {
      const serviceAccount = await response.json();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from secure source');
      return true;
    } else {
      throw new Error('Failed to fetch from Gist');
    }
  } catch (error) {
    // Fallback to local file for development
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, 'firebase-config.json');
      
      if (fs.existsSync(configPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized from local file');
        return true;
      }
    } catch (fileError) {
      console.error('❌ Failed to read local file:', fileError.message);
    }
    
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
    return false;
  }
}

/**
 * Validate article content using OpenAI
 */
async function validateArticleWithAI(articleData) {
  try {
    const openAIKey = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!openAIKey) {
      console.error('❌ OpenAI API key not found');
      return null;
    }
    
    // Prepare content sample for validation (first 1000 chars to save tokens)
    const contentSample = (articleData.content || articleData.body || '').substring(0, 1000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a Japanese language expert. Analyze if the given text is a legitimate Japanese article suitable for language learners. Return a JSON response.'
          },
          {
            role: 'user',
            content: `Analyze this article and determine:
1. Is this primarily Japanese content? (not English with some Japanese words)
2. What percentage is Japanese vs other languages?
3. Is it appropriate for language learners?
4. What JLPT level would you assign? (N5, N4, N3, N2, or N1)
5. Should this be visible to users?

Title: ${articleData.title}

Content: ${contentSample}

Return ONLY a JSON object with this format:
{
  "isJapanese": true/false,
  "japanesePercentage": 0-100,
  "appropriate": true/false,
  "jlptLevel": "N1-N5",
  "shouldBeVisible": true/false,
  "qualityScore": 0-100,
  "reason": "brief explanation"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI API error:', error);
      return null;
    }
    
    const result = await response.json();
    const content = result.choices[0].message.content;
    
    // Parse the JSON response
    try {
      const validation = JSON.parse(content);
      return {
        isJapanese: validation.isJapanese || false,
        japanesePercentage: validation.japanesePercentage || 0,
        appropriate: validation.appropriate || false,
        jlptLevel: validation.jlptLevel || 'Unknown',
        shouldBeVisible: validation.shouldBeVisible || false,
        qualityScore: validation.qualityScore || 0,
        reason: validation.reason || 'No reason provided'
      };
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', content);
      return null;
    }
    
  } catch (error) {
    console.error('❌ AI validation error:', error);
    return null;
  }
}

/**
 * Process a single article
 */
async function processArticle(articleId, articleData) {
  try {
    console.log(`🔍 Processing article: ${articleData.title?.substring(0, 50)}...`);
    
    // Call AI validation
    const validationResult = await validateArticleWithAI(articleData);
    
    if (!validationResult) {
      console.error(`Failed to validate article: ${articleId}`);
      return { success: false, reason: 'Validation API failed' };
    }
    
    console.log(`📊 AI Validation result for "${articleData.title?.substring(0, 30)}...":
      - Japanese: ${validationResult.isJapanese} (${validationResult.japanesePercentage}%)
      - Quality Score: ${validationResult.qualityScore}
      - Should be visible: ${validationResult.shouldBeVisible}
      - Reason: ${validationResult.reason}`);

    // Prepare update data
    const updateData = {
      aiValidated: true,
      aiValidationResult: validationResult,
      lastValidated: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update JLPT level if detected
    if (validationResult.jlptLevel && validationResult.jlptLevel !== 'Unknown') {
      updateData.difficulty = validationResult.jlptLevel;
    }

    // Handle based on validation results
    if (!validationResult.isJapanese || validationResult.japanesePercentage < 30) {
      // Not Japanese content - delete it
      console.log(`🗑️ Deleting non-Japanese article (${validationResult.japanesePercentage}% Japanese): ${articleId}`);
      await db.collection('articles').doc(articleId).delete();
      return { success: true, action: 'deleted', score: validationResult.qualityScore };
      
    } else if (!validationResult.appropriate || validationResult.qualityScore < 40) {
      // Inappropriate or very low quality - hide it
      updateData.visible = false;
      updateData.hidden = true;
      updateData.hideReason = validationResult.reason;
      console.log(`👁️‍🗨️ Hiding inappropriate/low-quality article (score: ${validationResult.qualityScore}): ${articleId}`);
      
    } else if (validationResult.shouldBeVisible && validationResult.qualityScore >= 60) {
      // Good quality - make visible
      updateData.visible = true;
      updateData.hidden = false;
      console.log(`✅ Article validated and made visible (score: ${validationResult.qualityScore}): ${articleId}`);
      
    } else {
      // Borderline - keep hidden for manual review
      updateData.visible = false;
      updateData.hidden = true;
      updateData.needsManualReview = true;
      updateData.reviewReason = `Borderline quality: ${validationResult.reason}`;
      console.log(`⚠️ Article needs manual review (score: ${validationResult.qualityScore}): ${articleId}`);
    }

    // Update the article
    await db.collection('articles').doc(articleId).update(updateData);
    
    return { 
      success: true, 
      action: updateData.visible ? 'made_visible' : updateData.hidden ? 'hidden' : 'deleted',
      score: validationResult.qualityScore
    };

  } catch (error) {
    console.error(`Error processing article ${articleId}:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Main handler for scheduled validation
 */
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // Check if this is a scheduled invocation or HTTP request
  const isScheduled = !event.httpMethod;
  
  // For HTTP requests, handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log(`🚀 [Article AI Validation] Starting ${isScheduled ? 'scheduled' : 'manual'} validation run`);
  
  // Initialize Firebase if needed
  await initializeFirebase();

  try {
    if (!firebaseInitialized || !db) {
      throw new Error('Firebase not initialized');
    }

    // Query for articles that need validation
    // Priority: Articles marked as needing AI enhancement or with low Japanese ratio
    const queries = [
      // HIGH PRIORITY: Articles with 30-70% Japanese (hidden by default)
      db.collection('articles')
        .where('quickValidation.japaneseRatio', '>=', 0.30)
        .where('quickValidation.japaneseRatio', '<', 0.70)
        .where('aiValidated', '!=', true)
        .limit(5),
      
      // MEDIUM PRIORITY: Articles with 70-87% Japanese (visible but need verification)
      db.collection('articles')
        .where('quickValidation.japaneseRatio', '>=', 0.70)
        .where('quickValidation.japaneseRatio', '<', 0.87)
        .where('aiValidated', '!=', true)
        .limit(3),
      
      // Articles explicitly marked as needing AI enhancement
      db.collection('articles')
        .where('quickValidation.needsAIEnhancement', '==', true)
        .where('aiValidated', '!=', true)
        .limit(2)
    ];

    // Execute queries
    const snapshots = await Promise.all(queries.map(q => q.get().catch(() => null)));
    
    // Combine results (deduplicate by ID)
    const articlesToProcess = new Map();
    for (const snapshot of snapshots) {
      if (snapshot && !snapshot.empty) {
        snapshot.forEach(doc => {
          if (!articlesToProcess.has(doc.id)) {
            articlesToProcess.set(doc.id, {
              id: doc.id,
              ...doc.data()
            });
          }
        });
      }
    }

    console.log(`📊 Found ${articlesToProcess.size} articles to process`);

    if (articlesToProcess.size === 0) {
      return isScheduled ? 
        { success: true, message: 'No articles to process' } :
        {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'No articles need validation',
            processed: 0
          })
        };
    }

    // Process articles (limit to 10 to avoid timeout and API costs)
    const articlesArray = Array.from(articlesToProcess.values()).slice(0, 10);
    const results = [];
    
    for (const article of articlesArray) {
      const result = await processArticle(article.id, article);
      results.push({
        id: article.id,
        title: article.title?.substring(0, 50),
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    const summary = {
      processed: results.length,
      made_visible: results.filter(r => r.action === 'made_visible').length,
      hidden: results.filter(r => r.action === 'hidden').length,
      deleted: results.filter(r => r.action === 'deleted').length,
      failed: results.filter(r => !r.success).length
    };

    const elapsed = Date.now() - startTime;
    console.log(`✅ AI Validation complete in ${Math.round(elapsed/1000)}s:`, summary);

    // Log to Firestore for monitoring
    await db.collection('aiValidationRuns').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isScheduled,
      summary,
      results: results.slice(0, 10), // Keep only first 10 for storage
      elapsed
    });

    // Return appropriate response
    if (isScheduled) {
      return {
        success: true,
        summary,
        elapsed
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Processed ${summary.processed} articles`,
          summary,
          results,
          elapsed: Math.round(elapsed/1000)
        })
      };
    }

  } catch (error) {
    console.error('❌ AI Validation function error:', error);
    
    if (isScheduled) {
      return {
        success: false,
        error: error.message
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }
  }
};