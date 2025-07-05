const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Initialize Firebase Admin SDK
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

// HTTP request helper
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DoshiSensei/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Extract JLPT level from title
function extractJLPTLevel(title) {
  const match = title.match(/\(n([1-5])\)/i);
  if (match) {
    return `N${match[1].toUpperCase()}`;
  }
  return 'N4'; // Default if not found
}

// Clean HTML and extract text
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
    .replace(/&#8230;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse date from Japanese format
function parseJapaneseDate(dateStr) {
  // Format: "2016年10月14日 金曜日"
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  return new Date();
}

// Extract articles from Watanoc homepage
async function scrapeWatanocArticles() {
  try {
    console.log('📖 Fetching Watanoc homepage...');
    const html = await makeRequest('https://watanoc.com');

    // Extract article links and metadata using regex
    const articlePattern = /<article[^>]*class="[^"]*loop-article[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<time[^>]+datetime="([^"]+)"[^>]*>([^<]+)<\/time>[\s\S]*?(?:<div[^>]+class="[^"]*loop-excerpt[^"]*"[^>]*>([^<]+)<\/div>)?[\s\S]*?<\/article>/gi;

    const articles = [];
    let match;
    let count = 0;

    while ((match = articlePattern.exec(html)) !== null && count < 10) {
      const [fullMatch, url, title, imageUrl, datetime, dateText, excerpt] = match;

      // Clean title and extract JLPT level
      const cleanTitle = cleanText(title).replace(/\s*\(n[1-5]\).*$/i, '');
      const jlptLevel = extractJLPTLevel(title);

      // Extract category from URL
      const categoryMatch = url.match(/watanoc\.com\/([^\/]+)/);
      const category = categoryMatch ? categoryMatch[1].replace('post-', '') : 'general';

      articles.push({
        url,
        title: cleanTitle,
        imageUrl: imageUrl || `https://images.unsplash.com/photo-${1500000000000 + count}?w=400`,
        date: parseJapaneseDate(dateText),
        excerpt: excerpt ? cleanText(excerpt) : '',
        jlptLevel,
        category
      });

      count++;
    }

    console.log(`✅ Found ${articles.length} articles on homepage`);

    // Fetch full content for each article
    const fullArticles = [];
    for (const article of articles.slice(0, 5)) { // Limit to 5 for performance
      try {
        console.log(`📄 Fetching article: ${article.title}`);
        const articleHtml = await makeRequest(article.url);

        // Extract content from article page
        const contentMatch = articleHtml.match(/<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const content = contentMatch ? cleanText(contentMatch[1]) : article.excerpt;

        // Extract vocabulary and kanji
        const vocabulary = (content.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [])
          .filter((word, index, self) => self.indexOf(word) === index)
          .slice(0, 20);

        const kanji = (content.match(/[\u4e00-\u9faf]/g) || [])
          .filter((char, index, self) => self.indexOf(char) === index)
          .slice(0, 15);

        fullArticles.push({
          id: `watanoc_${Date.now()}_${fullArticles.length}`,
          title: article.title,
          content: content.substring(0, 2000), // Limit content length
          summary: article.excerpt || content.substring(0, 150) + '...',
          url: article.url,
          imageUrl: article.imageUrl,
          publishDate: article.date,
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc',
            displayName: 'Watanoc - Japanese Learning Articles'
          },
          category: article.category,
          tags: ['japanese-learning', 'watanoc', article.jlptLevel.toLowerCase()],
          difficulty: article.jlptLevel,
          estimatedReadingTime: Math.ceil(content.length / 300),
          vocabulary: vocabulary,
          kanji: kanji
        });

        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to fetch article ${article.title}:`, error.message);
      }
    }

    return fullArticles;

  } catch (error) {
    console.error('❌ Error scraping Watanoc:', error);
    // Return mock data as fallback
    return getMockArticles();
  }
}

// Fallback mock data
const getMockArticles = () => [
  {
    id: `watanoc_${Date.now()}_001`,
    title: '日本の四季',
    content: '日本には美しい四季があります。春は桜、夏は祭り、秋は紅葉、冬は雪です。それぞれの季節には特別な魅力があります。',
    summary: '日本の四季の美しさについての記事です。',
    url: 'https://watanoc.com/articles/seasons',
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400',
    publishDate: new Date(),
    scrapedAt: new Date(),
    source: {
      id: 'watanoc',
      name: 'Watanoc',
      displayName: 'Watanoc - Japanese Learning Articles'
    },
    category: 'culture',
    tags: ['seasons', 'nature', 'culture'],
    difficulty: 'N5',
    estimatedReadingTime: 2,
    vocabulary: ['四季', '春', '桜', '夏', '祭り', '秋', '紅葉', '冬', '雪'],
    kanji: ['日', '本', '四', '季', '春', '桜', '夏', '祭', '秋', '紅', '葉', '冬', '雪']
  }
];

// Function to save articles to Firebase
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
    console.log('🚀 Working Watanoc scraping function triggered');
    console.log('📅 Event type:', event.httpMethod || 'scheduled');
    console.log('🔧 Firebase initialized:', firebaseInitialized);

    // Check if Firebase is properly initialized
    if (!firebaseInitialized) {
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

    // Get real articles from Watanoc
    const articles = await scrapeWatanocArticles();

    // Save articles to Firebase
    await saveArticlesToFirebase(articles);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} Watanoc articles to Firebase`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        fallbackUsed: articles.length > 0 && articles[0].id.includes('001') // Check if using mock data
      }),
    };

  } catch (error) {
    console.error('💥 Unexpected error in working scraping function:', error);

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
