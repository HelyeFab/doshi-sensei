const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

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

// HTTP request helper with gzip support
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
      timeout: 30000
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
          if (data.length > 1000000) { // 1MB limit
            gunzip.destroy();
            reject(new Error('Response too large'));
          }
        });
        
        gunzip.on('end', () => {
          console.log(`Decompressed ${data.length} bytes`);
          resolve(data);
        });
        
        gunzip.on('error', err => {
          console.error('Gunzip error:', err);
          reject(err);
        });
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
  // First, extract text from tipso/tooltip spans which contain vocabulary
  let processedHtml = html;
  
  // Extract content from tipso spans (Watanoc's vocabulary tooltips)
  processedHtml = processedHtml.replace(/<span[^>]*class=['"]tipso['"][^>]*data-tipso=['"]([^'"]*?)['"][^>]*>([^<]*)<\/span>/gi, (match, tooltip, word) => {
    return word + ' ';
  });
  
  // Extract content from other tooltip spans
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
    // Remove URLs from content - more comprehensive patterns
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
      if (count >= 20) break; // Limit to 20 articles
      
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
        kanji: [],
        audioUrl: null // Will be filled if audio is found
      };
      
      articles.push(article);
      
      count++;
      console.log(`✅ Extracted article ${count}: ${cleanTitle}`);
    }

    // Fetch content for all articles with improved extraction
    console.log('📄 Fetching article content...');
    const contentPromises = articles.map(async (article, i) => {
      try {
        await new Promise(resolve => setTimeout(resolve, i * 200)); // Stagger requests
        
        const articleHtml = await makeRequest(article.url);
        
        // Try multiple selectors to find the content
        let content = '';
        
        // First try: Watanoc's actual structure - entry entry-content
        const entryMatch = articleHtml.match(/<div[^>]*class="[^"]*entry\s+entry-content[^"]*"[^>]*>([\s\S]*?)(?:<footer|<aside|<div[^>]*class="[^"]*(?:share|comment|related))/i);
        if (entryMatch && entryMatch[1]) {
          content = entryMatch[1];
        }
        
        // Second try: just entry-content
        if (!content) {
          const entryContentMatch = articleHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)(?:<footer|<\/article|<div[^>]*class="[^"]*(?:share|comment))/i);
          if (entryContentMatch && entryContentMatch[1]) {
            content = entryContentMatch[1];
          }
        }
        
        // Third try: Look for the content area with Japanese text
        if (!content) {
          // Find divs containing substantial Japanese text
          const divMatches = articleHtml.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi);
          for (const match of divMatches) {
            const divContent = match[1];
            // Count Japanese characters
            const japaneseChars = (divContent.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
            // If this div has more than 200 Japanese characters, it's likely the main content
            if (japaneseChars > 200 && !divContent.includes('class="menu') && !divContent.includes('class="header')) {
              content = divContent;
              break;
            }
          }
        }
        
        // Fourth try: article content
        if (!content) {
          const articleMatch = articleHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
          if (articleMatch && articleMatch[1]) {
            // Remove header and footer sections
            const cleanedArticle = articleMatch[1]
              .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
              .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
            content = cleanedArticle;
          }
        }
        
        // Extract audio URL if present
        const audioMatch = articleHtml.match(/<audio[^>]*>[\s\S]*?<source[^>]*src="([^"]+\.mp3[^"]*)"[^>]*>/i);
        if (!audioMatch) {
          // Try alternative audio patterns
          const altAudioMatch = articleHtml.match(/src="([^"]+\/[^"]+\.mp3[^"]*)"/i);
          if (altAudioMatch) {
            article.audioUrl = altAudioMatch[1].replace(/\?.*$/, ''); // Remove query params
            console.log(`🎵 Found audio for article ${i + 1}: ${article.audioUrl}`);
          }
        } else {
          article.audioUrl = audioMatch[1].replace(/\?.*$/, ''); // Remove query params
          console.log(`🎵 Found audio for article ${i + 1}: ${article.audioUrl}`);
        }
        
        // Clean and process the content
        if (content) {
          // Remove nested divs that might be ads or unrelated
          content = content.replace(/<div[^>]*class="[^"]*(?:ad|banner|widget|sidebar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
          
          // Remove any URLs from the content BEFORE cleaning - more comprehensive
          content = content.replace(/https?:\/\/[^\s<>]+/g, '');
          content = content.replace(/www\.[^\s<>]+/g, '');
          content = content.replace(/<a[^>]*href=[^>]*>.*?<\/a>/gi, ''); // Remove entire link tags
          
          const cleanContent = cleanText(content);
          
          // Only update if we found substantial content
          if (cleanContent.length > 100) {
            article.content = cleanContent.substring(0, 3000); // Increased limit
            article.summary = cleanContent.substring(0, 250) + '...';
            
            // Extract vocabulary (Japanese words)
            const vocabulary = (cleanContent.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [])
              .filter((word, index, self) => self.indexOf(word) === index && word.length > 1)
              .slice(0, 30);
            article.vocabulary = vocabulary;
            
            // Extract kanji
            const kanji = (cleanContent.match(/[\u4e00-\u9faf]/g) || [])
              .filter((char, index, self) => self.indexOf(char) === index)
              .slice(0, 20);
            article.kanji = kanji;
            
            console.log(`✅ Extracted ${cleanContent.length} chars for article ${i + 1}: ${article.title}`);
          } else {
            console.log(`⚠️ Insufficient content (${cleanContent.length} chars) for article ${i + 1}`);
          }
        } else {
          console.log(`⚠️ No content found for article ${i + 1}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch content for article ${i + 1}: ${error.message}`);
      }
    });
    
    // Wait for all content fetching to complete
    await Promise.all(contentPromises);

    return articles;

  } catch (error) {
    console.error('❌ Error scraping Watanoc:', error.message);
    // Return empty array instead of test articles
    return [];
  }
}

// Function to save articles to Firebase
async function saveArticlesToFirebase(articles) {
  console.log('💾 Saving to Firebase - Check:', { 
    hasDb: !!db, 
    firebaseInitialized,
    adminAppsLength: admin.apps.length 
  });
  
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized - firebaseInitialized is false');
  }
  
  if (!db) {
    // Try to get db again
    db = admin.firestore();
    console.log('🔄 Re-initialized db:', !!db);
  }
  
  if (!db) {
    throw new Error('Firebase Firestore db is null');
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
      setTimeout(() => reject(new Error('Scraping timeout')), 90000) // 90 seconds timeout
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