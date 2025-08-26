const admin = require('firebase-admin');

// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase function
async function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length) {
    db = admin.firestore();
    firebaseInitialized = true;
    return { success: true, db };
  }
  
  try {
    // Try to fetch from GitHub Gist first (for production)
    const gistUrl = 'https://gist.githubusercontent.com/HelyeFab/4a363e7fabaa387b67fa80b5c8cb87d4/raw/firebase-config.json';
    
    console.log('🔄 Fetching Firebase credentials from secure source...');
    const response = await fetch(gistUrl);
    
    if (response.ok) {
      const serviceAccount = await response.json();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from secure source');
      return { success: true, db };
    } else {
      throw new Error('Failed to fetch from Gist');
    }
  } catch (error) {
    // Fallback to local file for development
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, 'firebase-config.json');
      
      if (fs.existsSync(configPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized from local file');
        return { success: true, db };
      }
    } catch (fileError) {
      console.error('❌ Failed to read local file:', fileError.message);
    }
    
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeFirebase,
  getDb: () => db,
  isInitialized: () => firebaseInitialized,
  getAdmin: () => admin
};