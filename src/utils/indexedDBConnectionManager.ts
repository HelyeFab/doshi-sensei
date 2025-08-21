/**
 * IndexedDB Connection Manager
 * Handles database connection lifecycle and error recovery
 */

export class IndexedDBConnectionManager {
  private static instances = new Map<string, IndexedDBConnectionManager>();
  private db: IDBDatabase | null = null;
  private isClosing = false;
  private pendingOperations = new Set<Promise<any>>();
  private connectionPromise: Promise<IDBDatabase> | null = null;

  private constructor(
    private dbName: string,
    private version: number,
    private onUpgrade?: (db: IDBDatabase, oldVersion: number, newVersion: number) => void
  ) {}

  static getInstance(
    dbName: string,
    version: number,
    onUpgrade?: (db: IDBDatabase, oldVersion: number, newVersion: number) => void
  ): IndexedDBConnectionManager {
    const key = `${dbName}_v${version}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new IndexedDBConnectionManager(dbName, version, onUpgrade));
    }
    return this.instances.get(key)!;
  }

  /**
   * Get database connection with retry logic
   */
  async getConnection(): Promise<IDBDatabase> {
    // If we're in the process of closing, wait and retry
    if (this.isClosing) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getConnection();
    }

    // If we have a valid connection, check it's still open
    if (this.db && this.db.readyState !== 'closed') {
      return this.db;
    }

    // If we're already connecting, wait for that
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection
    this.connectionPromise = this.connect();
    
    try {
      this.db = await this.connectionPromise;
      return this.db;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async connect(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is not available in server-side environment'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error(`Failed to open database ${this.dbName}:`, request.error);
        reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Add error handlers
        db.onerror = (event) => {
          console.error('Database error:', event);
        };

        db.onabort = (event) => {
          console.error('Database transaction aborted:', event);
        };

        db.onclose = () => {
          console.log(`Database ${this.dbName} closed`);
          this.db = null;
        };

        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || this.version;
        
        if (this.onUpgrade) {
          this.onUpgrade(db, oldVersion, newVersion);
        }
      };

      request.onblocked = () => {
        console.warn(`Database ${this.dbName} upgrade blocked. Close other tabs.`);
      };
    });
  }

  /**
   * Execute a transaction with automatic retry on failure
   */
  async executeTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if we're closing
        if (this.isClosing) {
          throw new Error('Database is closing');
        }

        const db = await this.getConnection();
        
        // Check if database is still valid
        if (!db || db.readyState === 'closed') {
          throw new Error('Database connection is closed');
        }

        // Create transaction
        const transaction = db.transaction(storeNames, mode);
        
        // Create promise that tracks transaction completion
        const transactionPromise = new Promise<T>((resolve, reject) => {
          let result: T;
          
          transaction.oncomplete = () => {
            this.pendingOperations.delete(transactionPromise);
            resolve(result);
          };
          
          transaction.onerror = () => {
            this.pendingOperations.delete(transactionPromise);
            reject(new Error(`Transaction failed: ${transaction.error?.message || 'Unknown error'}`));
          };
          
          transaction.onabort = () => {
            this.pendingOperations.delete(transactionPromise);
            reject(new Error('Transaction aborted'));
          };
          
          // Execute the operation
          operation(transaction)
            .then(res => { result = res; })
            .catch(err => {
              transaction.abort();
              reject(err);
            });
        });
        
        // Track pending operation
        this.pendingOperations.add(transactionPromise);
        
        return await transactionPromise;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Transaction attempt ${attempt + 1} failed:`, error);
        
        // If it's a connection issue, reset the connection
        if (lastError.message.includes('closing') || lastError.message.includes('closed')) {
          this.db = null;
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError || new Error('Transaction failed after max retries');
  }

  /**
   * Safely close the database connection
   */
  async close(): Promise<void> {
    if (this.isClosing) return;
    
    this.isClosing = true;
    
    try {
      // Wait for all pending operations
      if (this.pendingOperations.size > 0) {
        console.log(`Waiting for ${this.pendingOperations.size} pending operations...`);
        await Promise.allSettled(Array.from(this.pendingOperations));
      }
      
      // Close the database
      if (this.db && this.db.readyState !== 'closed') {
        this.db.close();
        this.db = null;
      }
    } finally {
      this.isClosing = false;
    }
  }

  /**
   * Clean up all connections (useful for HMR)
   */
  static async closeAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(instance => instance.close());
    await Promise.allSettled(promises);
    this.instances.clear();
  }

  /**
   * Check if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const db = await this.getConnection();
      return db && db.readyState !== 'closed';
    } catch {
      return false;
    }
  }
}

/**
 * Helper function to handle HMR cleanup
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Clean up on hot reload
  if ((module as any).hot) {
    (module as any).hot.dispose(() => {
      IndexedDBConnectionManager.closeAll();
    });
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    IndexedDBConnectionManager.closeAll();
  });
}