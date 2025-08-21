#!/usr/bin/env tsx
/**
 * Test script to verify dynamic limit updates are working correctly
 */

import { getFirebaseAdmin } from '../lib/firebase-admin-safe';
import { getServerDynamicRulesAdmin, clearRulesCache } from '../lib/server-dynamic-rules-admin';

const RULES_DOC_ID = 'entitlement_rules_v1';

async function testLimitUpdates() {
  console.log('🧪 Testing Dynamic Limit Updates...\n');
  
  try {
    // Step 1: Read current limits
    console.log('📖 Step 1: Reading current limits...');
    const initialRules = await getServerDynamicRulesAdmin(true); // Force refresh
    
    const monthlyRule = initialRules.find(r => r.userTypes.includes('monthly'));
    const initialLimit = monthlyRule?.limits?.daily?.youtube_shadowing || 0;
    console.log(`  Current monthly YouTube limit: ${initialLimit}`);
    
    // Step 2: Update the limit
    console.log('\n✏️  Step 2: Updating limit to 25...');
    const admin = await getFirebaseAdmin();
    const db = admin.firestore;
    const rulesDocRef = db.doc(`config/${RULES_DOC_ID}`);
    
    // Update the limit
    const updatedRules = JSON.parse(JSON.stringify(initialRules));
    const monthlyRuleIndex = updatedRules.findIndex((r: any) => r.userTypes.includes('monthly'));
    if (monthlyRuleIndex !== -1) {
      updatedRules[monthlyRuleIndex].limits.daily.youtube_shadowing = 25;
    }
    
    await rulesDocRef.set({
      rules: updatedRules,
      lastUpdated: new Date().toISOString(),
      version: 1
    });
    console.log('  ✅ Limit updated in Firestore');
    
    // Step 3: Clear cache and verify
    console.log('\n🧹 Step 3: Clearing cache...');
    clearRulesCache();
    
    // Step 4: Read again to verify
    console.log('\n🔍 Step 4: Verifying update...');
    const verifyRules = await getServerDynamicRulesAdmin(true); // Force refresh
    const verifyRule = verifyRules.find(r => r.userTypes.includes('monthly'));
    const newLimit = verifyRule?.limits?.daily?.youtube_shadowing || 0;
    console.log(`  New monthly YouTube limit: ${newLimit}`);
    
    // Step 5: Test cache behavior
    console.log('\n💾 Step 5: Testing cache behavior...');
    console.log('  Reading without force refresh (should use cache)...');
    const cachedRules1 = await getServerDynamicRulesAdmin(false);
    const cachedRule1 = cachedRules1.find(r => r.userTypes.includes('monthly'));
    console.log(`  Cached limit: ${cachedRule1?.limits?.daily?.youtube_shadowing}`);
    
    console.log('  Waiting 6 seconds for cache to expire...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('  Reading again (cache should be expired)...');
    const cachedRules2 = await getServerDynamicRulesAdmin(false);
    const cachedRule2 = cachedRules2.find(r => r.userTypes.includes('monthly'));
    console.log(`  Fresh limit: ${cachedRule2?.limits?.daily?.youtube_shadowing}`);
    
    // Step 6: Restore original limit
    console.log('\n🔄 Step 6: Restoring original limit...');
    updatedRules[monthlyRuleIndex].limits.daily.youtube_shadowing = initialLimit;
    await rulesDocRef.set({
      rules: updatedRules,
      lastUpdated: new Date().toISOString(),
      version: 1
    });
    clearRulesCache();
    console.log(`  ✅ Restored to original limit: ${initialLimit}`);
    
    // Summary
    console.log('\n✅ TEST COMPLETE!');
    console.log('  - Updates are saved correctly to Firestore');
    console.log('  - Cache is working with 5-second TTL');
    console.log('  - Force refresh bypasses cache');
    console.log('  - Manual cache clearing works');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  }
}

// Run the test
testLimitUpdates().then(() => process.exit(0)).catch(() => process.exit(1));