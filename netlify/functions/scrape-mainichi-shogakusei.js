const admin = require('firebase-admin');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Function to get Unsplash image
async function getUnsplashImage(keyword = 'japan elementary school') {
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

// Scrape Mainichi Shogakusei Shimbun (Elementary School Newspaper)
async function scrapeMainichiShogakusei() {
  const articles = [];
  let browser;
  
  try {
    console.log('🚀 [Mainichi Shogakusei] Launching browser...');
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    // Set Japanese user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Mainichi Shogakusei Shimbun
    console.log('📖 [Mainichi Shogakusei] Navigating to Mainichi Elementary News...');
    await page.goto('https://mainichi.jp/maisho/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for news items to load
    await page.waitForSelector('article, .article-list, .news-list, a[href*="/articles/"]', { timeout: 10000 });
    
    // Get article links from the homepage
    const articleLinks = await page.evaluate(() => {
      const links = [];
      
      // Try multiple selectors for Mainichi
      const selectors = [
        'article a[href*="/articles/"]',
        '.article-list a[href*="/articles/"]',
        '.news-list a[href*="/articles/"]',
        'a[href*="/maisho/articles/"]',
        'h2 a[href*="/articles/"]',
        'h3 a[href*="/articles/"]'
      ];
      
      const foundUrls = new Set();
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
          if (links.length >= 5) return; // Get max 5 articles
          
          const href = el.href;
          const titleEl = el.querySelector('h1, h2, h3') || el;
          const title = titleEl.textContent?.trim() || '';
          
          if (href && title && !foundUrls.has(href) && href.includes('/articles/')) {
            foundUrls.add(href);
            links.push({ url: href, title });
          }
        });
      }
      
      // If no articles found, try broader approach
      if (links.length === 0) {
        const allLinks = document.querySelectorAll('a[href*="/maisho/"]');
        allLinks.forEach((el) => {
          if (links.length >= 5) return;
          
          const href = el.href;
          const text = el.textContent?.trim() || '';
          
          // Check if it looks like an article (has Japanese text and reasonable length)
          if (href && text && text.length > 10 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && !foundUrls.has(href)) {
            foundUrls.add(href);
            links.push({ url: href, title: text });
          }
        });
      }
      
      return links.slice(0, 5);
    });
    
    console.log(`✅ [Mainichi Shogakusei] Found ${articleLinks.length} article links`);
    
    // Fetch each article
    for (let i = 0; i < articleLinks.length; i++) {
      const link = articleLinks[i];
      
      try {
        console.log(`📄 [Mainichi Shogakusei] Fetching article ${i + 1}: ${link.url}`);
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
            hasFurigana: false
          };
          
          // Title - Mainichi uses various selectors
          const titleSelectors = ['h1', '.article-title', '.news-title', '.entry-title'];
          for (const selector of titleSelectors) {
            const titleEl = document.querySelector(selector);
            if (titleEl) {
              data.title = titleEl.textContent?.trim() || '';
              if (data.title) break;
            }
          }
          
          // Date
          const timeSelectors = ['time', '.article-date', '.news-date', '.published-date'];
          for (const selector of timeSelectors) {
            const timeEl = document.querySelector(selector);
            if (timeEl) {
              data.date = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || '';
              if (data.date) break;
            }
          }
          
          // Thumbnail
          const imgSelectors = ['.article-image img', 'article img', 'figure img', '.news-image img'];
          for (const selector of imgSelectors) {
            const imgEl = document.querySelector(selector);
            if (imgEl && imgEl.src && !imgEl.src.includes('logo') && !imgEl.src.includes('icon')) {
              data.thumbnail = imgEl.src;
              break;
            }
          }
          
          // Check for furigana (ruby tags) - important for elementary content
          const rubyElements = document.querySelectorAll('ruby');
          data.hasFurigana = rubyElements.length > 0;
          
          // Content - Elementary newspaper might have simpler structure
          const contentSelectors = [
            '.article-body',
            '.article-content',
            '.news-body',
            '.entry-content',
            'main article',
            '.main-content'
          ];
          
          const paragraphs = [];
          
          for (const selector of contentSelectors) {
            const contentEl = document.querySelector(selector);
            if (contentEl) {
              // For elementary content, preserve ruby tags for furigana
              const elements = contentEl.querySelectorAll('p, h2, h3');
              elements.forEach(el => {
                let text;
                
                // If element has ruby tags, get the HTML to preserve furigana
                if (el.querySelector('ruby')) {
                  // Clone the element to manipulate it
                  const clone = el.cloneNode(true);
                  // Remove script tags and other unwanted elements
                  clone.querySelectorAll('script, style, noscript').forEach(e => e.remove());
                  // Get text content with ruby structure preserved
                  text = clone.textContent?.trim();
                } else {
                  text = el.textContent?.trim();
                }
                
                if (text && text.length > 10 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
                  paragraphs.push(text);
                }
              });
              
              if (paragraphs.length > 0) break;
            }
          }
          
          // If no content found with specific selectors, try broader approach
          if (paragraphs.length === 0) {
            const allParagraphs = document.querySelectorAll('p');
            allParagraphs.forEach(p => {
              const text = p.textContent?.trim();
              // Only get Japanese paragraphs that are substantial
              if (text && text.length > 20 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
                // Avoid navigation/footer text
                if (!text.includes('ログイン') && !text.includes('コメント') && 
                    !text.includes('シェア') && !text.includes('Copyright')) {
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
            id: `mainichi_shogakusei_${Date.now()}_${i}`,
            title: articleData.title || link.title,
            content: articleData.content,
            summary: articleData.content.substring(0, 150) + '...',
            url: link.url,
            imageUrl: articleData.thumbnail || await getUnsplashImage('japan elementary school'),
            publishDate: articleData.date ? new Date(articleData.date) : new Date(),
            scrapedAt: new Date(),
            source: {
              id: 'mainichi-shogakusei',
              name: 'Mainichi Shogakusei',
              displayName: '毎日小学生新聞'
            },
            category: 'elementary-news',
            tags: ['japanese-news', 'elementary', 'beginner-friendly', 'furigana'],
            difficulty: articleData.hasFurigana ? 'N5' : 'N4', // N5 if has furigana, N4 otherwise
            estimatedReadingTime: Math.ceil(articleData.content.length / 300), // Slower reading for beginners
            vocabulary: [],
            kanji: [],
            hasFurigana: articleData.hasFurigana
          };
          
          articles.push(article);
          console.log(`✅ [Mainichi Shogakusei] Created article: ${article.title} (Furigana: ${article.hasFurigana})`);
        } else {
          console.warn(`⚠️ [Mainichi Shogakusei] Skipping article with insufficient content: ${link.title}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fetching article ${i + 1}:`, error.message);
      }
    }
    
    return articles;
    
  } catch (error) {
    console.error('❌ [Mainichi Shogakusei] Error scraping:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 [Mainichi Shogakusei] Browser closed');
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
    console.log('🚀 [Mainichi Shogakusei] Starting scraper...');

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
      scrapeMainichiShogakusei(),
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
        message: `Successfully scraped ${articles.length} Mainichi Shogakusei articles`,
        articlesCount: articles.length,
        source: 'mainichi-shogakusei',
        articles: articles.map(a => ({
          title: a.title,
          contentLength: a.content.length,
          url: a.url,
          difficulty: a.difficulty,
          hasFurigana: a.hasFurigana
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
        source: 'mainichi-shogakusei',
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  }
};