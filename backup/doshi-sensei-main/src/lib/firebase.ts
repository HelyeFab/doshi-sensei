import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
