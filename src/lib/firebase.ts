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

// Initialize Firebase only on client side
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (typeof window !== 'undefined') {
  // Only initialize on client side
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);

  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app);

  // Initialize Firebase Storage and get a reference to the service
  storage = getStorage(app);
}

export { auth, db, storage };
export default app;
