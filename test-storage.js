// Storage Architecture Test Script
// Testing localStorage, IndexedDB, and Firebase connectivity

console.log('=== DOSHI SENSEI STORAGE ARCHITECTURE TEST ===\n');

// Test 1: localStorage availability and operations
console.log('1. Testing localStorage...');
try {
  // Check availability
  if (typeof(Storage) !== "undefined") {
    console.log('✅ localStorage is available');
    
    // Test write
    const testData = { test: 'data', timestamp: Date.now() };
    localStorage.setItem('doshi_test_key', JSON.stringify(testData));
    console.log('✅ Write operation successful');
    
    // Test read
    const retrieved = localStorage.getItem('doshi_test_key');
    const parsed = JSON.parse(retrieved);
    console.log('✅ Read operation successful:', parsed);
    
    // Test remove
    localStorage.removeItem('doshi_test_key');
    console.log('✅ Delete operation successful');
    
    // Check storage size
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    console.log(`📊 Current localStorage usage: ~${Math.round(totalSize/1024)}KB`);
    
    // Check for app-specific keys
    const appKeys = Object.keys(localStorage).filter(k => 
      k.includes('doshi') || k.includes('sensei') || k.includes('japanese')
    );
    console.log(`📊 Found ${appKeys.length} app-specific keys:`, appKeys.slice(0, 5));
    
  } else {
    console.log('❌ localStorage is not available');
  }
} catch (error) {
  console.error('❌ localStorage test failed:', error.message);
}

// Test 2: IndexedDB availability and operations
console.log('\n2. Testing IndexedDB...');
const testIndexedDB = () => {
  return new Promise((resolve, reject) => {
    try {
      // Check availability
      if (!window.indexedDB) {
        console.log('❌ IndexedDB is not available');
        resolve();
        return;
      }
      
      console.log('✅ IndexedDB is available');
      
      // Try to open the DoshiSenseiDB
      const request = indexedDB.open('DoshiSenseiDB');
      
      request.onerror = () => {
        console.error('❌ Failed to open DoshiSenseiDB:', request.error);
        resolve();
      };
      
      request.onsuccess = () => {
        const db = request.result;
        console.log('✅ Successfully opened DoshiSenseiDB');
        console.log(`📊 Database version: ${db.version}`);
        console.log(`📊 Object stores (${db.objectStoreNames.length}):`, 
          Array.from(db.objectStoreNames).slice(0, 10));
        
        // Check if we can access a store
        if (db.objectStoreNames.contains('settings')) {
          try {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
              console.log(`📊 Settings store has ${countRequest.result} records`);
            };
          } catch (e) {
            console.log('⚠️ Could not access settings store:', e.message);
          }
        }
        
        db.close();
        resolve();
      };
      
      request.onupgradeneeded = () => {
        console.log('⚠️ Database upgrade needed');
        resolve();
      };
      
    } catch (error) {
      console.error('❌ IndexedDB test failed:', error.message);
      resolve();
    }
  });
};

// Test 3: Check Firebase configuration
console.log('\n3. Checking Firebase configuration...');
const checkFirebase = () => {
  // Check for Firebase config in environment
  const firebaseKeys = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ];
  
  console.log('📊 Firebase environment variables:');
  firebaseKeys.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`⚠️ ${key}: Not found in environment`);
    }
  });
  
  // Check if Firebase is loaded in window
  if (typeof window !== 'undefined' && window.firebase) {
    console.log('✅ Firebase SDK is loaded');
  } else {
    console.log('⚠️ Firebase SDK not detected in window');
  }
};

// Test 4: Storage usage summary
console.log('\n4. Storage Usage Summary...');
const checkStorageQuota = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = (usage / quota * 100).toFixed(2);
      
      console.log('📊 Storage Quota Information:');
      console.log(`   Total quota: ${(quota / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`   Used: ${(usage / 1024 / 1024).toFixed(2)} MB (${percentUsed}%)`);
      console.log(`   Available: ${((quota - usage) / 1024 / 1024 / 1024).toFixed(2)} GB`);
      
      if (estimate.usageDetails) {
        console.log('📊 Breakdown by storage type:');
        Object.entries(estimate.usageDetails).forEach(([type, bytes]) => {
          console.log(`   ${type}: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to get storage estimate:', error);
    }
  } else {
    console.log('⚠️ Storage estimate API not available');
  }
};

// Run all tests
const runTests = async () => {
  if (typeof window !== 'undefined') {
    await testIndexedDB();
    checkFirebase();
    await checkStorageQuota();
    
    console.log('\n=== STORAGE TEST COMPLETE ===');
    console.log('Check the console for detailed results.');
  } else {
    console.log('⚠️ Tests must be run in a browser environment');
  }
};

// Execute if in browser
if (typeof window !== 'undefined') {
  runTests();
} else {
  console.log('Please run this script in the browser console.');
}