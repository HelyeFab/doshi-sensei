/**
 * IndexedDB Storage Adapter
 * Local storage implementation using IndexedDB
 */

import { StorageAdapter } from '../types';

export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;
  private storeName: string = 'review_store';

  constructor(dbName: string = 'review_hub_db') {
    this.dbName = dbName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes
          store.createIndex('sourceType', 'sourceType', { unique: false });
          store.createIndex('contentType', 'contentType', { unique: false });
          store.createIndex('dueDate', 'scheduling.dueDate', { unique: false });
          store.createIndex('lastReviewedAt', 'metadata.lastReviewedAt', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('syncVersion', 'sync.version', { unique: false });
        }
      };
    });
  }

  async get(key: string): Promise<any> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to get item: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Add id if not present
      const data = { ...value, id: key };
      
      // Add TTL if specified
      if (ttl) {
        data._ttl = Date.now() + ttl;
      }
      
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to set item: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to delete item: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Delete error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to clear store: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Clear error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null && value !== undefined;
  }

  /**
   * Get all items matching a query
   */
  async query(indexName: string, value: any): Promise<any[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index(indexName);
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(value);
        
        request.onsuccess = () => {
          const results = request.result;
          // Filter out expired items
          const now = Date.now();
          const valid = results.filter(item => !item._ttl || item._ttl > now);
          resolve(valid);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to query items: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] Query error:', error);
      return [];
    }
  }

  /**
   * Get all items within a range
   */
  async queryRange(
    indexName: string,
    lower: any,
    upper: any,
    limit?: number
  ): Promise<any[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index(indexName);
      
      const range = IDBKeyRange.bound(lower, upper);
      
      return new Promise((resolve, reject) => {
        const items: any[] = [];
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && (!limit || items.length < limit)) {
            const item = cursor.value;
            // Check TTL
            if (!item._ttl || item._ttl > Date.now()) {
              items.push(item);
            }
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to query range: ${request.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] QueryRange error:', error);
      return [];
    }
  }

  /**
   * Batch operations for efficiency
   */
  async batchSet(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const promises = items.map(({ key, value, ttl }) => {
        const data = { ...value, id: key };
        if (ttl) {
          data._ttl = Date.now() + ttl;
        }
        
        return new Promise<void>((resolve, reject) => {
          const request = store.put(data);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.error('[IndexedDBAdapter] BatchSet error:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    itemCount: number;
    estimatedSize: number;
    indexes: string[];
  }> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const countRequest = store.count();
      
      return new Promise((resolve, reject) => {
        countRequest.onsuccess = async () => {
          const itemCount = countRequest.result;
          
          // Estimate size (rough approximation)
          let estimatedSize = 0;
          if ('estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            estimatedSize = estimate.usage || 0;
          }
          
          // Get index names
          const indexes = Array.from(store.indexNames);
          
          resolve({
            itemCount,
            estimatedSize,
            indexes
          });
        };
        
        countRequest.onerror = () => {
          reject(new Error(`Failed to get stats: ${countRequest.error}`));
        };
      });
    } catch (error) {
      console.error('[IndexedDBAdapter] GetStats error:', error);
      return {
        itemCount: 0,
        estimatedSize: 0,
        indexes: []
      };
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}