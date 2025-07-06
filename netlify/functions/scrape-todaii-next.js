const admin = require('firebase-admin');

// Copied from working scraping-next project and adapted for Netlify functions

// Global variables for Firebase
let db = null;

function createHash(input) {
  let hash = 0;
  if (input.length === 0) return hash.toString();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

async function scrapeTodaii() {
  try {
    const response = await fetch('https://japanese.todaiinews.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const articles = [];

    // Find article links with /detail/ - based on working scraping-next code
    const linkRegex = /href="([^"]*\/detail\/[^"]*)"[^>]*>([^<]*)</gi;
    const urls = new Set();
    let match;
    let count = 0;

    while ((match = linkRegex.exec(html)) && count < 3) {
      const href = match[1];
      const linkText = match[2];
      
      const fullUrl = href.startsWith('http') ? href : `https://japanese.todaiinews.com${href}`;
      
      if (urls.has(fullUrl)) continue;
      urls.add(fullUrl);
      
      let title = linkText.replace(/<[^>]*>/g, '').trim();
      
      // If title is empty or too short, look for title in nearby elements
      if (!title || title.length < 10) {
        const contextStart = Math.max(0, match.index - 300);
        const contextEnd = Math.min(html.length, match.index + 300);
        const context = html.substring(contextStart, contextEnd);
        
        const titleMatch = context.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|title="([^"]+)"/);
        if (titleMatch) {
          title = (titleMatch[1] || titleMatch[2]).trim();
        }
      }
      
      if (!title || title.length < 5) continue;
      
      title = title.replace(/\s+/g, ' ').trim();
      
      // Look for JLPT level
      const levelMatch = title.match(/N([1-5])/i) || html.match(/N([1-5])/i);
      const level = levelMatch ? `N${levelMatch[1]}` : 'N4';
      
      // Look for source
      const sourceMatch = title.match(/(CNN|NHK|Asahi|Reuters|BBC)/i);
      const source = sourceMatch ? sourceMatch[1] : 'Todaii';
      
      const excerpt = title.length > 100 ? title.substring(0, 100) + '...' : title;
      
      const id = createHash(fullUrl);
      
      articles.push({
        id: `todaii_next_${id}`,
        title,
        content: excerpt,
        summary: excerpt,
        url: fullUrl,
        imageUrl: `https://images.unsplash.com/photo-1500000000001?w=400`,
        publishDate: new Date(),
        scrapedAt: new Date(),
        source: {
          id: 'todaii',
          name: 'Todaii',
          displayName: 'Todaii - Japanese News'
        },
        category: 'news',
        tags: ['japanese-learning', 'todaii', level.toLowerCase()],
        difficulty: level,
        estimatedReadingTime: 4,
        vocabulary: [],
        kanji: [],
        audioUrl: null,
        author: source
      });
      
      count++;
    }

    return articles;
  } catch (error) {
    console.error('Error scraping Todaii:', error);
    throw new Error(`Failed to scrape Todaii: ${error.message}`);
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
    console.log('🚀 Todaii scraper (copied from working scraping-next)');

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
        console.log('✅ Firebase initialized');
      } catch (error) {
        console.error('❌ Firebase init failed:', error.message);
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

    const articles = await scrapeTodaii();
    console.log(`📊 Scraped ${articles.length} articles`);

    if (articles.length > 0) {
      await saveArticlesToFirebase(articles);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} Todaii articles (SCRAPING-NEXT VERSION)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'scraping-next'
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
        version: 'scraping-next'
      }),
    };
  }
};