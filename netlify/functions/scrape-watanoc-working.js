const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
let db = null;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
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
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Mock article data
const getMockArticles = () => [
  {
    id: `watanoc_${Date.now()}_001`,
    title: '日本の四季',
    content: '日本には美しい四季があります。春は桜、夏は祭り、秋は紅葉、冬は雪です。それぞれの季節には特別な魅力があります。',
    summary: '日本の四季の美しさについての記事です。',
    url: 'https://watanoc.com/articles/seasons',
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400',
    publishDate: new Date(),
    scrapedAt: new Date(),
    source: {
      id: 'watanoc',
      name: 'Watanoc',
      displayName: 'Watanoc - Japanese Learning Articles'
    },
    category: 'culture',
    tags: ['seasons', 'nature', 'culture'],
    difficulty: 'N5',
    estimatedReadingTime: 2,
    vocabulary: [],
    kanji: []
  },
  {
    id: `watanoc_${Date.now()}_002`,
    title: '東京の交通システム',
    content: '東京の電車とバスのシステムは世界で最も複雑で効率的です。毎日何百万人もの人々が利用しています。',
    summary: '東京の公共交通システムについて説明します。',
    url: 'https://watanoc.com/articles/tokyo-transport',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
    publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    scrapedAt: new Date(),
    source: {
      id: 'watanoc',
      name: 'Watanoc',
      displayName: 'Watanoc - Japanese Learning Articles'
    },
    category: 'transportation',
    tags: ['tokyo', 'trains', 'transport'],
    difficulty: 'N4',
    estimatedReadingTime: 3,
    vocabulary: [],
    kanji: []
  }
];

// Function to save articles to Firebase
async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

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
  console.log(`✅ Successfully saved ${articles.length} articles to Firebase`);
  
  return true;
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
    console.log('🚀 Working Watanoc scraping function triggered');
    console.log('📅 Event type:', event.httpMethod || 'scheduled');
    console.log('🔧 Firebase initialized:', firebaseInitialized);

    // Check if Firebase is properly initialized
    if (!firebaseInitialized) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firebase Admin SDK not configured',
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Get mock articles (replace with real scraping later)
    const articles = getMockArticles();
    
    // Save articles to Firebase
    await saveArticlesToFirebase(articles);
    
    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} mock articles to Firebase`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString()
      }),
    };
    
  } catch (error) {
    console.error('💥 Unexpected error in working scraping function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during article scraping',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};