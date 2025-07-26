/**
 * Server-side dynamic rules reader
 * Uses Firebase client SDK but only on server-side API routes
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { EntitlementRule } from './entitlements/types';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from './entitlements/rules';

// Firebase config for server-side usage
const firebaseConfig = {
  apiKey: "AIzaSyCwwtWvfT6ws9rDyWGeH-RVWoTQtK-k_eI",
  authDomain: "doshi-sensei.firebaseapp.com",
  projectId: "doshi-sensei",
  storageBucket: "doshi-sensei",
  messagingSenderId: "940013577006",
  appId: "1:940013577006:web:7fb9e708bd1c99c41a50bf",
  measurementId: "G-X6LK9BFMEV"
};

// Initialize Firebase for server-side usage
let serverApp: any = null;
let serverDb: any = null;

try {
  if (!getApps().length) {
    serverApp = initializeApp(firebaseConfig, 'server-app');
  } else {
    serverApp = getApps().find(app => app.name === 'server-app') || getApps()[0];
  }
  serverDb = getFirestore(serverApp);
} catch (error) {
  console.error('Failed to initialize Firebase for server:', error);
}

const RULES_DOC_ID = 'entitlement_rules_v1';

/**
 * Get dynamic rules from Firestore (server-side only)
 */
export async function getServerDynamicRules(): Promise<EntitlementRule[]> {
  try {
    if (!serverDb) {
      console.log('Server Firebase not initialized, using default rules');
      return DEFAULT_RULES;
    }

    console.log('🔄 Loading dynamic rules from Firestore (server-side)...');
    const rulesDoc = await getDoc(doc(serverDb, 'config', RULES_DOC_ID));
    
    if (rulesDoc.exists()) {
      const data = rulesDoc.data();
      console.log('✅ Successfully loaded dynamic rules from Firestore');
      console.log(`📅 Last updated: ${data.lastUpdated}`);
      console.log(`🔢 Version: ${data.version}`);
      
      // Log YouTube shadowing limits specifically
      const rules = data.rules as EntitlementRule[];
      rules.forEach(rule => {
        if (rule.limits?.daily?.youtube_shadowing !== undefined) {
          console.log(`🎥 YouTube limits for ${rule.userTypes.join(', ')}: ${rule.limits.daily.youtube_shadowing}`);
        }
      });
      
      return rules;
    } else {
      console.log('📄 No dynamic rules found in Firestore, using defaults');
      return DEFAULT_RULES;
    }
  } catch (error) {
    console.error('❌ Error loading server dynamic rules:', error);
    return DEFAULT_RULES;
  }
}