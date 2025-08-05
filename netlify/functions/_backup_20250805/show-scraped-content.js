const admin = require('firebase-admin');

// Initialize Firebase
let firebaseInitialized = false;
let db = null;

if (!admin.apps.length) {
  try {
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
  } catch (error) {
    console.error('Firebase init failed:', error.message);
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
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
    if (!firebaseInitialized || !db) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firebase not configured'
        }),
      };
    }

    // Get recent articles - simpler query
    const results = {};
    
    try {
      // Get the most recent 50 articles
      const snapshot = await db.collection('articles')
        .orderBy('scrapedAt', 'desc')
        .limit(50)
        .get();

      const articlesBySource = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const sourceId = data.source?.id || 'unknown';
        
        if (!articlesBySource[sourceId]) {
          articlesBySource[sourceId] = {
            found: true,
            title: data.title,
            url: data.url,
            difficulty: data.difficulty,
            contentLength: data.content?.length || 0,
            contentPreview: data.content?.substring(0, 500) || 'No content',
            scrapedAt: data.scrapedAt?.toDate() || null,
            hasFurigana: data.hasFurigana || false,
            sourceDisplayName: data.source?.displayName || sourceId
          };
        }
      });
      
      // Add any missing sources
      const sources = ['watanoc', 'todaii', 'nhk-easy', 'nhk-news', 'yahoo-news', 'mainichi-shogakusei'];
      for (const source of sources) {
        if (!articlesBySource[source]) {
          articlesBySource[source] = {
            found: false,
            message: 'No articles found for this source'
          };
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          totalArticlesChecked: snapshot.size,
          sources: articlesBySource,
          timestamp: new Date().toISOString()
        }, null, 2),
      };
      
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sources: results,
        timestamp: new Date().toISOString()
      }, null, 2),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};