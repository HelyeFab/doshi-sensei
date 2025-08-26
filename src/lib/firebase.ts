import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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

// Validate configuration
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

if (!isConfigValid) {
  console.error('[Firebase] Invalid configuration:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING'
  });
}

// Initialize Firebase app
let app: FirebaseApp | null = null;

if (isConfigValid) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] App initialized');
  } else {
    app = getApps()[0];
    console.log('[Firebase] Using existing app');
  }
}

// Initialize services lazily
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Get or create auth instance
export function getAuthInstance(): Auth {
  if (!app) {
    throw new Error('Firebase app not initialized. Check your environment variables.');
  }
  
  if (!auth) {
    auth = getAuth(app);
    console.log('[Firebase] Auth service initialized');
    
    // Set up auth state listener for debugging
    if (typeof window !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        console.log('[Firebase Auth] State changed:', user?.email || 'signed out');
      });
    }
  }
  
  return auth;
}

// Get or create Firestore instance
export function getFirestoreInstance(): Firestore {
  if (!app) {
    throw new Error('Firebase app not initialized');
  }
  
  if (!db) {
    db = getFirestore(app);
    console.log('[Firebase] Firestore initialized');
  }
  
  return db;
}

// Get or create Storage instance
export function getStorageInstance(): FirebaseStorage {
  if (!app) {
    throw new Error('Firebase app not initialized');
  }
  
  if (!storage) {
    storage = getStorage(app);
    console.log('[Firebase] Storage initialized');
  }
  
  return storage;
}

// Initialize all services for client-side use
export function initializeFirebaseClient(): { auth: Auth; db: Firestore; storage: FirebaseStorage } | null {
  if (typeof window === 'undefined' || !app) {
    return null;
  }
  
  return {
    auth: getAuthInstance(),
    db: getFirestoreInstance(),
    storage: getStorageInstance()
  };
}

// Simple promise-based initialization for auth contexts
let initPromise: Promise<void> | null = null;

export async function ensureFirebaseInitialized(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  if (!initPromise) {
    initPromise = new Promise((resolve, reject) => {
      if (!app) {
        reject(new Error('Firebase app not initialized. Check environment variables.'));
        return;
      }
      
      try {
        // Initialize services
        getAuthInstance();
        getFirestoreInstance();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  return initPromise;
}

// Legacy exports for backward compatibility
const legacyAuth = typeof window !== 'undefined' && app ? getAuthInstance() : null;
const legacyDb = app ? getFirestoreInstance() : null;
const legacyStorage = typeof window !== 'undefined' && app ? getStorageInstance() : null;

export { 
  legacyAuth as auth, 
  legacyDb as db, 
  legacyStorage as storage 
};

export default app;