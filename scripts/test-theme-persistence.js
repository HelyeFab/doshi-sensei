#!/usr/bin/env node

// This script tests that theme settings are properly saved to IndexedDB
// Run this in the browser console to verify theme persistence

const testThemePersistence = async () => {
  console.log('🎨 Testing Theme Persistence in IndexedDB...\n');
  
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
    console.log(`   Version: ${db.version}`);
    console.log(`   Object Stores: ${Array.from(db.objectStoreNames).join(', ')}\n`);
    
    // 3. Check if settings store exists
    if (!db.objectStoreNames.contains('settings')) {
      console.error('❌ Settings object store does not exist');
      db.close();
      return;
    }
    
    // 4. Read current settings
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const getRequest = store.get('user_settings');
    
    getRequest.onsuccess = (event) => {
      const settings = event.target.result;
      
      if (settings) {
        console.log('✅ Settings found in IndexedDB:');
        console.log(`   Theme: ${settings.theme || 'system'}`);
        console.log(`   Color Scheme: ${settings.colorScheme || 'default'}`);
        console.log(`   Last Updated: ${settings.updatedAt || 'Never'}`);
        console.log('\n📋 Full Settings:');
        console.table(settings);
      } else {
        console.log('⚠️  No settings found in IndexedDB');
        console.log('   This is normal on first run or after clearing data');
      }
      
      // 5. Check localStorage for migration remnants
      console.log('\n🔍 Checking localStorage for old settings...');
      const oldSettings = localStorage.getItem('doshi_sensei_settings');
      const oldTheme = localStorage.getItem('doshi_sensei_theme');
      
      if (oldSettings || oldTheme) {
        console.log('⚠️  Found old settings in localStorage:');
        if (oldSettings) {
          try {
            const parsed = JSON.parse(oldSettings);
            console.log('   Old theme from settings:', parsed.theme);
          } catch (e) {
            console.log('   Could not parse old settings');
          }
        }
        if (oldTheme) {
          console.log('   Old theme backup:', oldTheme);
        }
        console.log('   These should be migrated and removed automatically');
      } else {
        console.log('✅ No old settings in localStorage (good!)');
      }
      
      db.close();
    };
    
    getRequest.onerror = (event) => {
      console.error('❌ Error reading settings:', event.target.error);
      db.close();
    };
  };
  
  request.onerror = (event) => {
    console.error('❌ Error opening database:', event.target.error);
  };
};

// Instructions for manual testing
console.log(`
🧪 Theme Persistence Test Script
================================

To test theme persistence:

1. Copy and paste this entire script into the browser console
2. Run: testThemePersistence()
3. Change theme in Settings
4. Run the test again to see if it persisted
5. Refresh the page and check if theme is retained

Manual theme change test:
1. Go to Settings page
2. Change theme to 'dark' or 'light'
3. Refresh the page
4. Theme should persist without reverting

To force a migration test:
1. Clear IndexedDB: indexedDB.deleteDatabase('DoshiSenseiDB')
2. Set old theme: localStorage.setItem('doshi_sensei_theme', 'dark')
3. Refresh the page
4. Check if theme migrated to IndexedDB
`);

// Export for use in browser console
window.testThemePersistence = testThemePersistence;