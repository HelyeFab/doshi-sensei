// All requires at module level - CRITICAL for Netlify
const admin = require('firebase-admin');
const { saveArticlesWithDeduplication } = require('./article-deduplication');

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

// Helper function to get Unsplash image
async function getUnsplashImage(query) {
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
  if (!UNSPLASH_ACCESS_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.urls?.regular || null;
    }
  } catch (error) {
    console.error('[Scheduled] Unsplash API error:', error);
  }
  return null;
}

// Scrape NHK Easy News (using exact params from manual function)
async function scrapeNHKEasy() {
  console.log('[Scheduled] Starting NHK Easy scraping...');
  
  try {
    const response = await fetch('https://www3.nhk.or.jp/news/easy/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const articles = [];
    
    // Extract article links using regex
    const linkRegex = /<a[^>]+href=["']([^"']+k[0-9]{10,}[^"']+)["'][^>]*>/gi;
    const matches = [...html.matchAll(linkRegex)];
    
    const uniqueUrls = [...new Set(matches.map(m => m[1]))];
    const articleUrls = uniqueUrls
      .filter(url => url.includes('/news/easy/') && url.match(/k[0-9]{10,}/))
      .slice(0, 5); // Up to 5 articles like manual function

    // Fetch each article
    for (const url of articleUrls) {
      const fullUrl = url.startsWith('http') ? url : `https://www3.nhk.or.jp${url}`;
      
      try {
        const articleResponse = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(5000)
        });

        if (articleResponse.ok) {
          const articleHtml = await articleResponse.text();
          
          // Extract title
          const titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const title = titleMatch ? titleMatch[1].trim() : 'NHK Easy News Article';
          
          // Extract content
          const contentMatch = articleHtml.match(/<div[^>]+class="article-body"[^>]*>([\s\S]*?)<\/div>/);
          let content = '';
          if (contentMatch) {
            content = contentMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 500);
          }

          articles.push({
            title,
            content: content || 'Content not available',
            url: fullUrl,
            source: 'nhk-easy',
            difficulty: 'N5',
            imageUrl: await getUnsplashImage('Japan news')
          });
        }
      } catch (error) {
        console.error(`[Scheduled] Error fetching NHK article: ${error.message}`);
      }
    }

    return articles;
  } catch (error) {
    console.error('[Scheduled] NHK Easy scraping failed:', error);
    return [];
  }
}

// Scrape Watanoc News (using exact params from manual function)
async function scrapeWatanoc() {
  console.log('[Scheduled] Starting Watanoc scraping...');
  
  try {
    const response = await fetch('https://watanoc.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const articles = [];
    
    // Extract article URLs
    const articleRegex = /<a[^>]+href=["'](https:\/\/watanoc\.com\/[^"']+)["'][^>]*>/gi;
    const matches = [...html.matchAll(articleRegex)];
    
    const articleUrls = [...new Set(matches.map(m => m[1]))]
      .filter(url => url.match(/watanoc\.com\/[\w-]+-[\w-]+/))
      .slice(0, 5); // Up to 5 articles

    // Fetch each article
    for (const url of articleUrls) {
      try {
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (articleResponse.ok) {
          const articleHtml = await articleResponse.text();
          
          // Extract title
          const titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const title = titleMatch ? titleMatch[1].trim() : 'Watanoc Article';
          
          // Extract JLPT level
          const jlptMatch = title.match(/[（(]([N][1-5])[)）]/);
          const difficulty = jlptMatch ? jlptMatch[1] : 'N3';
          
          // Extract content
          let content = '';
          const contentMatch = articleHtml.match(/<div[^>]+class="entry-content"[^>]*>([\s\S]*?)<\/div>/);
          if (contentMatch) {
            content = contentMatch[1]
              .replace(/<ruby>/g, '')
              .replace(/<\/ruby>/g, '')
              .replace(/<rt>.*?<\/rt>/g, '')
              .replace(/<rp>.*?<\/rp>/g, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 500);
          }

          articles.push({
            title: title.replace(/[（(][N][1-5][)）]/, '').trim(),
            content: content || 'Content not available',
            url,
            source: 'watanoc',
            difficulty,
            imageUrl: await getUnsplashImage('Japan culture')
          });
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[Scheduled] Error fetching Watanoc article: ${error.message}`);
      }
    }

    return articles;
  } catch (error) {
    console.error('[Scheduled] Watanoc scraping failed:', error);
    return [];
  }
}

// Scrape Todaii News (using exact params from manual function)
async function scrapeTodaii() {
  console.log('[Scheduled] Starting Todaii scraping...');
  
  try {
    const response = await fetch('https://japanese.todaiinews.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const articles = [];
    
    // Extract article links
    const linkRegex = /<a[^>]+href=["'](\/[^"']+)["'][^>]*>/gi;
    const matches = [...html.matchAll(linkRegex)];
    
    const articlePaths = [...new Set(matches.map(m => m[1]))]
      .filter(path => path.match(/^\/[a-z]+-[a-z]+-[a-z]+/))
      .slice(0, 5); // Up to 5 articles

    // Fetch each article
    for (const path of articlePaths) {
      const url = `https://japanese.todaiinews.com${path}`;
      
      try {
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          signal: AbortSignal.timeout(5000)
        });

        if (articleResponse.ok) {
          const articleHtml = await articleResponse.text();
          
          // Extract title
          const titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const title = titleMatch ? titleMatch[1].trim() : 'Todaii News Article';
          
          // Extract content
          let content = '';
          const contentMatch = articleHtml.match(/<div[^>]+class="article-content"[^>]*>([\s\S]*?)<\/div>/);
          if (contentMatch) {
            content = contentMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 500);
          }

          articles.push({
            title,
            content: content || 'Content not available',
            url,
            source: 'todaii',
            difficulty: 'N4',
            imageUrl: await getUnsplashImage('Japan modern')
          });
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[Scheduled] Error fetching Todaii article: ${error.message}`);
      }
    }

    return articles;
  } catch (error) {
    console.error('[Scheduled] Todaii scraping failed:', error);
    return [];
  }
}

// Save articles to Firebase with deduplication
async function saveArticlesToFirebase(articles) {
  if (!firebaseInitialized || !db) {
    throw new Error('Firebase not initialized');
  }

  console.log(`[Scheduled] Checking ${articles.length} articles for duplicates...`);
  
  // Add metadata to articles before deduplication
  const articlesWithMetadata = articles.map(article => ({
    ...article,
    createdAt: new Date(),
    lastModified: new Date(),
    views: 0,
    scraped: true,
    scheduledScrape: true
  }));
  
  const savedCount = await saveArticlesWithDeduplication(db, articlesWithMetadata, admin);
  console.log(`[Scheduled] Saved ${savedCount} new articles (${articles.length - savedCount} duplicates skipped)`);
}

// Main handler for both scheduled and HTTP triggers
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // Check if this is a scheduled invocation
  const isScheduled = event.httpMethod === undefined || event.httpMethod === null;
  
  // For HTTP requests, handle CORS
  if (!isScheduled && event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  console.log(`[Scheduled] Function triggered (${isScheduled ? 'scheduled' : 'HTTP'})`);

  try {
    // Check Firebase
    if (!firebaseInitialized || !db) {
      throw new Error('Firebase not initialized. Check environment variables.');
    }

    // Set up timeout promise (25 seconds for scraping, leaving 5 seconds for response)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scraping timeout')), 25000);
    });

    // Scrape all sources with timeout protection
    const scrapingPromise = Promise.all([
      scrapeNHKEasy(),
      scrapeWatanoc(),
      scrapeTodaii()
    ]);

    const [nhkArticles, watanocArticles, todaiiArticles] = await Promise.race([
      scrapingPromise,
      timeoutPromise
    ]);

    const allArticles = [...nhkArticles, ...watanocArticles, ...todaiiArticles];
    
    if (allArticles.length > 0) {
      await saveArticlesToFirebase(allArticles);
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      articlesScraped: {
        nhk: nhkArticles.length,
        watanoc: watanocArticles.length,
        todaii: todaiiArticles.length,
        total: allArticles.length
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      isScheduled
    };

    console.log('[Scheduled] Scraping completed:', result);

    // Return appropriate response based on trigger type
    if (isScheduled) {
      // For scheduled functions, just log the result
      return result;
    } else {
      // For HTTP requests, return proper HTTP response
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
      };
    }
  } catch (error) {
    console.error('[Scheduled] Function error:', error);
    
    const errorResult = {
      success: false,
      error: error.message,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    };

    if (isScheduled) {
      throw error; // Let Netlify handle the error for scheduled functions
    } else {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResult)
      };
    }
  }
};