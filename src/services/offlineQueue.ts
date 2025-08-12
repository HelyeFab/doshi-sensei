// Offline Queue Service
// Manages failed API requests and syncs when connection is restored

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: HeadersInit;
  body?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

class OfflineQueueService {
  private readonly DB_NAME = 'doshi-sensei-offline';
  private readonly STORE_NAME = 'request-queue';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;
  private isSyncing = false;
  private syncListeners: Set<(status: 'started' | 'completed' | 'failed') => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
      this.setupEventListeners();
    }
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open offline queue database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        }
      };
    });
  }

  private setupEventListeners(): void {
    // Listen for online event
    window.addEventListener('online', () => {
      console.log('Connection restored - syncing offline queue');
      this.syncQueue();
    });

    // Listen for visibility change (when app comes to foreground)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.syncQueue();
      }
    });

    // Register service worker sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as any).sync.register('offline-queue-sync');
      }).catch((err) => {
        console.error('Failed to register background sync:', err);
      });
    }
  }

  async addToQueue(
    url: string,
    options: RequestInit & { priority?: 'high' | 'normal' | 'low' } = {}
  ): Promise<string> {
    if (!this.db) {
      await this.initDB();
    }

    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: options.priority || 'normal'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const addRequest = store.add(request);

      addRequest.onsuccess = () => {
        console.log('Request queued for offline sync:', url);
        resolve(request.id);
      };

      addRequest.onerror = () => {
        console.error('Failed to queue request:', addRequest.error);
        reject(addRequest.error);
      };
    });
  }

  async getQueuedRequests(): Promise<QueuedRequest[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('priority');
      const requests: QueuedRequest[] = [];

      // Get requests ordered by priority
      const cursorRequest = index.openCursor(null, 'prev');

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          requests.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by priority and then by timestamp
          requests.sort((a, b) => {
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return a.timestamp - b.timestamp;
          });
          resolve(requests);
        }
      };

      cursorRequest.onerror = () => {
        reject(cursorRequest.error);
      };
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => {
        resolve();
      };

      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    });
  }

  async syncQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners('started');

    try {
      const requests = await this.getQueuedRequests();
      console.log(`Syncing ${requests.length} queued requests`);

      for (const request of requests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body ? JSON.stringify(request.body) : undefined
          });

          if (response.ok) {
            await this.removeFromQueue(request.id);
            console.log(`Successfully synced request: ${request.url}`);
          } else if (response.status >= 400 && response.status < 500) {
            // Client error - don't retry
            await this.removeFromQueue(request.id);
            console.error(`Request failed with client error: ${request.url}`, response.status);
          } else {
            // Server error - retry later
            request.retryCount++;
            if (request.retryCount >= request.maxRetries) {
              await this.removeFromQueue(request.id);
              console.error(`Request failed after max retries: ${request.url}`);
            } else {
              await this.updateRequest(request);
            }
          }
        } catch (error) {
          console.error(`Failed to sync request: ${request.url}`, error);
          request.retryCount++;
          if (request.retryCount >= request.maxRetries) {
            await this.removeFromQueue(request.id);
          } else {
            await this.updateRequest(request);
          }
        }
      }

      this.notifySyncListeners('completed');
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
      this.notifySyncListeners('failed');
    } finally {
      this.isSyncing = false;
    }
  }

  private async updateRequest(request: QueuedRequest): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const putRequest = store.put(request);

      putRequest.onsuccess = () => {
        resolve();
      };

      putRequest.onerror = () => {
        reject(putRequest.error);
      };
    });
  }

  onSyncStatusChange(listener: (status: 'started' | 'completed' | 'failed') => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifySyncListeners(status: 'started' | 'completed' | 'failed'): void {
    this.syncListeners.forEach(listener => listener(status));
  }

  async getQueueSize(): Promise<number> {
    const requests = await this.getQueuedRequests();
    return requests.length;
  }

  async clearQueue(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        console.log('Offline queue cleared');
        resolve();
      };

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    });
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();

// Export hook for React components
export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Get initial queue size
    offlineQueue.getQueueSize().then(setQueueSize);

    // Listen for sync status changes
    const unsubscribe = offlineQueue.onSyncStatusChange((status) => {
      setIsSyncing(status === 'started');
      if (status === 'completed') {
        offlineQueue.getQueueSize().then(setQueueSize);
      }
    });

    // Update queue size periodically
    const interval = setInterval(() => {
      offlineQueue.getQueueSize().then(setQueueSize);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    queueSize,
    isSyncing,
    addToQueue: offlineQueue.addToQueue.bind(offlineQueue),
    syncQueue: offlineQueue.syncQueue.bind(offlineQueue),
    clearQueue: offlineQueue.clearQueue.bind(offlineQueue)
  };
}

// For use in service worker or other contexts
import { useState, useEffect } from 'react';

export default offlineQueue;