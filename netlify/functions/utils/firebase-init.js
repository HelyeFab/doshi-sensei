// Firebase initialization for Netlify Functions
// This module provides a safe way to initialize Firebase in a serverless environment

const admin = require('firebase-admin');

let app = null;
let initializationError = null;

function initializeFirebase() {
  if (app) {
    return app;
  }

  // If already initialized globally
  if (admin.apps.length > 0) {
    app = admin.apps[0];
    return app;
  }

  // Get project ID with fallbacks
  const projectId = process.env.FIREBASE_PROJECT_ID || 
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
    "doshi-sensei";

  try {
    let serviceAccount = null;
    
    // Method 1: Try to parse FIREBASE_SERVICE_ACCOUNT JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Using FIREBASE_SERVICE_ACCOUNT JSON');
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError.message);
      }
    }
    
    // Method 2: Try FIREBASE_SERVICE_ACCOUNT_KEY (alternative name)
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY JSON');
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
      }
    }
    
    // Method 3: Build from individual environment variables
    if (!serviceAccount) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
      const clientId = process.env.FIREBASE_CLIENT_ID || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID;
      const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID;
      
      if (privateKey && clientEmail) {
        serviceAccount = {
          type: "service_account",
          project_id: projectId,
          private_key_id: privateKeyId || "",
          private_key: privateKey.replace(/\\n/g, '\n'),
          client_email: clientEmail,
          client_id: clientId || "",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
          universe_domain: "googleapis.com"
        };
        console.log('Using individual Firebase environment variables');
      }
    }
    
    // Initialize Firebase Admin
    if (serviceAccount) {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}.firebaseio.com`
      });
      console.log(`Firebase Admin initialized successfully for project: ${serviceAccount.project_id || projectId}`);
      return app;
    } else {
      // Method 4: Try minimal initialization with just project ID
      console.warn('No Firebase credentials found, attempting minimal initialization');
      app = admin.initializeApp({
        projectId: projectId
      });
      console.log(`Firebase Admin initialized with project ID only: ${projectId}`);
      return app;
    }
  } catch (error) {
    initializationError = error;
    console.error('Error initializing Firebase Admin:', error.message);
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('FIREBASE')).join(', '));
    return null;
  }
}

// Export functions for use in Netlify Functions
module.exports = {
  initializeFirebase,
  getFirestore: () => {
    const app = initializeFirebase();
    return app ? admin.firestore() : null;
  },
  getAuth: () => {
    const app = initializeFirebase();
    return app ? admin.auth() : null;
  },
  getStorage: () => {
    const app = initializeFirebase();
    return app ? admin.storage() : null;
  },
  getInitializationError: () => initializationError,
  isInitialized: () => app !== null || admin.apps.length > 0
};