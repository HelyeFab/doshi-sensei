/**
 * Scheduled function to run AI validation on scraped articles
 * Runs hourly to process articles that need deeper validation
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase at module level (critical for Netlify Functions)
if (!admin.apps.length) {
  try {
    // Try to load from JSON file first (deployed but not in Git)
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
      console.log('✅ Firebase Admin SDK initialized from firebase-config.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from base64');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from env vars');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
  }
} else {
      // Option 2: Use individual environment variables (fallback)
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from individual env vars');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.error('AI validation error:', error);
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

    // Prepare update data
    const updateData = {
      aiValidated: true,
      qualityScore: validationResult.qualityScore,
      validationResults: validationResult,
      lastValidated: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update JLPT level if detected
    if (validationResult.jlptLevel && validationResult.jlptLevel !== 'Unknown') {
      updateData.jlptLevel = validationResult.jlptLevel;
    }

    // Handle based on quality score
    if (validationResult.qualityScore < 30) {
      // Very low quality - delete the article
      console.log(`🗑️ Deleting low quality article (score: ${validationResult.qualityScore}): ${articleId}`);
      await db.collection('articles').doc(articleId).delete();
      return { success: true, action: 'deleted', score: validationResult.qualityScore };
      
    } else if (validationResult.qualityScore < 50) {
      // Low quality - mark for review and keep hidden
      updateData.needsReview = true;
      updateData.reviewReason = `Low quality score: ${validationResult.qualityScore}`;
      updateData.visible = false; // Keep hidden from users
      updateData.hidden = true; // Legacy field for backwards compatibility
      console.log(`⚠️ Article marked for review (score: ${validationResult.qualityScore}): ${articleId}`);
      
    } else if (validationResult.enhancedContent && validationResult.qualityScore >= 40 && validationResult.qualityScore <= 70) {
      // Moderate quality - use enhanced content and make visible
      updateData.content = validationResult.enhancedContent;
      updateData.aiEnhanced = true;
      updateData.originalContent = articleData.content || articleData.body;
      updateData.visible = true; // Now safe to show after enhancement
      updateData.hidden = false;
      console.log(`✨ Article enhanced and made visible (score: ${validationResult.qualityScore}): ${articleId}`);
      
    } else {
      // Good quality - make visible
      updateData.visible = true; // Safe to show
      updateData.hidden = false;
      console.log(`✅ Article validated and made visible (score: ${validationResult.qualityScore}): ${articleId}`);
    }

    // Update the article
    await db.collection('articles').doc(articleId).update(updateData);
    
    return { 
      success: true, 
      action: updateData.hidden ? 'hidden' : 'validated',
      score: validationResult.qualityScore,
      enhanced: !!updateData.aiEnhanced
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

  console.log(`🚀 [Article Validation] Starting ${isScheduled ? 'scheduled' : 'manual'} validation run`);

  try {
    if (!firebaseInitialized || !db) {
      throw new Error('Firebase not initialized');
    }

    // Query for articles that need validation
    // Priority 1: Articles marked as needing AI enhancement
    // Priority 2: Articles without AI validation
    // Priority 3: Old articles that haven't been validated in 30 days
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const queries = [
      // HIGH PRIORITY: Articles with low Japanese ratio (hidden from users)
      db.collection('articles')
        .where('aiValidationPriority', '==', 'high')
        .where('aiValidated', '!=', true)
        .limit(10),
      
      // MEDIUM PRIORITY: Articles with good ratio but from untrusted sources
      db.collection('articles')
        .where('aiValidationPriority', '==', 'medium')
        .where('aiValidated', '!=', true)
        .limit(5),
      
      // Articles marked as needing enhancement
      db.collection('articles')
        .where('quickValidation.needsAIEnhancement', '==', true)
        .where('aiValidated', '!=', true)
        .limit(5),
      
      // Articles without AI validation
      db.collection('articles')
        .where('aiValidated', '!=', true)
        .orderBy('aiValidated')
        .orderBy('publishDate', 'desc')
        .limit(3),
      
      // Old articles for re-validation
      db.collection('articles')
        .where('lastValidated', '<', thirtyDaysAgo)
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

    // Process articles (limit to 10 to avoid timeout)
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    const summary = {
      processed: results.length,
      validated: results.filter(r => r.success && r.action === 'validated').length,
      enhanced: results.filter(r => r.enhanced).length,
      deleted: results.filter(r => r.action === 'deleted').length,
      hidden: results.filter(r => r.action === 'hidden').length,
      failed: results.filter(r => !r.success).length
    };

    const elapsed = Date.now() - startTime;
    console.log(`✅ Validation complete in ${Math.round(elapsed/1000)}s:`, summary);

    // Log to Firestore for monitoring
    await db.collection('validationRuns').add({
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
    console.error('❌ Validation function error:', error);
    
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