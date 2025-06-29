import * as admin from 'firebase-admin';

// Singleton instance
let adminInstance: admin.app.App | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Safe initialization of Firebase Admin SDK for Netlify Functions
 * This ensures we don't have race conditions or multiple initializations
 */
async function initializeAdmin(): Promise<void> {
  // If already initializing, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // If already initialized, return immediately
  if (adminInstance || admin.apps.length > 0) {
    return;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID || 
                       process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                       "doshi-sensei";

      // Try different initialization methods
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Full service account JSON
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminInstance = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        });
        console.log('Firebase Admin initialized with service account JSON');
      } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        // Individual environment variables
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
        
        adminInstance = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          projectId,
        });
        console.log('Firebase Admin initialized with environment variables');
      } else {
        // Minimal initialization
        adminInstance = admin.initializeApp({ projectId });
        console.log('Firebase Admin initialized with project ID only');
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      // Don't throw - let operations fail gracefully
    }
  })();

  return initializationPromise;
}

/**
 * Get Firebase Admin instance
 * Always await this before using admin
 */
export async function getFirebaseAdmin(): Promise<typeof admin> {
  await initializeAdmin();
  return admin;
}

// For synchronous contexts where we can't await
export function getFirebaseAdminSync(): typeof admin {
  // Note: This might not be initialized yet
  if (!adminInstance && admin.apps.length === 0) {
    console.warn('Firebase Admin accessed before initialization');
  }
  return admin;
}

export default { getFirebaseAdmin, getFirebaseAdminSync };