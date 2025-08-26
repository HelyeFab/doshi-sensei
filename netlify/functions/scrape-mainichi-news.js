const admin = require('firebase-admin');
const cheerio = require('cheerio');
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

// Initialize Firebase function
async function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length) {
    db = admin.firestore();
    firebaseInitialized = true;
    return true;
  }
  
  try {
    // Try to fetch from GitHub Gist first (for production)
    const gistUrl = 'https://gist.githubusercontent.com/HelyeFab/4a363e7fabaa387b67fa80b5c8cb87d4/raw/firebase-config.json';
    
    console.log('🔄 Fetching Firebase credentials from secure source...');
    const response = await fetch(gistUrl);
    
    if (response.ok) {
      const serviceAccount = await response.json();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from secure source');
      return true;
    } else {
      throw new Error('Failed to fetch from Gist');
    }
  } catch (error) {
    // Fallback to local file for development
    try {
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
        console.log('✅ Firebase Admin SDK initialized from local file');
        return true;
      }
    } catch (fileError) {
      console.error('❌ Failed to read local file:', fileError.message);
    }
    
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
    return false;
  }
}

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
  db = admin.firestore();
}

// Enhanced scraping function for Mainichi news
async function scrapeMainichi() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Mainichi homepage...');
    const response = await fetch('https://mainichi.jp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters`);

    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Find article links - Mainichi uses various selectors
    const articleLinks = [];
    
    // Common article selectors for Mainichi
    const selectors = [
      'article a[href*="/articles/"]',
      '.articlelist a[href*="/articles/"]',
      '.top-news a[href*="/articles/"]',
      '.news-list a[href*="/articles/"]',
      'h2 a[href*="/articles/"]',
      'h3 a[href*="/articles/"]',
      'a.c-article-card__link',
      'a.p-article-card__link'
    ];
    
    const seenUrls = new Set();
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        if (articleLinks.length >= 10) return false; // Stop after 10 articles
        
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        
        // Skip if it's a paid article (有料記事)
        if (text.includes('有料記事') || href?.includes('premier')) {
          console.log(`⏭️ Skipping paid article: ${text}`);
          return;
        }
        
        if (href && !seenUrls.has(href)) {
          // Fix URL construction
          let fullUrl = href;
          
          // Check if href already contains the domain
          if (href.includes('mainichi.jp')) {
            // If it already has the domain, use as is
            fullUrl = href.startsWith('http') ? href : `https:${href}`;
          } else if (!href.startsWith('http')) {
            // If it's a relative path, add the domain
            fullUrl = href.startsWith('/') ? `https://mainichi.jp${href}` : `https://mainichi.jp/${href}`;
          }
          
          // Clean up any double slashes (except after https:)
          fullUrl = fullUrl.replace(/([^:]\/)\/+/g, '$1');
          
          // Only process mainichi.jp articles
          if (fullUrl.includes('mainichi.jp/articles/')) {
            seenUrls.add(fullUrl);
            articleLinks.push({
              url: fullUrl,
              title: text || 'No title'
            });
          }
        }
      });
    });

    console.log(`📰 Found ${articleLinks.length} article links`);

    // Now fetch actual content for each article (limit to 5)
    for (let i = 0; i < Math.min(articleLinks.length, 5); i++) {
      const article = articleLinks[i];
      
      try {
        console.log(`📄 Fetching article ${i + 1}: ${article.title}`);
        
        const articleResponse = await fetch(article.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ja,en;q=0.9',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!articleResponse.ok) {
          console.warn(`Failed to fetch article ${i + 1}: HTTP ${articleResponse.status}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Extract content and metadata
        let title = '';
        let content = '';
        let imageUrl = '';
        let publishDate = '';
        
        // Extract title - try multiple selectors
        const titleSelectors = [
          'h1.p-article__title',
          'h1.article-title',
          'h1',
          'meta[property="og:title"]'
        ];
        
        for (const selector of titleSelectors) {
          if (selector.includes('meta')) {
            title = $article(selector).attr('content') || '';
          } else {
            title = $article(selector).first().text().trim();
          }
          if (title) break;
        }
        
        // Extract publish date
        const dateSelectors = [
          'time[datetime]',
          'meta[property="article:published_time"]',
          '.article-date',
          '.publish-date',
          '.date',
          '[class*="date"]'
        ];
        
        for (const selector of dateSelectors) {
          if (selector.includes('meta')) {
            publishDate = $article(selector).attr('content') || '';
          } else if (selector.includes('time')) {
            publishDate = $article(selector).attr('datetime') || $article(selector).text().trim();
          } else {
            const dateText = $article(selector).first().text().trim();
            // Look for Japanese date pattern (e.g., "7/21 11:00")
            if (dateText && /\d/.test(dateText)) {
              publishDate = dateText;
            }
          }
          if (publishDate) break;
        }
        
        // Extract main image
        const imageSelectors = [
          'meta[property="og:image"]',
          '.article-image img',
          '.p-article__image img',
          'figure img',
          'article img'
        ];
        
        for (const selector of imageSelectors) {
          if (selector.includes('meta')) {
            imageUrl = $article(selector).attr('content') || '';
          } else {
            imageUrl = $article(selector).first().attr('src') || '';
          }
          if (imageUrl && !imageUrl.includes('logo')) break;
        }
        
        // Make image URL absolute if needed
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://mainichi.jp${imageUrl}`;
        }
        
        // Extract article content
        const contentSelectors = [
          '.articledetail-body',
          'section.articledetail-body',
          '.p-article__body',
          '.article-body',
          '.article-content',
          'div[itemprop="articleBody"]',
          '.entry-content',
          '.l-contents'
        ];
        
        for (const selector of contentSelectors) {
          const contentElem = $article(selector);
          if (contentElem.length > 0) {
            // Check if it's a paywall article
            if (contentElem.hasClass('is-mustpay') || contentElem.find('.is-mustpay').length > 0) {
              console.log(`⏭️ Paywall detected for selector ${selector}`);
              continue;
            }
            
            // Remove unwanted elements
            contentElem.find('script, style, aside, .ad, .advertisement, nav, header').remove();
            
            // Extract paragraphs
            contentElem.find('p').each((idx, elem) => {
              const text = $article(elem).text().trim();
              if (text && text.length > 20 && !text.includes('有料記事') && !text.includes('会員限定')) {
                content += text + '\\n\\n';
              }
            });
            
            if (content.length > 100) break;
          }
        }
        
        // Skip if content indicates it's a paid article
        if (content.includes('有料記事') || content.includes('有料会員')) {
          console.log(`⏭️ Skipping paid content: ${title}`);
          continue;
        }
        
        // If no content found, try getting all paragraphs
        if (!content) {
          $article('p').each((idx, elem) => {
            const text = $article(elem).text().trim();
            if (text && text.length > 20 && !text.includes('有料記事')) {
              content += text + '\\n\\n';
            }
          });
        }
        
        // Clean up content
        content = content.replace(/\\s+/g, ' ').replace(/\\n\\s*\\n/g, '\\n\\n').trim();
        
        // Create summary (first 200 characters)
        const summary = content.substring(0, 200) + (content.length > 200 ? '...' : '');
        
        // Calculate reading time (assuming 500 characters per minute for Japanese)
        const readingTime = Math.ceil(content.length / 500);
        
        // Skip if we don't have enough content
        if (!content || content.length < 100) {
          console.log(`⏭️ Skipping article with insufficient content: ${title}`);
          continue;
        }
        
        // If no image, get a relevant Unsplash image
        if (!imageUrl) {
          imageUrl = await getUnsplashImage('japan news ' + title.substring(0, 30));
        }
        
        // Parse publish date safely
        let parsedDate = new Date();
        if (publishDate) {
          try {
            // Try to parse the date
            const testDate = new Date(publishDate);
            if (!isNaN(testDate.getTime())) {
              parsedDate = testDate;
            } else {
              // Try parsing Japanese format like "8/15 18:26"
              const match = publishDate.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
              if (match) {
                const year = new Date().getFullYear();
                parsedDate = new Date(year, parseInt(match[1]) - 1, parseInt(match[2]), parseInt(match[3]), parseInt(match[4]));
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not parse date:', publishDate);
          }
        }
        
        const articleData = {
          title: title || article.title,
          content: content,
          summary: summary,
          url: article.url,
          imageUrl: imageUrl || '',
          publishDate: parsedDate,
          scrapedAt: admin.firestore.Timestamp.now(),
          source: {
            name: 'Mainichi Shimbun',
            url: 'https://mainichi.jp',
            language: 'ja'
          },
          category: 'news',
          difficulty: 'N3', // Mainichi is generally intermediate level
          readingTime: readingTime,
          tags: ['news', 'current affairs', 'japan'],
          scraped: true
        };
        
        articles.push(articleData);
        console.log(`✅ Scraped article ${i + 1}: ${title} (${content.length} chars)`);
        
      } catch (error) {
        console.error(`❌ Error scraping article ${i + 1}:`, error.message);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`📦 Successfully scraped ${articles.length} articles from Mainichi`);
    
  } catch (error) {
    console.error('❌ Mainichi scraping error:', error);
    throw error;
  }
  
  return articles;
}

// Main handler function
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
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  console.log('🚀 [Mainichi] Function triggered');
  // Initialize Firebase if needed
  await initializeFirebase();


  try {
    // Check Firebase
    if (!firebaseInitialized || !db) {
      throw new Error('Firebase not initialized');
    }

    // Scrape articles
    const articles = await scrapeMainichi();

    if (articles.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No new articles found',
          articlesCount: 0,
          source: 'Mainichi Shimbun'
        })
      };
    }

    // Filter out invalid articles before saving
    const validArticles = filterArticles(articles);
    console.log(`📊 After validation: ${validArticles.length} valid articles (filtered ${articles.length - validArticles.length})`);
    
    if (validArticles.length === 0) {
      console.log('⚠️ No valid articles to save');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No valid Japanese articles found',
          articlesCount: 0,
          totalScraped: articles.length,
          filtered: articles.length,
          source: 'Mainichi Shimbun'
        })
      };
    }
    
    // Save to Firestore
    const batch = db.batch();
    let savedCount = 0;

    for (const article of validArticles) {
      try {
        // Check if article already exists
        const existingDocs = await db.collection('articles')
          .where('url', '==', article.url)
          .limit(1)
          .get();

        if (existingDocs.empty) {
          const docRef = db.collection('articles').doc();
          batch.set(docRef, {
            ...article,
            id: docRef.id,
            createdAt: admin.firestore.Timestamp.now()
          });
          savedCount++;
        } else {
          console.log(`⏭️ Article already exists: ${article.title}`);
        }
      } catch (error) {
        console.error('❌ Error checking/saving article:', error);
      }
    }

    if (savedCount > 0) {
      await batch.commit();
      console.log(`✅ Saved ${savedCount} new articles to Firestore`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully scraped ${articles.length} articles from Mainichi`,
        articlesCount: articles.length,
        savedCount: savedCount,
        source: 'Mainichi Shimbun',
        articles: articles.map(a => ({
          title: a.title,
          url: a.url,
          contentLength: a.content.length
        }))
      })
    };

  } catch (error) {
    console.error('❌ [Mainichi] Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        source: 'Mainichi Shimbun'
      })
    };
  }
};