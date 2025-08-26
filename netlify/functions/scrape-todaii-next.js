const admin = require('firebase-admin');
const cheerio = require('cheerio');
const { saveArticlesWithDeduplication } = require('./article-deduplication');
const { filterArticles, quickValidate } = require('./article-quick-validation');

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
    // Try to load from JSON file first (deployed but not in Git)
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'firebase-config.json');
    
    if (fs.existsSync(configPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from firebase-config.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from base64');
    } else {
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
      console.log('✅ Firebase Admin SDK initialized from env vars');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Function to fetch individual article content from Todaii
async function fetchTodaiiArticle(articleUrl) {
  try {
    console.log(`📄 [Todaii] Fetching article: ${articleUrl}`);
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch article: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract article content
    const article = {
      title: '',
      content: '',
      summary: '',
      imageUrl: null
    };
    
    // Try to find title
    const titleSelectors = ['h1', '.article-title', '.entry-title', '.post-title', 'article h1', 'main h1'];
    for (const selector of titleSelectors) {
      const titleEl = $(selector).first();
      if (titleEl.length) {
        article.title = titleEl.text().trim();
        if (article.title) break;
      }
    }
    
    // Try to find content
    const contentSelectors = [
      '.article-content',
      '.entry-content', 
      '.post-content',
      'article .content',
      'article p',
      '.article-body',
      'main p'
    ];
    
    for (const selector of contentSelectors) {
      const contentEls = $(selector);
      if (contentEls.length > 0) {
        contentEls.each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20 && !text.includes('cookie') && !text.includes('privacy')) {
            article.content += text + '\n\n';
          }
        });
        if (article.content) break;
      }
    }
    
    // If still no content, try getting all paragraph text
    if (!article.content) {
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 50 && !text.includes('©') && !text.includes('Copyright')) {
          article.content += text + '\n\n';
        }
      });
    }
    
    // Try to find image
    const imageSelectors = ['article img', '.article-image img', '.featured-image img', 'main img', 'img.wp-post-image'];
    for (const selector of imageSelectors) {
      const imgEl = $(selector).first();
      if (imgEl.length) {
        const src = imgEl.attr('src') || imgEl.attr('data-src');
        if (src && !src.includes('logo') && !src.includes('icon')) {
          article.imageUrl = src.startsWith('http') ? src : `https://japanese.todaiinews.com${src}`;
          break;
        }
      }
    }
    
    // Generate summary
    if (article.content) {
      const sentences = article.content.split('。').filter(s => s.trim());
      article.summary = sentences.slice(0, 2).join('。') + (sentences.length > 0 ? '。' : '');
    }
    
    return article;
  } catch (error) {
    console.error(`❌ Error fetching Todaii article: ${error.message}`);
    return null;
  }
}

// Improved Todaii scraping with proper article fetching
async function scrapeTodaii() {
  const articles = [];
  
  try {
    console.log('📖 [Todaii] Fetching Todaii homepage...');
    const response = await fetch('https://japanese.todaiinews.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ [Todaii] Fetched ${html.length} characters`);
    
    // Use Cheerio to parse HTML properly
    const $ = cheerio.load(html);
    const articleLinks = [];
    
    // Find article links - Todaii uses /detail/ in article URLs
    $('a[href*="/detail/"]').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim() || $(el).find('img').attr('alt') || '';
      
      if (href && title && !href.includes('#') && !title.includes('もっと見る')) {
        const fullUrl = href.startsWith('http') ? href : `https://japanese.todaiinews.com${href}`;
        articleLinks.push({ url: fullUrl, title });
      }
    });
    
    console.log(`[Todaii] Found ${articleLinks.length} article links`);
    
    // Remove duplicates
    const uniqueLinks = articleLinks.filter((link, index, self) => 
      index === self.findIndex(l => l.url === link.url)
    );
    
    // Fetch first 5 articles
    for (let i = 0; i < Math.min(5, uniqueLinks.length); i++) {
      const link = uniqueLinks[i];
      const articleData = await fetchTodaiiArticle(link.url);
      
      if (articleData && articleData.content && articleData.content.length > 100) {
        const article = {
          // ID will be generated by deduplication function based on URL
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
    console.error('❌ [Todaii] Error scraping:', error);
    return [];
  }
}

// Save to Firebase with deduplication
async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  return await saveArticlesWithDeduplication(db, articles, admin);
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
    console.log('🚀 [Todaii] HTTP endpoint triggered');

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
      setTimeout(() => reject(new Error('Scraping timeout')), 25000) // 25 seconds max
    );
    
    const articles = await Promise.race([
      scrapeTodaii(),
      timeoutPromise
    ]);
    console.log(`📊 Scraped ${articles.length} articles`);

    // Filter out invalid articles (English, errors, etc.)
    const validArticles = filterArticles(articles);
    console.log(`📊 After validation: ${validArticles.length} valid articles (filtered ${articles.length - validArticles.length})`);

    // Save articles to Firebase
    let savedCount = 0;
    if (validArticles.length > 0) {
      savedCount = await saveArticlesWithDeduplication(db, validArticles, admin);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Scraped ${articles.length} articles, saved ${savedCount} new ones`,
        articlesCount: savedCount,
        articlesScraped: articles.length,
        source: 'todaii',
        scrapedAt: new Date().toISOString(),
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('❌ [Todaii] Handler error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        source: 'todaii',
        executionTime: elapsed,
        timestamp: new Date().toISOString()
      }),
    };
  }
};