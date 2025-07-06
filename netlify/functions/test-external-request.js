const https = require('https');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    // Test 1: Simple HTTPS request to a known working endpoint
    const testUrl = 'https://api.github.com/users/github';
    
    const data = await new Promise((resolve, reject) => {
      https.get(testUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) // First 200 chars
        }));
      }).on('error', reject);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        test: 'External HTTPS request',
        result: data,
        timestamp: new Date().toISOString()
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};