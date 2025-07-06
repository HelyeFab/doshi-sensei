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

// Ensure db is always set if Firebase is initialized
if (firebaseInitialized && !db) {
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
    const zlib = require('zlib');
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
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

      // Handle gzip compression
      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        
        gunzip.on('data', chunk => {
          data += chunk.toString();
          if (data.length > 1000000) { // 1MB limit
            gunzip.destroy();
            reject(new Error('Response too large'));
          }
        });
        
        gunzip.on('end', () => {
          console.log(`Decompressed ${data.length} bytes`);
          resolve(data);
        });
        
        gunzip.on('error', reject);
      } else {
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          if (data.length > 1000000) { // 1MB limit
            req.destroy();
            reject(new Error('Response too large'));
          }
        });
        
        res.on('end', () => {
          console.log(`Received ${data.length} bytes`);
          resolve(data);
        });
      }
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

// Improved Todaii scraping with content extraction
async function scrapeTodaiiArticles() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Todaii Japanese homepage...');
    const html = await makeRequest('https://japanese.todaiinews.com');
    console.log(`✅ Fetched homepage: ${html.length} bytes`);

    // Extract article data from the page - Updated for new structure
    const articleMatches = html.matchAll(/href="(https:\/\/japanese\.todaiinews\.com\/detail\/[^"?]+[^"\s]*)"/gi);
    const articleData = [];
    
    for (const match of articleMatches) {
      if (articleData.length >= 20) break;
      
      const url = match[1].trim();
      
      // Skip if we already have this URL
      if (articleData.some(a => a.url === url)) continue;
      
      // For now, we'll extract title from the article page itself
      articleData.push({
        url: url,
        title: '', // Will be filled when fetching content
        imageUrl: null, // Will be extracted from article page
        publishDate: new Date() // Will be updated if found on article page
      });
    }

    console.log(`Found ${articleData.length} articles on homepage`);

    // Fetch content for each article
    const contentPromises = articleData.map(async (data, i) => {
      try {
        await new Promise(resolve => setTimeout(resolve, i * 300)); // Stagger requests
        
        console.log(`📄 Fetching article ${i + 1}: ${data.url}`);
        const articleHtml = await makeRequest(data.url);
        
        // Extract title if not already set
        if (!data.title) {
          const titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                             articleHtml.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            data.title = cleanText(titleMatch[1]).replace(/\s*[-–—]\s*Todaii.*$/i, '').trim();
          }
        }
        
        // Extract image if not already set
        if (!data.imageUrl) {
          const imgMatch = articleHtml.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                          articleHtml.match(/<img[^>]*class="[^"]*main[^"]*"[^>]*src="([^"]+)"/i);
          if (imgMatch) {
            data.imageUrl = imgMatch[1];
          }
        }
        
        // Extract content - Todaii specific selectors
        let content = '';
        
        // Try multiple selectors
        const contentSelectors = [
          /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*(?:share|related|tags|comment))/i,
          /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)(?:<footer|<div[^>]*class="[^"]*share)/i,
          /<main[^>]*>([\s\S]*?)<\/main>/i
        ];
        
        for (const selector of contentSelectors) {
          const match = articleHtml.match(selector);
          if (match && match[1]) {
            content = match[1];
            break;
          }
        }
        
        // Clean the content
        if (content) {
          // Remove ads, social media, etc
          content = content.replace(/<div[^>]*class="[^"]*(?:ad|banner|social|share|related)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
          const cleanContent = cleanText(content);
          
          if (cleanContent.length > 100) {
            // Extract difficulty from content or title
            const difficultyMatch = data.title.match(/N[1-5]/i) || cleanContent.match(/N[1-5]/i);
            const difficulty = difficultyMatch ? difficultyMatch[0].toUpperCase() : 'N3';
            
            articles.push({
              id: `todaii_${Date.now()}_${i}`,
              title: data.title || 'Todaii Japanese Article',
              content: cleanContent.substring(0, 3000),
              summary: cleanContent.substring(0, 250) + '...',
              url: data.url,
              imageUrl: data.imageUrl || `https://images.unsplash.com/photo-${1600000000000 + i}?w=400`,
              audioUrl: null, // Todaii doesn't typically have audio files
              publishDate: data.publishDate,
              scrapedAt: new Date(),
              source: {
                id: 'todaii',
                name: 'Todaii',
                displayName: 'Todaii Japanese - Learning Platform'
              },
              category: 'news',
              tags: ['todaii', 'japanese-learning', difficulty.toLowerCase()],
              difficulty: difficulty,
              estimatedReadingTime: Math.ceil(cleanContent.length / 500),
              vocabulary: (cleanContent.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [])
                .filter((word, index, self) => self.indexOf(word) === index && word.length > 1)
                .slice(0, 30),
              grammarPoints: []
            });
            
            console.log(`✅ Extracted ${cleanContent.length} chars for: ${data.title}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch article ${i + 1}: ${error.message}`);
      }
    });
    
    await Promise.all(contentPromises);
    
    return articles.length > 0 ? articles : getFallbackArticles();

  } catch (error) {
    console.error('❌ Error scraping Todaii:', error.message);
    return getFallbackArticles();
  }
}

// Fallback articles - return empty array instead of test data
function getFallbackArticles() {
  return [];
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
      setTimeout(() => reject(new Error('Scraping timeout')), 90000) // 90 seconds timeout
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