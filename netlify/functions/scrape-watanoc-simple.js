// Simplified scraper to test
exports.handler = async (event, context) => {
  console.log('SIMPLE SCRAPER CALLED');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  
  try {
    // Test Firebase initialization
    console.log('Testing Firebase init...');
    const { initializeFirebase, getFirestore, isInitialized } = require('./utils/firebase-init');
    
    const app = initializeFirebase();
    const db = getFirestore();
    const initialized = isInitialized();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Simple scraper works!',
        firebaseInitialized: initialized,
        hasDb: !!db,
        time: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error in simple scraper:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};