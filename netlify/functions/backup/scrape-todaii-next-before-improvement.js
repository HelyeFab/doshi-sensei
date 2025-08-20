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

// Simple Todaii scraping
async function scrapeTodaii() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Todaii homepage...');
    const response = await fetch('https://japanese.todaiinews.com', {
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

    // Simple regex to find article links
    const linkRegex = /<a[^>]*href="([^"]*\/detail\/[^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;
    const urls = new Set();
    let count = 0;
    
    while ((match = linkRegex.exec(html)) && count < 5) {
      const href = match[1];
      const linkText = match[2];
      
      const fullUrl = href.startsWith('http') ? href : `https://japanese.todaiinews.com${href}`;
      
      if (urls.has(fullUrl)) continue;
      urls.add(fullUrl);
      
      let title = linkText.replace(/<[^>]*>/g, '').trim();
      if (!title || title.length < 5) continue;
      
      const article = {
        id: `todaii_http_${Date.now()}_${count}`,
        title: title,
        content: `日本語学習者向けのニュース記事です。\n\nタイトル：${title}\n\nこの記事は東大生が運営するTodaiiニュースサイトから取得されました。日本語学習に適した内容で、分かりやすい表現を使用しています。\n\n詳しい内容については、元の記事をご覧ください：${fullUrl}\n\n※この記事は日本語の読解練習に最適です。`,
        summary: title.substring(0, 100) + '...',
        url: fullUrl,
        imageUrl: 'https://images.unsplash.com/photo-1600000000000?w=400',
        publishDate: new Date(),
        scrapedAt: new Date(),
        source: {
          id: 'todaii',
          name: 'Todaii',
          displayName: 'Todaii - Japanese News'
        },
        category: 'news',
        tags: ['japanese-learning', 'todaii'],
        difficulty: 'N4',
        estimatedReadingTime: 4,
        vocabulary: [],
        kanji: []
      };
      
      articles.push(article);
      count++;
    }
    
    return articles;
  } catch (error) {
    console.error('❌ Error scraping Todaii:', error);
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
    console.log('🚀 Todaii HTTP endpoint triggered');

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

    const articles = await scrapeTodaii();
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
        message: `Successfully saved ${articles.length} Todaii articles (HTTP ENDPOINT)`,
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