import admin from 'firebase-admin';

// Lazy initialization of Firebase Admin SDK
let isInitialized = false;

function initializeAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    // Use Application Default Credentials for Netlify deployment
    if (process.env.NETLIFY) {
      // In Netlify, use minimal config with project ID only
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "doshi-sensei",
      });
      console.log('Firebase Admin SDK initialized with default credentials (Netlify)');
    } else {
      // Local development - try individual environment variables
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

      // Fallback to JSON string if individual vars not available
      if (!serviceAccount.private_key && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        Object.assign(serviceAccount, credentials);
      }

      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Firebase service account credentials are not properly configured for local development');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log('Firebase Admin SDK initialized with service account (local)');
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    
    // Fallback: Initialize without credentials (will use default project settings)
    try {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "doshi-sensei",
      });
      console.log('Firebase Admin SDK initialized with fallback configuration');
      isInitialized = true;
    } catch (fallbackError) {
      console.error('Firebase fallback initialization failed:', fallbackError);
      // Don't throw here - let individual functions handle the error
    }
  }
}

// Export a proxy that initializes on first use
export default new Proxy(admin, {
  get(target, prop, receiver) {
    initializeAdmin();
    return Reflect.get(target, prop, receiver);
  }
});