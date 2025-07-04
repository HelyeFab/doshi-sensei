const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
let db = null;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
const clientId = process.env.FIREBASE_CLIENT_ID || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID;

if (!admin.apps.length && projectId) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: privateKeyId,
      private_key: privateKey?.replace(/\\n/g, '\n'),
      client_email: clientEmail,
      client_id: clientId,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${clientEmail}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    db = admin.firestore();
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
}

console.log('--- SCRAPE-NHK-EASY-NEWS FUNCTION START ---');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_PRIVATE_KEY_ID:', process.env.FIREBASE_PRIVATE_KEY_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_CLIENT_ID:', process.env.FIREBASE_CLIENT_ID);
console.log('Firebase initialized:', firebaseInitialized);

// HTTP request function optimized for NHK Easy News
function makeRequest(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const performRequest = (currentUrl, redirectCount) => {
      if (redirectCount > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }

      const parsedUrl = new URL(currentUrl);

      // Headers optimized for NHK Easy News (based on nhkore)
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Charset': 'utf-8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Pragma': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
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

// Extract article links from NHK Easy News main page
function extractNHKArticleLinks(html) {
  const links = [];

  // NHK Easy News uses specific patterns for article links
  const linkPatterns = [
    // Standard article links with date pattern
    /href="(\/news\/easy\/k\d+\/[^"]+)"/g,
    // Alternative pattern
    /href="([^"]*k\d{10}[^"]*)"/g
  ];

  for (const pattern of linkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1];

      // Convert relative URLs to absolute
      if (url.startsWith('/')) {
        url = 'https://www3.nhk.or.jp' + url;
      }

      // Avoid duplicates
      if (!links.some(link => link.url === url)) {
        links.push({
          url: url,
          title: `NHK Easy Article ${links.length + 1}`
        });
      }
    }
  }

  console.log(`📄 Found ${links.length} NHK Easy article links`);
  return links.slice(0, 10); // Limit to 10 articles
}

// Extract title from NHK Easy News article
function extractNHKTitle(html) {
  const titlePatterns = [
    // NHK Easy specific patterns
    /<h1[^>]*class="[^"]*article-main__title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*class="[^"]*article-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*id="js-article-title"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title[^>]*>([^<]+)<\/title>/i
  ];

  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match) {
      const title = cleanText(match[1]);
      if (title.length > 5 && !title.toLowerCase().includes('nhk')) {
        return title;
      }
    }
  }

  return null;
}

// Extract content from NHK Easy News article
function extractNHKContent(html) {
  const contentSelectors = [
    // NHK Easy specific selectors (based on nhkore)
    'div#js-article-body',
    'div.article-main__body',
    'div.article-body',
    'div.article-main__text',
    'div[class*="article-body"]',
    'div[class*="article-main"]'
  ];

  for (const selector of contentSelectors) {
    // Simple selector matching
    const patterns = [
      new RegExp(`<div[^>]*id="${selector.replace('#', '').replace('js-', 'js-')}"[^>]*>(.*?)</div>`, 'is'),
      new RegExp(`<div[^>]*class="[^"]*${selector.replace('.', '').replace('-', '[-_]')}[^"]*"[^>]*>(.*?)</div>`, 'is')
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const content = cleanTextAdvanced(match[1]);
        if (content.length > 200) {
          console.log(`✓ Content extracted using: ${selector}`);
          return content;
        }
      }
    }
  }

  // Fallback: extract paragraphs within the article area
  const articleMatch = html.match(/<article[^>]*>(.*?)<\/article>/is);
  if (articleMatch) {
    const paragraphs = articleMatch[1].match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
    if (paragraphs.length > 2) {
      const content = paragraphs
        .map(p => cleanText(p))
        .filter(text => text.length > 20)
        .join('\n\n');

      if (content.length > 200) {
        console.log('✓ Content extracted from article paragraphs');
        return content;
      }
    }
  }

  console.log('⚠️ No content found');
  return null;
}

// Advanced text cleaning for Japanese content
function cleanTextAdvanced(html) {
  return html
    // Remove scripts and styles
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')

    // Handle ruby tags (furigana) - preserve both kanji and reading
    .replace(/<ruby[^>]*>([^<]*)<rt[^>]*>([^<]*)<\/rt><\/ruby>/gi, '$1($2)')
    .replace(/<ruby[^>]*>([^<]*)<rp[^>]*>[^<]*<\/rp><rt[^>]*>([^<]*)<\/rt><rp[^>]*>[^<]*<\/rp><\/ruby>/gi, '$1($2)')

    // Remove all other HTML tags
    .replace(/<[^>]*>/g, ' ')

    // Handle HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")

    // Normalize whitespace (including Japanese full-width spaces)
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

// Simple text cleaning
function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Estimate JLPT level for NHK Easy content
function estimateJLPTLevel(text) {
  const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
  const totalChars = text.length;
  const kanjiRatio = kanjiCount / totalChars;

  // NHK Easy is designed for learners, so most content is N4-N5
  if (kanjiRatio < 0.15) return 'N5';
  if (kanjiRatio < 0.25) return 'N4';
  if (kanjiRatio < 0.35) return 'N3';
  return 'N4'; // Default for NHK Easy
}

// Extract Japanese vocabulary
function extractVocabulary(text) {
  const japaneseWords = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [];
  return [...new Set(japaneseWords)]
    .filter(word => word.length > 1 && word.length < 8)
    .slice(0, 15);
}

// Extract kanji characters
function extractKanji(text) {
  const kanjiChars = text.match(/[\u4e00-\u9faf]/g) || [];
  return [...new Set(kanjiChars)].slice(0, 10);
}

// Scrape individual NHK Easy article
async function scrapeNHKArticle(link) {
  try {
    const response = await makeRequest(link.url);

    const title = extractNHKTitle(response.body) || link.title;
    const content = extractNHKContent(response.body);

    if (!content || content.length < 100) {
      throw new Error('Insufficient content');
    }

    const difficulty = estimateJLPTLevel(content);
    const vocabulary = extractVocabulary(content);
    const kanji = extractKanji(content);

    return {
      id: `nhk_easy_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: title.substring(0, 200),
      content: content.substring(0, 5000),
      summary: content.substring(0, 200) + '...',
      url: link.url,
      publishDate: new Date(),
      scrapedAt: new Date(),
      source: {
        id: 'nhk-easy',
        name: 'NHK Easy',
        displayName: 'NHK Easy News - Japanese Learning'
      },
      category: 'news',
      tags: ['news', 'japanese', 'learning', 'nhk-easy'],
      difficulty: difficulty,
      estimatedReadingTime: Math.max(1, Math.ceil(content.length / 400)),
      vocabulary: vocabulary,
      kanji: kanji,
      sourceLanguage: 'japanese',
      learnerFriendly: true
    };
  } catch (error) {
    console.log(`❌ Failed to scrape ${link.url}: ${error.message}`);
    return null;
  }
}

// Main NHK Easy News scraping function
async function scrapeNHKEasyNews() {
  console.log('🔍 Starting NHK Easy News scraping...');

  const articles = [];
  const targetCount = 8;

  try {
    // Get main NHK Easy News page
    console.log('📖 Fetching NHK Easy News main page...');
    const mainPageResponse = await makeRequest('https://www3.nhk.or.jp/news/easy/');

    // Extract article links
    const articleLinks = extractNHKArticleLinks(mainPageResponse.body);

    if (articleLinks.length === 0) {
      console.log('⚠️ No article links found on main page');
      return {
        success: false,
        articles: [],
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'nhk-easy',
          error: 'No articles found'
        }
      };
    }

    // Scrape individual articles
    for (const link of articleLinks.slice(0, targetCount)) {
      const article = await scrapeNHKArticle(link);
      if (article) {
        articles.push(article);
        console.log(`✅ Scraped: ${article.title}`);
      }

      // Be respectful - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`✅ Successfully scraped ${articles.length} NHK Easy articles`);

    return {
      success: true,
      articles: articles,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'nhk-easy',
        articleCount: articles.length,
        targetUrl: 'https://www3.nhk.or.jp/news/easy/'
      }
    };

  } catch (error) {
    console.error('❌ Error in NHK Easy scraping:', error);
    return {
      success: false,
      articles: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'nhk-easy',
        error: error.message
      }
    };
  }
}

// Save articles to Firebase
async function saveArticlesToFirebase(articles, metadata) {
  if (!firebaseInitialized || !db) {
    throw new Error('Firebase not initialized');
  }

  const batch = db.batch();

  for (const article of articles) {
    const docRef = db.collection('articles').doc(article.id);
    batch.set(docRef, {
      ...article,
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
    });
  }

  // Save metadata
  const metadataRef = db.collection('articlesMetadata').doc('nhk-easy-stats');
  batch.set(metadataRef, {
    ...metadata,
    lastUpdated: admin.firestore.Timestamp.fromDate(new Date())
  });

  await batch.commit();
  console.log(`✅ Saved ${articles.length} articles to Firebase`);
}

// Handler
exports.handler = async (event) => {
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

  try {
    console.log('🚀 NHK Easy News scraping function triggered');

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

    const scrapingResult = await scrapeNHKEasyNews();

    if (scrapingResult.success && scrapingResult.articles.length > 0) {
      await saveArticlesToFirebase(scrapingResult.articles, scrapingResult.metadata);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: scrapingResult.success,
        message: scrapingResult.success
          ? `Successfully scraped and saved ${scrapingResult.articles.length} NHK Easy articles`
          : 'Scraping failed',
        articlesCount: scrapingResult.articles.length,
        articles: scrapingResult.articles.map(a => ({
          id: a.id,
          title: a.title,
          difficulty: a.difficulty,
          vocabularyCount: a.vocabulary?.length || 0,
          kanjiCount: a.kanji?.length || 0
        })),
        metadata: scrapingResult.metadata,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('💥 Error in NHK Easy scraping function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
