const https = require('https');
const { URL } = require('url');

// HTTP request helper with gzip support
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const zlib = require('zlib');
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      
      // Handle gzip compression
      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        
        gunzip.on('data', chunk => {
          data += chunk.toString();
        });
        
        gunzip.on('end', () => {
          resolve(data);
        });
        
        gunzip.on('error', reject);
      } else {
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      }
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

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
    // Test with the article from the PDF filename
    const testUrl = 'https://watanoc.com/post-7964/';
    console.log(`Testing Watanoc article structure: ${testUrl}`);
    
    const html = await makeRequest(testUrl);
    console.log(`Fetched ${html.length} bytes`);
    
    const results = {
      url: testUrl,
      htmlLength: html.length,
      structure: {}
    };
    
    // Look for ALL divs and their classes
    const divMatches = [...html.matchAll(/<div[^>]*class="([^"]*)"[^>]*>/gi)];
    const divClasses = {};
    divMatches.forEach(match => {
      const classes = match[1].split(' ');
      classes.forEach(cls => {
        if (!divClasses[cls]) divClasses[cls] = 0;
        divClasses[cls]++;
      });
    });
    
    results.divClasses = Object.entries(divClasses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    
    // Look for Japanese content in different structures
    const patterns = [
      // Try to find divs with substantial Japanese text
      /<div[^>]*>((?:[^<]|<(?!\/div>))*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]{10,}(?:[^<]|<(?!\/div>))*)<\/div>/gi,
      // Look for paragraphs with Japanese
      /<p[^>]*>((?:[^<]|<(?!\/p>))*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]{10,}(?:[^<]|<(?!\/p>))*)<\/p>/gi,
    ];
    
    results.japaneseContent = [];
    
    for (const pattern of patterns) {
      const matches = [...html.matchAll(pattern)];
      matches.forEach(match => {
        const content = match[1].replace(/<[^>]*>/g, '').trim();
        if (content.length > 50) {
          const parentDiv = html.substring(Math.max(0, match.index - 100), match.index);
          const classMatch = parentDiv.match(/class="([^"]*)"/);
          results.japaneseContent.push({
            class: classMatch ? classMatch[1] : 'no-class',
            contentLength: content.length,
            preview: content.substring(0, 200) + '...',
            fullMatch: match[0].substring(0, 300) + '...'
          });
        }
      });
    }
    
    // Look for specific Watanoc content areas
    const contentAreas = [
      'single-content',
      'entry-content',
      'post-content',
      'article-content',
      'main-content',
      'content-area',
      'post-body',
      'article-body',
      'textBody',
      'text-body',
      'single-article',
      'post-single'
    ];
    
    results.contentAreas = {};
    
    for (const area of contentAreas) {
      const regex = new RegExp(`<div[^>]*class="[^"]*${area}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'i');
      const match = html.match(regex);
      if (match) {
        const content = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        results.contentAreas[area] = {
          found: true,
          contentLength: content.length,
          preview: content.substring(0, 300) + '...',
          hasJapanese: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(content)
        };
      }
    }
    
    // Check article tag
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      const articleContent = articleMatch[1];
      
      // Find all divs within article
      const innerDivs = [...articleContent.matchAll(/<div[^>]*class="([^"]*)"[^>]*>/gi)];
      results.articleStructure = {
        found: true,
        innerDivClasses: innerDivs.map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i),
        contentLength: articleContent.length
      };
      
      // Look for main content within article
      const mainContentMatch = articleContent.match(/<div[^>]*>((?:[^<]|<(?!div))*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]{50,}[\s\S]*?)<\/div>/i);
      if (mainContentMatch) {
        results.articleMainContent = {
          found: true,
          preview: mainContentMatch[1].replace(/<[^>]*>/g, '').substring(0, 500) + '...'
        };
      }
    }
    
    // Try a more aggressive approach - find the largest block of Japanese text
    const allTextBlocks = html.split(/<\/div>|<\/p>|<\/article>/i);
    let largestJapaneseBlock = { text: '', size: 0 };
    
    for (const block of allTextBlocks) {
      const cleanBlock = block.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const japaneseChars = (cleanBlock.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
      
      if (japaneseChars > largestJapaneseBlock.size) {
        largestJapaneseBlock = {
          text: cleanBlock,
          size: japaneseChars
        };
      }
    }
    
    results.largestJapaneseBlock = {
      size: largestJapaneseBlock.size,
      preview: largestJapaneseBlock.text.substring(0, 500) + '...'
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2),
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
    };
  }
};