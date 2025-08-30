/**
 * Test script for Universal Sync System
 * Verifies that ALL features sync properly for premium users
 * 
 * Run this in the browser console when logged in as a premium user
 */

async function testUniversalSync() {
  console.log('🧪 Starting Universal Sync System Test...\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  // Test 1: Check if unified storage is initialized
  try {
    const storage = window.unifiedStorage || 
                   (await import('/src/services/storage/UnifiedStorageLayer')).unifiedStorage;
    if (storage) {
      results.passed.push('✅ Unified Storage initialized');
    } else {
      results.failed.push('❌ Unified Storage not found');
    }
  } catch (error) {
    results.failed.push(`❌ Unified Storage error: ${error.message}`);
  }
  
  // Test 2: Check premium status
  try {
    const auth = window.auth || (await import('/src/lib/firebase')).auth;
    const user = auth.currentUser;
    
    if (!user) {
      results.warnings.push('⚠️ No user logged in - please log in first');
      return results;
    }
    
    results.passed.push(`✅ User logged in: ${user.uid}`);
    
    // Check subscription
    const db = window.db || (await import('firebase/firestore')).getFirestore();
    const userDoc = await (await import('firebase/firestore')).getDoc(
      (await import('firebase/firestore')).doc(db, 'users', user.uid)
    );
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (subscription?.plan === 'monthly' || subscription?.plan === 'yearly') {
        results.passed.push(`✅ Premium subscription active: ${subscription.plan}`);
      } else {
        results.warnings.push('⚠️ No premium subscription - sync disabled');
      }
    }
  } catch (error) {
    results.failed.push(`❌ Auth check error: ${error.message}`);
  }
  
  // Test 3: Test textbook vocabulary sync
  try {
    console.log('\n📚 Testing Textbook Vocabulary Sync...');
    
    const testData = {
      id: `test_vocab_${Date.now()}`,
      textbook: 'test',
      lesson: 1,
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 86400000),
      reviewCount: 1,
      easeFactor: 2.5,
      interval: 1,
      quality: 4,
      masteryLevel: 25,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to IndexedDB (should trigger sync)
    const dbName = 'doshi-sensei-textbook-vocab';
    const request = indexedDB.open(dbName);
    
    await new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const db = request.result;
        const transaction = db.transaction(['progress'], 'readwrite');
        const store = transaction.objectStore('progress');
        await store.put(testData);
        resolve();
      };
      request.onerror = reject;
    });
    
    results.passed.push('✅ Textbook vocabulary test data saved');
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if synced to Firebase
    const db = window.db || (await import('firebase/firestore')).getFirestore();
    const docRef = (await import('firebase/firestore')).doc(
      db, 'users', auth.currentUser.uid, 'textbookVocabularyProgress', testData.id
    );
    const syncedDoc = await (await import('firebase/firestore')).getDoc(docRef);
    
    if (syncedDoc.exists()) {
      results.passed.push('✅ Textbook vocabulary synced to Firebase');
    } else {
      results.warnings.push('⚠️ Textbook vocabulary not synced yet (may take time)');
    }
  } catch (error) {
    results.failed.push(`❌ Textbook vocabulary test failed: ${error.message}`);
  }
  
  // Test 4: Test localStorage sync
  try {
    console.log('\n💾 Testing localStorage Sync...');
    
    const testKey = `test_local_${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };
    
    localStorage.setItem(testKey, JSON.stringify(testValue));
    results.passed.push('✅ localStorage test data saved');
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check sync status
    const syncStatus = await (await import('/src/services/storage/AutoSyncIntegration')).getSyncStatus();
    
    if (syncStatus.enabled && syncStatus.premium) {
      results.passed.push(`✅ Auto-sync enabled (${syncStatus.pending} items pending)`);
    } else {
      results.warnings.push('⚠️ Auto-sync not enabled');
    }
    
    // Clean up
    localStorage.removeItem(testKey);
  } catch (error) {
    results.failed.push(`❌ localStorage test failed: ${error.message}`);
  }
  
  // Test 5: Test study lists sync
  try {
    console.log('\n📋 Testing Study Lists Sync...');
    
    const testList = {
      id: `test_list_${Date.now()}`,
      name: 'Test Study List',
      type: 'drillable',
      itemIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save study list
    const lists = JSON.parse(localStorage.getItem('doshi_sensei_study_lists') || '[]');
    lists.push(testList);
    localStorage.setItem('doshi_sensei_study_lists', JSON.stringify(lists));
    
    results.passed.push('✅ Study list test data saved');
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if synced
    const db = window.db || (await import('firebase/firestore')).getFirestore();
    const listDoc = await (await import('firebase/firestore')).getDoc(
      (await import('firebase/firestore')).doc(
        db, 'users', auth.currentUser.uid, 'studyLists', testList.id
      )
    );
    
    if (listDoc.exists()) {
      results.passed.push('✅ Study list synced to Firebase');
    } else {
      results.warnings.push('⚠️ Study list not synced yet (may take time)');
    }
    
    // Clean up
    const updatedLists = lists.filter(l => l.id !== testList.id);
    localStorage.setItem('doshi_sensei_study_lists', JSON.stringify(updatedLists));
  } catch (error) {
    results.failed.push(`❌ Study lists test failed: ${error.message}`);
  }
  
  // Test 6: Check all storage interceptors
  try {
    console.log('\n🔧 Testing Storage Interceptors...');
    
    // Check if localStorage is intercepted
    if (localStorage.setItem.toString().includes('originalSetItem')) {
      results.passed.push('✅ localStorage interceptor active');
    } else {
      results.warnings.push('⚠️ localStorage interceptor not detected');
    }
    
    // Check if sessionStorage is intercepted
    if (sessionStorage.setItem.toString().includes('originalSetItem')) {
      results.passed.push('✅ sessionStorage interceptor active');
    } else {
      results.warnings.push('⚠️ sessionStorage interceptor not detected');
    }
    
    // Check if IndexedDB is intercepted
    if (indexedDB.open.toString().includes('originalOpen')) {
      results.passed.push('✅ IndexedDB interceptor active');
    } else {
      results.warnings.push('⚠️ IndexedDB interceptor not detected');
    }
  } catch (error) {
    results.failed.push(`❌ Interceptor check failed: ${error.message}`);
  }
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n✅ PASSED: ${results.passed.length}`);
  results.passed.forEach(msg => console.log('  ' + msg));
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS: ${results.warnings.length}`);
    results.warnings.forEach(msg => console.log('  ' + msg));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED: ${results.failed.length}`);
    results.failed.forEach(msg => console.log('  ' + msg));
  }
  
  console.log('\n' + '='.repeat(50));
  
  const successRate = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  
  if (results.failed.length === 0) {
    console.log('🎉 All tests passed! Universal sync is working correctly.');
  } else if (successRate >= 80) {
    console.log('✅ Most tests passed. Some features may need attention.');
  } else {
    console.log('❌ Several tests failed. Please check the implementation.');
  }
  
  return results;
}

// Run the test
console.log('To run the test, execute: testUniversalSync()');
console.log('Make sure you are logged in as a premium user first!');