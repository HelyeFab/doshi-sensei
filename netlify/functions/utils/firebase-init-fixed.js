const admin = require('firebase-admin');

// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase at module level (critical for Netlify Functions)
function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      // Option 1: Use base64 encoded service account (to work around Netlify's 4KB limit)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        firebaseInitialized = true;
        db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized from base64 service account');
        return { db, firebaseInitialized };
      }
      
      // Option 2: Use individual environment variables (fallback)
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

      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from individual env vars');
      
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      firebaseInitialized = false;
    }
  } else {
    firebaseInitialized = true;
    db = admin.firestore();
  }
  
  return { db, firebaseInitialized };
}

module.exports = { initializeFirebase };