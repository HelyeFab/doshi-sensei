// Firebase initialization for Netlify Functions
// This module provides a safe way to initialize Firebase in a serverless environment

const admin = require('firebase-admin');

let app = null;

function initializeFirebase() {
  if (app) {
    return app;
  }

  try {
    // Check if we're in a Netlify Functions environment
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable not set');
      return null;
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
    });

    console.log('Firebase Admin initialized successfully');
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
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
  }
};