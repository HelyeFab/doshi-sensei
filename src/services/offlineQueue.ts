/**
 * Offline Queue Service with IndexedDB
 * Manages failed requests for background sync
 */

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
  metadata?: Record<string, any>;
}

class OfflineQueueService {
  private dbName = 'doshi-sensei-offline';
  private dbVersion = 1;
  private storeName = 'request-queue';
  private db: IDBDatabase | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      this.setupEventListeners();
    }
  }

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      console.log('[OfflineQueue] Database initialized');
      
      // Process queue when coming online
      if (this.isOnline) {
        this.processQueue();
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to initialize:', error);
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create request queue store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id' 
          });
          
          // Create indexes
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains('sync-metadata')) {
          const metaStore = db.createObjectStore('sync-metadata', { 
            keyPath: 'key' 
          });
          metaStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[OfflineQueue] Back online, processing queue...');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[OfflineQueue] Gone offline');
    });

    // Service worker sync event
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        // Register for background sync
        (registration as any).sync.register('sync-queue').catch((error: Error) => {
          console.error('[OfflineQueue] Failed to register sync:', error);
        });
      });
    }

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log(`[OfflineQueue] Synced ${event.data.count} requests`);
          this.clearProcessedRequests();
        }
      });
    }
  }

  /**
   * Add request to queue
   */
  async queueRequest(
    url: string,
    options: RequestInit = {},
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = this.generateId();
    const queuedRequest: QueuedRequest = {
      id,
      url,
      method: options.method || 'GET',
      headers: this.serializeHeaders(options.headers),
      body: options.body as string,
      timestamp: Date.now(),
      retryCount: 0,
      priority: this.getPriority(url, options.method),
      metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(queuedRequest);

      request.onsuccess = () => {
        console.log(`[OfflineQueue] Queued request: ${url}`);
        resolve(id);
        
        // Try to process immediately if online
        if (this.isOnline) {
          this.processQueue();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to queue request'));
      };
    });
  }

  /**
   * Process queued requests
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || !this.db) {
      return;
    }

    this.syncInProgress = true;
    console.log('[OfflineQueue] Processing queue...');

    try {
      const requests = await this.getQueuedRequests();
      let successCount = 0;
      let failureCount = 0;

      for (const request of requests) {
        try {
          const response = await this.executeRequest(request);
          
          if (response.ok) {
            await this.removeRequest(request.id);
            successCount++;
          } else {
            await this.handleFailedRequest(request);
            failureCount++;
          }
        } catch (error) {
          console.error(`[OfflineQueue] Failed to process ${request.url}:`, error);
          await this.handleFailedRequest(request);
          failureCount++;
        }
      }

      console.log(`[OfflineQueue] Processed: ${successCount} success, ${failureCount} failed`);
      
      // Notify UI
      this.notifyUI({
        type: 'SYNC_COMPLETE',
        successCount,
        failureCount,
        remaining: failureCount
      });

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<Response> {
    const headers = new Headers(request.headers);
    
    // Add sync header
    headers.set('X-Sync-Request', 'true');
    headers.set('X-Sync-Timestamp', request.timestamp.toString());

    return fetch(request.url, {
      method: request.method,
      headers,
      body: request.body,
      // Add abort controller with timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
  }

  /**
   * Handle failed request
   */
  private async handleFailedRequest(request: QueuedRequest): Promise<void> {
    request.retryCount++;
    
    // Max 3 retries
    if (request.retryCount >= 3) {
      console.error(`[OfflineQueue] Max retries reached for ${request.url}`);
      await this.moveToDeadLetter(request);
    } else {
      // Update retry count
      await this.updateRequest(request);
    }
  }

  /**
   * Get all queued requests
   */
  private getQueuedRequests(): Promise<QueuedRequest[]> {
    if (!this.db) {
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('priority');
      const request = index.getAll();

      request.onsuccess = () => {
        const requests = request.result as QueuedRequest[];
        // Sort by priority and timestamp
        requests.sort((a, b) => {
          if (a.priority !== b.priority) {
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return a.timestamp - b.timestamp;
        });
        resolve(requests);
      };

      request.onerror = () => {
        reject(new Error('Failed to get queued requests'));
      };
    });
  }

  /**
   * Remove request from queue
   */
  private removeRequest(id: string): Promise<void> {
    if (!this.db) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove request'));
    });
  }

  /**
   * Update request in queue
   */
  private updateRequest(request: QueuedRequest): Promise<void> {
    if (!this.db) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const updateRequest = store.put(request);

      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(new Error('Failed to update request'));
    });
  }

  /**
   * Move request to dead letter queue
   */
  private async moveToDeadLetter(request: QueuedRequest): Promise<void> {
    // In production, you might want to store these separately
    // For now, just remove from queue and log
    console.error('[OfflineQueue] Moving to dead letter:', request);
    await this.removeRequest(request.id);
  }

  /**
   * Clear processed requests
   */
  private async clearProcessedRequests(): Promise<void> {
    // Clear requests older than 24 hours that have been processed
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    if (!this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    
    index.openCursor(range).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get queue size'));
    });
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[OfflineQueue] Queue cleared');
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to clear queue'));
    });
  }

  /**
   * Utility: Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility: Serialize headers
   */
  private serializeHeaders(headers?: HeadersInit): Record<string, string> {
    const serialized: Record<string, string> = {};
    
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        serialized[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        serialized[key] = value;
      });
    } else if (headers) {
      Object.assign(serialized, headers);
    }
    
    return serialized;
  }

  /**
   * Utility: Determine request priority
   */
  private getPriority(url: string, method?: string): 'high' | 'normal' | 'low' {
    // User data changes are high priority
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      if (url.includes('/api/user') || url.includes('/api/progress')) {
        return 'high';
      }
    }
    
    // Analytics and logs are low priority
    if (url.includes('/api/analytics') || url.includes('/api/logs')) {
      return 'low';
    }
    
    return 'normal';
  }

  /**
   * Notify UI about sync status
   */
  private notifyUI(data: any): void {
    // Post message to all clients
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(data);
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('offline-queue-sync', { detail: data }));
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();

// Export for use in other modules
export type { QueuedRequest };
export { OfflineQueueService };