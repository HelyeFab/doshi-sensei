const https = require('https');
const http = require('http');
const { URL } = require('url');

// Simple request function
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    };

    console.log(`Making request to: ${url}`);
    console.log('Options:', JSON.stringify(options, null, 2));

    const req = client.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let data = '';
      
      // Handle different encodings
      if (res.headers['content-encoding'] === 'gzip') {
        const zlib = require('zlib');
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        
        gunzip.on('data', chunk => {
          data += chunk.toString();
        });
        
        gunzip.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            length: data.length
          });
        });
        
        gunzip.on('error', reject);
      } else {
        res.setEncoding('utf8');
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            length: data.length
          });
        });
      }
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
    
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

  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Watanoc.com
  try {
    console.log('\n=== Testing Watanoc.com ===');
    const watanoc = await makeRequest('https://watanoc.com');
    
    // Check for articles
    const articleCount = (watanoc.data.match(/<article/gi) || []).length;
    const hasLoop = watanoc.data.includes('loop-article');
    const titleMatches = watanoc.data.match(/title="([^"]+)"/g) || [];
    
    results.tests.push({
      name: 'Watanoc',
      success: true,
      status: watanoc.status,
      dataLength: watanoc.length,
      articleCount,
      hasLoopArticle: hasLoop,
      sampleTitles: titleMatches.slice(0, 5).map(t => t.replace(/title="|"/g, '')),
      headers: watanoc.headers
    });
  } catch (error) {
    results.tests.push({
      name: 'Watanoc',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }

  // Test 2: Try HTTP instead of HTTPS for Watanoc
  try {
    console.log('\n=== Testing Watanoc.com (HTTP) ===');
    const watanocHttp = await makeRequest('http://watanoc.com');
    
    results.tests.push({
      name: 'Watanoc HTTP',
      success: true,
      status: watanocHttp.status,
      dataLength: watanocHttp.length,
      headers: watanocHttp.headers
    });
  } catch (error) {
    results.tests.push({
      name: 'Watanoc HTTP',
      success: false,
      error: error.message
    });
  }

  // Test 3: Todaii
  try {
    console.log('\n=== Testing todaijapanese.com ===');
    const todaii = await makeRequest('https://todaijapanese.com');
    
    results.tests.push({
      name: 'Todaii',
      success: true,
      status: todaii.status,
      dataLength: todaii.length,
      hasNewsLinks: todaii.data.includes('/news/'),
      headers: todaii.headers
    });
  } catch (error) {
    results.tests.push({
      name: 'Todaii',
      success: false,
      error: error.message
    });
  }

  // Test 4: NHK Easy
  try {
    console.log('\n=== Testing NHK Easy JSON ===');
    const nhk = await makeRequest('https://www3.nhk.or.jp/news/easy/news-list.json');
    
    results.tests.push({
      name: 'NHK Easy',
      success: true,
      status: nhk.status,
      dataLength: nhk.length,
      isJson: nhk.data.trim().startsWith('{') || nhk.data.trim().startsWith('['),
      headers: nhk.headers
    });
  } catch (error) {
    results.tests.push({
      name: 'NHK Easy',
      success: false,
      error: error.message
    });
  }

  // Test 5: Check DNS resolution
  const dns = require('dns').promises;
  try {
    const addresses = await dns.resolve4('watanoc.com');
    results.dns = {
      watanoc: addresses
    };
  } catch (error) {
    results.dns = {
      error: error.message
    };
  }

  // Test 6: Environment info
  results.environment = {
    nodeVersion: process.version,
    platform: process.platform,
    netlify: !!process.env.NETLIFY,
    awsRegion: process.env.AWS_REGION,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results, null, 2),
  };
};