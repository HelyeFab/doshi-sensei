import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration with fallback values (ensures auth always works)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBUGHKkXNi6xPCZ4TGWEQmY5YH_J7khCoE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "doshi-sensei.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "doshi-sensei",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "doshi-sensei.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "940013577006",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:940013577006:web:9b63a063ae91bce3d8f8fa",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-YVBQL71V35"
};

// Diagnostic logging for auth issues
console.log('[Firebase Init] Configuration check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  authDomain: firebaseConfig.authDomain || 'NOT SET',
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId || 'NOT SET',
  timestamp: new Date().toISOString()
});

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Only initialize Firebase if we have the required configuration
// This prevents build errors when environment variables are not available
if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  console.log('[Firebase Init] Initializing Firebase app...');
  // Initialize Firebase (works on both client and server)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase Init] Firebase app initialized successfully');
  } else {
    app = getApps()[0];
    console.log('[Firebase Init] Using existing Firebase app');
  }

  // Initialize services
  // Auth and Storage are only needed on client side
  if (typeof window !== 'undefined') {
    auth = getAuth(app);
    storage = getStorage(app);
    console.log('[Firebase Init] Auth and Storage services initialized');
    
    // Log auth settings for debugging
    auth.onAuthStateChanged((user) => {
      console.log('[Firebase Auth] Auth state changed:', {
        isSignedIn: !!user,
        email: user?.email || 'none',
        provider: user?.providerData?.[0]?.providerId || 'none',
        timestamp: new Date().toISOString()
      });
    });
  } else {
    console.log('[Firebase Init] Server-side render - skipping Auth/Storage initialization');
  }

  // Firestore is needed on both client and server (for caching)
  db = getFirestore(app);
  console.log('[Firebase Init] Firestore service initialized');
} else {
  // Log warning only in development or on client side
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
    console.error('[Firebase Init] CRITICAL: Firebase configuration is incomplete!', {
      apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
      authDomain: firebaseConfig.authDomain ? `SET: ${firebaseConfig.authDomain}` : 'MISSING',
      projectId: firebaseConfig.projectId ? `SET: ${firebaseConfig.projectId}` : 'MISSING'
    });
  }
}

export { auth, db, storage };
export default app;