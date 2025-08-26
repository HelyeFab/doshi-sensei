import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

let initialized = false;

function initializeAdmin() {
  if (initialized || admin.apps.length > 0) {
    return admin.apps[0];
  }

  // Use environment variables for Firebase Admin
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'doshi-sensei';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  // During build phase or when credentials are missing, initialize with minimal config
  if (!clientEmail || !privateKey) {
    // This is expected during build phase or local development without admin credentials
    const app = admin.initializeApp({
      projectId,
    });
    
    initialized = true;
    // Only log if we're not in build phase
    if (process.env.NODE_ENV !== 'production' || process.env.NETLIFY !== 'true') {
      console.log('[Firebase Admin] Initialized with minimal config (build phase or missing credentials)');
    }
    return app;
  }
  
  // Production initialization with full credentials
  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      projectId,
    });
    
    initialized = true;
    console.log('[Firebase Admin] Initialized with environment variables');
    return app;
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error);
    // Fallback to minimal config
    const app = admin.initializeApp({
      projectId,
    });
    
    initialized = true;
    return app;
  }
}

// Initialize on import
const app = initializeAdmin();

// Export admin instance and helpers
// These will work when credentials are available, but won't throw during build
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null as any;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null as any;
export default admin;