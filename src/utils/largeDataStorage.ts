// Simple IndexedDB wrapper for large data storage
// This avoids webpack module resolution issues

const DB_NAME = 'DoshiSenseiLargeData';
const DB_VERSION = 1;
const ITEMS_STORE = 'savedStudyItems';

class LargeDataStorage {
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(ITEMS_STORE)) {
          const store = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
          store.createIndex('listIds', 'listIds', { unique: false, multiEntry: true });
        }
      };
    });
  }

  async getAllItems(): Promise<any[]> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ITEMS_STORE], 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`LargeDataStorage: Retrieved ${request.result.length} items from IndexedDB`);
        resolve(request.result || []);
      };

      request.onerror = () => reject(new Error('Failed to get items'));
    });
  }

  async saveAllItems(items: any[]): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ITEMS_STORE], 'readwrite');
      const store = transaction.objectStore(ITEMS_STORE);

      // Clear existing items first
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add all items after clear completes
        let added = 0;
        let errors = 0;
        const totalItems = items.length;
        
        // Track completion
        const checkComplete = () => {
          if (added + errors === totalItems) {
            console.log(`LargeDataStorage: Saved ${added} items to IndexedDB (${errors} errors)`);
            if (errors === 0) {
              resolve();
            } else if (added > 0) {
              // Partial success
              resolve();
            } else {
              reject(new Error(`Failed to save items: ${errors} errors`));
            }
          }
        };
        
        // If no items to add, resolve immediately
        if (totalItems === 0) {
          resolve();
          return;
        }
        
        for (const item of items) {
          try {
            const request = store.add(item);
            request.onsuccess = () => {
              added++;
              checkComplete();
            };
            request.onerror = (event) => {
              errors++;
              console.warn(`Failed to add item with id ${item.id}:`, event);
              checkComplete();
            };
          } catch (error) {
            errors++;
            console.warn(`Exception adding item with id ${item.id}:`, error);
            checkComplete();
          }
        }
      };
      
      clearRequest.onerror = (event) => {
        console.error('Failed to clear store:', event);
        reject(new Error('Failed to clear existing items'));
      };

      transaction.onerror = (event) => {
        console.error('Transaction failed:', event);
        const error = (event.target as IDBRequest).error;
        reject(new Error('Failed to save items: ' + (error?.message || 'Unknown error')));
      };
      
      transaction.onabort = () => {
        console.error('Transaction aborted');
        reject(new Error('Transaction was aborted'));
      };
    });
  }

  async getItemsByListId(listId: string): Promise<any[]> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ITEMS_STORE], 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const index = store.index('listIds');
      const request = index.getAll(listId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get items by list ID'));
    });
  }

  async getItemCount(): Promise<number> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ITEMS_STORE], 'readonly');
      const store = transaction.objectStore(ITEMS_STORE);
      const request = store.count();

      request.onsuccess = () => {
        console.log(`LargeDataStorage: Total items in IndexedDB: ${request.result}`);
        resolve(request.result);
      };
      request.onerror = () => reject(new Error('Failed to count items'));
    });
  }
}

// Export singleton
export const largeDataStorage = new LargeDataStorage();