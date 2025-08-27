'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SearchHistoryManager2 } from '@/utils/searchHistoryManager2';

export default function CheckLocalHistoryPage() {
  const { user, userType } = useAuth();
  const [indexedDBHistory, setIndexedDBHistory] = useState<any[]>([]);
  const [firebaseHistory, setFirebaseHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHistory = async () => {
      if (!user) return;
      
      try {
        // Get history from IndexedDB directly
        const { UserScopedStorage } = await import('@/utils/userScopedStorage');
        const localHistory = await UserScopedStorage.getFromStore('searchHistory', 'history', user.uid);
        setIndexedDBHistory(localHistory || []);
        
        // Get history from Firebase
        if (userType === 'monthly' || userType === 'yearly') {
          const { db } = await import('@/lib/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          
          const docRef = doc(db, 'users', user.uid, 'searchHistory', 'data');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFirebaseHistory(data.history || []);
          }
        }
      } catch (error) {
        console.error('Error checking history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkHistory();
  }, [user, userType]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search History Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IndexedDB (Local) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              IndexedDB (Local Storage)
              <span className="ml-2 text-sm text-gray-500">
                ({indexedDBHistory.length} entries)
              </span>
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {indexedDBHistory.length === 0 ? (
                <p className="text-gray-500">No local history found</p>
              ) : (
                indexedDBHistory.map((entry, index) => (
                  <div key={entry.id || index} className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">{entry.searchTerm}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                      {' • '}
                      {entry.resultsCount} results
                      {' • '}
                      {entry.source}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Firebase (Cloud) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Firebase (Cloud Storage)
              <span className="ml-2 text-sm text-gray-500">
                ({firebaseHistory.length} entries)
              </span>
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {firebaseHistory.length === 0 ? (
                <p className="text-gray-500">No Firebase history found</p>
              ) : (
                firebaseHistory.map((entry, index) => (
                  <div key={entry.id || index} className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">{entry.searchTerm}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                      {' • '}
                      {entry.resultsCount} results
                      {' • '}
                      {entry.source}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Analysis */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Analysis</h3>
          {indexedDBHistory.length > firebaseHistory.length ? (
            <div>
              <p className="text-red-600 font-medium">
                ⚠️ Data Loss Detected!
              </p>
              <p>
                You have {indexedDBHistory.length} searches locally but only {firebaseHistory.length} in Firebase.
              </p>
              <p className="mt-2">
                This indicates the Firebase sync is overwriting data instead of merging it properly.
              </p>
            </div>
          ) : indexedDBHistory.length < firebaseHistory.length ? (
            <p>
              Firebase has more entries. Local data might be outdated.
            </p>
          ) : (
            <p className="text-green-600">
              ✅ Local and cloud storage are in sync ({indexedDBHistory.length} entries each)
            </p>
          )}
        </div>
        
        {/* Fix Button */}
        {indexedDBHistory.length > firebaseHistory.length && (
          <button
            onClick={async () => {
              if (!user) return;
              
              const confirm = window.confirm(
                `This will upload all ${indexedDBHistory.length} local entries to Firebase. Continue?`
              );
              
              if (confirm) {
                try {
                  // Force sync local to Firebase
                  const { db } = await import('@/lib/firebase');
                  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                  
                  const docRef = doc(db, 'users', user.uid, 'searchHistory', 'data');
                  const firebaseData = {
                    history: indexedDBHistory.map(entry => ({
                      ...entry,
                      results: entry.results.slice(0, 10).map((word: any) => ({
                        id: word.id,
                        kanji: word.kanji,
                        kana: word.kana,
                        meaning: word.meaning,
                        type: word.type
                      }))
                    })),
                    lastUpdated: serverTimestamp(),
                    count: indexedDBHistory.length
                  };
                  
                  await setDoc(docRef, firebaseData);
                  alert('Successfully synced local history to Firebase!');
                  window.location.reload();
                } catch (error) {
                  console.error('Error syncing:', error);
                  alert('Failed to sync: ' + error);
                }
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Fix: Upload Local History to Firebase
          </button>
        )}
      </div>
    </div>
  );
}