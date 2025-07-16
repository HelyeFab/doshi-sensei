const admin = require('firebase-admin');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Function to get Unsplash image for articles without covers
async function getUnsplashImage(keyword = 'japan news') {
  try {
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashAccessKey) {
      console.log('⚠️ Unsplash API key not configured, skipping image fetch');
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
      console.warn('❌ Unsplash API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Unsplash image fetched:', data.urls.regular);
    return data.urls.regular;
  } catch (error) {
    console.warn('⚠️ Failed to fetch Unsplash image:', error.message);
    return null;
  }
}

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

// Launch Puppeteer with proper configuration for Netlify
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

// Fetch article content using Puppeteer
async function fetchArticleContentWithPuppeteer(articleUrl, browser) {
  const page = await browser.newPage();
  
  try {
    console.log(`📄 [Todaii] Fetching article with Puppeteer: ${articleUrl}`);
    
    // Set a reasonable timeout
    await page.setDefaultTimeout(15000);
    
    // Navigate to the article
    await page.goto(articleUrl, { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Wait for content to load
    await page.waitForSelector('.article-content, .entry-content, article, main', { timeout: 5000 }).catch(() => {});
    
    // Extract article data
    const articleData = await page.evaluate(() => {
      const data = {
        title: '',
        content: '',
        imageUrl: null,
        summary: ''
      };
      
      // Get title
      const titleSelectors = ['h1', '.article-title', '.entry-title', '.post-title', 'article h1', 'main h1'];
      for (const selector of titleSelectors) {
        const titleEl = document.querySelector(selector);
        if (titleEl) {
          data.title = titleEl.textContent.trim();
          if (data.title) break;
        }
      }
      
      // Get content
      const contentSelectors = [
        '.article-content',
        '.entry-content', 
        '.post-content',
        'article .content',
        '.article-body',
        'main'
      ];
      
      for (const selector of contentSelectors) {
        const contentEl = document.querySelector(selector);
        if (contentEl) {
          // Clone the element to manipulate without affecting the page
          const clone = contentEl.cloneNode(true);
          
          // Remove unwanted elements
          clone.querySelectorAll('script, style, nav, aside, footer, .share, .related, .comments, .advertisement, .navigation').forEach(el => el.remove());
          
          // Get paragraphs with Japanese content
          const paragraphs = clone.querySelectorAll('p');
          const japaneseContent = [];
          
          paragraphs.forEach(p => {
            const text = p.textContent.trim();
            // Check if text contains Japanese characters
            if (text && text.length > 10 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
              japaneseContent.push(text);
            }
          });
          
          if (japaneseContent.length > 0) {
            data.content = japaneseContent.join('\n\n');
            break;
          }
        }
      }
      
      // If still no content, try getting all Japanese text
      if (!data.content) {
        const allParagraphs = document.querySelectorAll('p');
        const japaneseText = [];
        
        allParagraphs.forEach(p => {
          const text = p.textContent.trim();
          if (text && text.length > 50 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && !text.includes('©') && !text.includes('Copyright')) {
            japaneseText.push(text);
          }
        });
        
        data.content = japaneseText.join('\n\n');
      }
      
      // Get image
      const imageSelectors = ['article img', '.article-image img', '.featured-image img', 'main img', 'img.wp-post-image'];
      for (const selector of imageSelectors) {
        const imgEl = document.querySelector(selector);
        if (imgEl) {
          const src = imgEl.src || imgEl.dataset.src;
          if (src && !src.includes('logo') && !src.includes('icon')) {
            data.imageUrl = src.startsWith('http') ? src : `https://japanese.todaiinews.com${src}`;
            break;
          }
        }
      }
      
      // Generate summary
      if (data.content) {
        const sentences = data.content.split('。').filter(s => s.trim());
        data.summary = sentences.slice(0, 2).join('。') + (sentences.length > 0 ? '。' : '');
      }
      
      return data;
    });
    
    return articleData;
  } catch (error) {
    console.error(`❌ Error fetching article with Puppeteer: ${error.message}`);
    return null;
  } finally {
    await page.close();
  }
}

// Enhanced Todaii scraping with Puppeteer
async function scrapeTodaiiWithPuppeteer() {
  const articles = [];
  let browser;
  
  try {
    console.log('🚀 [Todaii] Launching Puppeteer browser...');
    browser = await launchBrowser();
    
    const page = await browser.newPage();
    console.log('📖 [Todaii] Navigating to Todaii homepage...');
    
    await page.goto('https://japanese.todaiinews.com', {
      waitUntil: 'networkidle2',
      timeout: 20000
    });
    
    // Wait for articles to load
    await page.waitForSelector('a[href*="/detail/"]', { timeout: 10000 }).catch(() => {});
    
    // Extract article links
    const articleLinks = await page.evaluate(() => {
      const links = [];
      
      // Find article links - Todaii uses /detail/ in article URLs
      const linkElements = document.querySelectorAll('a[href*="/detail/"]');
      
      linkElements.forEach(el => {
        const href = el.href;
        const title = el.textContent.trim() || el.querySelector('img')?.alt || '';
        
        if (href && title && !href.includes('#') && !title.includes('もっと見る')) {
          links.push({
            url: href,
            title: title
          });
        }
      });
      
      // Remove duplicates
      const uniqueLinks = [];
      const seenUrls = new Set();
      
      links.forEach(link => {
        if (!seenUrls.has(link.url)) {
          seenUrls.add(link.url);
          uniqueLinks.push(link);
        }
      });
      
      return uniqueLinks.slice(0, 5); // Get first 5 articles
    });
    
    console.log(`✅ [Todaii] Found ${articleLinks.length} article links`);
    await page.close();
    
    // Fetch individual articles
    for (let i = 0; i < articleLinks.length; i++) {
      const link = articleLinks[i];
      const articleData = await fetchArticleContentWithPuppeteer(link.url, browser);
      
      if (articleData && articleData.content && articleData.content.length > 100) {
        const article = {
          id: `todaii_puppeteer_${Date.now()}_${i}`,
          title: articleData.title || link.title,
          content: articleData.content,
          summary: articleData.summary || articleData.content.substring(0, 150) + '...',
          url: link.url,
          imageUrl: articleData.imageUrl || await getUnsplashImage('japan news'),
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'todaii',
            name: 'Todaii',
            displayName: 'Todaii - Japanese News'
          },
          category: 'news',
          tags: ['japanese-learning', 'todaii', 'intermediate'],
          difficulty: 'N3',
          estimatedReadingTime: Math.ceil((articleData.content.length || 300) / 400),
          vocabulary: [],
          kanji: []
        };
        
        articles.push(article);
        console.log(`✅ [Todaii] Created article ${i + 1}: ${article.title}`);
      } else {
        console.warn(`⚠️ [Todaii] Skipping article with insufficient content: ${link.title}`);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ [Todaii] Error scraping with Puppeteer:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 [Todaii] Browser closed');
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

// HTTP endpoint handler
exports.handler = async (event, context) => {
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
    console.log('🚀 [Todaii Puppeteer] HTTP endpoint triggered');

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

    // Add timeout protection for the whole scraping process
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 55000) // 55 seconds max (Netlify limit is 60s)
    );
    
    const articles = await Promise.race([
      scrapeTodaiiWithPuppeteer(),
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
        message: `Successfully scraped ${articles.length} Todaii articles with Puppeteer`,
        articlesCount: articles.length,
        source: 'todaii-puppeteer',
        scrapedAt: new Date().toISOString(),
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('❌ [Todaii Puppeteer] Handler error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        source: 'todaii-puppeteer',
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  }
};