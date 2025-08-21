import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCwwtWvfT6ws9rDyWGeH-RVWoTQtK-k_eI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "doshi-sensei.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "doshi-sensei",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "doshi-sensei.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "940013577006",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:940013577006:web:7fb9e708bd1c99c41a50bf",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X6LK9BFMEV"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth | null = null;
let db: Firestore;
let storage: FirebaseStorage | null = null;

// Initialize Firebase (works on both client and server)
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
// Auth is only needed on client side
if (typeof window !== 'undefined') {
  auth = getAuth(app);
  storage = getStorage(app);
}

// Firestore is needed on both client and server (for caching)
db = getFirestore(app);

export { auth, db, storage };
export default app;