/**
 * Server-side dynamic rules reader using Firebase Admin SDK
 */

import { getFirebaseAdmin } from './firebase-admin-safe';
import { EntitlementRule } from './entitlements/types';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from './entitlements/rules';

const RULES_DOC_ID = 'entitlement_rules_v1';

// Cache with TTL
let rulesCache: { data: EntitlementRule[], timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds cache to prevent excessive reads

/**
 * Get dynamic rules from Firestore using Admin SDK (server-side only)
 */
export async function getServerDynamicRulesAdmin(forceRefresh: boolean = false): Promise<EntitlementRule[]> {
  // Special case: if explicitly asked to clear cache
  if (forceRefresh) {
    rulesCache = null;
  }
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh && rulesCache && Date.now() - rulesCache.timestamp < CACHE_TTL) {
      console.log('📦 Returning cached rules (age: ' + (Date.now() - rulesCache.timestamp) + 'ms)');
      return rulesCache.data;
    }

    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const db = admin.firestore;
    
    // Get the rules document
    const rulesDocRef = db.collection('config').doc(RULES_DOC_ID);
    const rulesDoc = await rulesDocRef.get();
    
    if (rulesDoc.exists) {
      const data = rulesDoc.data();
      console.log('✅ Successfully loaded dynamic rules from Firestore (Admin SDK)');

      // Log raw Firebase data for debugging

      const monthlyRule = data.rules?.find((r: any) => r.userTypes?.includes('monthly'));
      const yearlyRule = data.rules?.find((r: any) => r.userTypes?.includes('yearly'));

      // Log YouTube shadowing limits specifically
      const rules = data.rules as EntitlementRule[];
      rules.forEach(rule => {
        if (rule.limits?.daily?.youtube_shadowing !== undefined) {
          console.log(`🎥 YouTube limits for ${rule.userTypes.join(', ')}: ${rule.limits.daily.youtube_shadowing}`);
        }
      });
      
      // Update cache
      rulesCache = { data: rules, timestamp: Date.now() };
      
      return rules;
    } else {

      return DEFAULT_RULES;
    }
  } catch (error) {
    console.error('❌ Error loading server dynamic rules with Admin SDK:', error);
    return DEFAULT_RULES;
  }
}

/**
 * Clear the rules cache (useful after updates)
 */
export function clearRulesCache() {
  rulesCache = null;

}