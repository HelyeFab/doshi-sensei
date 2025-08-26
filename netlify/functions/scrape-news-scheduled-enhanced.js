// Enhanced scheduled scraper that uses all improved scrapers
const admin = require('firebase-admin');
const { filterArticles, quickValidate } = require('./article-quick-validation');

// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase function
async function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length) {
    db = admin.firestore();
    firebaseInitialized = true;
    return true;
  }
  
  try {
    // Try to fetch from GitHub Gist first (for production)
    const gistUrl = 'https://gist.githubusercontent.com/HelyeFab/4a363e7fabaa387b67fa80b5c8cb87d4/raw/firebase-config.json';
    
    console.log('🔄 Fetching Firebase credentials from secure source...');
    const response = await fetch(gistUrl);
    
    if (response.ok) {
      const serviceAccount = await response.json();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from secure source');
      return true;
    } else {
      throw new Error('Failed to fetch from Gist');
    }
  } catch (error) {
    // Fallback to local file for development
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, 'firebase-config.json');
      
      if (fs.existsSync(configPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized from local file');
        return true;
      }
    } catch (fileError) {
      console.error('❌ Failed to read local file:', fileError.message);
    }
    
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
    return false;
  }
}

// Initialize Firebase at module level (critical for Netlify Functions)
if (!admin.apps.length) {
  try {
    // Try to load from JSON file first (deployed but not in Git)
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'firebase-config.json');
    
    if (fs.existsSync(configPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from firebase-config.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from base64');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
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
      console.log('✅ Firebase Admin SDK initialized from env vars');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
  }
} else {
      // Option 2: Use individual environment variables (fallback)
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
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
      console.log('✅ Firebase Admin SDK initialized from individual env vars');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Helper function to trigger a scraper via Netlify function
async function triggerScraper(functionName, sourceName) {
  try {
    console.log(`[Scheduled] Triggering ${sourceName} scraper...`);
    
    // In production, use the full URL
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const url = `${baseUrl}/.netlify/functions/${functionName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'scheduled',
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(55000) // 55 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ [Scheduled] ${sourceName}: ${result.articlesCount || 0} articles scraped`);
      return {
        source: sourceName,
        success: true,
        articlesCount: result.articlesCount || 0
      };
    } else {
      console.error(`❌ [Scheduled] ${sourceName} failed:`, result.error);
      return {
        source: sourceName,
        success: false,
        articlesCount: 0,
        error: result.error
      };
    }
  } catch (error) {
    console.error(`❌ [Scheduled] ${sourceName} error:`, error.message);
    return {
      source: sourceName,
      success: false,
      articlesCount: 0,
      error: error.message
    };
  }
}

// Main handler for both scheduled and HTTP triggers
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // Check if this is a scheduled invocation
  const isScheduled = event.httpMethod === undefined || event.httpMethod === null;
  
  // For HTTP requests, handle CORS
  if (!isScheduled && event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  console.log(`[Scheduled Enhanced] Function triggered (${isScheduled ? 'scheduled' : 'HTTP'})`);
  // Initialize Firebase if needed
  await initializeFirebase();


  try {
    // Check Firebase
    if (!firebaseInitialized || !db) {
      throw new Error('Firebase not initialized. Check environment variables.');
    }

    // Define all scrapers to run
    const scrapers = [
      { function: 'scrape-watanoc-next', name: 'Watanoc' },
      { function: 'scrape-todaii-next', name: 'Todaii' },
      { function: 'scrape-nhk-easy', name: 'NHK Easy' },
      { function: 'scrape-mainichi-shogakusei', name: 'Mainichi Elementary' },
      { function: 'scrape-mainichi-news', name: 'Mainichi Shimbun' }
    ];

    // Run all scrapers in parallel
    const results = await Promise.allSettled(
      scrapers.map(scraper => triggerScraper(scraper.function, scraper.name))
    );

    // Process results
    const summary = {
      totalArticles: 0,
      successfulSources: 0,
      failedSources: 0,
      details: {}
    };

    results.forEach((result, index) => {
      const scraperName = scrapers[index].name;
      if (result.status === 'fulfilled' && result.value.success) {
        summary.successfulSources++;
        summary.totalArticles += result.value.articlesCount;
        summary.details[scraperName] = {
          success: true,
          articles: result.value.articlesCount
        };
      } else {
        summary.failedSources++;
        summary.details[scraperName] = {
          success: false,
          error: result.status === 'rejected' ? result.reason : result.value?.error || 'Unknown error'
        };
      }
    });

    const duration = Date.now() - startTime;
    const finalResult = {
      success: summary.successfulSources > 0,
      summary,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      isScheduled
    };

    console.log('[Scheduled Enhanced] Scraping completed:', finalResult);

    // Log to Firebase for tracking
    if (db && summary.totalArticles > 0) {
      try {
        await db.collection('scraping_logs').add({
          ...finalResult,
          createdAt: admin.firestore.Timestamp.now()
        });
      } catch (logError) {
        console.error('[Scheduled Enhanced] Failed to log results:', logError);
      }
    }

    // Return appropriate response based on trigger type
    if (isScheduled) {
      // For scheduled functions, just log the result
      return finalResult;
    } else {
      // For HTTP requests, return proper HTTP response
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(finalResult)
      };
    }
  } catch (error) {
    console.error('[Scheduled Enhanced] Function error:', error);
    
    const errorResult = {
      success: false,
      error: error.message,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    };

    if (isScheduled) {
      throw error; // Let Netlify handle the error for scheduled functions
    } else {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(errorResult)
      };
    }
  }
};