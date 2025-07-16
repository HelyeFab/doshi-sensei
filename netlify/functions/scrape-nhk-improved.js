const admin = require('firebase-admin');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Function to get Unsplash image
async function getUnsplashImage(keyword = 'japan news') {
  try {
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashAccessKey) {
      return null;
    }
    
    const response = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`, {
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`,
        'Accept-Version': 'v1'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.urls.regular;
  } catch (error) {
    return null;
  }
}

// Initialize Firebase
let firebaseInitialized = false;
let db = null;

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
    console.log('✅ Firebase initialized');
  } catch (error) {
    console.error('❌ Firebase init failed:', error.message);
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Launch browser
async function launchBrowser() {
  // For local testing, try regular puppeteer first
  try {
    const puppeteerRegular = require('puppeteer');
    return await puppeteerRegular.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (e) {
    // Fallback to chromium for serverless
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
}

// Scrape regular NHK News (not Easy) using patterns from news-crawler
async function scrapeNHKNews() {
  const articles = [];
  let browser;
  
  try {
    console.log('🚀 [NHK] Launching browser...');
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    // First, get the news list page
    console.log('📖 [NHK] Navigating to NHK News...');
    await page.goto('https://www3.nhk.or.jp/news/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for news items to load
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Get article links
    const articleLinks = await page.evaluate(() => {
      const links = [];
      // Look for article links - adjust selector based on current NHK structure
      const articles = document.querySelectorAll('article a[href*="/news/html/"]');
      
      articles.forEach((article, index) => {
        if (index < 5) { // Get first 5
          const href = article.href;
          const title = article.textContent?.trim() || '';
          
          if (href && title) {
            links.push({ url: href, title });
          }
        }
      });
      
      return links;
    });
    
    console.log(`✅ [NHK] Found ${articleLinks.length} article links`);
    
    // Fetch each article
    for (let i = 0; i < articleLinks.length; i++) {
      const link = articleLinks[i];
      
      try {
        console.log(`📄 [NHK] Fetching article ${i + 1}: ${link.url}`);
        await page.goto(link.url, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });
        
        // Extract article data using selectors from news-crawler
        const articleData = await page.evaluate(() => {
          const data = {
            title: '',
            content: '',
            date: '',
            thumbnail: null
          };
          
          // Try the selectors from news-crawler first
          const contentSection = document.querySelector('section.module--detail-content');
          if (contentSection) {
            // Title
            const titleEl = contentSection.querySelector('h1');
            if (titleEl) {
              data.title = titleEl.textContent?.trim() || '';
            }
            
            // Date
            const timeEl = contentSection.querySelector('time');
            if (timeEl) {
              data.date = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || '';
            }
            
            // Thumbnail
            const imgEl = contentSection.querySelector('figure img');
            if (imgEl) {
              data.thumbnail = imgEl.src;
            }
            
            // Content
            const mainContent = contentSection.querySelector('.content--detail-main');
            if (mainContent) {
              const paragraphs = mainContent.querySelectorAll('p');
              const contentArray = [];
              
              paragraphs.forEach(p => {
                const text = p.textContent?.trim();
                if (text && text.length > 10) {
                  contentArray.push(text);
                }
              });
              
              data.content = contentArray.join('\n\n');
            }
          }
          
          // Fallback selectors if the above don't work
          if (!data.title) {
            const h1 = document.querySelector('h1');
            if (h1) data.title = h1.textContent?.trim() || '';
          }
          
          if (!data.content) {
            // Try to get any article content
            const articleEl = document.querySelector('article, .article-body, .news-body');
            if (articleEl) {
              const paragraphs = articleEl.querySelectorAll('p');
              const contentArray = [];
              
              paragraphs.forEach(p => {
                const text = p.textContent?.trim();
                if (text && text.length > 10 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
                  contentArray.push(text);
                }
              });
              
              data.content = contentArray.join('\n\n');
            }
          }
          
          return data;
        });
        
        // Only add if we have content
        if (articleData.content && articleData.content.length > 50) {
          const article = {
            id: `nhk_news_${Date.now()}_${i}`,
            title: articleData.title || link.title,
            content: articleData.content,
            summary: articleData.content.substring(0, 150) + '...',
            url: link.url,
            imageUrl: articleData.thumbnail || await getUnsplashImage('japan news'),
            publishDate: articleData.date ? new Date(articleData.date) : new Date(),
            scrapedAt: new Date(),
            source: {
              id: 'nhk-news',
              name: 'NHK News',
              displayName: 'NHK ニュース'
            },
            category: 'news',
            tags: ['japanese-news', 'nhk', 'current-events'],
            difficulty: 'N3', // Regular NHK news is intermediate level
            estimatedReadingTime: Math.ceil(articleData.content.length / 400),
            vocabulary: [],
            kanji: []
          };
          
          articles.push(article);
          console.log(`✅ [NHK] Created article: ${article.title}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fetching article ${i + 1}:`, error.message);
      }
    }
    
    return articles;
    
  } catch (error) {
    console.error('❌ [NHK] Error scraping:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
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

// Handler
exports.handler = async (event, context) => {
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
    console.log('🚀 [NHK Improved] Starting scraper...');

    if (!firebaseInitialized || !db) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firebase not configured',
          timestamp: new Date().toISOString()
        }),
      };
    }

    const articles = await scrapeNHKNews();
    
    if (articles.length > 0) {
      await saveArticlesToFirebase(articles);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully scraped ${articles.length} NHK News articles`,
        articlesCount: articles.length,
        source: 'nhk-news-improved',
        articles: articles.map(a => ({
          title: a.title,
          contentLength: a.content.length,
          url: a.url
        })),
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('❌ Handler error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  }
};