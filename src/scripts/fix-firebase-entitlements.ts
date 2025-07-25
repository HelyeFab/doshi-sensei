/**
 * Script to fix Firebase entitlement rules structure
 * Migrates incorrectly placed fields to the proper nested structure
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from '../lib/entitlements/rules';

// Firebase config (you'll need to add your config here)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function fixEntitlementRules() {
  console.log('🔧 Starting Firebase entitlement rules fix...');
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    // Get the current document
    const rulesDoc = await getDoc(doc(db, 'config', 'entitlement_rules_v1'));
    
    if (!rulesDoc.exists()) {
      console.log('❌ Document not found. Creating with default rules...');
      await setDoc(doc(db, 'config', 'entitlement_rules_v1'), {
        rules: DEFAULT_RULES,
        lastUpdated: new Date().toISOString(),
        version: 1
      });
      console.log('✅ Created document with default rules');
      return;
    }
    
    const data = rulesDoc.data();
    console.log('📋 Current document data:', JSON.stringify(data, null, 2));
    
    // Check if we have the correct structure
    if (data.rules && Array.isArray(data.rules)) {
      console.log('✅ Document already has correct structure');
      
      // Log current YouTube shadowing values
      data.rules.forEach((rule: any) => {
        const userType = rule.userTypes[0];
        const youtubeLimit = rule.limits?.daily?.youtube_shadowing;
        console.log(`  ${userType}: youtube_shadowing = ${youtubeLimit}`);
      });
      
      return;
    }
    
    // If we have root-level fields like youtube_shadowing, we need to migrate
    console.log('⚠️  Document has incorrect structure. Migrating...');
    
    // Create the correct structure
    const fixedRules = {
      rules: DEFAULT_RULES,
      lastUpdated: new Date().toISOString(),
      version: 1
    };
    
    // If there's a youtube_shadowing value at root, apply it to all user types
    if (data.youtube_shadowing !== undefined) {
      console.log(`📝 Found root-level youtube_shadowing: ${data.youtube_shadowing}`);
      
      // Apply to monthly and yearly users (keeping guest at 0, free at 1)
      fixedRules.rules = fixedRules.rules.map(rule => {
        if (rule.userTypes.includes('monthly') || rule.userTypes.includes('yearly')) {
          return {
            ...rule,
            limits: {
              ...rule.limits,
              daily: {
                ...rule.limits.daily,
                youtube_shadowing: data.youtube_shadowing
              }
            }
          };
        }
        return rule;
      });
    }
    
    // Save the fixed structure
    await setDoc(doc(db, 'config', 'entitlement_rules_v1'), fixedRules);
    
    console.log('✅ Fixed document structure!');
    console.log('📋 New structure:', JSON.stringify(fixedRules, null, 2));
    
  } catch (error) {
    console.error('❌ Error fixing rules:', error);
  }
}

// Run the fix
fixEntitlementRules()
  .then(() => {
    console.log('🎉 Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });