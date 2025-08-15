/**
 * Debug utility for checking stats sync issues
 */

import { statsTracker } from '@/lib/stats/statsTracker';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

export async function debugStatsSync(user: User | null) {

  if (!user) {

    return;
  }
  
  try {
    // 1. Check current in-memory stats
    const currentStats = statsTracker.getStats();
    console.log('📊 Current In-Memory Stats:', {
      totalActivities: currentStats?.totalActivities || 0,
      articlesRead: currentStats?.articlesRead || 0,
      drillsCompleted: currentStats?.drillsCompleted || 0,
      gamesPlayed: currentStats?.gamesPlayed || 0,
      lastUpdated: currentStats?.lastUpdated ? new Date(currentStats.lastUpdated).toISOString() : 'N/A'
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

    }
    
    if (activitiesDoc.exists()) {
      console.log('☁️ Firebase Activities:', activitiesDoc.data());
    } else {

    }
    
    // 4. Check daily activities
    const dailyActivitiesRef = collection(db, 'userStats', user.uid, 'dailyActivities');
    const dailySnapshot = await getDocs(dailyActivitiesRef);

    let totalFromDaily = 0;
    let articleCountFromDaily = 0;
    
    dailySnapshot.forEach(doc => {
      const data = doc.data();
      totalFromDaily += data.summary?.totalActivities || 0;
      articleCountFromDaily += data.summary?.articlesRead || 0;
    });

    // 5. Check for discrepancies

    if (currentStats.totalActivities !== totalFromDaily) {

    }
    
    if (currentStats.articlesRead !== articleCountFromDaily) {

    }
    
    // 6. Recommend fix
    if (currentStats.totalActivities === 0 && totalFromDaily > 0) {

      console.log('Run: await statsTracker.recalculateTotalActivities()');

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

    // Force sync to cloud
    await statsTracker.forceSync();

  };

  console.log('- debugStatsSync(user) - Check stats sync status');
  console.log('- fixStats() - Fix totalActivities calculation');
}