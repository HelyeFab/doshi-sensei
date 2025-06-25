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
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
}

// Improved HTTP request function based on nhkore techniques
function makeImprovedRequest(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const performRequest = (currentUrl, redirectCount) => {
      if (redirectCount > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }

      const parsedUrl = new URL(currentUrl);
      
      // Headers based on nhkore's successful approach
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Charset': 'utf-8',  // Critical for Japanese content
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Pragma': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      };

      console.log(`🌐 Requesting: ${currentUrl} (redirect #${redirectCount})`);

      const req = https.request(options, (res) => {
        console.log(`📊 Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);

        // Handle redirects manually
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
        
        // Force UTF-8 encoding like nhkore does
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`✅ Response received: ${data.length} characters`);
          
          // Additional check for empty or invalid responses
          if (data.length < 100) {
            reject(new Error(`Response too short: ${data.length} characters`));
            return;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: currentUrl
          });
        });
      });

      req.on('error', (error) => {
        console.error(`❌ Request error for ${currentUrl}:`, error.message);
        reject(error);
      });

      req.on('timeout', () => {
        console.error(`⏱️ Timeout for ${currentUrl}`);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    };

    performRequest(url, 0);
  });
}

// Multiple CSS selectors for content extraction (based on nhkore's approach)
function extractContent(html) {
  const contentSelectors = [
    // Common WordPress/blog patterns
    'article .entry-content',
    'article .post-content', 
    '.post-body',
    '.entry-content',
    '.post-content',
    '.article-content',
    '.content',
    
    // Generic article patterns
    'article',
    'main article',
    '[role="main"] article',
    '.main-content article',
    
    // Paragraph fallback
    '.post p',
    'article p',
    '.content p'
  ];

  for (const selector of contentSelectors) {
    // Simple CSS selector matching (without external libraries)
    let content = '';
    
    if (selector.includes('p')) {
      // Extract paragraphs
      const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gis);
      if (pMatches && pMatches.length > 2) {
        content = pMatches
          .map(p => cleanText(p))
          .filter(text => text.length > 20)
          .join('\n\n');
      }
    } else {
      // Try to match container elements
      const patterns = [
        new RegExp(`<${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>(.*?)</${selector.split(/\s+/).pop()}>`, 'is'),
        new RegExp(`<div[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>(.*?)</div>`, 'is'),
        new RegExp(`<article[^>]*>(.*?)</article>`, 'is')
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          content = cleanText(match[1]);
          break;
        }
      }
    }
    
    if (content && content.length > 200) {
      console.log(`✓ Content extracted using selector: ${selector}`);
      return content;
    }
  }
  
  console.log('⚠️ No content found with any selector');
  return null;
}

// Extract title with multiple fallback strategies
function extractTitle(html) {
  const titlePatterns = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match) {
      const title = cleanText(match[1]);
      if (title.length > 5 && title.length < 200) {
        return title;
      }
    }
  }
  
  return null;
}

// Clean text function (inspired by nhkore's strip_web_str)
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
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract links with improved pattern matching
function extractArticleLinks(html, baseUrl) {
  const links = new Set();
  
  // Multiple link extraction patterns
  const linkPatterns = [
    /href=["'](https?:\/\/watanoc\.com\/[^"'#?]+)["']/gi,
    /href=["'](\/[^"'#?]+)["']/gi
  ];
  
  for (const pattern of linkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1];
      
      // Convert relative URLs
      if (url.startsWith('/')) {
        url = 'https://watanoc.com' + url;
      }
      
      // Filter out non-article URLs
      if (url.includes('watanoc.com') && 
          !url.includes('/category/') && 
          !url.includes('/tag/') && 
          !url.includes('/page/') &&
          !url.includes('/wp-') &&
          !url.includes('#') &&
          !url.includes('?') &&
          url !== 'https://watanoc.com/' &&
          url !== 'https://watanoc.com') {
        links.add(url);
      }
    }
  }
  
  const result = Array.from(links).slice(0, 10);
  console.log(`📄 Found ${result.length} potential article links`);
  return result.map(url => ({ url, title: url.split('/').pop() }));
}

// Main scraping function
async function scrapeWatanocImproved() {
  console.log('🔍 Starting improved Watanoc scraping...');
  
  const articles = [];
  const testUrls = [
    'https://watanoc.com/',
    'https://watanoc.com/category/simplejapanese',
    'https://watanoc.com/category/japan-fun/culture'
  ];

  for (const testUrl of testUrls) {
    try {
      console.log(`\n📖 Testing: ${testUrl}`);
      
      const response = await makeImprovedRequest(testUrl);
      
      // Log response details for debugging
      console.log(`  Status: ${response.statusCode}`);
      console.log(`  URL: ${response.url}`);
      console.log(`  Content-Type: ${response.headers['content-type']}`);
      console.log(`  Content-Length: ${response.body.length}`);
      
      // Check for Japanese content
      const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(response.body);
      console.log(`  Has Japanese: ${hasJapanese}`);
      
      // Sample content
      const sample = response.body.substring(0, 300).replace(/\s+/g, ' ');
      console.log(`  Sample: ${sample}...`);
      
      // Try to extract article links
      const articleLinks = extractArticleLinks(response.body, testUrl);
      console.log(`  Article links found: ${articleLinks.length}`);
      
      // If this is an article page, try to extract content
      if (testUrl !== 'https://watanoc.com/') {
        const title = extractTitle(response.body);
        const content = extractContent(response.body);
        
        console.log(`  Title: ${title || 'None'}`);
        console.log(`  Content length: ${content?.length || 0}`);
        
        if (title && content && content.length > 100) {
          articles.push({
            id: `watanoc_improved_${Date.now()}_${articles.length}`,
            title: title,
            content: content.substring(0, 5000),
            summary: content.substring(0, 200) + '...',
            url: response.url,
            publishDate: new Date(),
            scrapedAt: new Date(),
            source: {
              id: 'watanoc',
              name: 'Watanoc',
              displayName: 'Watanoc - Japanese Articles'
            },
            category: 'general',
            tags: ['japanese', 'learning'],
            difficulty: 'N4',
            estimatedReadingTime: Math.max(1, Math.ceil(content.length / 400))
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Error with ${testUrl}:`, error.message);
    }
  }

  return {
    success: true,
    articles: articles,
    metadata: {
      scrapedAt: new Date().toISOString(),
      source: 'watanoc-improved',
      articleCount: articles.length
    }
  };
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
    console.log('🚀 Improved Watanoc scraping function triggered');
    
    const scrapingResult = await scrapeWatanocImproved();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Improved scraping completed`,
        articlesCount: scrapingResult.articles.length,
        articles: scrapingResult.articles.map(a => ({
          id: a.id,
          title: a.title,
          url: a.url,
          contentLength: a.content.length
        })),
        metadata: scrapingResult.metadata
      }),
    };
    
  } catch (error) {
    console.error('💥 Error in improved scraping:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
    };
  }
};