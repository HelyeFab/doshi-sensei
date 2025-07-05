const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
let db = null;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
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
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// HTTP request with retry logic
function makeRequestWithRetry(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptRequest = (retriesLeft) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DoshiSensei/1.0)',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ja,en;q=0.9',
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        
        res.setEncoding('utf8');
        
        res.on('data', chunk => {
          data += chunk;
          // Prevent memory issues
          if (data.length > 1000000) { // 1MB limit
            req.destroy();
            reject(new Error('Response too large'));
          }
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ Successfully fetched ${url} (${data.length} bytes)`);
            resolve(data);
          } else if (retriesLeft > 0) {
            console.log(`⚠️ HTTP ${res.statusCode}, retrying... (${retriesLeft} attempts left)`);
            setTimeout(() => attemptRequest(retriesLeft - 1), 1000 * (4 - retriesLeft));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });
      
      req.on('error', (err) => {
        if (retriesLeft > 0) {
          console.log(`⚠️ Request error, retrying... (${retriesLeft} attempts left)`);
          setTimeout(() => attemptRequest(retriesLeft - 1), 1000 * (4 - retriesLeft));
        } else {
          reject(err);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (retriesLeft > 0) {
          console.log(`⚠️ Timeout, retrying... (${retriesLeft} attempts left)`);
          setTimeout(() => attemptRequest(retriesLeft - 1), 1000 * (4 - retriesLeft));
        } else {
          reject(new Error('Request timeout after all retries'));
        }
      });
    };
    
    attemptRequest(retries);
  });
}

// Parse JSON with BOM handling
function parseJSON(text) {
  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('❌ JSON parse error:', error.message);
    console.log('First 200 chars:', cleanText.substring(0, 200));
    throw error;
  }
}

// Simplified NHK Easy scraping
async function scrapeNHKEasyArticles() {
  try {
    console.log('📡 Fetching NHK Easy news list...');
    const jsonData = await makeRequestWithRetry('https://www3.nhk.or.jp/news/easy/news-list.json');
    
    const data = parseJSON(jsonData);
    console.log('📰 Parsing news data...');
    
    // Handle both array and object formats
    let allArticles = [];
    if (Array.isArray(data)) {
      allArticles = data;
    } else if (data[0]) {
      // Date-keyed format
      const dates = Object.keys(data).sort().reverse();
      for (const date of dates.slice(0, 3)) { // Last 3 days
        if (data[date] && Array.isArray(data[date])) {
          allArticles.push(...data[date]);
        }
      }
    }
    
    console.log(`Found ${allArticles.length} total articles`);
    
    // Convert to our format (limit to 15 articles)
    const articles = allArticles.slice(0, 15).map((article, index) => ({
      id: `nhk_easy_${article.news_id || Date.now()}_${index}`,
      title: article.title || 'NHK Easy News Article',
      content: article.title_with_ruby || article.title || '',
      summary: (article.title || '').substring(0, 100) + '...',
      url: article.news_web_url || `https://www3.nhk.or.jp/news/easy/${article.news_id}/${article.news_id}.html`,
      imageUrl: article.news_web_image_uri || article.news_easy_image_uri || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400',
      publishDate: article.news_prearranged_time ? new Date(article.news_prearranged_time) : new Date(),
      scrapedAt: new Date(),
      source: {
        id: 'nhk-easy',
        name: 'NHK Easy',
        displayName: 'NHK NEWS WEB EASY'
      },
      category: 'news',
      tags: ['nhk-easy', 'news', 'beginner-friendly'],
      difficulty: 'N5',
      estimatedReadingTime: 3,
      hasVideo: !!article.has_news_easy_movie,
      hasAudio: !!article.has_news_easy_voice,
      vocabulary: [],
      furigana: article.title_with_ruby || ''
    }));
    
    return articles.length > 0 ? articles : getFallbackArticles();
    
  } catch (error) {
    console.error('❌ Error scraping NHK Easy:', error.message);
    return getFallbackArticles();
  }
}

// Fallback articles
function getFallbackArticles() {
  return [{
    id: `nhk_easy_${Date.now()}_fallback`,
    title: 'NHK Easy Scraping Test',
    content: 'This is a fallback article for NHK Easy.',
    summary: 'Test article for NHK Easy',
    url: 'https://www3.nhk.or.jp/news/easy/',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400',
    publishDate: new Date(),
    scrapedAt: new Date(),
    source: {
      id: 'nhk-easy',
      name: 'NHK Easy',
      displayName: 'NHK Easy - Fallback Mode'
    },
    category: 'test',
    tags: ['fallback'],
    difficulty: 'N5',
    estimatedReadingTime: 1,
    hasVideo: false,
    hasAudio: false,
    vocabulary: [],
    furigana: ''
  }];
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

// Main handler
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
    console.log('🚀 Fixed NHK Easy scraping function triggered');
    console.log('🔧 Firebase initialized:', firebaseInitialized);

    if (!firebaseInitialized) {
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

    // Scrape with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 50000) // 50 seconds timeout
    );
    
    const articles = await Promise.race([
      scrapeNHKEasyArticles(),
      timeoutPromise
    ]);

    console.log(`📊 Scraped ${articles.length} articles`);

    // Save to Firebase
    await saveArticlesToFirebase(articles);

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} NHK Easy articles`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        fallbackUsed: articles.some(a => a.id.includes('fallback'))
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