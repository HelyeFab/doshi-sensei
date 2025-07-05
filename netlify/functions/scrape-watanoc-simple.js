const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
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
  } catch (error) {
    console.error('Firebase init error:', error.message);
  }
}

const db = admin.firestore();

// Mock articles - return empty array to avoid test data
const getMockArticles = () => [];

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
    console.log('🚀 Simple Watanoc scraping function triggered');
    
    // Get mock articles
    const articles = getMockArticles();
    
    // Try to save to Firebase (but don't fail if it doesn't work)
    let savedToFirebase = false;
    try {
      const batch = db.batch();
      const articlesRef = db.collection('articles');
      
      for (const article of articles) {
        const docRef = articlesRef.doc(article.id);
        batch.set(docRef, {
          ...article,
          publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
          scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
        });
      }
      
      await batch.commit();
      savedToFirebase = true;
      console.log('✅ Saved to Firebase');
    } catch (error) {
      console.error('❌ Firebase save error:', error.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully processed ${articles.length} test articles`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title })),
        savedToFirebase,
        timestamp: new Date().toISOString(),
        fallbackUsed: true
      }),
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    
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