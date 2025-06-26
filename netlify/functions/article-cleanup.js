const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Use individual environment variables for Netlify
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
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
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

// Article cleanup configuration
const ARTICLE_CONFIG = {
  expirationDays: 60,
  archiveAfterDays: 30,
  batchSize: 100
};

/**
 * Cleanup expired articles - scheduled function
 * This function runs automatically to clean up expired articles
 */
exports.handler = async (event, context) => {
  console.log('🧹 Starting scheduled article cleanup...');
  
  try {
    const now = admin.firestore.Timestamp.now();
    const expirationThreshold = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - ARTICLE_CONFIG.expirationDays * 24 * 60 * 60 * 1000)
    );
    
    // Find expired articles
    const expiredQuery = db.collection('articles')
      .where('expiresAt', '<=', now)
      .where('isArchived', '==', false)
      .limit(ARTICLE_CONFIG.batchSize);
    
    const snapshot = await expiredQuery.get();
    
    if (snapshot.empty) {
      console.log('✅ No expired articles found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No expired articles found',
          processed: 0,
          deleted: 0,
          archived: 0
        })
      };
    }
    
    const batch = db.batch();
    let deletedCount = 0;
    let archivedCount = 0;
    
    for (const doc of snapshot.docs) {
      const article = doc.data();
      
      // If article is bookmarked, archive instead of delete
      if (article.bookmarkedBy && article.bookmarkedBy.length > 0) {
        batch.update(doc.ref, { 
          isArchived: true,
          archivedAt: now 
        });
        archivedCount++;
        console.log(`📦 Archiving bookmarked article: ${article.title}`);
      } else {
        batch.delete(doc.ref);
        deletedCount++;
        console.log(`🗑️ Deleting expired article: ${article.title}`);
      }
    }
    
    await batch.commit();
    
    const result = {
      success: true,
      message: `Cleanup completed: ${deletedCount} deleted, ${archivedCount} archived`,
      processed: snapshot.size,
      deleted: deletedCount,
      archived: archivedCount,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Article cleanup completed:', result);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('❌ Error during article cleanup:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};