// Firebase Admin SDK - Disabled for Netlify deployment
// This file exports a stub when running in Netlify to prevent initialization errors

const isNetlify = process.env.NETLIFY === 'true';

let adminExport: any;

if (isNetlify) {
  // Export a stub for Netlify - admin features won't work but the app won't crash
  adminExport = {
    apps: [],
    auth: () => ({ verifyIdToken: () => Promise.reject(new Error('Firebase Admin disabled in Netlify')) }),
    firestore: () => ({ collection: () => ({ doc: () => ({}) }) }),
  };
  
  console.log('Firebase Admin SDK: Disabled for Netlify deployment');
} else {
  // Normal Firebase Admin for local development
  const admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    try {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "doshi-sensei",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
        universe_domain: "googleapis.com"
      };

      if (!serviceAccount.private_key && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        Object.assign(serviceAccount, credentials);
      }

      if (serviceAccount.private_key && serviceAccount.client_email) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
        console.log('Firebase Admin SDK initialized with service account (local)');
      }
    } catch (error) {
      console.error('Firebase Admin SDK initialization error:', error);
    }
  }
  
  adminExport = admin;
}

export default adminExport;