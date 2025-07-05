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
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
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

  if (!firebaseInitialized || !db) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Firebase not initialized' }),
    };
  }

  try {
    const articlesRef = db.collection('articles');
    
    // Find test articles
    const testPatterns = [
      'Test Article',
      'Scraping Test',
      'Fallback Article',
      'Netlify Functions Working',
      'debugging Netlify functions'
    ];
    
    const snapshot = await articlesRef.get();
    const articlesToDelete = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const isTest = testPatterns.some(pattern => 
        data.title?.includes(pattern) || 
        data.category === 'test' || 
        data.tags?.includes('test') ||
        data.tags?.includes('debug') ||
        data.tags?.includes('fallback') ||
        doc.id.includes('fallback')
      );
      
      if (isTest) {
        articlesToDelete.push({
          id: doc.id,
          title: data.title
        });
      }
    });
    
    // Get delete mode from request body
    const body = event.body ? JSON.parse(event.body) : {};
    const deleteMode = body.mode || 'batch'; // 'batch' or 'individual'
    const articleIds = body.articleIds || null; // For deleting specific articles
    
    let deleteCount = 0;
    const deletedArticles = [];
    
    // If specific article IDs provided, filter to only those
    const finalArticlesToDelete = articleIds 
      ? articlesToDelete.filter(a => articleIds.includes(a.id))
      : articlesToDelete;
    
    if (deleteMode === 'batch' && finalArticlesToDelete.length > 0) {
      // Batch delete - more efficient for multiple articles
      const batch = db.batch();
      
      for (const article of finalArticlesToDelete) {
        batch.delete(articlesRef.doc(article.id));
        deletedArticles.push(article);
        deleteCount++;
      }
      
      try {
        await batch.commit();
        console.log(`Batch deleted ${deleteCount} articles`);
      } catch (error) {
        console.error('Batch delete error:', error);
        // Fallback to individual deletes if batch fails
        deleteCount = 0;
        deletedArticles.length = 0;
        
        for (const article of finalArticlesToDelete) {
          try {
            await articlesRef.doc(article.id).delete();
            deleteCount++;
            deletedArticles.push(article);
            console.log(`Individually deleted: ${article.title}`);
          } catch (err) {
            console.error(`Failed to delete ${article.id}:`, err.message);
          }
        }
      }
    } else {
      // Individual delete mode
      for (const article of finalArticlesToDelete) {
        try {
          await articlesRef.doc(article.id).delete();
          deleteCount++;
          deletedArticles.push(article);
          console.log(`Deleted: ${article.title}`);
        } catch (error) {
          console.error(`Failed to delete ${article.id}:`, error.message);
        }
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Deleted ${deleteCount} test articles`,
        deletedArticles: deletedArticles,
        timestamp: new Date().toISOString()
      }),
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};