const admin = require('firebase-admin');

// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase at module level (critical for Netlify Functions)
if (!admin.apps.length) {
  try {
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
    console.log('✅ Firebase Admin SDK initialized at module level');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK at module level:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Enhanced scraping function with actual content extraction
async function scrapeWatanoc() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Watanoc homepage...');
    const response = await fetch('https://watanoc.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters`);

    // Extract article URLs and metadata
    const articleRegex = /<article[^>]*class="[^"]*loop-article[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;
    let count = 0;
    const articleData = [];

    while ((match = articleRegex.exec(html)) && count < 3) {
      const articleHtml = match[1];
      
      const urlMatch = articleHtml.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/);
      const titleMatch = articleHtml.match(/title="([^"]+)"/);
      
      if (urlMatch && titleMatch) {
        articleData.push({
          url: urlMatch[1],
          title: titleMatch[1].replace(/\s*\(n[1-5]\).*$/i, ''),
          rawTitle: titleMatch[1]
        });
        count++;
      }
    }

    // Now fetch actual content for each article
    for (let i = 0; i < articleData.length; i++) {
      const data = articleData[i];
      
      try {
        console.log(`📄 Fetching article content: ${data.title}`);
        
        const articleResponse = await fetch(data.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(8000)
        });

        if (!articleResponse.ok) {
          console.warn(`Failed to fetch article ${i + 1}: HTTP ${articleResponse.status}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        
        // Extract content and image from the article page
        let content = '';
        let imageUrl = '';
        
        // Extract article image first
        const imageSelectors = [
          /<img[^>]*class="[^"]*(?:featured|thumbnail|article|post)[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]+)"[^>]*class="[^"]*(?:featured|thumbnail|article|post)[^"]*"/i,
          /<div[^>]*class="[^"]*(?:featured|thumbnail|post)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]+)"[^>]*(?:width|height)="[^"]*"/i
        ];
        
        for (const selector of imageSelectors) {
          const imageMatch = articleHtml.match(selector);
          if (imageMatch && imageMatch[1]) {
            imageUrl = imageMatch[1].startsWith('http') ? imageMatch[1] : `https://watanoc.com${imageMatch[1]}`;
            console.log(`✅ [Enhanced] Article image found: ${imageUrl}`);
            break;
          }
        }
        
        // Enhanced content selectors for Watanoc
        const contentSelectors = [
          // Primary Watanoc content area
          /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)(?:<\/div>[\s\S]*?<(?:footer|div[^>]*class="[^"]*(?:share|comment|related|navigation)))/i,
          // Alternative content selectors
          /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*(?:content|entry)[^"]*"[^>]*>([\s\S]*?)(?:<\/div>[\s\S]*?<footer)/i,
          // WordPress content area
          /<div[^>]*class="[^"]*(?:post-content|article-content|the-content)[^"]*"[^>]*>([\s\S]*?)(?:<\/div>)/i,
          // Generic content area
          /<main[^>]*>([\s\S]*?)(?:<aside|<footer|<\/main>)/i,
          // Fallback: look for article tag content
          /<article[^>]*>([\s\S]*?)(?:<footer|<\/article>)/i
        ];

        for (const selector of contentSelectors) {
          const contentMatch = articleHtml.match(selector);
          if (contentMatch && contentMatch[1]) {
            content = contentMatch[1];
            console.log(`✅ [Enhanced] Content extracted using selector pattern`);
            break;
          }
        }

        // If no content found with selectors, try extracting from any substantial text blocks
        if (!content || content.length < 100) {
          console.log('⚠️ [Enhanced] Primary selectors failed, trying fallback extraction...');
          
          // Look for paragraphs with Japanese content
          const paragraphMatches = articleHtml.match(/<p[^>]*>([^<]*[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF][^<]*)<\/p>/gi);
          if (paragraphMatches && paragraphMatches.length > 0) {
            content = paragraphMatches.slice(0, 10).join('\n'); // Take first 10 paragraphs
            console.log(`✅ [Enhanced] Extracted ${paragraphMatches.length} paragraphs as fallback`);
          }
        }

        // Enhanced content cleaning
        if (content) {
          console.log(`🧹 [Enhanced] Cleaning content (${content.length} chars before cleaning)`);
          
          // Remove unwanted elements first
          content = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
            .replace(/<div[^>]*class="[^"]*(?:ad|advertisement|banner|share|comment|related|navigation|sidebar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
          
          // Process ruby tags for furigana before removing HTML
          content = content.replace(/<ruby[^>]*>(.*?)<rt[^>]*>(.*?)<\/rt>.*?<\/ruby>/gi, '$1（$2）');
          
          // Remove all remaining HTML tags
          content = content.replace(/<[^>]*>/g, ' ');
          
          // Clean up HTML entities and formatting
          content = content
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#\d+;/g, '') // Remove numeric entities
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .replace(/\s*([。！？])\s*/g, '$1\n\n') // Add line breaks after Japanese punctuation
            .replace(/\n\n\n+/g, '\n\n') // Remove excessive line breaks
            .trim();
          
          // Remove URLs and email addresses
          content = content
            .replace(/https?:\/\/[^\s]+/gi, '')
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '');
          
          // Enhanced English text removal
          content = content
            .replace(/\b[A-Z][a-zA-Z\s,.'"\-!?:;0-9()]+[.!?]\s*/g, ' ') // Remove English sentences
            .replace(/\b[a-zA-Z]{3,}\b/g, ' ') // Remove English words 3+ characters
            .replace(/\([^)]*[a-zA-Z][^)]*\)/g, ' ') // Remove parentheses with English
            .replace(/[""'']/g, '') // Remove English quotes
            .replace(/\b[a-zA-Z]\b/g, ' ') // Remove single English letters
            .replace(/\s+/g, ' ') // Clean up extra spaces again
            .trim();
          
          console.log(`✅ [Enhanced] Content cleaned (${content.length} chars after cleaning)`);
        }

        // Extract JLPT level
        const levelMatch = data.rawTitle.match(/\(n([1-5])\)/i);
        const difficulty = levelMatch ? `N${levelMatch[1].toUpperCase()}` : 'N4';

        // Ensure we have meaningful content
        if (!content || content.length < 50) {
          console.log(`⚠️ [Enhanced] Insufficient content extracted, creating fallback content`);
          content = `この記事について：${data.title}\n\nこの記事はWatanocから取得された日本語学習記事です。${difficulty}レベルの内容となっています。\n\n詳しい内容については元の記事をご覧ください：${data.url}\n\n※この記事は日本語の読解練習に適しています。`;
        }

        const article = {
          id: `watanoc_improved_${Date.now()}_${i}`,
          title: data.title,
          content: content,
          summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
          url: data.url,
          imageUrl: imageUrl || `https://images.unsplash.com/photo-${1500000000000 + i}?w=400`,
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc',
            displayName: 'Watanoc - Japanese Learning Articles'
          },
          category: 'general',
          tags: ['japanese-learning', 'watanoc', difficulty.toLowerCase()],
          difficulty: difficulty,
          estimatedReadingTime: Math.ceil((content?.length || 500) / 500),
          vocabulary: [],
          kanji: []
        };
        
        articles.push(article);
        console.log(`✅ Extracted article ${i + 1}: ${data.title} (${content?.length || 0} chars)`);
        
        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch content for article ${i + 1}: ${error.message}`);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ Error scraping Watanoc:', error);
    return [];
  }
}

// Save to Firebase
async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  const batch = db.batch();
  const articlesRef = db.collection('articles');

  for (const article of articles) {
    const docRef = articlesRef.doc(article.id);
    batch.set(docRef, {
      ...article,
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
    });
  }

  await batch.commit();
  console.log(`✅ Successfully saved ${articles.length} articles to Firebase`);
  return true;
}

// HTTP endpoint handler (not scheduled)
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  const startTime = Date.now();

  try {
    console.log('🚀 Watanoc HTTP endpoint triggered');

    // Check if Firebase is properly initialized at module level
    if (!firebaseInitialized || !db) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firebase Admin SDK not configured',
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Add timeout protection for the whole scraping process
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 20000) // 20 seconds max
    );
    
    const articles = await Promise.race([
      scrapeWatanoc(),
      timeoutPromise
    ]);
    console.log(`📊 Scraped ${articles.length} articles`);

    // Save articles to Firebase
    if (articles.length > 0) {
      await saveArticlesToFirebase(articles);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} Watanoc articles (HTTP ENDPOINT)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000)
      }),
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000)
      }),
    };
  }
};