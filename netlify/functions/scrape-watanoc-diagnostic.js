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

// Simple HTTP request function with detailed logging
function makeRequest(url) {
  console.log(`🌐 Making request to: ${url}`);
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      timeout: 30000
    };

    console.log('📋 Request options:', JSON.stringify({
      hostname: options.hostname,
      path: options.path,
      headers: options.headers
    }, null, 2));

    const req = https.request(options, (res) => {
      console.log(`📊 Response status: ${res.statusCode}`);
      console.log(`📊 Response headers:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Response received, length: ${data.length} characters`);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request error:`, error);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('⏱️ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Diagnostic scraping function
async function diagnosticScrape() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Simple HTTPS request to watanoc.com
  console.log('\n🧪 Test 1: Simple HTTPS request to watanoc.com');
  try {
    const response = await makeRequest('https://watanoc.com/');
    results.tests.push({
      test: 'Simple HTTPS request',
      url: 'https://watanoc.com/',
      success: true,
      statusCode: response.statusCode,
      responseLength: response.body.length,
      hasJapaneseContent: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(response.body),
      sampleContent: response.body.substring(0, 200)
    });
  } catch (error) {
    results.tests.push({
      test: 'Simple HTTPS request',
      url: 'https://watanoc.com/',
      success: false,
      error: error.message,
      errorStack: error.stack
    });
  }

  // Test 2: Category page
  console.log('\n🧪 Test 2: Category page request');
  try {
    const response = await makeRequest('https://watanoc.com/category/simplejapanese');
    
    // Look for links in the response
    const linkMatches = response.body.match(/href=["']([^"']+)["']/gi) || [];
    const watanoclLinks = linkMatches
      .map(match => match.replace(/href=["']|["']/g, ''))
      .filter(link => link.includes('watanoc.com') && !link.includes('/category/') && !link.includes('/tag/'))
      .slice(0, 5);
    
    results.tests.push({
      test: 'Category page request',
      url: 'https://watanoc.com/category/simplejapanese',
      success: true,
      statusCode: response.statusCode,
      responseLength: response.body.length,
      totalLinksFound: linkMatches.length,
      watanoclArticleLinks: watanoclLinks.length,
      sampleLinks: watanoclLinks
    });
  } catch (error) {
    results.tests.push({
      test: 'Category page request',
      url: 'https://watanoc.com/category/simplejapanese',
      success: false,
      error: error.message
    });
  }

  // Test 3: Check if we can access a specific article
  console.log('\n🧪 Test 3: Specific article request');
  const testArticleUrl = 'https://watanoc.com/sake-museum';
  try {
    const response = await makeRequest(testArticleUrl);
    
    // Extract title
    const titleMatch = response.body.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = response.body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    
    // Extract some content
    const paragraphs = response.body.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
    
    results.tests.push({
      test: 'Specific article request',
      url: testArticleUrl,
      success: true,
      statusCode: response.statusCode,
      responseLength: response.body.length,
      title: titleMatch ? titleMatch[1].trim() : 'No title found',
      h1: h1Match ? h1Match[1].trim() : 'No H1 found',
      paragraphCount: paragraphs.length,
      hasJapaneseContent: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(response.body)
    });
  } catch (error) {
    results.tests.push({
      test: 'Specific article request',
      url: testArticleUrl,
      success: false,
      error: error.message
    });
  }

  // Test 4: Check environment
  console.log('\n🧪 Test 4: Environment check');
  results.tests.push({
    test: 'Environment check',
    nodeVersion: process.version,
    platform: process.platform,
    firebaseInitialized: firebaseInitialized,
    hasFirebaseCredentials: !!process.env.FIREBASE_PRIVATE_KEY,
    netlifyFunction: !!process.env.NETLIFY,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'not-lambda'
  });

  return results;
}

// Main handler
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
    console.log('🚀 Diagnostic Watanoc scraping function triggered');
    
    const diagnosticResults = await diagnosticScrape();
    
    // Try to save results to Firebase if available
    if (firebaseInitialized && db) {
      try {
        await db.collection('diagnostics').add({
          ...diagnosticResults,
          createdAt: admin.firestore.Timestamp.now()
        });
        console.log('✅ Diagnostic results saved to Firebase');
      } catch (error) {
        console.error('❌ Failed to save to Firebase:', error);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Diagnostic tests completed',
        results: diagnosticResults
      }),
    };
    
  } catch (error) {
    console.error('💥 Error in diagnostic function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Diagnostic test failed',
        details: error.message,
        stack: error.stack
      }),
    };
  }
};