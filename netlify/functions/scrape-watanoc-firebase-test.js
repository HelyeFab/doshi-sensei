// Test Firebase Admin SDK loading step by step
let loadingStep = 'start';

try {
  loadingStep = 'requiring admin';
  const admin = require('firebase-admin');
  
  loadingStep = 'checking apps';
  const hasApps = admin.apps.length > 0;
  
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
      loadingStep = 'handler started';
      
      // Check environment variables
      const firebaseVars = Object.keys(process.env).filter(key => key.includes('FIREBASE'));
      
      loadingStep = 'checking credentials';
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
      const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
      
      let initResult = 'not attempted';
      let dbResult = 'not attempted';
      
      if (hasPrivateKey && hasClientEmail && projectId) {
        try {
          loadingStep = 'attempting firebase init';
          
          if (!admin.apps.length) {
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
            
            initResult = 'success';
            loadingStep = 'getting firestore';
            
            const db = admin.firestore();
            dbResult = 'success';
            loadingStep = 'completed successfully';
          } else {
            initResult = 'already initialized';
            const db = admin.firestore();
            dbResult = 'success';
            loadingStep = 'completed successfully';
          }
        } catch (initError) {
          initResult = `failed: ${initError.message}`;
          loadingStep = `init failed: ${initError.message}`;
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Firebase Admin SDK test results',
          loadingStep,
          firebaseVars,
          credentials: {
            hasProjectId: !!projectId,
            hasPrivateKey,
            hasClientEmail,
            hasPrivateKeyId: !!process.env.FIREBASE_PRIVATE_KEY_ID,
            hasClientId: !!process.env.FIREBASE_CLIENT_ID
          },
          initialization: {
            initResult,
            dbResult,
            existingApps: admin.apps.length
          },
          timestamp: new Date().toISOString()
        }),
      };

    } catch (handlerError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: handlerError.message,
          loadingStep,
          stack: handlerError.stack,
          timestamp: new Date().toISOString()
        }),
      };
    }
  };

} catch (requireError) {
  // If we can't even require firebase-admin, export a handler that reports this
  exports.handler = async (event, context) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to require firebase-admin',
        details: requireError.message,
        loadingStep,
        stack: requireError.stack,
        timestamp: new Date().toISOString()
      }),
    };
  };
}