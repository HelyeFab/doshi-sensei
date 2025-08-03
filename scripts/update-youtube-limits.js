// Script to update YouTube shadowing limits in Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');
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

async function updateLimits() {
  try {
    console.log('\n=== Updating YouTube Shadowing Limits ===\n');
    
    const rulesRef = doc(db, 'config', 'entitlement_rules_v1');
    const rulesDoc = await getDoc(rulesRef);
    
    if (!rulesDoc.exists()) {
      console.log('No dynamic rules found. Creating new rules document...');
      // You would need to create the entire rules structure here
      console.log('Please run the app as an admin user to initialize the dynamic rules first.');
      return;
    }
    
    const currentRules = rulesDoc.data().rules;
    console.log('Current rules loaded. Updating YouTube shadowing limits...');
    
    // Update the rules
    const updatedRules = currentRules.map(rule => {
      if (rule.id === 'free_user') {
        // Free users: 5 per day
        rule.limits.daily.youtube_shadowing = 5;
        console.log('✓ Updated free_user: 5 per day');
      } else if (rule.id === 'premium_monthly' || rule.id === 'premium_yearly') {
        // Premium users: Unlimited
        rule.limits.daily.youtube_shadowing = -1;
        console.log(`✓ Updated ${rule.id}: Unlimited`);
      } else if (rule.id === 'guest_basic') {
        // Guest users: 0 (no access)
        rule.limits.daily.youtube_shadowing = 0;
        console.log('✓ Updated guest_basic: 0 (no access)');
      }
      return rule;
    });
    
    // Update the document
    await updateDoc(rulesRef, {
      rules: updatedRules,
      lastUpdated: new Date()
    });
    
    console.log('\n✅ Successfully updated YouTube shadowing limits!\n');
    
    // Verify the update
    console.log('=== Verification ===');
    const verifyDoc = await getDoc(rulesRef);
    const verifyRules = verifyDoc.data().rules;
    
    verifyRules.forEach(rule => {
      const ytLimit = rule.limits?.daily?.youtube_shadowing;
      if (ytLimit !== undefined) {
        console.log(`${rule.id}: ${ytLimit === -1 ? 'Unlimited' : ytLimit + ' per day'}`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Error updating limits:', error.message);
    console.error('\nMake sure you have the necessary permissions to update the config collection.');
  }
  
  process.exit(0);
}

updateLimits();