const admin = require('firebase-admin');
const crypto = require('crypto');

// Global variables for Firebase
let db = null;

async function scrapeNHKEasy() {
  try {
    const response = await fetch('https://www3.nhk.or.jp/news/easy/news-list.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    console.log(`✅ Fetched NHK Easy JSON data`);

    // Extract articles from the JSON response
    const articles = [];
    
    // NHK Easy JSON has different structures - handle both
    let articlesData = [];
    if (Array.isArray(jsonData)) {
      articlesData = jsonData;
    } else if (jsonData[0] && Array.isArray(jsonData[0])) {
      articlesData = jsonData[0];
    } else if (jsonData.news && Array.isArray(jsonData.news)) {
      articlesData = jsonData.news;
    }

    console.log(`Found ${articlesData.length} total articles`);
    
    // Convert to our format (limit to 3 articles)
    const limitedArticles = articlesData.slice(0, 3).map((article, index) => {
      const id = crypto.createHash('md5').update(article.news_id || `nhk_${Date.now()}_${index}`).digest('hex');
      
      return {
        id: `nhk_easy_modern_${id}`,
        title: article.title || article.news_title || 'NHK Easy News Article',
        content: article.title_with_ruby || article.title || '',
        summary: (article.title || '').substring(0, 100) + '...',
        url: article.news_web_url || article.url || `https://www3.nhk.or.jp/news/easy/${article.news_id}/`,
        imageUrl: article.news_web_image_uri || article.news_easy_image_uri || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400',
        publishDate: article.news_publication_time ? new Date(article.news_publication_time) : new Date(),
        scrapedAt: new Date(),
        source: {
          id: 'nhk_easy',
          name: 'NHK Easy',
          displayName: 'NHK Easy News'
        },
        category: 'news',
        tags: ['japanese-learning', 'nhk-easy', 'n5'],
        difficulty: 'N5',
        estimatedReadingTime: 2,
        vocabulary: [],
        kanji: [],
        audioUrl: null,
        author: 'NHK Easy'
      };
    });

    return limitedArticles;
  } catch (error) {
    console.error('Error scraping NHK Easy:', error);
    throw new Error(`Failed to scrape NHK Easy: ${error.message}`);
  }
}

async function saveArticlesToFirebase(articles) {
  if (!db) {
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

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  const startTime = Date.now();

  try {
    console.log('🚀 MODERN NHK Easy scraping function triggered');

    // Initialize Firebase
    if (!admin.apps.length) {
      try {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
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
        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Firebase initialization failed: ' + error.message,
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    db = admin.firestore();

    // Scrape articles with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 12000) // 12 seconds timeout
    );
    
    const articles = await Promise.race([
      scrapeNHKEasy(),
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
        message: `Successfully saved ${articles.length} NHK Easy articles to Firebase (MODERN VERSION)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'modern'
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
        timeElapsed: Math.round(elapsed / 1000),
        version: 'modern'
      }),
    };
  }
};