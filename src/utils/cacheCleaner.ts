/**
 * Cache Cleaner Utility
 * Provides user-friendly cache clearing functionality
 */

export interface CacheClearResult {
  success: boolean;
  clearedItems: {
    serviceworkers: number;
    caches: number;
    localStorage: boolean;
    indexedDB: boolean;
  };
  errors: string[];
}

export class CacheCleaner {
  /**
   * Clear all browser caches and storage
   * This is safe to call from any browser
   */
  static async clearAllCaches(): Promise<CacheClearResult> {
    const result: CacheClearResult = {
      success: true,
      clearedItems: {
        serviceworkers: 0,
        caches: 0,
        localStorage: false,
        indexedDB: false
      },
      errors: []
    };

    // Add a timeout to prevent hanging
    const timeout = new Promise<CacheClearResult>((resolve) => {
      setTimeout(() => {
        result.errors.push('Operation timed out');
        result.success = false;
        resolve(result);
      }, 10000); // 10 second timeout
    });

    // Run the actual clearing with timeout
    return Promise.race([
      this.performClear(result),
      timeout
    ]);
  }

  private static async performClear(result: CacheClearResult): Promise<CacheClearResult> {
    // 1. Unregister Service Workers
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          const success = await registration.unregister();
          if (success) {
            result.clearedItems.serviceworkers++;
          }
        }
      }
    } catch (error) {
      result.errors.push('Failed to unregister service workers');
      console.error('Service worker error:', error);
    }

    // 2. Clear Browser Caches
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const success = await caches.delete(cacheName);
          if (success) {
            result.clearedItems.caches++;
          }
        }
      }
    } catch (error) {
      result.errors.push('Failed to clear browser caches');
      console.error('Cache error:', error);
    }

    // 3. Clear localStorage (app data only)
    try {
      const keysToKeep = ['theme', 'language']; // Keep user preferences
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      result.clearedItems.localStorage = true;
    } catch (error) {
      result.errors.push('Failed to clear local storage');
      console.error('LocalStorage error:', error);
    }

    // 4. Clear IndexedDB
    try {
      if ('indexedDB' in window) {
        // Get all databases
        const databases = await indexedDB.databases();
        
        for (const db of databases) {
          if (db.name) {
            try {
              // Delete each database
              await new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
              result.clearedItems.indexedDB = true;
            } catch (dbError) {
              console.error(`Failed to delete database ${db.name}:`, dbError);
            }
          }
        }
      }
    } catch (error) {
      // Some browsers don't support indexedDB.databases()
      // Try to delete known databases
      try {
        const knownDatabases = [
          'doshi-sensei-jmdict',
          'doshi-sensei-stories',
          'doshi-sensei-resources',
          'enhancedStorage',
          'firebaseLocalStorageDb'
        ];
        
        for (const dbName of knownDatabases) {
          try {
            await new Promise<void>((resolve) => {
              const deleteReq = indexedDB.deleteDatabase(dbName);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => resolve(); // Continue even if error
            });
            result.clearedItems.indexedDB = true;
          } catch (dbError) {
            console.error(`Failed to delete database ${dbName}:`, dbError);
          }
        }
      } catch (fallbackError) {
        result.errors.push('Failed to clear IndexedDB');
        console.error('IndexedDB error:', fallbackError);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    serviceworkers: number;
    caches: string[];
    localStorageSize: number;
    indexedDBs: string[];
  }> {
    const stats = {
      serviceworkers: 0,
      caches: [] as string[],
      localStorageSize: 0,
      indexedDBs: [] as string[]
    };

    // Count service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      stats.serviceworkers = registrations.length;
    }

    // List caches
    if ('caches' in window) {
      stats.caches = await caches.keys();
    }

    // Calculate localStorage size
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              totalSize += value.length + key.length;
            }
          } catch (e) {
            // Skip items that can't be accessed
            console.warn(`Could not access localStorage item: ${key}`, e);
          }
        }
      }
      stats.localStorageSize = totalSize || 0; // Ensure it's never undefined
    } catch (error) {
      console.error('Error calculating localStorage size:', error);
      stats.localStorageSize = 0; // Default to 0 if there's an error
    }

    // List IndexedDB databases
    try {
      if ('indexedDB' in window && indexedDB.databases) {
        const databases = await indexedDB.databases();
        stats.indexedDBs = databases.map(db => db.name || 'unknown').filter(Boolean);
      }
    } catch (error) {
      // Fallback for browsers that don't support databases()
      stats.indexedDBs = ['Browser does not support listing databases'];
    }

    return stats;
  }
}