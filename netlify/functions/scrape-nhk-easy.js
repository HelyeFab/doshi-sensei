const admin = require('firebase-admin');
const cheerio = require('cheerio');
const { saveArticlesWithDeduplication } = require('./article-deduplication');

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
    console.log('✅ Firebase Admin SDK initialized at module level (NHK Easy)');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK at module level:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Function to fetch individual article content
async function fetchArticleContent(articleUrl) {
  try {
    console.log(`📄 [NHK Easy] Fetching article: ${articleUrl}`);
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch article: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract article content from NHK Easy structure
    let content = '';
    
    // Try multiple selectors for article content
    const contentSelectors = [
      '.article-body',
      '.news-article-body',
      '.content-body',
      '#js-article-body',
      '.article-main-text',
      'article p',
      '.news-textbody',
      'div[class*="article"] p',
      'div[class*="body"] p'
    ];
    
    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            content += text + '\n\n';
          }
        });
        if (content) break;
      }
    }
    
    // If no content found, try getting all text from main content area
    if (!content) {
      const mainContent = $('main').text().trim() || $('article').text().trim() || $('.content').text().trim();
      if (mainContent && mainContent.length > 100) {
        // Clean up the text - remove navigation, headers, etc
        content = mainContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 20)
          .join('\n\n');
      }
    }
    
    return content;
  } catch (error) {
    console.error(`❌ Error fetching article content: ${error.message}`);
    return null;
  }
}

// Enhanced NHK Easy scraping with proper article fetching
async function scrapeNHKEasy() {
  const articles = [];
  
  try {
    // NHK Easy uses a JSON API for their article list
    console.log('📖 [NHK Easy] Fetching NHK Easy news list...');
    
    // Try the API endpoint first
    const apiUrl = 'https://www3.nhk.or.jp/news/easy/news-list.json';
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www3.nhk.or.jp/news/easy/'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ [NHK Easy] Successfully fetched JSON data');
      
      // Process the JSON data
      let articleCount = 0;
      for (const dateKey of Object.keys(data)) {
        if (articleCount >= 5) break;
        
        const dateArticles = data[dateKey];
        for (const article of dateArticles) {
          if (articleCount >= 5) break;
          
          const articleUrl = `https://www3.nhk.or.jp/news/easy/${article.news_id}/${article.news_id}.html`;
          const articleContent = await fetchArticleContent(articleUrl);
          
          articles.push({
            url: articleUrl,
            title: article.title || article.news_prearranged_time,
            content: articleContent || article.title_with_ruby || '',
            date: article.news_prearranged_time,
            imageUrl: article.news_web_image_uri ? `https://www3.nhk.or.jp/news/easy/${article.news_id}/${article.news_web_image_uri}` : null,
            hasVideo: article.has_news_web_movie || false
          });
          
          articleCount++;
        }
      }
    } else {
      // Fallback to HTML scraping
      console.log('⚠️ [NHK Easy] API failed, falling back to HTML scraping');
      const htmlResponse = await fetch('https://www3.nhk.or.jp/news/easy/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!htmlResponse.ok) {
        throw new Error(`HTTP ${htmlResponse.status}`);
      }
      
      const html = await htmlResponse.text();
      console.log(`✅ [NHK Easy] Fetched HTML: ${html.length} characters`);

      // Use Cheerio for proper HTML parsing
      const $ = cheerio.load(html);
      
      // Look for article links
      const articleLinks = [];
      $('a[href*="/news/easy/"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && title && href.includes('k10') && !href.includes('#')) {
          const fullUrl = href.startsWith('http') ? href : `https://www3.nhk.or.jp${href}`;
          articleLinks.push({ url: fullUrl, title });
        }
      });
      
      console.log(`[NHK Easy] Found ${articleLinks.length} article links`);
      
      // Fetch first 5 articles
      for (let i = 0; i < Math.min(5, articleLinks.length); i++) {
        const link = articleLinks[i];
        const content = await fetchArticleContent(link.url);
        
        if (content) {
          articles.push({
            url: link.url,
            title: link.title,
            content: content,
            date: new Date().toISOString(),
            imageUrl: null
          });
        }
      }
    }
    
    // Convert to final article format
    const finalArticles = [];
    for (let i = 0; i < articles.length; i++) {
      const data = articles[i];
      
      // Only create article if we have actual content
      if (!data.content || data.content.length < 50) {
        console.warn(`⚠️ [NHK Easy] Skipping article with insufficient content: ${data.title}`);
        continue;
      }
      
      // Extract summary from content
      const contentLines = data.content.split('\n').filter(line => line.trim());
      const summary = contentLines[0].substring(0, 150) + '...';
      
      const article = {
        // ID will be generated by deduplication function based on URL
        title: data.title,
        content: data.content,
        summary: summary,
        url: data.url,
        imageUrl: data.imageUrl || await getUnsplashImage('japan news'),
        publishDate: new Date(data.date || Date.now()),
        scrapedAt: new Date(),
        source: {
          id: 'nhk-easy',
          name: 'NHK Easy',
          displayName: 'NHK NEWS WEB EASY'
        },
        category: 'news',
        tags: ['japanese-learning', 'nhk-easy', 'beginner', 'n5'],
        difficulty: 'N5',
        estimatedReadingTime: Math.ceil((data.content.length || 300) / 400),
        vocabulary: [],
        kanji: []
      };
      
      finalArticles.push(article);
      console.log(`✅ [NHK Easy] Created article ${i + 1}: ${data.title}`);
    }
    
    return finalArticles;
  } catch (error) {
    console.error('❌ [NHK Easy] Error scraping:', error);
    return [];
  }
}

// Save to Firebase with deduplication
async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  const savedCount = await saveArticlesWithDeduplication(db, articles, admin);
  return savedCount > 0;
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
    console.log('🚀 [NHK Easy] HTTP endpoint triggered');

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
      scrapeNHKEasy(),
      timeoutPromise
    ]);
    console.log(`📊 [NHK Easy] Scraped ${articles.length} articles`);

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
        message: `Successfully saved ${articles.length} NHK Easy articles`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ 
          id: a.id, 
          title: a.title, 
          difficulty: a.difficulty,
          contentLength: a.content?.length || 0,
          source: 'NHK Easy'
        })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'fixed'
      }),
    };

  } catch (error) {
    console.error('💥 [NHK Easy] Function error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'fixed'
      }),
    };
  }
};