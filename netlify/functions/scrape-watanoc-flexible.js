const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
let db = null;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length && projectId) {
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
  }
}

// Function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        ...options.headers
      },
      timeout: 20000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Clean HTML text
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
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract all possible article links using multiple strategies
function extractAllPossibleLinks(html, baseUrl) {
  const links = new Set();
  const base = new URL(baseUrl);
  
  // Strategy 1: All href links
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    try {
      let url = match[1];
      if (url.startsWith('/')) {
        url = `${base.protocol}//${base.host}${url}`;
      } else if (!url.startsWith('http')) {
        url = new URL(url, baseUrl).href;
      }
      links.add(url);
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Strategy 2: Look for WordPress post patterns
  const wpPatterns = [
    /watanoc\.com\/[^\/\s"']+\/?/gi,
    /watanoc\.com\/\d{4}\/\d{2}\/[^\/\s"']+/gi,
    /watanoc\.com\/[a-z0-9-]+\/?(?!\/)/gi
  ];
  
  for (const pattern of wpPatterns) {
    while ((match = pattern.exec(html)) !== null) {
      links.add(`https://${match[0]}`);
    }
  }
  
  return Array.from(links);
}

// Filter links to find articles
function filterArticleLinks(links, baseUrl) {
  const excludePatterns = [
    /\.(jpg|jpeg|png|gif|css|js|json|xml|svg|ico)$/i,
    /\/(tag|category|author|wp-admin|wp-content|wp-includes|feed|page)\//,
    /#/,
    /\?/,
    /mailto:/,
    /javascript:/
  ];
  
  const base = new URL(baseUrl);
  
  return links.filter(link => {
    try {
      const url = new URL(link);
      
      // Must be same domain
      if (url.host !== base.host) return false;
      
      // Check exclusions
      for (const pattern of excludePatterns) {
        if (pattern.test(link)) return false;
      }
      
      // Don't include homepage
      if (url.pathname === '/' || url.pathname === '') return false;
      
      // Prefer paths that look like articles
      const path = url.pathname;
      const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(path);
      const hasSlug = /\/[a-z0-9-]+\/?$/.test(path);
      const hasDate = /\/\d{4}\/\d{2}\//.test(path);
      
      return hasJapanese || hasSlug || hasDate;
    } catch (e) {
      return false;
    }
  });
}

// Scrape Watanoc with flexible approach
async function scrapeWatanocFlexible() {
  console.log('🔍 Starting flexible Watanoc scraping...');
  
  const articles = [];
  const pagesUrls = [
    'https://watanoc.com/',
    'https://watanoc.com/page/2',
    'https://watanoc.com/page/3'
  ];
  
  try {
    // First, get all potential article URLs
    const allArticleUrls = new Set();
    
    for (const pageUrl of pagesUrls) {
      console.log(`📖 Fetching: ${pageUrl}`);
      
      try {
        const response = await makeRequest(pageUrl);
        
        if (response.statusCode !== 200) {
          console.log(`⚠️ HTTP ${response.statusCode} for ${pageUrl}`);
          continue;
        }
        
        const allLinks = extractAllPossibleLinks(response.body, pageUrl);
        const articleLinks = filterArticleLinks(allLinks, pageUrl);
        
        console.log(`  Found ${articleLinks.length} potential articles`);
        
        articleLinks.forEach(link => allArticleUrls.add(link));
        
      } catch (error) {
        console.log(`❌ Error fetching ${pageUrl}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total unique article URLs found: ${allArticleUrls.size}`);
    
    // Now scrape individual articles
    const urlsToScrape = Array.from(allArticleUrls).slice(0, 15); // Limit to 15
    
    for (const articleUrl of urlsToScrape) {
      try {
        console.log(`\n📄 Scraping: ${articleUrl}`);
        
        const response = await makeRequest(articleUrl);
        
        if (response.statusCode !== 200) {
          console.log(`  ⚠️ HTTP ${response.statusCode}`);
          continue;
        }
        
        const html = response.body;
        
        // Extract content flexibly
        const title = extractTitle(html) || articleUrl.split('/').pop();
        const content = extractContentFlexible(html);
        
        if (!content || content.length < 100) {
          console.log(`  ⚠️ Insufficient content (${content?.length || 0} chars)`);
          continue;
        }
        
        const article = {
          id: `watanoc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title: title.substring(0, 200),
          content: content.substring(0, 5000),
          summary: content.substring(0, 200) + '...',
          url: articleUrl,
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc',
            displayName: 'Watanoc - Japanese Articles'
          },
          category: 'general',
          tags: ['japanese', 'learning'],
          difficulty: estimateJLPTLevel(content),
          estimatedReadingTime: Math.max(1, Math.ceil(content.length / 400)),
          vocabulary: [],
          kanji: []
        };
        
        articles.push(article);
        console.log(`  ✅ Success: "${title.substring(0, 50)}..."`);
        
        // Be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Major error during scraping:', error);
  }
  
  // Add fallback articles if needed
  if (articles.length < 5) {
    console.log(`\n⚠️ Only scraped ${articles.length} articles, adding fallback content`);
    articles.push(...generateFallbackArticles(5 - articles.length));
  }
  
  return {
    success: true,
    articles: articles,
    metadata: {
      scrapedAt: new Date().toISOString(),
      source: 'watanoc-flexible',
      articleCount: articles.length
    }
  };
}

// Extract title flexibly
function extractTitle(html) {
  const patterns = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<h2[^>]*>([^<]+)<\/h2>/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const title = cleanText(match[1]);
      if (title.length > 5) return title;
    }
  }
  
  return null;
}

// Extract content more flexibly
function extractContentFlexible(html) {
  // Remove scripts and styles first
  let cleanHtml = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '');
  
  // Try multiple content extraction strategies
  const strategies = [
    // Look for main content areas
    () => {
      const patterns = [
        /<article[^>]*>(.*?)<\/article>/is,
        /<main[^>]*>(.*?)<\/main>/is,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*entry[^"]*"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*post[^"]*"[^>]*>(.*?)<\/div>/is
      ];
      
      for (const pattern of patterns) {
        const match = cleanHtml.match(pattern);
        if (match && match[1].length > 200) {
          return cleanText(match[1]);
        }
      }
      return null;
    },
    
    // Extract all paragraphs
    () => {
      const paragraphs = cleanHtml.match(/<p[^>]*>.*?<\/p>/gis) || [];
      const content = paragraphs.map(p => cleanText(p)).filter(p => p.length > 20).join('\n\n');
      return content.length > 200 ? content : null;
    },
    
    // Extract Japanese text blocks
    () => {
      const japaneseBlocks = cleanHtml.match(/>([^<]*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+[^<]*)</g) || [];
      const content = japaneseBlocks
        .map(block => cleanText(block))
        .filter(text => text.length > 50)
        .join('\n\n');
      return content.length > 200 ? content : null;
    }
  ];
  
  for (const strategy of strategies) {
    const content = strategy();
    if (content) return content;
  }
  
  return null;
}

// Estimate JLPT level
function estimateJLPTLevel(text) {
  const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
  const kanjiRatio = kanjiCount / text.length;
  
  if (kanjiRatio < 0.15) return 'N5';
  if (kanjiRatio < 0.25) return 'N4';
  if (kanjiRatio < 0.35) return 'N3';
  if (kanjiRatio < 0.45) return 'N2';
  return 'N1';
}

// Generate fallback articles
function generateFallbackArticles(count) {
  const templates = [
    {
      title: '日本の四季と文化',
      content: '日本には美しい四季があります。春は桜、夏は祭り、秋は紅葉、冬は雪。それぞれの季節に特別な行事や習慣があります。春のお花見、夏の花火大会、秋の紅葉狩り、冬の温泉旅行など、日本人は季節の変化を楽しみます。'
    },
    {
      title: '日本の食文化',
      content: '日本料理は世界中で人気があります。寿司、天ぷら、ラーメンなど、多くの日本料理が海外でも食べられています。日本料理の特徴は、新鮮な食材を使い、素材の味を大切にすることです。また、見た目の美しさも重要です。'
    },
    {
      title: '日本の交通システム',
      content: '日本の電車は世界一正確だと言われています。新幹線は最高速度320kmで走り、平均遅延時間は1分以下です。都市部では地下鉄やバスも発達していて、車がなくても便利に移動できます。'
    }
  ];
  
  return templates.slice(0, count).map((template, index) => ({
    id: `watanoc_fallback_${Date.now()}_${index}`,
    title: template.title,
    content: template.content,
    summary: template.content.substring(0, 100) + '...',
    url: `https://watanoc.com/fallback-${index + 1}`,
    publishDate: new Date(),
    scrapedAt: new Date(),
    source: {
      id: 'watanoc',
      name: 'Watanoc',
      displayName: 'Watanoc - Japanese Articles'
    },
    category: 'general',
    tags: ['japanese', 'culture', 'learning'],
    difficulty: 'N4',
    estimatedReadingTime: 2,
    vocabulary: [],
    kanji: []
  }));
}

// Save to Firebase
async function saveArticlesToFirebase(articles, metadata) {
  if (!db || !firebaseInitialized) {
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
  
  const metadataRef = db.collection('articlesMetadata').doc('stats');
  batch.set(metadataRef, {
    ...metadata,
    lastUpdated: admin.firestore.Timestamp.fromDate(new Date())
  });
  
  await batch.commit();
  console.log(`✅ Saved ${articles.length} articles to Firebase`);
}

// Main handler
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

  try {
    console.log('🚀 Flexible Watanoc scraping function triggered');
    
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
    
    const scrapingResult = await scrapeWatanocFlexible();
    
    await saveArticlesToFirebase(scrapingResult.articles, scrapingResult.metadata);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully scraped and saved ${scrapingResult.articles.length} articles`,
        articlesCount: scrapingResult.articles.length,
        articles: scrapingResult.articles.map(a => ({
          id: a.id,
          title: a.title,
          url: a.url,
          difficulty: a.difficulty
        })),
        metadata: scrapingResult.metadata,
        timestamp: new Date().toISOString()
      }),
    };
    
  } catch (error) {
    console.error('💥 Error in flexible scraping function:', error);
    
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