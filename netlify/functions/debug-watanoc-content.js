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
    // Test with a specific article URL
    const testUrl = 'https://watanoc.com/post-7964/';
    console.log(`Fetching test article: ${testUrl}`);
    
    const html = await makeRequest(testUrl);
    console.log(`Fetched ${html.length} bytes`);
    
    // Try different selectors for content
    const selectors = [
      /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*single-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    
    const results = {
      url: testUrl,
      htmlLength: html.length,
      contentMatches: []
    };
    
    // Check for Japanese content sections
    const japaneseContentPattern = /<div[^>]*class="[^"]*japanese[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const japaneseMatches = html.match(japaneseContentPattern);
    if (japaneseMatches) {
      results.japaneseContent = {
        found: true,
        count: japaneseMatches.length,
        sample: japaneseMatches[0].substring(0, 500)
      };
    }
    
    // Look for any div with Japanese text
    const divPattern = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    const divMatches = [...html.matchAll(divPattern)];
    const japaneseDivs = divMatches.filter(match => {
      const content = match[1];
      // Check if content has significant Japanese characters
      const japaneseChars = (content.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
      return japaneseChars > 50; // At least 50 Japanese characters
    });
    
    if (japaneseDivs.length > 0) {
      results.japaneseDivs = {
        count: japaneseDivs.length,
        samples: japaneseDivs.slice(0, 3).map(div => ({
          class: div[0].match(/class="([^"]*)"/)?.[1] || 'no-class',
          content: div[1].substring(0, 200).replace(/<[^>]*>/g, '').trim() + '...'
        }))
      };
    }
    
    // Try each selector
    for (const selector of selectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const cleanContent = match[1]
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<style[^>]*>.*?<\/style>/gis, '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanContent.length > 100) {
          results.contentMatches.push({
            selector: selector.toString().substring(0, 50) + '...',
            contentLength: cleanContent.length,
            preview: cleanContent.substring(0, 300) + '...'
          });
        }
      }
    }
    
    // Look for specific Watanoc content structure
    const postBodyMatch = html.match(/<div[^>]*class="[^"]*post-body[^"]*"[^>]*>([\s\S]*?)<footer/i);
    if (postBodyMatch) {
      results.postBody = {
        found: true,
        length: postBodyMatch[1].length,
        preview: postBodyMatch[1].substring(0, 500).replace(/<[^>]*>/g, '').trim()
      };
    }
    
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