const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to clean text
function cleanText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
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

async function rescrapeArticle(articleId) {
  try {
    console.log(`Attempting to re-scrape article: ${articleId}`);
    
    // Get the article from Firestore
    const articleDoc = await db.collection('articles').doc(articleId).get();
    
    if (!articleDoc.exists) {
      console.error('Article not found:', articleId);
      return;
    }
    
    const article = articleDoc.data();
    console.log('Article URL:', article.url);
    
    if (!article.url) {
      console.error('Article has no URL to scrape');
      return;
    }
    
    // Fetch the article content
    console.log('Fetching article content...');
    const html = await makeRequest(article.url);
    
    // Try to extract content
    let content = '';
    
    // Try Watanoc's structure
    const entryMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)(?:<footer|<\/article|<div[^>]*class="[^"]*(?:share|comment))/i);
    if (entryMatch && entryMatch[1]) {
      content = cleanText(entryMatch[1]);
    }
    
    if (!content) {
      // Try article tag
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch && articleMatch[1]) {
        content = cleanText(articleMatch[1]);
      }
    }
    
    if (!content) {
      // Try main content
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch && mainMatch[1]) {
        content = cleanText(mainMatch[1]);
      }
    }
    
    if (content && content.length > 100) {
      // Update the article with the new content
      await articleDoc.ref.update({
        content: content.substring(0, 3000),
        lastRescraped: new Date()
      });
      
      console.log('✅ Successfully updated article content');
      console.log('Content preview:', content.substring(0, 200) + '...');
    } else {
      console.error('❌ Could not extract content from the page');
    }
    
  } catch (error) {
    console.error('Error re-scraping article:', error);
  } finally {
    process.exit();
  }
}

// Get article ID from command line
const articleId = process.argv[2];
if (!articleId) {
  console.error('Usage: node rescrape-article.js <articleId>');
  process.exit(1);
}

rescrapeArticle(articleId);