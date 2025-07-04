const { initializeFirebase, getFirestore, isInitialized, getInitializationError } = require('./utils/firebase-init');

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
    console.log('--- TEST SCRAPER INITIALIZATION ---');
    
    // Initialize Firebase
    const app = initializeFirebase();
    const db = getFirestore();
    const initialized = isInitialized();
    const error = getInitializationError();

    // Check available environment variables
    const firebaseVars = Object.keys(process.env).filter(key => 
      key.includes('FIREBASE') || key.includes('NEXT_PUBLIC_FIREBASE')
    );
    
    // Test Firestore access if initialized
    let firestoreTest = null;
    if (db && initialized) {
      try {
        // Try to read a simple document
        const testDoc = await db.collection('_test').doc('test').get();
        firestoreTest = {
          success: true,
          message: 'Firestore access successful',
          exists: testDoc.exists
        };
      } catch (fsError) {
        firestoreTest = {
          success: false,
          message: 'Firestore access failed',
          error: fsError.message
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: initialized,
        firebaseInitialized: initialized,
        initializationError: error ? error.message : null,
        availableFirebaseVars: firebaseVars,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT_FOUND',
        firestoreTest,
        timestamp: new Date().toISOString()
      }),
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
      }),
    };
  }
};