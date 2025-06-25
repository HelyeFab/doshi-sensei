const admin = require('firebase-admin');
const https = require('https');

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

// Very simple fetch function
async function simpleFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Main function
async function testScraping() {
  const results = [];
  
  try {
    // Test 1: Fetch main page
    console.log('Test 1: Fetching main page...');
    const mainPage = await simpleFetch('https://watanoc.com/');
    results.push({
      test: 'Main page',
      url: 'https://watanoc.com/',
      status: mainPage.status,
      dataLength: mainPage.data.length,
      hasContent: mainPage.data.length > 1000
    });
    
    // Test 2: Fetch a category page
    console.log('Test 2: Fetching category page...');
    const categoryPage = await simpleFetch('https://watanoc.com/category/simplejapanese');
    results.push({
      test: 'Category page',
      url: 'https://watanoc.com/category/simplejapanese',
      status: categoryPage.status,
      dataLength: categoryPage.data.length,
      hasContent: categoryPage.data.length > 1000
    });
    
    // Extract some links from category page
    const linkMatches = categoryPage.data.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/g) || [];
    const articleLinks = linkMatches
      .map(m => m.replace(/href="|"/g, ''))
      .filter(link => 
        !link.includes('/category/') && 
        !link.includes('/tag/') && 
        !link.includes('/page/') &&
        !link.includes('#') &&
        link !== 'https://watanoc.com/'
      )
      .slice(0, 3);
    
    results.push({
      test: 'Link extraction',
      totalLinks: linkMatches.length,
      articleLinks: articleLinks.length,
      sampleLinks: articleLinks
    });
    
    // Test 3: Try to fetch first article
    if (articleLinks.length > 0) {
      console.log('Test 3: Fetching article...');
      const article = await simpleFetch(articleLinks[0]);
      
      // Extract title
      const titleMatch = article.data.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1] : 'No title';
      
      results.push({
        test: 'Article fetch',
        url: articleLinks[0],
        status: article.status,
        dataLength: article.data.length,
        title: title,
        hasJapanese: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(article.data)
      });
    }
    
  } catch (error) {
    results.push({
      test: 'Error',
      error: error.message,
      stack: error.stack
    });
  }
  
  return results;
}

// Save test article to Firebase
async function saveTestArticle() {
  if (!firebaseInitialized || !db) {
    return { saved: false, reason: 'Firebase not initialized' };
  }
  
  try {
    const testArticle = {
      id: `test_${Date.now()}`,
      title: 'Test Article from Simple Scraper',
      content: 'This is a test article to verify Firebase saving works correctly.',
      url: 'https://watanoc.com/test',
      publishDate: admin.firestore.Timestamp.now(),
      scrapedAt: admin.firestore.Timestamp.now(),
      source: {
        id: 'watanoc',
        name: 'Watanoc Test',
        displayName: 'Watanoc - Test'
      },
      category: 'test',
      tags: ['test'],
      difficulty: 'N5',
      estimatedReadingTime: 1
    };
    
    await db.collection('articles').doc(testArticle.id).set(testArticle);
    
    return { saved: true, articleId: testArticle.id };
  } catch (error) {
    return { saved: false, error: error.message };
  }
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
    console.log('🚀 Simple Watanoc test function triggered');
    
    const testResults = await testScraping();
    const saveResult = await saveTestArticle();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Simple test completed',
        testResults,
        saveResult,
        environment: {
          nodeVersion: process.version,
          netlify: !!process.env.NETLIFY,
          firebaseConfigured: firebaseInitialized
        }
      }),
    };
    
  } catch (error) {
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