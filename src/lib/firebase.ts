import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Initialize Firebase
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

// Only initialize if we have the required config
if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  // Initialize Firebase (works on both client and server)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize services
  // Auth and Storage are only needed on client side
  if (typeof window !== 'undefined') {
    auth = getAuth(app);
    storage = getStorage(app);
  }

  // Firestore is needed on both client and server (for caching)
  db = getFirestore(app);
} else {
  console.error('[Firebase] Missing required configuration:', {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId
  });
}

// Export simple getters for compatibility
export function getAuthInstance() {
  if (!auth && app && typeof window !== 'undefined') {
    auth = getAuth(app);
  }
  return auth;
}

export function getFirestoreInstance() {
  if (!db && app) {
    db = getFirestore(app);
  }
  return db;
}

export function getStorageInstance() {
  if (!storage && app && typeof window !== 'undefined') {
    storage = getStorage(app);
  }
  return storage;
}

// Simple initialization check
export async function ensureFirebaseInitialized() {
  return new Promise<void>((resolve, reject) => {
    if (!app) {
      reject(new Error('Firebase not initialized. Check environment variables.'));
      return;
    }
    
    // For client-side, ensure auth is available
    if (typeof window !== 'undefined' && !auth) {
      auth = getAuth(app);
    }
    
    resolve();
  });
}

export { auth, db, storage };
export default app;