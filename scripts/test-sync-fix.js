#!/usr/bin/env node

/**
 * Test script to verify that sync works correctly for paid users
 * Run this in the browser console while logged in as a paid user
 */

// This script should be run in the browser console
const testSyncFix = async () => {
  console.log('🔍 Testing sync fix for paid users...\n');
  
  // 1. Check current user
  const auth = window.firebase?.auth();
  const user = auth?.currentUser;
  
  if (!user) {
    console.error('❌ No user logged in');
    return;
  }
  
  console.log('✅ User:', user.email);
  console.log('   UID:', user.uid);
  
  // 2. Check subscription in Firestore
  const db = window.firebase?.firestore();
  const userDoc = await db.collection('users').doc(user.uid).get();
  const userData = userDoc.data();
  const subscription = userData?.subscription;
  
  console.log('\n📋 Subscription data:');
  console.log('   Plan:', subscription?.plan || 'none');
  console.log('   Status:', subscription?.status || 'none');
  console.log('   Is Paid:', subscription?.plan === 'monthly' || subscription?.plan === 'yearly');
  
  // 3. Check if achievements are being synced
  console.log('\n🏆 Checking achievement sync...');
  const achievementStats = await db
    .collection('users')
    .doc(user.uid)
    .collection('achievementStats')
    .doc('current')
    .get();
  
  if (achievementStats.exists()) {
    console.log('✅ Achievement stats in cloud:', achievementStats.data());
  } else {
    console.log('⚠️  No achievement stats in cloud');
  }
  
  // 4. Check if stats are being synced
  console.log('\n📊 Checking stats sync...');
  const userStats = await db
    .collection('userStats')
    .doc(user.uid)
    .collection('current')
    .doc('summary')
    .get();
  
  if (userStats.exists()) {
    console.log('✅ User stats in cloud:', userStats.data());
  } else {
    console.log('⚠️  No user stats in cloud');
  }
  
  // 5. Check local storage
  console.log('\n💾 Checking local storage...');
  const localStats = localStorage.getItem('doshi_user_stats');
  if (localStats) {
    console.log('✅ Local stats found:', JSON.parse(localStats));
  }
  
  // 6. Force a sync
  console.log('\n🔄 Attempting to force sync...');
  try {
    // Try to access the stats tracker if it's available globally
    if (window.statsTracker) {
      await window.statsTracker.forceSync();
      console.log('✅ Sync triggered');
    } else {
      console.log('⚠️  Stats tracker not available globally');
    }
  } catch (error) {
    console.log('⚠️  Could not force sync:', error.message);
  }
  
  console.log('\n✅ Test complete!');
  console.log('If you have a paid plan (monthly/yearly) and data is not syncing,');
  console.log('please check the browser console for errors.');
};

// Export for use in browser
if (typeof window !== 'undefined') {
  window.testSyncFix = testSyncFix;
  console.log('Test function loaded. Run: testSyncFix()');
}