import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

let initialized = false;

function initializeAdmin() {
  if (initialized || admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    // Try to use the service account file
    const serviceAccountJson = require('../../firebase-service-account.json');
    
    const serviceAccount: ServiceAccount = {
      projectId: serviceAccountJson.project_id,
      clientEmail: serviceAccountJson.client_email,
      privateKey: serviceAccountJson.private_key,
    };
    
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccountJson.project_id || 'doshi-sensei',
    });
    
    initialized = true;
    console.log('[Firebase Admin] Initialized with service account file');
    return app;
  } catch (error) {
    console.error('[Firebase Admin] Error loading service account:', error);
    
    // Fallback to environment variables
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'doshi-sensei';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (clientEmail && privateKey) {
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
    } else {
      // Minimal initialization - won't work for most operations
      const app = admin.initializeApp({
        projectId,
      });
      
      initialized = true;
      console.log('[Firebase Admin] WARNING: Initialized with minimal config - most operations will fail');
      return app;
    }
  }
}

// Initialize on import
const app = initializeAdmin();

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;