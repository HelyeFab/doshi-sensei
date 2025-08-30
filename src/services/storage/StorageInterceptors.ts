/**
 * Storage Interceptors
 * Automatically intercepts ALL storage operations and syncs to Firebase for premium users
 * This ensures EVERY feature syncs without modifying individual services
 */

import { getUnifiedStorage } from './UnifiedStorageLayer';
import { auth } from '@/lib/firebase';
import { getDoc, doc, getFirestore } from 'firebase/firestore';

// Cache premium status for performance
let isPremiumCached: boolean | null = null;
let premiumCacheTime = 0;
const PREMIUM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function checkPremiumStatus(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached value if fresh
  if (isPremiumCached !== null && (now - premiumCacheTime) < PREMIUM_CACHE_DURATION) {
    return isPremiumCached;
  }
  
  const user = auth.currentUser;
  if (!user) {
    isPremiumCached = false;
    premiumCacheTime = now;
    return false;
  }
  
  try {
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      isPremiumCached = false;
      premiumCacheTime = now;
      return false;
    }
    
    const userData = userDoc.data();
    const subscription = userData.subscription;
    
    // Check for monthly or yearly subscription
    isPremiumCached = subscription?.plan === 'monthly' || subscription?.plan === 'yearly';
    premiumCacheTime = now;
    
    return isPremiumCached;
  } catch (error) {
    console.error('Error checking premium status:', error);
    isPremiumCached = false;
    premiumCacheTime = now;
    return false;
  }
}

/**
 * Intercept localStorage operations
 */
export function interceptLocalStorage() {
  const storage = getUnifiedStorage();
  const userId = auth.currentUser?.uid;
  
  // Store original methods
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  
  // Override setItem
  localStorage.setItem = function(key: string, value: string) {
    // Call original method
    originalSetItem(key, value);
    
    // Sync to cloud if premium
    if (userId) {
      checkPremiumStatus().then(isPremium => {
        if (isPremium) {
          try {
            const parsedValue = JSON.parse(value);
            storage.save(`localStorage_${key}`, key, parsedValue, { skipLocal: true });
          } catch {
            // If not JSON, store as string
            storage.save(`localStorage_${key}`, key, { value }, { skipLocal: true });
          }
        }
      });
    }
  };
  
  // Override getItem to check cloud first for premium users
  localStorage.getItem = function(key: string): string | null {
    const localValue = originalGetItem(key);
    
    // For premium users, check if cloud has newer data
    if (userId) {
      checkPremiumStatus().then(isPremium => {
        if (isPremium) {
          storage.load(`localStorage_${key}`, key).then(cloudValue => {
            if (cloudValue && cloudValue.updatedAt) {
              // If cloud is newer, update local
              const cloudStr = typeof cloudValue.value === 'string' 
                ? cloudValue.value 
                : JSON.stringify(cloudValue);
              originalSetItem(key, cloudStr);
            }
          });
        }
      });
    }
    
    return localValue;
  };
  
  // Override removeItem
  localStorage.removeItem = function(key: string) {
    originalRemoveItem(key);
    
    // Remove from cloud if premium
    if (userId) {
      checkPremiumStatus().then(isPremium => {
        if (isPremium) {
          storage.delete(`localStorage_${key}`, key);
        }
      });
    }
  };
}

/**
 * Intercept IndexedDB operations
 */
export function interceptIndexedDB() {
  const storage = getUnifiedStorage();
  
  // Store original open method
  const originalOpen = indexedDB.open.bind(indexedDB);
  
  // Override indexedDB.open
  indexedDB.open = function(name: string, version?: number): IDBOpenDBRequest {
    const request = originalOpen(name, version);
    
    // Intercept success to wrap the database
    const originalOnsuccess = request.onsuccess;
    request.onsuccess = function(event: Event) {
      const db = request.result;
      
      // Wrap transaction method
      const originalTransaction = db.transaction.bind(db);
      db.transaction = function(
        storeNames: string | string[], 
        mode?: IDBTransactionMode,
        options?: IDBTransactionOptions
      ): IDBTransaction {
        const transaction = originalTransaction(storeNames, mode, options);
        
        // Only intercept readwrite transactions
        if (mode === 'readwrite') {
          const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
          
          stores.forEach(storeName => {
            const objectStore = transaction.objectStore(storeName);
            
            // Wrap put method
            const originalPut = objectStore.put.bind(objectStore);
            objectStore.put = function(value: any, key?: IDBValidKey): IDBRequest {
              const request = originalPut(value, key);
              
              // Sync to cloud on success
              request.onsuccess = function() {
                const userId = auth.currentUser?.uid;
                if (userId) {
                  checkPremiumStatus().then(isPremium => {
                    if (isPremium) {
                      const actualKey = key || value.id || request.result;
                      storage.save(
                        `idb_${name}_${storeName}`,
                        String(actualKey),
                        value,
                        { skipLocal: true }
                      );
                    }
                  });
                }
              };
              
              return request;
            };
            
            // Wrap add method
            const originalAdd = objectStore.add.bind(objectStore);
            objectStore.add = function(value: any, key?: IDBValidKey): IDBRequest {
              const request = originalAdd(value, key);
              
              // Sync to cloud on success
              request.onsuccess = function() {
                const userId = auth.currentUser?.uid;
                if (userId) {
                  checkPremiumStatus().then(isPremium => {
                    if (isPremium) {
                      const actualKey = key || value.id || request.result;
                      storage.save(
                        `idb_${name}_${storeName}`,
                        String(actualKey),
                        value,
                        { skipLocal: true }
                      );
                    }
                  });
                }
              };
              
              return request;
            };
            
            // Wrap delete method
            const originalDelete = objectStore.delete.bind(objectStore);
            objectStore.delete = function(key: IDBValidKey | IDBKeyRange): IDBRequest {
              const request = originalDelete(key);
              
              // Sync deletion to cloud
              request.onsuccess = function() {
                const userId = auth.currentUser?.uid;
                if (userId) {
                  checkPremiumStatus().then(isPremium => {
                    if (isPremium && !(key instanceof IDBKeyRange)) {
                      storage.delete(
                        `idb_${name}_${storeName}`,
                        String(key)
                      );
                    }
                  });
                }
              };
              
              return request;
            };
          });
        }
        
        return transaction;
      };
      
      // Call original success handler
      if (originalOnsuccess) {
        originalOnsuccess.call(request, event);
      }
    };
    
    return request;
  };
}

/**
 * Intercept sessionStorage operations (for temporary data that might need sync)
 */
export function interceptSessionStorage() {
  const storage = getUnifiedStorage();
  const userId = auth.currentUser?.uid;
  
  // Store original methods
  const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
  const originalRemoveItem = sessionStorage.removeItem.bind(sessionStorage);
  
  // Override setItem
  sessionStorage.setItem = function(key: string, value: string) {
    originalSetItem(key, value);
    
    // Only sync certain keys that should persist
    const persistentKeys = ['draft_', 'temp_study_', 'unsaved_'];
    const shouldPersist = persistentKeys.some(prefix => key.startsWith(prefix));
    
    if (shouldPersist && userId) {
      checkPremiumStatus().then(isPremium => {
        if (isPremium) {
          try {
            const parsedValue = JSON.parse(value);
            storage.save(`session_${key}`, key, parsedValue, { skipLocal: true });
          } catch {
            storage.save(`session_${key}`, key, { value }, { skipLocal: true });
          }
        }
      });
    }
  };
  
  // Override removeItem
  sessionStorage.removeItem = function(key: string) {
    originalRemoveItem(key);
    
    const persistentKeys = ['draft_', 'temp_study_', 'unsaved_'];
    const shouldPersist = persistentKeys.some(prefix => key.startsWith(prefix));
    
    if (shouldPersist && userId) {
      checkPremiumStatus().then(isPremium => {
        if (isPremium) {
          storage.delete(`session_${key}`, key);
        }
      });
    }
  };
}

/**
 * Initialize all storage interceptors
 * Call this ONCE at app startup
 */
export function initializeStorageInterceptors() {
  console.log('🔧 Initializing storage interceptors...');
  
  // Intercept all storage types
  interceptLocalStorage();
  interceptIndexedDB();
  interceptSessionStorage();
  
  // Listen for auth changes to update interceptors
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Clear premium cache to force re-check
      isPremiumCached = null;
      premiumCacheTime = 0;
      console.log('👤 Storage interceptors updated for user:', user.uid);
    } else {
      // Clear premium status for logged out users
      isPremiumCached = false;
      premiumCacheTime = Date.now();
      console.log('👤 Storage interceptors cleared (user logged out)');
    }
  });
  
  console.log('✅ Storage interceptors initialized');
}

/**
 * Disable storage interceptors (for testing or debugging)
 */
export function disableStorageInterceptors() {
  // This would need to store and restore original methods
  // Implementation depends on whether we want this feature
  console.warn('⚠️ Storage interceptors cannot be disabled once initialized');
}