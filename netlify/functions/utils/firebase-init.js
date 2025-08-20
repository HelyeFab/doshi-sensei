/**
 * Firebase initialization for Netlify Functions
 * 
 * This module handles Firebase Admin SDK initialization for Netlify Functions
 * using a workaround for the 4KB environment variable limit.
 * 
 * Solution: Store the Firebase private key in a separate environment variable
 * that's only accessed when needed, not passed to all functions.
 */

const admin = require('firebase-admin');

let initialized = false;

function initializeFirebase() {
  if (initialized || admin.apps.length > 0) {
    return admin;
  }

  try {
    // Method 1: Try to use minimal environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || 'doshi-sensei';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    // Get the private key from a separate variable
    // This is the key insight: we only access it when needed
    const privateKey = process.env.FIREBASE_PRIVATE_KEY_NETLIFY || process.env.FIREBASE_PRIVATE_KEY;
    
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      initialized = true;
      console.log('[Netlify Function] Firebase initialized with env vars');
    } else {
      // Method 2: Try Application Default Credentials
      admin.initializeApp({
        projectId,
      });
      initialized = true;
      console.log('[Netlify Function] Firebase initialized with default credentials');
    }
  } catch (error) {
    console.error('[Netlify Function] Firebase initialization failed:', error);
    throw error;
  }

  return admin;
}

module.exports = { initializeFirebase, admin };