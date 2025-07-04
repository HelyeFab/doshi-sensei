const https = require('https');
const { URL } = require('url');
const admin = require('firebase-admin');

// Module-level variables for Firebase
let firebaseInitialized = false;
let db = null;

// Function to initialize Firebase Admin SDK when needed
function initializeFirebaseIfNeeded() {
  if (firebaseInitialized) {
    return true;
  }

  console.log('--- SCRAPE-MULTI-SOURCE FUNCTION START ---');
  console.log('Initializing Firebase Admin SDK...');

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  const clientId = process.env.FIREBASE_CLIENT_ID || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID;

  if (!admin.apps.length && projectId && privateKey && clientEmail) {
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
      console.log('✅ Firebase Admin SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      firebaseInitialized = false;
      return false;
    }
  } else if (admin.apps.length > 0) {
    firebaseInitialized = true;
    db = admin.firestore();
    console.log('✅ Firebase Admin SDK already initialized');
    return true;
  } else {
    console.error('❌ Missing required Firebase credentials');
    firebaseInitialized = false;
    return false;
  }
}

// Shared HTTP request function
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
          'Accept-Charset': 'utf-8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, currentUrl).href;
          performRequest(redirectUrl, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          body: data,
          url: currentUrl
        }));
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
function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTextAdvanced(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
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

// Content analysis utilities
function estimateJLPTLevel(text) {
  const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
  const kanjiRatio = kanjiCount / text.length;
  
  if (kanjiRatio < 0.15) return 'N5';
  if (kanjiRatio < 0.25) return 'N4';
  if (kanjiRatio < 0.35) return 'N3';
  if (kanjiRatio < 0.45) return 'N2';
  return 'N1';
}

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

// NHK Easy News scraper
async function scrapeNHKEasy() {
  console.log('📰 Scraping NHK Easy News...');
  
  try {
    const response = await makeRequest('https://www3.nhk.or.jp/news/easy/');
    
    // Extract article links
    const articleLinks = [];
    const linkPattern = /href="(\/news\/easy\/k\d+\/[^"]+)"/g;
    let match;
    
    while ((match = linkPattern.exec(response.body)) !== null) {
      const url = 'https://www3.nhk.or.jp' + match[1];
      articleLinks.push({ url, title: `NHK Easy Article` });
    }
    
    console.log(`  Found ${articleLinks.length} NHK Easy links`);
    
    const articles = [];
    
    // Scrape up to 5 articles
    for (const link of articleLinks.slice(0, 5)) {
      try {
        const articleResponse = await makeRequest(link.url);
        
        // Extract title
        const titleMatch = articleResponse.body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : 'NHK Easy Article';
        
        // Extract content
        const contentPatterns = [
          /<div[^>]*id="js-article-body"[^>]*>(.*?)<\/div>/is,
          /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>(.*?)<\/div>/is
        ];
        
        let content = null;
        for (const pattern of contentPatterns) {
          const contentMatch = articleResponse.body.match(pattern);
          if (contentMatch) {
            content = cleanTextAdvanced(contentMatch[1]);
            break;
          }
        }
        
        if (content && content.length > 100) {
          articles.push({
            id: `nhk_easy_${Date.now()}_${articles.length}`,
            title: title.substring(0, 200),
            content: content.substring(0, 5000),
            summary: content.substring(0, 200) + '...',
            url: link.url,
            publishDate: new Date(),
            scrapedAt: new Date(),
            source: {
              id: 'nhk-easy',
              name: 'NHK Easy',
              displayName: 'NHK Easy News'
            },
            category: 'news',
            tags: ['news', 'japanese', 'nhk-easy'],
            difficulty: 'N4', // NHK Easy is designed for learners
            estimatedReadingTime: Math.max(1, Math.ceil(content.length / 400)),
            vocabulary: extractVocabulary(content),
            kanji: extractKanji(content),
            learnerFriendly: true
          });
          
          console.log(`  ✅ NHK Easy: ${title.substring(0, 50)}...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ Failed to scrape ${link.url}: ${error.message}`);
      }
    }
    
    return articles;
    
  } catch (error) {
    console.error('❌ NHK Easy scraping error:', error.message);
    return [];
  }
}

// Watanoc scraper
async function scrapeWatanoc() {
  console.log('🏯 Scraping Watanoc...');
  
  const articles = [];
  const testUrls = [
    'https://watanoc.com/category/simplejapanese',
    'https://watanoc.com/category/japan-fun/culture'
  ];
  
  for (const categoryUrl of testUrls) {
    try {
      const response = await makeRequest(categoryUrl);
      
      // Extract article links
      const linkPattern = /href="(https:\/\/watanoc\.com\/[^"#?]+)"/g;
      const articleLinks = [];
      let match;
      
      while ((match = linkPattern.exec(response.body)) !== null) {
        const url = match[1];
        if (!url.includes('/category/') && !url.includes('/tag/') && !url.includes('/page/')) {
          articleLinks.push({ url, title: url.split('/').pop() });
        }
      }
      
      console.log(`  Found ${articleLinks.length} Watanoc links in ${categoryUrl}`);
      
      // Try to scrape first 2 articles from this category
      for (const link of articleLinks.slice(0, 2)) {
        try {
          const articleResponse = await makeRequest(link.url);
          
          // Extract title
          const titleMatch = articleResponse.body.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                            articleResponse.body.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? cleanText(titleMatch[1]) : link.title;
          
          // Extract content from paragraphs
          const paragraphs = articleResponse.body.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
          const content = paragraphs
            .map(p => cleanText(p))
            .filter(text => text.length > 20)
            .join('\n\n');
          
          if (content.length > 200) {
            articles.push({
              id: `watanoc_${Date.now()}_${articles.length}`,
              title: title.substring(0, 200),
              content: content.substring(0, 5000),
              summary: content.substring(0, 200) + '...',
              url: link.url,
              publishDate: new Date(),
              scrapedAt: new Date(),
              source: {
                id: 'watanoc',
                name: 'Watanoc',
                displayName: 'Watanoc - Japanese Articles'
              },
              category: 'culture',
              tags: ['japanese', 'culture'],
              difficulty: estimateJLPTLevel(content),
              estimatedReadingTime: Math.max(1, Math.ceil(content.length / 400)),
              vocabulary: extractVocabulary(content),
              kanji: extractKanji(content)
            });
            
            console.log(`  ✅ Watanoc: ${title.substring(0, 50)}...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`  ❌ Failed to scrape ${link.url}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Watanoc category error for ${categoryUrl}:`, error.message);
    }
  }
  
  return articles;
}

// Generate fallback articles if scraping fails
function generateFallbackArticles() {
  const fallbackArticles = [
    {
      id: `fallback_${Date.now()}_1`,
      title: '日本の季節と文化',
      content: '日本には美しい四季があります。春は桜の季節で、多くの人がお花見を楽しみます。夏は暑くて、お祭りがたくさんあります。秋は紅葉が美しく、冬は雪が降ります。それぞれの季節に特別な食べ物や行事があります。',
      summary: '日本の四季とそれぞれの季節の特徴について説明します。',
      url: 'https://doshisensei.com/fallback/seasons',
      publishDate: new Date(),
      scrapedAt: new Date(),
      source: {
        id: 'fallback',
        name: 'Doshi Sensei',
        displayName: 'Doshi Sensei - Learning Content'
      },
      category: 'culture',
      tags: ['seasons', 'culture', 'japanese'],
      difficulty: 'N5',
      estimatedReadingTime: 2,
      vocabulary: ['四季', '桜', 'お花見', 'お祭り', '紅葉'],
      kanji: ['四', '季', '桜', '夏', '秋', '冬', '雪']
    },
    {
      id: `fallback_${Date.now()}_2`,
      title: '日本の交通システム',
      content: '日本の電車はとても便利です。時間通りに来るので、多くの人が電車を使います。新幹線は日本の高速鉄道で、とても速いです。東京から大阪まで約3時間で行けます。電車の中では静かにすることがマナーです。',
      summary: '日本の電車システムと新幹線について紹介します。',
      url: 'https://doshisensei.com/fallback/transport',
      publishDate: new Date(),
      scrapedAt: new Date(),
      source: {
        id: 'fallback',
        name: 'Doshi Sensei',
        displayName: 'Doshi Sensei - Learning Content'
      },
      category: 'transportation',
      tags: ['trains', 'transport', 'shinkansen'],
      difficulty: 'N4',
      estimatedReadingTime: 2,
      vocabulary: ['電車', '新幹線', '高速鉄道', 'マナー'],
      kanji: ['電', '車', '新', '幹', '線', '高', '速', '鉄', '道']
    }
  ];
  
  return fallbackArticles;
}

// Main multi-source scraping function
async function scrapeMultiSource() {
  console.log('🚀 Starting multi-source Japanese content scraping...');
  
  const allArticles = [];
  
  // Try NHK Easy News first (more reliable)
  const nhkArticles = await scrapeNHKEasy();
  allArticles.push(...nhkArticles);
  
  // Try Watanoc if we need more articles
  if (allArticles.length < 5) {
    const watanocArticles = await scrapeWatanoc();
    allArticles.push(...watanocArticles);
  }
  
  // Add fallback articles if we still don't have enough
  if (allArticles.length < 3) {
    console.log('⚠️ Adding fallback articles');
    const fallbackArticles = generateFallbackArticles();
    allArticles.push(...fallbackArticles);
  }
  
  console.log(`✅ Total articles collected: ${allArticles.length}`);
  
  return {
    success: true,
    articles: allArticles,
    metadata: {
      scrapedAt: new Date().toISOString(),
      sources: ['nhk-easy', 'watanoc', 'fallback'],
      articleCount: allArticles.length,
      breakdown: {
        nhkEasy: nhkArticles.length,
        watanoc: allArticles.filter(a => a.source.id === 'watanoc').length,
        fallback: allArticles.filter(a => a.source.id === 'fallback').length
      }
    }
  };
}

// Save to Firebase
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
  
  const metadataRef = db.collection('articlesMetadata').doc('multi-source-stats');
  batch.set(metadataRef, {
    ...metadata,
    lastUpdated: admin.firestore.Timestamp.fromDate(new Date())
  });
  
  await batch.commit();
  console.log(`✅ Saved ${articles.length} articles to Firebase`);
}

// Handler
exports.handler = async (event) => {
  // Initialize Firebase at runtime
  initializeFirebaseIfNeeded();
  
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
    console.log('🚀 Multi-source scraping function triggered');
    
    // Enhanced Firebase debugging
    console.log('🔍 Checking Firebase configuration...');
    console.log('  - Project ID:', projectId || 'MISSING');
    console.log('  - Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING');
    console.log('  - Private Key:', process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING');
    console.log('  - Firebase Initialized:', firebaseInitialized);
    console.log('  - Database object:', !!db);
    
    if (!firebaseInitialized) {
      console.error('❌ Firebase not initialized - returning error');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firebase Admin SDK not configured',
          debug: {
            projectId: !!projectId,
            clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: !!process.env.FIREBASE_PRIVATE_KEY
          }
        }),
      };
    }
    
    console.log('✅ Starting multi-source scraping...');
    const scrapingResult = await scrapeMultiSource();
    console.log('✅ Scraping completed:', scrapingResult.success, scrapingResult.articles.length);
    
    if (scrapingResult.success && scrapingResult.articles.length > 0) {
      console.log('💾 Saving articles to Firebase...');
      await saveArticlesToFirebase(scrapingResult.articles, scrapingResult.metadata);
      console.log('✅ Articles saved successfully');
    } else {
      console.log('⚠️ No articles to save');
    }
    
    const response = {
      success: scrapingResult.success,
      message: `Successfully scraped ${scrapingResult.articles.length} articles from multiple sources`,
      articlesCount: scrapingResult.articles.length,
      sources: scrapingResult.metadata.breakdown,
      articles: scrapingResult.articles.map(a => ({
        id: a.id,
        title: a.title,
        source: a.source.name,
        difficulty: a.difficulty,
        category: a.category
      })),
      metadata: scrapingResult.metadata
    };
    
    console.log('📤 Returning response:', JSON.stringify(response, null, 2));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('💥 DETAILED ERROR in multi-source scraping:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Error name:', error.name);
    console.error('  - Error code:', error.code);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.name,
        errorCode: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
    };
  }
};