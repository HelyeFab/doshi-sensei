// All requires at the top - CRITICAL for Netlify Functions
const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Initialize Firebase Admin SDK at module level
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

// HTTP request function with retry logic
function makeRequest(url, maxRedirects = 3, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let retryCount = 0;

    const attemptRequest = () => {
      const performRequest = (currentUrl, redirectCount) => {
        if (redirectCount > maxRedirects) {
          reject(new Error('Too many redirects'));
          return;
        }

        const parsedUrl = new URL(currentUrl);

        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DoshiSensei/1.0)',
            'Accept': 'application/json, text/html',
            'Accept-Language': 'ja,en;q=0.9',
          },
          timeout: 10000 // 10 second timeout
        };

        const req = https.request(options, (res) => {
          // Handle redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const newUrl = new URL(res.headers.location, currentUrl);
            performRequest(newUrl.toString(), redirectCount + 1);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }

          let data = '';
          res.setEncoding('utf8');

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            resolve(data);
          });
        });

        req.on('error', (error) => {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retry attempt ${retryCount} after error:`, error.message);
            setTimeout(attemptRequest, 1000 * retryCount); // Exponential backoff
          } else {
            reject(error);
          }
        });

        req.on('timeout', () => {
          req.destroy();
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retry attempt ${retryCount} after timeout`);
            setTimeout(attemptRequest, 1000 * retryCount);
          } else {
            reject(new Error('Request timeout'));
          }
        });

        req.end();
      };

      performRequest(url, 0);
    };

    attemptRequest();
  });
}

// Parse date from various formats
function parseDate(dateStr) {
  if (!dateStr) return new Date();

  try {
    // Try parsing ISO format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // Try parsing Japanese date format (令和6年6月29日)
    const japaneseMatch = dateStr.match(/令和(\d+)年(\d+)月(\d+)日/);
    if (japaneseMatch) {
      const reiwaYear = parseInt(japaneseMatch[1]);
      const year = 2018 + reiwaYear; // Reiwa started in 2019
      const month = parseInt(japaneseMatch[2]) - 1;
      const day = parseInt(japaneseMatch[3]);
      return new Date(year, month, day);
    }

    // Try parsing yyyy年mm月dd日 format
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }

    return new Date();
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date();
  }
}

// Clean and sanitize text
function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/<ruby>.*?<\/ruby>/g, (match) => {
      const base = match.match(/<ruby>(.*?)<rt>/);
      return base ? base[1] : match;
    })
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  try {
    console.log('🚀 Starting NHK Easy News scraper...');
    console.log('📅 Event type:', event.httpMethod || 'scheduled');
    console.log('🔧 Firebase initialized:', firebaseInitialized);

    // Check if Firebase is properly initialized
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

    // Fetch NHK Easy News
    console.log('📰 Fetching articles from NHK Easy News...');
    const newsData = await makeRequest('https://www3.nhk.or.jp/news/easy/news-list.json');

    let articles;
    try {
      // Remove BOM if present
      const cleanData = newsData.replace(/^\uFEFF/, '');
      const parsed = JSON.parse(cleanData);

      // Extract articles from the nested structure
      articles = [];

      // Handle new array format: [{"2025-07-04": [articles]}, ...]
      if (Array.isArray(parsed)) {
        parsed.forEach(dateObject => {
          Object.values(dateObject).forEach(dateData => {
            if (Array.isArray(dateData)) {
              articles.push(...dateData);
            }
          });
        });
      } else {
        // Handle old object format (backward compatibility)
        Object.values(parsed).forEach(dateData => {
          if (Array.isArray(dateData)) {
            articles.push(...dateData);
          }
        });
      }
    } catch (parseError) {
      console.error('Failed to parse NHK news data:', parseError);
      throw new Error('Invalid response format from NHK');
    }

    if (!articles || articles.length === 0) {
      console.log('No articles found');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No articles found',
          articlesProcessed: 0
        })
      };
    }

    console.log(`📊 Found ${articles.length} articles to process`);

    // Process articles
    let successCount = 0;
    let errorCount = 0;
    const processedArticles = [];

    for (const article of articles.slice(0, 5)) { // Limit to 5 articles for now
      try {
        if (!article.news_id) {
          console.warn('Article missing ID, skipping');
          errorCount++;
          continue;
        }

        // Fetch full article content
        const articleUrl = `https://www3.nhk.or.jp/news/easy/${article.news_id}/${article.news_id}.html`;
        console.log(`Fetching article: ${article.news_id}`);

        const articleHtml = await makeRequest(articleUrl);

        // Extract content from HTML
        const contentMatch = articleHtml.match(/<div class="article-body"[^>]*>([\s\S]*?)<\/div>/);
        const content = contentMatch ? cleanText(contentMatch[1]) : '';

        if (!content) {
          console.warn(`No content found for article ${article.news_id}`);
          errorCount++;
          continue;
        }

        // Create article document
        const articleDoc = {
          articleId: article.news_id,
          url: articleUrl,
          imageUrl: article.news_web_image_uri || article.news_prearranged_time || null,
          title: cleanText(article.title || article.news_prearranged_time || ''),
          content: content,
          date: parseDate(article.news_prearranged_time || article.news_publication_time),
          category: 'nhk_easy',
          source: 'NHK Easy News',
          difficulty: 'beginner',
          readTime: Math.ceil(content.length / 300), // Estimate based on reading speed
          tags: ['news', 'nhk', 'easy'],
          metadata: {
            originalId: article.news_id,
            hasVideo: article.has_news_web_movie || false,
            hasVoice: article.has_news_easy_voice || false,
            publicationTime: article.news_publication_time || null,
            prearrangedTime: article.news_prearranged_time || null
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          views: 0,
          bookmarks: 0
        };

        // Save to Firestore with article ID as document ID
        try {
          await db.collection('articles')
            .doc(`nhk_easy_${article.news_id}`)
            .set(articleDoc, { merge: true });
          console.log('Article written:', article.news_id);
          processedArticles.push({
            id: article.news_id,
            title: articleDoc.title
          });
          successCount++;
        } catch (err) {
          console.error('Failed to write article:', article.news_id, err);
          errorCount++;
        }

        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (articleError) {
        console.error(`Error processing article ${article.news_id}:`, articleError.message);
        errorCount++;
      }
    }

    // Update metadata
    await db.collection('articlesMetadata').doc('stats').set({
      lastNHKEasyScrape: admin.firestore.FieldValue.serverTimestamp(),
      nhkEasyArticleCount: admin.firestore.FieldValue.increment(successCount),
      lastScrapeResults: {
        source: 'nhk_easy',
        processed: successCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      }
    }, { merge: true });

    console.log(`✅ Scraping completed: ${successCount} articles saved, ${errorCount} errors`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'NHK Easy News scraping completed',
        articlesProcessed: successCount,
        errors: errorCount,
        articles: processedArticles,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Unexpected error in NHK scraping function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during article scraping',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
