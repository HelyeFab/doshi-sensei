const https = require('https');
const { URL } = require('url');

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
        'Accept-Language': 'ja,en-US;q=0.8,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      },
      timeout: 15000
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

// Debug function to test Watanoc scraping
async function debugWatanocScraping() {
  console.log('🔍 Starting Watanoc debug test...\n');
  
  try {
    const response = await makeRequest('https://watanoc.com/');
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    console.log(`📏 HTML Length: ${response.body.length} characters`);
    console.log(`🌐 Content-Type: ${response.headers['content-type']}`);
    
    // Check for common patterns
    const patterns = {
      'Article tags': /<article/gi,
      'Post class divs': /<div[^>]*class="[^"]*post[^"]*"/gi,
      'Entry class divs': /<div[^>]*class="[^"]*entry[^"]*"/gi,
      'H1 tags': /<h1[^>]*>/gi,
      'H2 tags': /<h2[^>]*>/gi,
      'Links with Japanese': /<a[^>]*>[^<]*[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+[^<]*<\/a>/gi,
      'Any links': /<a[^>]*href=["'][^"']+["'][^>]*>/gi
    };
    
    console.log('\n🔎 Pattern Analysis:');
    for (const [name, pattern] of Object.entries(patterns)) {
      const matches = response.body.match(pattern) || [];
      console.log(`  ${name}: ${matches.length} found`);
    }
    
    // Find all unique links
    const linkPattern = /href=["']([^"']+)["']/gi;
    const allLinks = [];
    let match;
    while ((match = linkPattern.exec(response.body)) !== null) {
      allLinks.push(match[1]);
    }
    
    // Filter for potential article links
    const articleLinks = allLinks.filter(link => {
      return link.includes('watanoc.com') && 
             !link.includes('/tag/') &&
             !link.includes('/category/') &&
             !link.includes('/wp-') &&
             !link.includes('#') &&
             !link.includes('.css') &&
             !link.includes('.js') &&
             !link.includes('.jpg') &&
             !link.includes('.png') &&
             link !== 'https://watanoc.com/' &&
             link !== 'https://watanoc.com';
    });
    
    console.log(`\n📄 Potential Article Links Found: ${articleLinks.length}`);
    if (articleLinks.length > 0) {
      console.log('  Sample links:');
      articleLinks.slice(0, 5).forEach(link => {
        console.log(`    - ${link}`);
      });
    }
    
    // Look for Japanese content
    const japaneseContent = response.body.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [];
    console.log(`\n🇯🇵 Japanese Content: ${japaneseContent.length > 0 ? 'Found' : 'Not found'}`);
    
    // Check for WordPress patterns
    const isWordPress = response.body.includes('wp-content') || response.body.includes('wp-json');
    console.log(`\n📝 WordPress Site: ${isWordPress ? 'Yes' : 'No'}`);
    
    // Sample HTML structure
    console.log('\n📋 HTML Structure Sample:');
    const structureSample = response.body.substring(0, 500).replace(/\s+/g, ' ');
    console.log(structureSample + '...');
    
  } catch (error) {
    console.error('❌ Error during debug test:', error.message);
  }
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
    await debugWatanocScraping();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Debug test completed. Check logs for details.',
        timestamp: new Date().toISOString()
      }),
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Debug test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};