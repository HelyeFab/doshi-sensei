/**
 * IndexedDB Storage Manager for Universal Learning Analytics
 */

import { LearningEvent, UserLearningStats } from '@/types/analytics';

const DB_NAME = 'doshi-sensei-analytics';
const DB_VERSION = 1;

const STORES = {
  EVENTS: 'events',
  STATS: 'stats',
  QUEUE: 'queue'
} as const;

export class StorageManager {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    if (this.db) return;
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      // IndexedDB not available (SSR or unsupported browser)
      return;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Events store
        if (!db.objectStoreNames.contains(STORES.EVENTS)) {
          const eventStore = db.createObjectStore(STORES.EVENTS, { 
            keyPath: 'id',
            autoIncrement: false 
          });
          eventStore.createIndex('userId', 'userId', { unique: false });
          eventStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventStore.createIndex('type', 'type', { unique: false });
          eventStore.createIndex('category', 'category', { unique: false });
          eventStore.createIndex('synced', 'synced', { unique: false });
          eventStore.createIndex('userTimestamp', ['userId', 'timestamp'], { unique: false });
        }
        
        // Stats store
        if (!db.objectStoreNames.contains(STORES.STATS)) {
          db.createObjectStore(STORES.STATS, { keyPath: 'userId' });
        }
        
        // Queue store for batch syncing
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          });
          queueStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }
  
  async saveEvent(event: LearningEvent): Promise<void> {
    await this.init();
    
    if (!this.db) {
      // Database not initialized, cannot save event
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readwrite');
      const store = transaction.objectStore(STORES.EVENTS);
      const request = store.add(event);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async saveEvents(events: LearningEvent[]): Promise<void> {
    await this.init();
    
    if (!this.db) {
      // Database not initialized, cannot save events
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readwrite');
      const store = transaction.objectStore(STORES.EVENTS);
      
      let completed = 0;
      let hasError = false;
      
      events.forEach(event => {
        const request = store.add(event);
        
        request.onsuccess = () => {
          completed++;
          if (completed === events.length && !hasError) {
            resolve();
          }
        };
        
        request.onerror = () => {
          hasError = true;
          // Try to update if add fails (event already exists)
          const putRequest = store.put(event);
          putRequest.onsuccess = () => {
            completed++;
            if (completed === events.length) {
              resolve();
            }
          };
          putRequest.onerror = () => reject(putRequest.error);
        };
      });
    });
  }
  
  async getEvents(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startTime?: number;
      endTime?: number;
      category?: string;
      type?: string;
    }
  ): Promise<LearningEvent[]> {
    await this.init();
    
    if (!this.db) {
      // Database not initialized, returning empty array
      return [];
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readonly');
      const store = transaction.objectStore(STORES.EVENTS);
      const index = store.index('userTimestamp');
      
      const events: LearningEvent[] = [];
      const range = this.createTimeRange(userId, options?.startTime, options?.endTime);
      const request = index.openCursor(range, 'prev'); // Most recent first
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (!cursor) {
          resolve(events);
          return;
        }
        
        const learningEvent = cursor.value as LearningEvent;
        
        // Apply filters
        if (options?.category && learningEvent.category !== options.category) {
          cursor.continue();
          return;
        }
        
        if (options?.type && learningEvent.type !== options.type) {
          cursor.continue();
          return;
        }
        
        events.push(learningEvent);
        
        // Check limit
        if (options?.limit && events.length >= options.limit) {
          resolve(events);
          return;
        }
        
        cursor.continue();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async getRecentEvents(userId: string, limit: number = 100): Promise<LearningEvent[]> {
    return this.getEvents(userId, { limit });
  }
  
  async getEventsByCategory(
    userId: string, 
    category: string,
    limit: number = 100
  ): Promise<LearningEvent[]> {
    return this.getEvents(userId, { category, limit });
  }
  
  async getUnsyncedEvents(userId: string): Promise<LearningEvent[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readonly');
      const store = transaction.objectStore(STORES.EVENTS);
      const index = store.index('synced');
      
      const events: LearningEvent[] = [];
      const request = index.openCursor(IDBKeyRange.only(false));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (!cursor) {
          resolve(events.filter(e => e.userId === userId));
          return;
        }
        
        events.push(cursor.value as LearningEvent);
        cursor.continue();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async markEventsSynced(eventIds: string[]): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readwrite');
      const store = transaction.objectStore(STORES.EVENTS);
      
      let completed = 0;
      const syncedAt = Date.now();
      
      eventIds.forEach(id => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const event = request.result;
          if (event) {
            event.synced = true;
            event.syncedAt = syncedAt;
            
            const updateRequest = store.put(event);
            updateRequest.onsuccess = () => {
              completed++;
              if (completed === eventIds.length) {
                resolve();
              }
            };
          } else {
            completed++;
            if (completed === eventIds.length) {
              resolve();
            }
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }
  
  async getUserStats(userId: string): Promise<UserLearningStats | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATS], 'readonly');
      const store = transaction.objectStore(STORES.STATS);
      const request = store.get(userId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  async updateUserStats(stats: UserLearningStats): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATS], 'readwrite');
      const store = transaction.objectStore(STORES.STATS);
      const request = store.put(stats);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async clearUserData(userId: string): Promise<void> {
    await this.init();
    
    // Clear events
    const events = await this.getEvents(userId);
    const eventIds = events.map(e => e.id);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.EVENTS, STORES.STATS], 
        'readwrite'
      );
      
      // Delete events
      const eventStore = transaction.objectStore(STORES.EVENTS);
      eventIds.forEach(id => eventStore.delete(id));
      
      // Delete stats
      const statsStore = transaction.objectStore(STORES.STATS);
      statsStore.delete(userId);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  async getStorageInfo(): Promise<{
    eventCount: number;
    estimatedSize: number;
    oldestEvent?: Date;
    newestEvent?: Date;
  }> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readonly');
      const store = transaction.objectStore(STORES.EVENTS);
      
      const countRequest = store.count();
      
      countRequest.onsuccess = async () => {
        const count = countRequest.result;
        
        // Estimate storage size
        let estimatedSize = 0;
        if ('estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          estimatedSize = estimate.usage || 0;
        }
        
        resolve({
          eventCount: count,
          estimatedSize
        });
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
  
  private createTimeRange(
    userId: string,
    startTime?: number,
    endTime?: number
  ): IDBKeyRange {
    const lower = [userId, startTime || 0];
    const upper = [userId, endTime || Date.now()];
    return IDBKeyRange.bound(lower, upper);
  }
  
  // Cleanup old events to manage storage
  async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    await this.init();
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.EVENTS], 'readwrite');
      const store = transaction.objectStore(STORES.EVENTS);
      const index = store.index('timestamp');
      
      let deletedCount = 0;
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (!cursor) {
          resolve(deletedCount);
          return;
        }
        
        const learningEvent = cursor.value as LearningEvent;
        
        // Only delete if synced
        if (learningEvent.synced) {
          cursor.delete();
          deletedCount++;
        }
        
        cursor.continue();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const storageManager = new StorageManager();