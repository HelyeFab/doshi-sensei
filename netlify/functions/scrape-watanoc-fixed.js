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

// HTTP request helper with better error handling
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 30000 // Increase timeout to 30 seconds
    };

    let data = '';
    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      res.setEncoding('utf8');
      res.on('data', chunk => {
        data += chunk;
        // Prevent memory issues - stop if data is too large
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

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Clean HTML and extract text
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

// Extract JLPT level from title
function extractJLPTLevel(title) {
  const match = title.match(/\(n([1-5])\)/i);
  if (match) {
    return `N${match[1].toUpperCase()}`;
  }
  return 'N4'; // Default if not found
}

// Parse date from Japanese format
function parseJapaneseDate(dateStr) {
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  return new Date();
}

// Simplified article extraction
async function scrapeWatanocArticles() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Watanoc homepage...');
    const html = await makeRequest('https://watanoc.com');
    console.log(`✅ Fetched homepage: ${html.length} bytes`);

    // Use a simpler regex pattern to find articles
    const articleMatches = html.matchAll(/<article[^>]*>[\s\S]*?<\/article>/gi);
    let count = 0;

    for (const match of articleMatches) {
      if (count >= 10) break; // Limit to 10 articles
      
      const articleHtml = match[0];
      
      // Extract URL
      const urlMatch = articleHtml.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/);
      if (!urlMatch) continue;
      
      // Extract title
      const titleMatch = articleHtml.match(/title="([^"]+)"/);
      if (!titleMatch) continue;
      
      const url = urlMatch[1];
      const rawTitle = titleMatch[1];
      const cleanTitle = cleanText(rawTitle).replace(/\s*\(n[1-5]\).*$/i, '');
      const jlptLevel = extractJLPTLevel(rawTitle);
      
      // Try to extract image URL
      const imgMatch = articleHtml.match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
      const imageUrl = imgMatch ? imgMatch[1] : `https://images.unsplash.com/photo-${1500000000000 + count}?w=400`;
      
      // Extract date if available
      const dateMatch = articleHtml.match(/<time[^>]*datetime="([^"]+)"|>(\d{4}年\d{1,2}月\d{1,2}日)</);
      const publishDate = dateMatch ? parseJapaneseDate(dateMatch[1] || dateMatch[2]) : new Date();
      
      // Create article object
      const article = {
        id: `watanoc_${Date.now()}_${count}`,
        title: cleanTitle,
        content: '', // Will be filled later
        summary: cleanTitle.substring(0, 150) + '...',
        url: url,
        imageUrl: imageUrl,
        publishDate: publishDate,
        scrapedAt: new Date(),
        source: {
          id: 'watanoc',
          name: 'Watanoc',
          displayName: 'Watanoc - Japanese Learning Articles'
        },
        category: 'general',
        tags: ['japanese-learning', 'watanoc', jlptLevel.toLowerCase()],
        difficulty: jlptLevel,
        estimatedReadingTime: 3,
        vocabulary: [],
        kanji: []
      };
      
      articles.push(article);
      
      count++;
      console.log(`✅ Extracted article ${count}: ${cleanTitle}`);
    }

    // Fetch content for first 3 articles (to avoid timeout)
    console.log('📄 Fetching article content...');
    for (let i = 0; i < Math.min(3, articles.length); i++) {
      try {
        const articleHtml = await makeRequest(articles[i].url);
        const contentMatch = articleHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (contentMatch) {
          articles[i].content = cleanText(contentMatch[1]).substring(0, 2000); // Limit content length
          articles[i].summary = articles[i].content.substring(0, 200) + '...';
          
          // Extract vocabulary
          const vocabulary = (articles[i].content.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [])
            .filter((word, index, self) => self.indexOf(word) === index && word.length > 1)
            .slice(0, 20);
          articles[i].vocabulary = vocabulary;
          
          // Extract kanji
          const kanji = (articles[i].content.match(/[\u4e00-\u9faf]/g) || [])
            .filter((char, index, self) => self.indexOf(char) === index)
            .slice(0, 15);
          articles[i].kanji = kanji;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
      } catch (error) {
        console.warn(`⚠️ Could not fetch content for article ${i + 1}: ${error.message}`);
      }
    }

    return articles;

  } catch (error) {
    console.error('❌ Error scraping Watanoc:', error.message);
    // Return one fallback article
    return [{
      id: `watanoc_${Date.now()}_fallback`,
      title: 'Watanoc Scraping Test',
      content: 'This is a fallback article. The scraping encountered an error: ' + error.message,
      summary: 'Fallback article for testing',
      url: 'https://watanoc.com',
      imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400',
      publishDate: new Date(),
      scrapedAt: new Date(),
      source: {
        id: 'watanoc',
        name: 'Watanoc',
        displayName: 'Watanoc - Error Mode'
      },
      category: 'test',
      tags: ['fallback'],
      difficulty: 'N5',
      estimatedReadingTime: 1,
      vocabulary: [],
      kanji: []
    }];
  }
}

// Function to save articles to Firebase
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

// Main handler function
exports.handler = async (event, context) => {
  // Set function timeout
  context.callbackWaitsForEmptyEventLoop = false;
  
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
    console.log('🚀 Fixed Watanoc scraping function triggered');
    console.log('📅 Event type:', event.httpMethod || 'scheduled');
    console.log('🔧 Firebase initialized:', firebaseInitialized);

    // Check if Firebase is properly initialized
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

    // Get articles from Watanoc with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 50000) // 50 seconds timeout
    );
    
    const articles = await Promise.race([
      scrapeWatanocArticles(),
      timeoutPromise
    ]);

    console.log(`📊 Scraped ${articles.length} articles`);

    // Save articles to Firebase
    await saveArticlesToFirebase(articles);

    const elapsed = Date.now() - startTime;

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} Watanoc articles to Firebase`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
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