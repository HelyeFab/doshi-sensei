'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { EnhancedStorageManager } from '@/utils/storage';
import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';

export default function StorageTestPage() {
  const [results, setResults] = useState<any>({
    localStorage: { status: 'pending', details: {} },
    indexedDB: { status: 'pending', details: {} },
    firebase: { status: 'pending', details: {} },
    storageManager: { status: 'pending', details: {} }
  });

  useEffect(() => {
    runStorageTests();
  }, []);

  const runStorageTests = async () => {
    const newResults = { ...results };

    // Test 1: localStorage
    try {
      console.log('Testing localStorage...');
      const testKey = 'doshi_test_' + Date.now();
      const testData = { test: 'data', timestamp: Date.now() };
      
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = localStorage.getItem(testKey);
      const parsed = JSON.parse(retrieved!);
      localStorage.removeItem(testKey);
      
      // Check existing keys
      const appKeys = Object.keys(localStorage).filter(k => 
        k.includes('doshi') || k.includes('settings') || k.includes('theme')
      );
      
      // Calculate size
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      newResults.localStorage = {
        status: 'success',
        details: {
          available: true,
          writeTest: 'passed',
          readTest: 'passed',
          deleteTest: 'passed',
          totalSize: `${Math.round(totalSize/1024)}KB`,
          appKeys: appKeys.length,
          sampleKeys: appKeys.slice(0, 5)
        }
      };
    } catch (error: any) {
      newResults.localStorage = {
        status: 'error',
        details: { error: error.message }
      };
    }

    // Test 2: IndexedDB
    try {
      console.log('Testing IndexedDB...');
      if (!window.indexedDB) {
        throw new Error('IndexedDB not available');
      }
      
      const request = indexedDB.open('DoshiSenseiDB');
      
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const stores = Array.from(db.objectStoreNames);
          
          // Try to count records in key stores
          const transaction = db.transaction(stores.slice(0, 5), 'readonly');
          const counts: any = {};
          
          stores.slice(0, 5).forEach(storeName => {
            try {
              const store = transaction.objectStore(storeName);
              const countRequest = store.count();
              countRequest.onsuccess = () => {
                counts[storeName] = countRequest.result;
              };
            } catch (e) {
              counts[storeName] = 'error';
            }
          });
          
          transaction.oncomplete = () => {
            newResults.indexedDB = {
              status: 'success',
              details: {
                available: true,
                dbVersion: db.version,
                totalStores: stores.length,
                stores: stores.slice(0, 10),
                recordCounts: counts
              }
            };
            db.close();
            resolve(true);
          };
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error: any) {
      newResults.indexedDB = {
        status: 'error',
        details: { error: error.message }
      };
    }

    // Test 3: Firebase/Firestore
    try {
      console.log('Testing Firebase...');
      
      // Check if Firebase is initialized
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      
      // Try to write and read a test document
      const testDoc = {
        test: true,
        timestamp: Date.now(),
        type: 'storage-audit'
      };
      
      const testDocRef = doc(db, 'test-audit', 'test-' + Date.now());
      await setDoc(testDocRef, testDoc);
      
      const docSnap = await getDoc(testDocRef);
      const retrieved = docSnap.exists() ? docSnap.data() : null;
      
      // Check collections (limited to avoid performance issues)
      const collections = ['users', 'settings', 'progress', 'stories'];
      const collectionInfo: any = {};
      
      for (const collName of collections) {
        try {
          const coll = collection(db, collName);
          const snapshot = await getDocs(coll);
          collectionInfo[collName] = {
            size: snapshot.size,
            empty: snapshot.empty
          };
        } catch (e) {
          collectionInfo[collName] = 'access denied or not exists';
        }
      }
      
      newResults.firebase = {
        status: 'success',
        details: {
          initialized: true,
          writeTest: 'passed',
          readTest: retrieved ? 'passed' : 'failed',
          authAvailable: !!auth,
          collections: collectionInfo
        }
      };
    } catch (error: any) {
      newResults.firebase = {
        status: 'error',
        details: { 
          error: error.message,
          code: error.code
        }
      };
    }

    // Test 4: EnhancedStorageManager
    try {
      console.log('Testing EnhancedStorageManager...');
      
      // Initialize storage manager
      await EnhancedStorageManager.initialize();
      const info = await EnhancedStorageManager.getStorageInfo();
      
      // Test operations
      const testKey = 'test-audit-' + Date.now();
      const testValue = { data: 'test', timestamp: Date.now() };
      
      await EnhancedStorageManager.saveSettings(testValue as any);
      const retrieved = await EnhancedStorageManager.loadSettings();
      
      // Get storage quota
      let quota = null;
      if (navigator.storage && navigator.storage.estimate) {
        quota = await navigator.storage.estimate();
      }
      
      newResults.storageManager = {
        status: 'success',
        details: {
          storageType: info.type,
          available: info.available,
          writeTest: 'passed',
          readTest: retrieved ? 'passed' : 'failed',
          quota: quota ? {
            usage: `${(quota.usage! / 1024 / 1024).toFixed(2)} MB`,
            total: `${(quota.quota! / 1024 / 1024 / 1024).toFixed(2)} GB`,
            percent: `${((quota.usage! / quota.quota!) * 100).toFixed(2)}%`
          } : 'not available'
        }
      };
    } catch (error: any) {
      newResults.storageManager = {
        status: 'error',
        details: { error: error.message }
      };
    }

    setResults(newResults);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Storage Architecture Audit Report
        </h1>
        
        <div className="grid gap-6">
          {/* localStorage Report */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={getStatusColor(results.localStorage.status)}>
                {results.localStorage.status === 'success' ? '✅' : 
                 results.localStorage.status === 'error' ? '❌' : '⏳'}
              </span>
              localStorage
            </h2>
            {results.localStorage.status !== 'pending' && (
              <pre className="text-sm text-muted overflow-auto">
                {JSON.stringify(results.localStorage.details, null, 2)}
              </pre>
            )}
          </div>

          {/* IndexedDB Report */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={getStatusColor(results.indexedDB.status)}>
                {results.indexedDB.status === 'success' ? '✅' : 
                 results.indexedDB.status === 'error' ? '❌' : '⏳'}
              </span>
              IndexedDB
            </h2>
            {results.indexedDB.status !== 'pending' && (
              <pre className="text-sm text-muted overflow-auto">
                {JSON.stringify(results.indexedDB.details, null, 2)}
              </pre>
            )}
          </div>

          {/* Firebase Report */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={getStatusColor(results.firebase.status)}>
                {results.firebase.status === 'success' ? '✅' : 
                 results.firebase.status === 'error' ? '❌' : '⏳'}
              </span>
              Firebase/Firestore
            </h2>
            {results.firebase.status !== 'pending' && (
              <pre className="text-sm text-muted overflow-auto">
                {JSON.stringify(results.firebase.details, null, 2)}
              </pre>
            )}
          </div>

          {/* Storage Manager Report */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={getStatusColor(results.storageManager.status)}>
                {results.storageManager.status === 'success' ? '✅' : 
                 results.storageManager.status === 'error' ? '❌' : '⏳'}
              </span>
              EnhancedStorageManager
            </h2>
            {results.storageManager.status !== 'pending' && (
              <pre className="text-sm text-muted overflow-auto">
                {JSON.stringify(results.storageManager.details, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <button
          onClick={runStorageTests}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Re-run Tests
        </button>
      </div>
    </div>
  );
}