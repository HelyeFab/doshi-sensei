import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwwtWvfT6ws9rDyWGeH-RVWoTQtK-k_eI",
  authDomain: "doshi-sensei.firebaseapp.com",
  projectId: "doshi-sensei",
  storageBucket: "doshi-sensei.firebasestorage.app",
  messagingSenderId: "940013577006",
  appId: "1:940013577006:web:7fb9e708bd1c99c41a50bf",
  measurementId: "G-X6LK9BFMEV"
};

// Initialize Firebase for both client and server
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

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
