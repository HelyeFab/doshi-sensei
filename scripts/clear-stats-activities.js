#!/usr/bin/env node

// This script helps clear daily activities from IndexedDB if they're causing sync issues
// Run this in the browser console to clear problematic data

const clearDailyActivities = async () => {
  console.log('🧹 Clearing daily activities from IndexedDB...\n');
  
  // 1. Check if IndexedDB is available
  if (!window.indexedDB) {
    console.error('❌ IndexedDB is not available in this browser');
    return;
  }
  
  // 2. Open the database
  const dbName = 'DoshiSenseiDB';
  const request = indexedDB.open(dbName);
  
  request.onsuccess = async (event) => {
    const db = event.target.result;
    console.log('✅ Database opened successfully');
    
    // 3. Check if dailyActivities store exists
    if (!db.objectStoreNames.contains('dailyActivities')) {
      console.log('ℹ️  No dailyActivities store found (this is normal)');
      db.close();
      return;
    }
    
    // 4. Clear all daily activities
    const transaction = db.transaction(['dailyActivities'], 'readwrite');
    const store = transaction.objectStore('dailyActivities');
    const clearRequest = store.clear();
    
    clearRequest.onsuccess = () => {
      console.log('✅ Successfully cleared all daily activities from IndexedDB');
      console.log('   The stats system will rebuild activities as you use the app');
    };
    
    clearRequest.onerror = (event) => {
      console.error('❌ Error clearing activities:', event.target.error);
    };
    
    transaction.oncomplete = () => {
      console.log('\n✅ Transaction complete');
      db.close();
    };
    
    transaction.onerror = (event) => {
      console.error('❌ Transaction error:', event.target.error);
      db.close();
    };
  };
  
  request.onerror = (event) => {
    console.error('❌ Error opening database:', event.target.error);
  };
};

// Instructions
console.log(`
🧹 Daily Activities Cleanup Script
=================================

This script clears all daily activities from IndexedDB.
Use this if you're getting Firebase sync errors.

To run:
1. Copy and paste this entire script into the browser console
2. Run: clearDailyActivities()
3. Refresh the page

Your stats (streak, totals, etc.) will remain intact.
Only the detailed daily activity logs will be cleared.
`);

// Export for use in browser console
window.clearDailyActivities = clearDailyActivities;