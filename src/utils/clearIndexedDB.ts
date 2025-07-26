/**
 * Utility to clear all IndexedDB databases
 * This is useful when there are version conflicts
 */

export async function clearAllIndexedDB(): Promise<void> {
  console.log('Starting IndexedDB cleanup...');

  try {
    // First, try to close any open connections
    if ((window as any).doshiSenseiDB) {
      console.log('Closing existing DoshiSenseiDB connection...');
      (window as any).doshiSenseiDB.close();
      delete (window as any).doshiSenseiDB;
    }

    // Get all databases (this method might not be available in all browsers)
    if ('databases' in indexedDB) {
      const databases = await (indexedDB as any).databases();
      console.log('Found databases:', databases);
      
      for (const db of databases) {
        try {
          console.log(`Deleting database: ${db.name} (version ${db.version})`);
          await deleteDatabase(db.name);
        } catch (error) {
          console.error(`Failed to delete database ${db.name}:`, error);
        }
      }
    }
    
    // Always try to delete known database names
    const knownDatabases = [
      'DoshiSenseiDB',  // Main app database
      'doshi-sensei-db',
      'textbook-vocabulary',
      'jmdict-cache',
      'cache-db',
      'firebaseLocalStorageDb',
      'firebase-heartbeat-database',
      'firebase-installations-database',
      '_ionicstorage',
      'keyval-store'
    ];
    
    for (const dbName of knownDatabases) {
      try {
        console.log(`Attempting to delete database: ${dbName}`);
        await deleteDatabase(dbName);
      } catch (error) {
        // Only log if it's not a "not found" error
        if (!error?.message?.includes('not found')) {
          console.error(`Failed to delete database ${dbName}:`, error);
        }
      }
    }
    
    console.log('IndexedDB cleanup completed');
  } catch (error) {
    console.error('Error during IndexedDB cleanup:', error);
    throw error;
  }
}

async function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteReq = indexedDB.deleteDatabase(name);
    
    deleteReq.onsuccess = () => {
      console.log(`Successfully deleted database: ${name}`);
      resolve();
    };
    
    deleteReq.onerror = () => {
      console.error(`Error deleting database ${name}:`, deleteReq.error);
      reject(deleteReq.error);
    };
    
    deleteReq.onblocked = () => {
      console.warn(`Delete blocked for database ${name}. Close all connections and try again.`);
      // Still resolve to continue with other databases
      resolve();
    };
  });
}

// Function to run from browser console
export function exposeDeleteFunction() {
  if (typeof window !== 'undefined') {
    (window as any).clearAllIndexedDB = clearAllIndexedDB;
    console.log('Function exposed! Run clearAllIndexedDB() in the console to delete all IndexedDB databases.');
  }
}