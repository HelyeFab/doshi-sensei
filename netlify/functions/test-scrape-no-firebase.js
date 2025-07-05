const https = require('https');
const { URL } = require('url');

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
      timeout: 10000
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

  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Basic function execution
  results.tests.basicExecution = { success: true, message: 'Function is running' };

  // Test 2: Can make HTTPS requests
  try {
    const testUrl = 'https://httpbin.org/user-agent';
    const response = await makeRequest(testUrl);
    results.tests.httpsRequest = { 
      success: true, 
      message: 'Can make HTTPS requests',
      response: response.substring(0, 100) + '...'
    };
  } catch (error) {
    results.tests.httpsRequest = { 
      success: false, 
      message: 'Cannot make HTTPS requests',
      error: error.message 
    };
  }

  // Test 3: Try to fetch Watanoc
  try {
    const watanocHtml = await makeRequest('https://watanoc.com');
    results.tests.watanocFetch = { 
      success: true, 
      message: 'Successfully fetched Watanoc',
      htmlLength: watanocHtml.length,
      hasArticles: watanocHtml.includes('article')
    };
  } catch (error) {
    results.tests.watanocFetch = { 
      success: false, 
      message: 'Failed to fetch Watanoc',
      error: error.message 
    };
  }

  // Test 4: Environment check
  results.tests.environment = {
    nodeVersion: process.version,
    hasFirebaseVars: !!process.env.FIREBASE_PROJECT_ID,
    isNetlifyEnv: !!process.env.NETLIFY,
    url: process.env.URL || 'not set'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results, null, 2),
  };
};