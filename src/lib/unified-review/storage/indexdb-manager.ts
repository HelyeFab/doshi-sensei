/**
 * IndexedDB Manager for Unified Review Engine
 * 
 * Handles all database operations for the review system including:
 * - Schema creation and upgrades
 * - Transaction management
 * - Performance optimization
 * - Error handling and recovery
 */

import { StorageConfig, StorageError, UREError } from '../types';

/**
 * IndexedDB schema version and store configurations
 */
export const DB_CONFIG = {
  name: 'DoshiSenseiReview',
  version: 1,
  stores: {
    reviewItems: {
      keyPath: 'id',
      indexes: {
        type: { keyPath: 'type', unique: false },
        source: { keyPath: 'metadata.source', unique: false },
        createdAt: { keyPath: 'createdAt', unique: false },
        tags: { keyPath: 'metadata.tags', unique: false, multiEntry: true }
      }
    },
    reviewProgress: {
      keyPath: ['userId', 'itemId'],
      indexes: {
        userId: { keyPath: 'userId', unique: false },
        itemId: { keyPath: 'itemId', unique: false },
        nextReview: { keyPath: 'nextReview', unique: false },
        algorithm: { keyPath: 'algorithm', unique: false },
        masteryLevel: { keyPath: 'masteryLevel', unique: false },
        syncedAt: { keyPath: 'syncedAt', unique: false }
      }
    },
    reviewSessions: {
      keyPath: 'sessionId',
      indexes: {
        userId: { keyPath: 'userId', unique: false },
        startTime: { keyPath: 'startTime', unique: false },
        endTime: { keyPath: 'endTime', unique: false }
      }
    },
    notifications: {
      keyPath: 'id',
      indexes: {
        userId: { keyPath: 'userId', unique: false },
        scheduledTime: { keyPath: 'scheduledTime', unique: false },
        status: { keyPath: 'status', unique: false }
      }
    },
    settings: {
      keyPath: ['userId', 'key'],
      indexes: {
        userId: { keyPath: 'userId', unique: false }
      }
    }
  }
};

/**
 * Transaction types for type safety
 */
export type StoreNames = keyof typeof DB_CONFIG.stores;
export type TransactionMode = 'readonly' | 'readwrite';

/**
 * IndexedDB Manager class
 */
export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private config: StorageConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      dbName: DB_CONFIG.name,
      dbVersion: DB_CONFIG.version,
      enableSync: true,
      syncInterval: 30,
      maxOfflineStorage: 100,
      ...config
    };
  }

  /**
   * Initialize the database connection
   */
  public async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.openDatabase();
    return this.initPromise;
  }

  /**
   * Open IndexedDB connection with schema creation/upgrade
   */
  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new StorageError('IndexedDB not supported in this browser'));
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        reject(new StorageError('Failed to open database', request.error));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.setupErrorHandlers();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        
        this.createStores(db, transaction, event.oldVersion, event.newVersion || 1);
      };
    });
  }

  /**
   * Create object stores and indexes during database upgrade
   */
  private createStores(
    db: IDBDatabase, 
    transaction: IDBTransaction, 
    oldVersion: number, 
    newVersion: number
  ): void {
    console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

    // Create stores for version 1
    if (oldVersion < 1) {
      this.createVersion1Stores(db);
    }

    // Future version upgrades would go here
    // if (oldVersion < 2) {
    //   this.upgradeToVersion2(db);
    // }
  }

  /**
   * Create stores for version 1
   */
  private createVersion1Stores(db: IDBDatabase): void {
    Object.entries(DB_CONFIG.stores).forEach(([storeName, config]) => {
      // Skip if store already exists
      if (db.objectStoreNames.contains(storeName)) {
        return;
      }

      const store = db.createObjectStore(storeName, { 
        keyPath: config.keyPath 
      });

      // Create indexes
      if (config.indexes) {
        Object.entries(config.indexes).forEach(([indexName, indexConfig]) => {
          store.createIndex(indexName, indexConfig.keyPath, {
            unique: indexConfig.unique,
            multiEntry: indexConfig.multiEntry
          });
        });
      }

      console.log(`Created object store: ${storeName}`);
    });
  }

  /**
   * Setup error handlers for the database connection
   */
  private setupErrorHandlers(): void {
    if (!this.db) return;

    this.db.onerror = (event) => {
      console.error('Database error:', event);
    };

    this.db.onversionchange = () => {
      console.log('Database version change detected, closing connection');
      this.close();
    };
  }

  /**
   * Get a transaction for the specified stores
   */
  public async getTransaction(
    storeNames: StoreNames | StoreNames[], 
    mode: TransactionMode = 'readonly'
  ): Promise<IDBTransaction> {
    await this.init();
    
    if (!this.db) {
      throw new StorageError('Database not initialized');
    }

    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
    return this.db.transaction(stores, mode);
  }

  /**
   * Get an object store from a transaction
   */
  public getStore(
    transaction: IDBTransaction, 
    storeName: StoreNames
  ): IDBObjectStore {
    return transaction.objectStore(storeName);
  }

  /**
   * Execute a database operation with automatic transaction management
   */
  public async executeTransaction<T>(
    storeNames: StoreNames | StoreNames[],
    mode: TransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const transaction = await this.getTransaction(storeNames, mode);
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(new StorageError('Transaction failed', transaction.error));
      };

      transaction.onabort = () => {
        reject(new StorageError('Transaction aborted'));
      };

      transaction.oncomplete = () => {
        // Transaction completed successfully
      };

      // Execute the operation
      operation(transaction)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Count total number of records in a store
   */
  public async count(storeName: StoreNames, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    const transaction = await this.getTransaction(storeName, 'readonly');
    const store = this.getStore(transaction, storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.count(query);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new StorageError('Count operation failed', request.error));
    });
  }

  /**
   * Check if the database is healthy and responsive
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    storeCounts: Record<string, number>;
    lastCheck: Date;
  }> {
    try {
      await this.init();
      
      const storeCounts: Record<string, number> = {};
      
      for (const storeName of Object.keys(DB_CONFIG.stores) as StoreNames[]) {
        try {
          storeCounts[storeName] = await this.count(storeName);
        } catch (error) {
          console.warn(`Failed to count ${storeName}:`, error);
          storeCounts[storeName] = -1;
        }
      }

      return {
        connected: true,
        storeCounts,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        connected: false,
        storeCounts: {},
        lastCheck: new Date()
      };
    }
  }

  /**
   * Clear all data from a specific store
   */
  public async clearStore(storeName: StoreNames): Promise<void> {
    const transaction = await this.getTransaction(storeName, 'readwrite');
    const store = this.getStore(transaction, storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError('Clear operation failed', request.error));
    });
  }

  /**
   * Get database storage usage information
   */
  public async getStorageEstimate(): Promise<{
    quota?: number;
    usage?: number;
    usagePercentage?: number;
    available?: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;
        const available = quota - usage;

        return {
          quota,
          usage,
          usagePercentage,
          available
        };
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }

    return {};
  }

  /**
   * Create an index cursor for efficient iteration
   */
  public async createIndexCursor<T>(
    storeName: StoreNames,
    indexName: string,
    query?: IDBValidKey | IDBKeyRange,
    direction: IDBCursorDirection = 'next'
  ): Promise<T[]> {
    const transaction = await this.getTransaction(storeName, 'readonly');
    const store = this.getStore(transaction, storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const request = index.openCursor(query, direction);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new StorageError('Cursor operation failed', request.error));
      };
    });
  }

  /**
   * Batch operation for better performance
   */
  public async batch<T>(
    operations: Array<{
      store: StoreNames;
      operation: 'put' | 'add' | 'delete';
      data?: T;
      key?: IDBValidKey;
    }>
  ): Promise<void> {
    const storeNames = [...new Set(operations.map(op => op.store))];
    
    return this.executeTransaction(storeNames, 'readwrite', async (transaction) => {
      const promises = operations.map(op => {
        const store = this.getStore(transaction, op.store);
        
        return new Promise<void>((resolve, reject) => {
          let request: IDBRequest;
          
          switch (op.operation) {
            case 'put':
              request = store.put(op.data);
              break;
            case 'add':
              request = store.add(op.data);
              break;
            case 'delete':
              request = store.delete(op.key!);
              break;
            default:
              reject(new StorageError(`Unknown operation: ${op.operation}`));
              return;
          }
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new StorageError(`${op.operation} operation failed`, request.error));
        });
      });

      await Promise.all(promises);
    });
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Delete the entire database
   */
  public async deleteDatabase(): Promise<void> {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError('Failed to delete database', request.error));
      request.onblocked = () => {
        console.warn('Database deletion blocked - other tabs may be using it');
        // Still resolve as the deletion will complete when other connections close
        setTimeout(resolve, 1000);
      };
    });
  }

  /**
   * Export all data for backup purposes
   */
  public async exportData(): Promise<Record<string, any[]>> {
    const exportData: Record<string, any[]> = {};
    
    for (const storeName of Object.keys(DB_CONFIG.stores) as StoreNames[]) {
      exportData[storeName] = await this.getAllFromStore(storeName);
    }
    
    return exportData;
  }

  /**
   * Get all records from a store
   */
  private async getAllFromStore(storeName: StoreNames): Promise<any[]> {
    const transaction = await this.getTransaction(storeName, 'readonly');
    const store = this.getStore(transaction, storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new StorageError(`Failed to get all from ${storeName}`, request.error));
    });
  }
}