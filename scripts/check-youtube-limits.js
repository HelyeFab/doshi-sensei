// Script to check current YouTube shadowing limits in Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
require('dotenv').config();

// Your Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLimits() {
  try {
    const rulesDoc = await getDoc(doc(db, 'config', 'entitlement_rules_v1'));
    if (rulesDoc.exists()) {
      const rules = rulesDoc.data().rules;
      
      console.log('\n=== YouTube Shadowing Limits in Firebase ===\n');
      rules.forEach(rule => {
        const ytLimit = rule.limits?.daily?.youtube_shadowing;
        if (ytLimit !== undefined) {
          console.log(`${rule.id}: ${ytLimit === -1 ? 'Unlimited' : ytLimit + ' per day'}`);
        }
      });
      console.log('\n=====================================\n');
    } else {
      console.log('No dynamic rules found in Firebase');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkLimits();