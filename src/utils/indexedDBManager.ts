// IndexedDB manager for handling large data storage
const DB_NAME = 'DoshiSenseiDB';
const DB_VERSION = 1;

export interface DBStores {
  studyLists: 'studyLists';
  studyItems: 'studyItems';
}

const STORES: DBStores = {
  studyLists: 'studyLists',
  studyItems: 'studyItems'
};

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create study lists store
        if (!db.objectStoreNames.contains(STORES.studyLists)) {
          const listsStore = db.createObjectStore(STORES.studyLists, { keyPath: 'id' });
          listsStore.createIndex('createdAt', 'createdAt', { unique: false });
          listsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create study items store
        if (!db.objectStoreNames.contains(STORES.studyItems)) {
          const itemsStore = db.createObjectStore(STORES.studyItems, { keyPath: 'id' });
          itemsStore.createIndex('savedAt', 'savedAt', { unique: false });
          itemsStore.createIndex('itemType', 'itemType', { unique: false });
          // Create compound index for list queries
          itemsStore.createIndex('listIds', 'listIds', { unique: false, multiEntry: true });
        }
      };
    });
  }

  async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
  }

  // Study Lists operations
  async getAllStudyLists(): Promise<any[]> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyLists], 'readonly');
      const store = transaction.objectStore(STORES.studyLists);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get study lists'));
      };
    });
  }

  async saveStudyLists(lists: any[]): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyLists], 'readwrite');
      const store = transaction.objectStore(STORES.studyLists);

      // Clear existing and add all
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        lists.forEach(list => {
          store.add(list);
        });
      };

      transaction.oncomplete = () => {

        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to save study lists'));
      };
    });
  }

  // Study Items operations
  async getAllStudyItems(): Promise<any[]> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyItems], 'readonly');
      const store = transaction.objectStore(STORES.studyItems);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];

        resolve(items);
      };

      request.onerror = () => {
        reject(new Error('Failed to get study items'));
      };
    });
  }

  async saveStudyItems(items: any[]): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyItems], 'readwrite');
      const store = transaction.objectStore(STORES.studyItems);

      // Clear existing and add all
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add items in batches to avoid overwhelming the transaction
        const BATCH_SIZE = 100;
        let processed = 0;

        const addBatch = () => {
          const batch = items.slice(processed, processed + BATCH_SIZE);
          
          batch.forEach(item => {
            store.add(item);
          });

          processed += batch.length;

          if (processed < items.length) {
            // Continue with next batch
            setTimeout(addBatch, 0);
          }
        };

        addBatch();
      };

      transaction.oncomplete = () => {

        resolve();
      };

      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(new Error('Failed to save study items'));
      };
    });
  }

  async getStudyItemsByListId(listId: string): Promise<any[]> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyItems], 'readonly');
      const store = transaction.objectStore(STORES.studyItems);
      const index = store.index('listIds');
      const request = index.getAll(listId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get study items by list ID'));
      };
    });
  }

  async addStudyItem(item: any): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyItems], 'readwrite');
      const store = transaction.objectStore(STORES.studyItems);
      
      // Try to get existing item first
      const getRequest = store.get(item.id);
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          // Update existing
          store.put(item);
        } else {
          // Add new
          store.add(item);
        }
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to add study item'));
      };
    });
  }

  // Utility methods
  async clearAll(): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.studyLists, STORES.studyItems], 'readwrite');
      
      transaction.objectStore(STORES.studyLists).clear();
      transaction.objectStore(STORES.studyItems).clear();

      transaction.oncomplete = () => {

        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to clear IndexedDB'));
      };
    });
  }

  // Migration helper - migrate from localStorage to IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const STUDY_LISTS_KEY = 'studyLists';
      const SAVED_STUDY_ITEMS_KEY = 'savedStudyItems';

      // Get data from localStorage
      const listsData = localStorage.getItem(STUDY_LISTS_KEY);
      const itemsData = localStorage.getItem(SAVED_STUDY_ITEMS_KEY);

      if (listsData) {
        const lists = JSON.parse(listsData);

        await this.saveStudyLists(lists);
      }

      if (itemsData) {
        const items = JSON.parse(itemsData);

        await this.saveStudyItems(items);
      }

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();