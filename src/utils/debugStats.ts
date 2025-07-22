/**
 * Debug utility for checking stats sync issues
 */

import { statsTracker } from '@/lib/stats/statsTracker';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

export async function debugStatsSync(user: User | null) {
  console.log('🔍 === STATS DEBUG REPORT ===');
  
  if (!user) {
    console.log('❌ No user logged in');
    return;
  }
  
  try {
    // 1. Check current in-memory stats
    const currentStats = statsTracker.getStats();
    console.log('📊 Current In-Memory Stats:', {
      totalActivities: currentStats.totalActivities,
      articlesRead: currentStats.articlesRead,
      drillsCompleted: currentStats.drillsCompleted,
      gamesPlayed: currentStats.gamesPlayed,
      lastUpdated: new Date(currentStats.lastUpdated).toISOString()
    });
    
    // 2. Check IndexedDB stats
    try {
      const dbName = 'DoshiSenseiDB';
      const request = indexedDB.open(dbName);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['statsV2'], 'readonly');
        const store = transaction.objectStore('statsV2');
        const getRequest = store.get('userStats');
        
        getRequest.onsuccess = () => {
          const indexedDBStats = getRequest.result;
          if (indexedDBStats) {
            console.log('💾 IndexedDB Stats:', {
              totalActivities: indexedDBStats.totalActivities,
              articlesRead: indexedDBStats.articlesRead,
              drillsCompleted: indexedDBStats.drillsCompleted,
              gamesPlayed: indexedDBStats.gamesPlayed,
              lastUpdated: new Date(indexedDBStats.lastUpdated).toISOString()
            });
          } else {
            console.log('❌ No stats found in IndexedDB');
          }
        };
      };
    } catch (error) {
      console.error('❌ Error reading from IndexedDB:', error);
    }
    
    // 3. Check Firebase stats (new structure)
    const userStatsRef = collection(db, 'userStats', user.uid, 'current');
    
    const [summaryDoc, activitiesDoc] = await Promise.all([
      getDoc(doc(userStatsRef, 'summary')),
      getDoc(doc(userStatsRef, 'activities'))
    ]);
    
    if (summaryDoc.exists()) {
      console.log('☁️ Firebase Summary:', summaryDoc.data());
    } else {
      console.log('❌ No summary document in Firebase');
    }
    
    if (activitiesDoc.exists()) {
      console.log('☁️ Firebase Activities:', activitiesDoc.data());
    } else {
      console.log('❌ No activities document in Firebase');
    }
    
    // 4. Check daily activities
    const dailyActivitiesRef = collection(db, 'userStats', user.uid, 'dailyActivities');
    const dailySnapshot = await getDocs(dailyActivitiesRef);
    
    console.log(`📅 Found ${dailySnapshot.size} daily activity records`);
    
    let totalFromDaily = 0;
    let articleCountFromDaily = 0;
    
    dailySnapshot.forEach(doc => {
      const data = doc.data();
      totalFromDaily += data.summary?.totalActivities || 0;
      articleCountFromDaily += data.summary?.articlesRead || 0;
    });
    
    console.log('📊 Calculated from daily activities:', {
      totalActivities: totalFromDaily,
      articlesRead: articleCountFromDaily
    });
    
    // 5. Check for discrepancies
    console.log('\n🔍 === DISCREPANCY CHECK ===');
    
    if (currentStats.totalActivities !== totalFromDaily) {
      console.warn(`⚠️ Total activities mismatch: In-memory=${currentStats.totalActivities}, DailyCalc=${totalFromDaily}`);
    }
    
    if (currentStats.articlesRead !== articleCountFromDaily) {
      console.warn(`⚠️ Articles read mismatch: In-memory=${currentStats.articlesRead}, DailyCalc=${articleCountFromDaily}`);
    }
    
    // 6. Recommend fix
    if (currentStats.totalActivities === 0 && totalFromDaily > 0) {
      console.log('\n💡 RECOMMENDED FIX:');
      console.log('Run: await statsTracker.recalculateTotalActivities()');
      console.log('Or reload the page to trigger the new sync logic');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugStatsSync = debugStatsSync;
  (window as any).fixStats = async () => {
    const result = await statsTracker.recalculateTotalActivities();
    console.log('✅ Stats fixed:', result);
    // Force sync to cloud
    await statsTracker.forceSync();
    console.log('☁️ Synced to cloud');
  };
  
  console.log('🔧 Debug utilities loaded:');
  console.log('- debugStatsSync(user) - Check stats sync status');
  console.log('- fixStats() - Fix totalActivities calculation');
}