const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

// Global variables for Firebase
let db = null;

// HTTP request helper with gzip support (same as original but with better error logging)
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
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 25000 // Reduced from 30s
    };

    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Content-Encoding:', res.headers['content-encoding']);
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      
      // Handle gzip compression
      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        
        gunzip.on('data', chunk => {
          data += chunk.toString();
          if (data.length > 500000) { // Reduced from 1MB to 500KB limit
            console.log(`⚠️ Data size limit reached: ${data.length} bytes`);
            gunzip.destroy();
            reject(new Error('Response too large'));
          }
        });
        
        gunzip.on('end', () => {
          console.log(`✅ Decompressed ${data.length} bytes`);
          resolve(data);
        });
        
        gunzip.on('error', err => {
          console.error('❌ Gunzip error:', err.message);
          reject(err);
        });
      } else {
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          if (data.length > 500000) { // Reduced limit
            console.log(`⚠️ Data size limit reached: ${data.length} bytes`);
            req.destroy();
            reject(new Error('Response too large'));
          }
        });
        
        res.on('end', () => {
          console.log(`✅ Received ${data.length} bytes`);
          resolve(data);
        });
      }
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err.message);
      reject(err);
    });
    
    req.on('timeout', () => {
      console.log('⏰ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Clean HTML and extract text (same as original)
function cleanText(html) {
  let processedHtml = html;
  
  processedHtml = processedHtml.replace(/<span[^>]*class=['"]tipso['"][^>]*data-tipso=['"]([^'"]*?)['"][^>]*>([^<]*)<\/span>/gi, (match, tooltip, word) => {
    return word + ' ';
  });
  
  processedHtml = processedHtml.replace(/<span[^>]*class=['"][^'"]*tooltips[^'"]*['"][^>]*title=['"]([^'"]*?)['"][^>]*>([^<]*)<\/span>/gi, (match, tooltip, content) => {
    return content + ' ';
  });
  
  return processedHtml
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/https?:\/\/[^\s<>]+/g, '')
    .replace(/www\.[^\s<>]+/g, '')
    .replace(/[a-zA-Z0-9][a-zA-Z0-9-]+\.(com|org|net|jp|co\.jp)[^\s<>]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract JLPT level from title
function extractJLPTLevel(title) {
  const match = title.match(/\(n([1-5])\)/i);
  if (match) {
    return `N${match[1].toUpperCase()}`;
  }
  return 'N4';
}

// Parse date from Japanese format
function parseJapaneseDate(dateStr) {
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  return new Date();
}

// LIMITED article extraction - only 2 articles max
async function scrapeWatanocArticles() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Watanoc homepage...');
    const html = await makeRequest('https://watanoc.com');
    console.log(`✅ Fetched homepage: ${html.length} bytes`);

    const articleMatches = html.matchAll(/<article[^>]*>[\s\S]*?<\/article>/gi);
    let count = 0;

    for (const match of articleMatches) {
      if (count >= 2) { // REDUCED FROM 5 TO 2
        console.log(`⏹️ Stopping at ${count} articles to stay within limits`);
        break;
      }
      
      const articleHtml = match[0];
      
      // Extract URL
      const urlMatch = articleHtml.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/);
      if (!urlMatch) {
        console.log(`⚠️ No URL found for article ${count + 1}`);
        continue;
      }
      
      // Extract title
      const titleMatch = articleHtml.match(/title="([^"]+)"/);
      if (!titleMatch) {
        console.log(`⚠️ No title found for article ${count + 1}`);
        continue;
      }
      
      const url = urlMatch[1];
      const rawTitle = titleMatch[1];
      const cleanTitle = cleanText(rawTitle).replace(/\s*\(n[1-5]\).*$/i, '');
      const jlptLevel = extractJLPTLevel(rawTitle);
      
      const imgMatch = articleHtml.match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
      const imageUrl = imgMatch ? imgMatch[1] : `https://images.unsplash.com/photo-${1500000000000 + count}?w=400`;
      
      const dateMatch = articleHtml.match(/<time[^>]*datetime="([^"]+)"|>(\d{4}年\d{1,2}月\d{1,2}日)</);
      const publishDate = dateMatch ? parseJapaneseDate(dateMatch[1] || dateMatch[2]) : new Date();
      
      const article = {
        id: `watanoc_limited_${Date.now()}_${count}`,
        title: cleanTitle,
        content: '',
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
        kanji: [],
        audioUrl: null
      };
      
      articles.push(article);
      count++;
      console.log(`✅ Extracted article ${count}: ${cleanTitle}`);
    }

    // Fetch content for articles with staggered requests
    console.log('📄 Fetching article content...');
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      try {
        console.log(`📖 Fetching content for article ${i + 1}/${articles.length}`);
        
        // Longer delay between requests
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const articleHtml = await makeRequest(article.url);
        console.log(`✅ Got article HTML: ${articleHtml.length} bytes`);
        
        // Try to extract content (simplified)
        let content = '';
        const entryMatch = articleHtml.match(/<div[^>]*class="[^"]*entry\s+entry-content[^"]*"[^>]*>([\s\S]*?)(?:<footer|<aside|<div[^>]*class="[^"]*(?:share|comment|related))/i);
        if (entryMatch && entryMatch[1]) {
          content = entryMatch[1];
        }
        
        if (content) {
          const cleanContent = cleanText(content);
          if (cleanContent.length > 100) {
            article.content = cleanContent.substring(0, 2000); // Reduced from 3000
            article.summary = cleanContent.substring(0, 200) + '...';
            console.log(`✅ Extracted ${cleanContent.length} chars for article ${i + 1}`);
          }
        } else {
          console.log(`⚠️ No content extracted for article ${i + 1}`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Could not fetch content for article ${i + 1}: ${error.message}`);
      }
    }

    return articles;

  } catch (error) {
    console.error('❌ Error scraping Watanoc:', error.message);
    return [];
  }
}

// Function to save articles to Firebase
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

// Main handler function
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
    console.log('🚀 LIMITED Watanoc scraping function triggered');
    console.log('📅 Event type:', event.httpMethod || 'scheduled');

    // Initialize Firebase
    if (!admin.apps.length) {
      try {
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

    // Get articles with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 15000) // REDUCED from 20s to 15s
    );
    
    const articles = await Promise.race([
      scrapeWatanocArticles(),
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
        message: `Successfully saved ${articles.length} Watanoc articles to Firebase (LIMITED VERSION)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'limited'
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
        version: 'limited'
      }),
    };
  }
};