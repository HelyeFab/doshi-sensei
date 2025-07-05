const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

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

// HTTP request helper with redirect support
function makeRequest(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      reject(new Error('Too many redirects'));
      return;
    }

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.9',
      },
      timeout: 30000
    };

    let data = '';
    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode} for ${url}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : `https://${parsedUrl.hostname}${res.headers.location}`;
        console.log(`Redirecting to: ${redirectUrl}`);
        return makeRequest(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

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
        console.log(`Received ${data.length} bytes`);
        resolve(data);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Clean text helper
function cleanText(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

// Simplified Todaii scraping
async function scrapeTodaiiArticles() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Todaii Japanese homepage...');
    const html = await makeRequest('https://todaijapanese.com');
    console.log(`✅ Fetched homepage: ${html.length} bytes`);

    // Extract article links - simplified pattern
    const linkMatches = html.matchAll(/href="(\/news\/[^"]+)"/g);
    const articleUrls = new Set();
    
    for (const match of linkMatches) {
      if (articleUrls.size >= 10) break; // Limit to 10 articles
      const fullUrl = `https://todaijapanese.com${match[1]}`;
      articleUrls.add(fullUrl);
    }

    console.log(`Found ${articleUrls.size} article URLs`);

    // Create articles from URLs
    let count = 0;
    for (const url of articleUrls) {
      const title = `Todaii Article ${count + 1}`;
      
      articles.push({
        id: `todaii_${Date.now()}_${count}`,
        title: title,
        content: `Content from: ${url}`,
        summary: `Summary of ${title}`,
        url: url,
        imageUrl: `https://images.unsplash.com/photo-${1600000000000 + count}?w=400`,
        publishDate: new Date(),
        scrapedAt: new Date(),
        source: {
          id: 'todaii',
          name: 'Todaii',
          displayName: 'Todaii Japanese - Learning Platform'
        },
        category: 'news',
        tags: ['todaii', 'japanese-learning', 'news'],
        difficulty: 'N3',
        estimatedReadingTime: 5,
        vocabulary: [],
        grammarPoints: []
      });
      
      count++;
    }

    return articles.length > 0 ? articles : getFallbackArticles();

  } catch (error) {
    console.error('❌ Error scraping Todaii:', error.message);
    return getFallbackArticles();
  }
}

// Fallback articles
function getFallbackArticles() {
  return [{
    id: `todaii_${Date.now()}_fallback`,
    title: 'Todaii Scraping Test',
    content: 'This is a fallback article for Todaii scraping.',
    summary: 'Test article for Todaii',
    url: 'https://todaijapanese.com',
    imageUrl: 'https://images.unsplash.com/photo-1600000000000?w=400',
    publishDate: new Date(),
    scrapedAt: new Date(),
    source: {
      id: 'todaii',
      name: 'Todaii',
      displayName: 'Todaii - Fallback Mode'
    },
    category: 'test',
    tags: ['fallback'],
    difficulty: 'N3',
    estimatedReadingTime: 1,
    vocabulary: [],
    grammarPoints: []
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
    console.log('🚀 Fixed Todaii scraping function triggered');
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
      scrapeTodaiiArticles(),
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
        message: `Successfully saved ${articles.length} Todaii articles`,
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