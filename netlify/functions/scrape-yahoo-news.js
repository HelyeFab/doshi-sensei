const admin = require('firebase-admin');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { filterArticles, quickValidate } = require('./article-quick-validation');

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
  try {
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });
    return browser;
  } catch (error) {
    console.error('❌ Failed to launch browser:', error);
    throw error;
  }
}

// Scrape Yahoo News Japan
async function scrapeYahooNews() {
  const articles = [];
  let browser;
  
  try {
    console.log('🚀 [Yahoo News] Launching browser...');
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    // Set Japanese user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Yahoo News Japan
    console.log('📖 [Yahoo News] Navigating to Yahoo News Japan...');
    await page.goto('https://news.yahoo.co.jp/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for news items to load
    await page.waitForSelector('article, .newsFeed_item, [data-ual-view-type="list"]', { timeout: 10000 });
    
    // Get article links from the homepage
    const articleLinks = await page.evaluate(() => {
      const links = [];
      
      // Try multiple selectors for Yahoo News
      const selectors = [
        'article a[href*="news.yahoo.co.jp/articles/"]',
        '.newsFeed_item a[href*="articles/"]',
        '[data-ual-view-type="list"] a[href*="articles/"]',
        'a[href*="news.yahoo.co.jp/articles/"]'
      ];
      
      const foundUrls = new Set();
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
          if (links.length >= 5) return; // Get max 5 articles
          
          const href = el.href;
          const titleEl = el.querySelector('h1, h2, h3, .newsFeed_item_title') || el;
          const title = titleEl.textContent?.trim() || '';
          
          if (href && title && !foundUrls.has(href) && href.includes('/articles/')) {
            foundUrls.add(href);
            links.push({ url: href, title });
          }
        });
      }
      
      return links.slice(0, 5);
    });
    
    console.log(`✅ [Yahoo News] Found ${articleLinks.length} article links`);
    
    // Fetch each article
    for (let i = 0; i < articleLinks.length; i++) {
      const link = articleLinks[i];
      
      try {
        console.log(`📄 [Yahoo News] Fetching article ${i + 1}: ${link.url}`);
        await page.goto(link.url, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });
        
        // Extract article data
        const articleData = await page.evaluate(() => {
          const data = {
            title: '',
            content: '',
            date: '',
            thumbnail: null,
            source: ''
          };
          
          // Title - Yahoo News uses various selectors
          const titleSelectors = ['h1', '.article-title', '[data-ual-view-type="title"]', '.sc-kmQMED'];
          for (const selector of titleSelectors) {
            const titleEl = document.querySelector(selector);
            if (titleEl) {
              data.title = titleEl.textContent?.trim() || '';
              if (data.title) break;
            }
          }
          
          // Date
          const timeSelectors = ['time', '.article-date', '[data-ual-view-type="date"]'];
          for (const selector of timeSelectors) {
            const timeEl = document.querySelector(selector);
            if (timeEl) {
              data.date = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || '';
              if (data.date) break;
            }
          }
          
          // Media source
          const sourceEl = document.querySelector('.sc-euEtCV, .article-source, [data-ual-view-type="media"]');
          if (sourceEl) {
            data.source = sourceEl.textContent?.trim() || '';
          }
          
          // Thumbnail
          const imgSelectors = ['.sc-fHCHyC img', 'article img', '.article-image img', 'figure img'];
          for (const selector of imgSelectors) {
            const imgEl = document.querySelector(selector);
            if (imgEl && imgEl.src && !imgEl.src.includes('logo')) {
              data.thumbnail = imgEl.src;
              break;
            }
          }
          
          // Content - Yahoo News article body
          const contentSelectors = [
            '.article-body',
            '.sc-bBHxTw',
            '.sc-jcFkyM',
            '[data-ual-view-type="paragraph"]',
            '.yjDirectSLinkTarget'
          ];
          
          const paragraphs = [];
          
          for (const selector of contentSelectors) {
            const elements = document.querySelectorAll(`${selector} p, ${selector}`);
            elements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 20 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
                // Check if it's not already added (avoid duplicates)
                if (!paragraphs.some(p => p.includes(text.substring(0, 50)))) {
                  paragraphs.push(text);
                }
              }
            });
          }
          
          // If no content found with specific selectors, try broader approach
          if (paragraphs.length === 0) {
            const allParagraphs = document.querySelectorAll('p');
            allParagraphs.forEach(p => {
              const text = p.textContent?.trim();
              // Only get Japanese paragraphs that are substantial
              if (text && text.length > 50 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
                // Avoid navigation/footer text
                if (!text.includes('ログイン') && !text.includes('コメント') && !text.includes('シェア')) {
                  paragraphs.push(text);
                }
              }
            });
          }
          
          data.content = paragraphs.join('\n\n');
          
          return data;
        });
        
        // Only add if we have content
        if (articleData.content && articleData.content.length > 100) {
          const article = {
            id: `yahoo_news_${Date.now()}_${i}`,
            title: articleData.title || link.title,
            content: articleData.content,
            summary: articleData.content.substring(0, 150) + '...',
            url: link.url,
            imageUrl: articleData.thumbnail || await getUnsplashImage('japan news'),
            publishDate: articleData.date ? new Date(articleData.date) : new Date(),
            scrapedAt: new Date(),
            source: {
              id: 'yahoo-news',
              name: 'Yahoo News',
              displayName: `Yahoo!ニュース${articleData.source ? ' (' + articleData.source + ')' : ''}`
            },
            category: 'news',
            tags: ['japanese-news', 'yahoo', 'current-events'],
            difficulty: 'N3', // Yahoo News is intermediate level
            estimatedReadingTime: Math.ceil(articleData.content.length / 400),
            vocabulary: [],
            kanji: []
          };
          
          articles.push(article);
          console.log(`✅ [Yahoo News] Created article: ${article.title}`);
        } else {
          console.warn(`⚠️ [Yahoo News] Skipping article with insufficient content: ${link.title}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fetching article ${i + 1}:`, error.message);
      }
    }
    
    return articles;
    
  } catch (error) {
    console.error('❌ [Yahoo News] Error scraping:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 [Yahoo News] Browser closed');
    }
  }
}

// Save to Firebase
async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  // Filter out invalid articles before saving
  const validArticles = filterArticles(articles);
  console.log(`📊 After validation: ${validArticles.length} valid articles (filtered ${articles.length - validArticles.length})`);
  
  if (validArticles.length === 0) {
    console.log('⚠️ No valid articles to save');
    return false;
  }
  
  // Only save valid articles
  const batch = db.batch();
  const articlesRef = db.collection('articles');
  
  for (const article of validArticles) {
    const docRef = articlesRef.doc(article.id);
    batch.set(docRef, {
      ...article,
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
    });
  }
  
  await batch.commit();
  console.log(`✅ Successfully saved ${validArticles.length} articles to Firebase`);
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
    console.log('🚀 [Yahoo News] Starting scraper...');

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

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 55000) // 55 seconds max
    );
    
    const articles = await Promise.race([
      scrapeYahooNews(),
      timeoutPromise
    ]);
    
    if (articles.length > 0) {
      await saveArticlesToFirebase(articles);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully scraped ${articles.length} Yahoo News articles`,
        articlesCount: articles.length,
        source: 'yahoo-news',
        articles: articles.map(a => ({
          title: a.title,
          contentLength: a.content.length,
          url: a.url,
          mediaSource: a.source.displayName
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
        source: 'yahoo-news',
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  }
};