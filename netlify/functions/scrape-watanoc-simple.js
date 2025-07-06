const admin = require('firebase-admin');
const https = require('https');

// Simple request without gzip complexity
function makeSimpleRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Simplified article extraction
function extractArticles(html) {
  const articles = [];
  
  try {
    // Find article patterns more simply
    const articleMatches = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
    
    for (let i = 0; i < Math.min(articleMatches.length, 3); i++) {
      const articleHtml = articleMatches[i];
      
      const urlMatch = articleHtml.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/);
      const titleMatch = articleHtml.match(/title="([^"]+)"/);
      
      if (urlMatch && titleMatch) {
        const article = {
          id: `watanoc_simple_${Date.now()}_${i}`,
          title: titleMatch[1].replace(/\s*\(n[1-5]\).*$/i, ''),
          content: 'Content will be extracted later',
          summary: titleMatch[1].substring(0, 100) + '...',
          url: urlMatch[1],
          imageUrl: 'https://images.unsplash.com/photo-1500000000000?w=400',
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc',
            displayName: 'Watanoc - Japanese Learning Articles'
          },
          category: 'general',
          tags: ['japanese-learning', 'watanoc'],
          difficulty: 'N4',
          estimatedReadingTime: 3,
          vocabulary: [],
          kanji: [],
          audioUrl: null
        };
        
        articles.push(article);
      }
    }
  } catch (error) {
    console.error('Error extracting articles:', error);
  }
  
  return articles;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS OK' }) };
  }

  const startTime = Date.now();

  try {
    console.log('🚀 Simple Watanoc scraper starting...');

    // Initialize Firebase
    if (!admin.apps.length) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
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
    }

    const db = admin.firestore();

    // Fetch homepage with 15-second timeout
    console.log('📖 Fetching Watanoc...');
    const html = await makeSimpleRequest('https://watanoc.com');
    console.log(`✅ Got ${html.length} bytes`);

    // Extract articles
    const articles = extractArticles(html);
    console.log(`📄 Extracted ${articles.length} articles`);

    // Save to Firebase
    if (articles.length > 0) {
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
      console.log(`✅ Saved ${articles.length} articles to Firebase`);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Simple scraper completed: ${articles.length} articles`,
        articlesCount: articles.length,
        timeElapsed: Math.round(elapsed / 1000),
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('❌ Simple scraper error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timeElapsed: Math.round(elapsed / 1000),
        timestamp: new Date().toISOString()
      }),
    };
  }
};