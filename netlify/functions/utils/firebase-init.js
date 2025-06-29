const admin = require('firebase-admin');

let app = null;
let db = null;
let initialized = false;
let initError = null;

/**
 * Safe Firebase initialization for Netlify Functions
 * Ensures single initialization and proper error handling
 */
function initializeFirebase() {
  // Return cached instance if already initialized
  if (initialized) {
    return { admin, db, error: initError };
  }

  // Return error if initialization previously failed
  if (initError) {
    return { admin: null, db: null, error: initError };
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 
                     process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                     'doshi-sensei';

    // Check if already initialized by another function
    if (admin.apps.length > 0) {
      app = admin.apps[0];
      db = admin.firestore();
      initialized = true;
      console.log('✅ Firebase already initialized');
      return { admin, db, error: null };
    }

    // Try to initialize with service account
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || "",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
        universe_domain: "googleapis.com"
      };

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
      
      db = admin.firestore();
      initialized = true;
      console.log('✅ Firebase initialized with service account');
      
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Try parsing service account from JSON env var
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      
      db = admin.firestore();
      initialized = true;
      console.log('✅ Firebase initialized with service account JSON');
      
    } else {
      // Initialize with project ID only (limited functionality)
      app = admin.initializeApp({ projectId });
      db = admin.firestore();
      initialized = true;
      console.log('⚠️ Firebase initialized with project ID only - limited functionality');
    }

    return { admin, db, error: null };
    
  } catch (error) {
    initError = error;
    console.error('❌ Firebase initialization failed:', error.message);
    return { admin: null, db: null, error };
  }
}

module.exports = { initializeFirebase };