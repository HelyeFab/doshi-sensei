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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = JSON.parse(event.body || '{}');
    const { articleIds, deleteAll = false } = body;
    
    if (!articleIds && !deleteAll) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No article IDs provided' }),
      };
    }

    const articlesRef = db.collection('articles');
    let deleteCount = 0;
    const deletedArticles = [];
    const errors = [];

    if (deleteAll) {
      // Delete all articles
      const snapshot = await articlesRef.get();
      const batch = db.batch();
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedArticles.push({ id: doc.id, title: doc.data().title });
      });
      
      if (deletedArticles.length > 0) {
        try {
          await batch.commit();
          deleteCount = deletedArticles.length;
        } catch (error) {
          // Fallback to individual deletes
          for (const doc of snapshot.docs) {
            try {
              await doc.ref.delete();
              deleteCount++;
            } catch (err) {
              errors.push({ id: doc.id, error: err.message });
            }
          }
        }
      }
    } else {
      // Delete specific articles
      const batch = db.batch();
      
      for (const id of articleIds) {
        const docRef = articlesRef.doc(id);
        const doc = await docRef.get();
        
        if (doc.exists) {
          batch.delete(docRef);
          deletedArticles.push({ id, title: doc.data().title });
        }
      }
      
      if (deletedArticles.length > 0) {
        try {
          await batch.commit();
          deleteCount = deletedArticles.length;
        } catch (error) {
          // Fallback to individual deletes
          for (const article of deletedArticles) {
            try {
              await articlesRef.doc(article.id).delete();
              deleteCount++;
            } catch (err) {
              errors.push({ id: article.id, error: err.message });
            }
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Deleted ${deleteCount} articles`,
        deletedArticles,
        errors: errors.length > 0 ? errors : undefined,
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