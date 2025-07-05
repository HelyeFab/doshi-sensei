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

// HTTP request function
function makeRequest(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      };

      console.log(`🌐 Requesting: ${currentUrl}`);

      const req = https.request(options, (res) => {
        console.log(`📊 Status: ${res.statusCode}`);

        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, currentUrl).href;
          console.log(`🔄 Redirecting to: ${redirectUrl}`);
          performRequest(redirectUrl, redirectCount + 1);
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
          console.log(`✅ Response: ${data.length} characters`);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: currentUrl
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    };

    performRequest(url, 0);
  });
}

// Text cleaning utilities
function cleanText(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

function cleanTextAdvanced(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    // Preserve furigana structure
    .replace(/<ruby[^>]*>([^<]*)<rt[^>]*>([^<]*)<\/rt><\/ruby>/gi, '$1($2)')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

// Extract vocabulary and kanji
function extractVocabulary(text) {
  const japaneseWords = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [];
  return [...new Set(japaneseWords)]
    .filter(word => word.length > 1 && word.length < 8)
    .slice(0, 15);
}

function extractKanji(text) {
  const kanjiChars = text.match(/[\u4e00-\u9faf]/g) || [];
  return [...new Set(kanjiChars)].slice(0, 10);
}

// Estimate reading time
function estimateReadingTime(text) {
  return Math.max(1, Math.ceil(text.length / 400));
}

// Function to estimate JLPT level
function estimateJLPTLevel(text) {
  const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
  const totalChars = text.length;
  const kanjiRatio = kanjiCount / totalChars;

  if (kanjiRatio < 0.1) return 'N5';
  else if (kanjiRatio < 0.2) return 'N4';
  else if (kanjiRatio < 0.3) return 'N3';
  else if (kanjiRatio < 0.4) return 'N2';
  else return 'N1';
}

// Function to generate diverse image URLs
function generateTodaiiImageUrl(index) {
  const todaiiImages = [
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', // japanese temple
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400', // train
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', // japanese garden
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400', // bullet train
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400', // traditional building
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', // mountain landscape
  ];

  return todaiiImages[index % todaiiImages.length];
}

// Extract JLPT level from HTML
function extractJLPTLevelFromHTML(html) {
  const match = html.match(/data-level="(\d+)">N\d+/);
  if (match) {
    return `N${match[1]}`;
  }
  return estimateJLPTLevel(html);
}

// Parse date from Todaii format
function parseTodaiiDate(dateStr) {
  // Format: "Jul 5, 2025 07:07"
  try {
    return new Date(dateStr);
  } catch (error) {
    return new Date();
  }
}

// Extract article ID from URL
function extractArticleId(url) {
  const match = url.match(/detail\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

// Scrape articles from Todaii News
async function scrapeTodaiiArticles() {
  try {
    console.log('📖 Fetching Todaii News page...');
    const response = await makeRequest('https://japanese.todaiinews.com/news/0/all');
    const html = response.body;

    // Extract article links and metadata
    const articlePattern = /<a[^>]+class="first-item"[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+data-src="([^"]+)"[^>]*>[\s\S]*?<div[^>]+class="source">([^<]+)<\/div>[\s\S]*?<div[^>]+class="title">([^<]+(?:<[^>]+>[^<]+)*)<\/div>[\s\S]*?data-level="(\d+)">N\d+<\/span>[\s\S]*?<span[^>]+class="time-up">([^<]+)<\/span>/gi;

    const articles = [];
    let match;
    let count = 0;

    while ((match = articlePattern.exec(html)) !== null && count < 10) {
      const [fullMatch, url, imageUrl, source, titleHtml, jlptLevel, dateStr] = match;

      // Clean title by removing ruby tags but keeping the text
      const title = cleanTextAdvanced(titleHtml);

      // Extract article ID
      const articleId = extractArticleId(url);
      if (!articleId) continue;

      articles.push({
        id: articleId,
        url: url.replace(/&amp;/g, '&').split('?')[0], // Clean URL
        imageUrl: imageUrl,
        source: source,
        title: title,
        jlptLevel: `N${jlptLevel}`,
        date: parseTodaiiDate(dateStr.trim())
      });

      count++;
    }

    console.log(`✅ Found ${articles.length} articles on news page`);

    // Fetch full content for each article
    const fullArticles = [];
    for (const article of articles.slice(0, 5)) { // Limit to 5 for performance
      try {
        console.log(`📄 Fetching article: ${article.title}`);
        const articleUrl = article.url.includes('https://') ? article.url : `https://japanese.todaiinews.com${article.url}`;
        const articleResponse = await makeRequest(articleUrl);
        const articleHtml = articleResponse.body;

        // Extract content from article page
        const contentMatch = articleHtml.match(/<div[^>]+class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const content = contentMatch ? cleanTextAdvanced(contentMatch[1]).substring(0, 2000) : article.title;

        // Extract vocabulary and kanji
        const vocabulary = extractVocabulary(content);
        const kanji = extractKanji(content);

        fullArticles.push({
          id: `todaii_${article.id}`,
          title: article.title,
          content: content,
          summary: content.substring(0, 150) + '...',
          url: articleUrl,
          imageUrl: article.imageUrl || generateTodaiiImageUrl(fullArticles.length),
          publishDate: article.date,
          scrapedAt: new Date(),
          source: {
            id: 'todaii-news',
            name: article.source,
            displayName: 'Todaii Japanese News - Learning Platform'
          },
          category: 'news',
          tags: ['news', 'japanese', 'learning', 'todaii', article.jlptLevel.toLowerCase()],
          difficulty: article.jlptLevel,
          estimatedReadingTime: estimateReadingTime(content),
          vocabulary: vocabulary,
          kanji: kanji,
          sourceLanguage: 'japanese',
          learnerFriendly: true
        });

        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to fetch article ${article.title}:`, error.message);
      }
    }

    return fullArticles;

  } catch (error) {
    console.error('❌ Error scraping Todaii:', error);
    // Return mock data as fallback
    return generateMockArticles();
  }
}

// Generate mock articles for fallback
function generateMockArticles() {
  const articles = [
    {
      title: '日本の伝統的な祭りが今年も開催されます',
      content: '日本には四季を通じて様々な伝統的な祭りがあります。春には桜祭り、夏には盆踊りや花火大会、秋には収穫祭、冬には雪祭りなどが各地で開催されます。これらの祭りは、地域の文化を次の世代に伝える重要な役割を果たしています。',
      difficulty: 'N4'
    }
  ];

  return articles.map((article, index) => ({
    id: `todaii_${Date.now()}_${index}`,
    title: article.title,
    content: article.content,
    summary: article.content.substring(0, 100) + '...',
    url: `https://japanese.todaiinews.com/article/${index + 1}`,
    imageUrl: generateTodaiiImageUrl(index),
    publishDate: new Date(Date.now() - index * 86400000),
    scrapedAt: new Date(),
    source: {
      id: 'todaii-news',
      name: 'Todaii News',
      displayName: 'Todaii Japanese News - Learning Platform'
    },
    category: 'news',
    tags: ['news', 'japanese', 'learning', 'todaii'],
    difficulty: article.difficulty,
    estimatedReadingTime: estimateReadingTime(article.content),
    vocabulary: extractVocabulary(article.content),
    kanji: extractKanji(article.content),
    sourceLanguage: 'japanese',
    learnerFriendly: true
  }));
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
    console.log('🚀 Starting Todaii News scraper...');
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

    // Scrape real articles from Todaii News
    const articles = await scrapeTodaiiArticles();

    console.log(`📊 Scraped ${articles.length} articles from Todaii News`);

    // Save articles to Firebase
    const batch = db.batch();
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    for (const article of articles) {
      const articleWithTimestamps = {
        ...article,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
        scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt),
        viewCount: 0,
        bookmarkedBy: [],
        isArchived: false
      };

      const docRef = db.collection('articles').doc(article.id);
      batch.set(docRef, articleWithTimestamps);
    }

    await batch.commit();
    console.log(`✅ Saved ${articles.length} articles to Firebase`);

    // Update metadata
    await db.collection('articlesMetadata').doc('todaii-news-stats').set({
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date()),
      articleCount: articles.length,
      source: 'todaii-news',
      timestamp: new Date().toISOString()
    }, { merge: true });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} Todaii News articles`,
        articlesCount: articles.length,
        articles: articles.map(a => ({
          id: a.id,
          title: a.title,
          difficulty: a.difficulty
        })),
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Unexpected error in Todaii scraping function:', error);

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
