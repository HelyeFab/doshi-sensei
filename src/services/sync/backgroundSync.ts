// Background Sync Service for Progress Data
// Implements reliable sync with retry logic using Background Sync API

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

interface SyncQueueItem {
  id: string;
  type: 'word-progress' | 'session-data' | 'learned-words' | 'user-stats';
  data: any;
  userId: string;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
}

interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSync: Date | null;
  failures: number;
}

class BackgroundSyncService {
  private readonly DB_NAME = 'SyncQueue';
  private readonly STORE_NAME = 'pendingSync';
  private readonly SYNC_TAG = 'doshi-sync';
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncListeners = new Set<(status: SyncStatus) => void>();
  private currentSyncPromise: Promise<void> | null = null;

  constructor() {
    this.initDB();
    this.setupEventListeners();
    this.registerBackgroundSync();
  }

  private async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.attemptSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Listen for visibility change to sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.attemptSync();
      }
    });
  }

  private async registerBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {

      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if we can use background sync
      if ('sync' in registration) {
        // This will be handled by service worker
        await (registration as any).sync.register(this.SYNC_TAG);
      }
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  // Add item to sync queue
  async addToQueue(
    type: SyncQueueItem['type'],
    userId: string,
    data: any
  ): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const item: SyncQueueItem = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      data,
      userId,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(item);

      request.onsuccess = () => {
        this.notifyListeners();
        
        // Try to sync immediately if online
        if (this.isOnline) {
          this.attemptSync();
        }
        
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Manual sync trigger (called from settings page)
  async manualSync(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    return this.performSync();
  }

  // Attempt automatic sync
  private async attemptSync(): Promise<void> {
    if (!this.isOnline || this.currentSyncPromise) {
      return;
    }

    this.currentSyncPromise = this.performSync()
      .then(() => {
        this.currentSyncPromise = null;
      })
      .catch(error => {
        console.error('Auto sync failed:', error);
        this.currentSyncPromise = null;
      });
  }

  // Perform actual sync
  private async performSync(): Promise<{ success: boolean; synced: number; failed: number }> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const items = await this.getQueueItems();
    
    if (items.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    this.notifyListeners(); // Update UI to show syncing

    let synced = 0;
    let failed = 0;
    const failedItems: SyncQueueItem[] = [];

    // Group items by user for batch operations
    const userGroups = this.groupByUser(items);

    for (const [userId, userItems] of userGroups.entries()) {
      try {
        await this.syncUserData(userId, userItems);
        synced += userItems.length;
        
        // Remove synced items from queue
        for (const item of userItems) {
          await this.removeFromQueue(item.id);
        }
      } catch (error) {
        console.error(`Sync failed for user ${userId}:`, error);
        failed += userItems.length;
        
        // Update retry count for failed items
        for (const item of userItems) {
          item.retryCount++;
          item.lastAttempt = Date.now();
          failedItems.push(item);
        }
      }
    }

    // Update failed items in queue
    for (const item of failedItems) {
      if (item.retryCount < 5) { // Max 5 retries
        await this.updateQueueItem(item);
      } else {
        // Remove items that have failed too many times
        await this.removeFromQueue(item.id);
        console.error('Removed item after max retries:', item);
      }
    }

    this.notifyListeners();
    
    return { 
      success: failed === 0, 
      synced, 
      failed 
    };
  }

  // Sync user data to Firebase
  private async syncUserData(userId: string, items: SyncQueueItem[]): Promise<void> {
    const batch = writeBatch(db);
    
    for (const item of items) {
      switch (item.type) {
        case 'word-progress':
          const progressRef = doc(db, 'users', userId, 'wordLearningProgress', item.data.lessonId);
          batch.set(progressRef, {
            ...item.data,
            lastSynced: new Date().toISOString()
          }, { merge: true });
          break;
          
        case 'session-data':
          const sessionRef = doc(db, 'users', userId, 'wordLearningSessions', item.data.id);
          batch.set(sessionRef, {
            ...item.data,
            syncedAt: new Date().toISOString()
          });
          break;
          
        case 'learned-words':
          const learnedRef = doc(db, 'users', userId, 'learnedWords', item.data.wordId);
          batch.set(learnedRef, {
            ...item.data,
            syncedAt: new Date().toISOString()
          });
          break;
          
        case 'user-stats':
          const statsRef = doc(db, 'users', userId, 'stats', 'wordLearning');
          batch.set(statsRef, {
            ...item.data,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
          break;
      }
    }
    
    await batch.commit();
  }

  // Get all items from queue
  private async getQueueItems(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };

      request.onerror = () => resolve([]);
    });
  }

  // Remove item from queue
  private async removeFromQueue(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  // Update queue item
  private async updateQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  // Group items by user
  private groupByUser(items: SyncQueueItem[]): Map<string, SyncQueueItem[]> {
    const groups = new Map<string, SyncQueueItem[]>();
    
    for (const item of items) {
      if (!groups.has(item.userId)) {
        groups.set(item.userId, []);
      }
      groups.get(item.userId)!.push(item);
    }
    
    return groups;
  }

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus> {
    const items = await this.getQueueItems();
    const failures = items.filter(i => i.retryCount > 0).length;
    
    // Get last sync time from localStorage
    const lastSyncStr = localStorage.getItem('lastSyncTime');
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
    
    return {
      pending: items.length,
      syncing: this.currentSyncPromise !== null,
      lastSync,
      failures
    };
  }

  // Subscribe to sync status changes
  subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(callback);
    
    // Send initial status
    this.getSyncStatus().then(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners.delete(callback);
    };
  }

  // Notify all listeners
  private async notifyListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(callback => callback(status));
  }

  // Clear sync queue (for debugging/reset)
  async clearQueue(): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    oldestItem: Date | null;
    failedItems: number;
  }> {
    const items = await this.getQueueItems();
    
    const byType: Record<string, number> = {};
    let oldestTimestamp = Date.now();
    
    items.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
    });
    
    return {
      total: items.length,
      byType,
      oldestItem: items.length > 0 ? new Date(oldestTimestamp) : null,
      failedItems: items.filter(i => i.retryCount > 0).length
    };
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncService();

// Export convenience functions
export async function queueForSync(
  type: SyncQueueItem['type'],
  userId: string,
  data: any
): Promise<void> {
  return backgroundSync.addToQueue(type, userId, data);
}

export async function triggerManualSync(): Promise<{ success: boolean; synced: number; failed: number }> {
  return backgroundSync.manualSync();
}

export function subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
  return backgroundSync.subscribeSyncStatus(callback);
}