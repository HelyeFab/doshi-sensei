const admin = require('firebase-admin');

// Copied from working scraping-next/watanoc-scraper/lib/scrapers/watanoc.ts
// Adapted for Netlify functions with Firebase integration

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

// Simple cheerio-like parsing using native DOM-like parsing
function parseHTML(html) {
  return {
    load: (html) => {
      return (selector) => {
        if (selector === 'article.loop-article') {
          return {
            each: (callback) => {
              const articleRegex = /<article[^>]*class="[^"]*loop-article[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
              let match;
              let index = 0;
              while ((match = articleRegex.exec(html)) !== null) {
                const element = {
                  html: match[1],
                  find: (sel) => {
                    if (sel === '.entry-title a') {
                      const titleMatch = match[1].match(/<a[^>]*href="([^"]+)"[^>]*[^>]*title="([^"]+)"|<a[^>]*title="([^"]+)"[^>]*href="([^"]+)"/);
                      if (titleMatch) {
                        return {
                          text: () => (titleMatch[2] || titleMatch[3] || '').trim(),
                          attr: (attr) => attr === 'href' ? (titleMatch[1] || titleMatch[4]) : null
                        };
                      }
                      return { text: () => '', attr: () => null };
                    }
                    if (sel === '.loop-excerpt') {
                      const excerptMatch = match[1].match(/<div[^>]*class="[^"]*loop-excerpt[^"]*"[^>]*>(.*?)<\/div>/s);
                      return {
                        text: () => excerptMatch ? excerptMatch[1].replace(/<[^>]*>/g, '').trim() : ''
                      };
                    }
                    if (sel === '.meta-author .fn') {
                      const authorMatch = match[1].match(/<[^>]*class="[^"]*fn[^"]*"[^>]*>([^<]+)<\//);
                      return {
                        text: () => authorMatch ? authorMatch[1].trim() : ''
                      };
                    }
                    if (sel === '.loop-date time') {
                      const timeMatch = match[1].match(/<time[^>]*datetime="([^"]+)"[^>]*>([^<]*)<\/time>/);
                      return {
                        attr: (attr) => attr === 'datetime' && timeMatch ? timeMatch[1] : null,
                        text: () => timeMatch ? timeMatch[2].trim() : ''
                      };
                    }
                    if (sel === '.loop-post-thumb img') {
                      const imgMatch = match[1].match(/<img[^>]*src="([^"]+)"/);
                      return {
                        attr: (attr) => attr === 'src' && imgMatch ? imgMatch[1] : null
                      };
                    }
                    return { text: () => '', attr: () => null };
                  }
                };
                callback(index, element);
                index++;
              }
            }
          };
        }
        return { each: () => {} };
      };
    }
  };
}

function createHash(input) {
  // Simple hash function to replace crypto.createHash('md5')
  let hash = 0;
  if (input.length === 0) return hash.toString();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

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
    const $ = parseHTML(html).load(html);
    const articles = [];

    $('article.loop-article').each((_, element) => {
      const titleElement = element.find('.entry-title a');
      const title = titleElement.text();
      const url = titleElement.attr('href') || '';
      
      if (!title || !url) return;
      
      const id = createHash(url);
      
      const excerpt = element.find('.loop-excerpt').text();
      const author = element.find('.meta-author .fn').text();
      
      const dateTime = element.find('.loop-date time').attr('datetime');
      const dateText = element.find('.loop-date time').text();
      const date = dateTime || dateText;
      
      const imageUrl = element.find('.loop-post-thumb img').attr('src');
      
      const levelMatch = title.match(/\(n(\d)\)/);
      const level = levelMatch ? `N${levelMatch[1]}` : 'N4';
      
      const cleanTitle = title.replace(/\.\.\.\(n\d\).*$/, '').trim();
      
      articles.push({
        id: `watanoc_next_${id}`,
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

    return articles.slice(0, 3);
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
    console.log('🚀 Watanoc scraper (copied from working scraping-next)');

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

    const articles = await scrapeWatanoc();
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
        message: `Successfully saved ${articles.length} Watanoc articles (SCRAPING-NEXT VERSION)`,
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