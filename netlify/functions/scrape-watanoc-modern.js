const admin = require('firebase-admin');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Global variables for Firebase
let db = null;

async function scrapeWatanoc() {
  try {
    const response = await fetch('https://watanoc.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];

    $('article.loop-article').each((_, element) => {
      const $article = $(element);
      
      const titleElement = $article.find('.entry-title a');
      const title = titleElement.text().trim();
      const url = titleElement.attr('href') || '';
      
      if (!title || !url) return;
      
      const id = crypto.createHash('md5').update(url).digest('hex');
      
      const excerpt = $article.find('.loop-excerpt').text().trim();
      const author = $article.find('.meta-author .fn').text().trim();
      
      const dateTime = $article.find('.loop-date time').attr('datetime');
      const dateText = $article.find('.loop-date time').text().trim();
      const date = dateTime || dateText;
      
      const imageUrl = $article.find('.loop-post-thumb img').attr('src');
      
      const levelMatch = title.match(/\\(n(\\d)\\)/);
      const level = levelMatch ? `N${levelMatch[1]}` : 'N4';
      
      const cleanTitle = title.replace(/\\.\\.\\.\\(n\\d\\).*$/, '').trim();
      
      articles.push({
        id: `watanoc_modern_${id}`,
        title: cleanTitle,
        content: excerpt || cleanTitle.substring(0, 150) + '...',
        summary: excerpt || cleanTitle.substring(0, 150) + '...',
        url,
        imageUrl: imageUrl || `https://images.unsplash.com/photo-1500000000000?w=400`,
        publishDate: date ? new Date(date) : new Date(),
        scrapedAt: new Date(),
        source: {
          id: 'watanoc',
          name: 'Watanoc',
          displayName: 'Watanoc - Japanese Learning Articles'
        },
        category: 'general',
        tags: ['japanese-learning', 'watanoc', level.toLowerCase()],
        difficulty: level,
        estimatedReadingTime: 3,
        vocabulary: [],
        kanji: [],
        audioUrl: null,
        author: author || 'Watanoc'
      });
    });

    return articles.slice(0, 3); // Limit to 3 articles
  } catch (error) {
    console.error('Error scraping Watanoc:', error);
    throw new Error(`Failed to scrape Watanoc: ${error.message}`);
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
    console.log('🚀 MODERN Watanoc scraping function triggered');

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
        message: `Successfully saved ${articles.length} Watanoc articles to Firebase (MODERN VERSION)`,
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