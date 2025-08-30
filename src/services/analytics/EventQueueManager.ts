/**
 * Event Queue Manager - Handles batching and syncing of learning events
 * Now uses LearningEventsService for proper tiered storage
 */

import { LearningEvent } from '@/types/analytics';
import { storageManager } from './StorageManager';
import { learningEventsService } from './LearningEventsService';

class EventQueueManager {
  private queue: LearningEvent[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  
  // Configuration
  private readonly BATCH_SIZE = 100;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  
  constructor() {
    // Initialize storage on creation
    this.initStorage();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncBatch());
      window.addEventListener('beforeunload', () => this.syncBatch(true));
    }
  }
  
  private async initStorage() {
    try {
      await storageManager.init();
    } catch (error) {
      // Silently handle storage initialization error
    }
  }
  
  async queueEvent(event: LearningEvent): Promise<void> {
    // Use the new LearningEventsService for proper tiered storage
    try {
      await learningEventsService.trackEvent(event);
    } catch (error) {
      console.error('[EventQueueManager] Failed to track event:', error);
    }
    
    // Still maintain queue for backward compatibility
    this.queue.push(event);
    
    // Schedule sync if needed (handled by LearningEventsService now)
    this.scheduleBatchSync();
  }
  
  private scheduleBatchSync() {
    // If we have enough events or no timer is set, schedule sync
    if (this.queue.length >= this.BATCH_SIZE || !this.syncTimer) {
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
      }
      
      this.syncTimer = setTimeout(() => {
        this.syncBatch();
      }, this.SYNC_INTERVAL);
    }
  }
  
  private startPeriodicSync() {
    // Sync every 5 minutes regardless of queue size
    setInterval(() => {
      this.syncFromStorage();
    }, 5 * 60 * 1000);
  }
  
  async syncBatch(force: boolean = false): Promise<void> {
    // DEPRECATED: EventQueueManager no longer handles syncing directly.
    // LearningEventsService handles all tiered storage and syncing.
    // This method is kept for backward compatibility but only clears the queue.
    
    // Clear the queue to prevent memory leaks
    this.queue = [];
    
    // Clear sync timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Reset syncing flag
    this.isSyncing = false;
  }
  
  private async syncFromStorage(): Promise<void> {
    // DEPRECATED: This method should not be used anymore.
    // LearningEventsService handles all storage syncing.
    return;
  }
  
  private cleanEventData(data: any): any {
    // Handle null and undefined
    if (data === null || data === undefined) {
      return null;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.cleanEventData(item)).filter(item => item !== undefined);
    }
    
    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    // Handle Set objects - convert to array
    if (data instanceof Set) {
      return Array.from(data);
    }
    
    // Handle Map objects - convert to object
    if (data instanceof Map) {
      const obj: any = {};
      data.forEach((value, key) => {
        obj[key] = this.cleanEventData(value);
      });
      return obj;
    }
    
    // Handle functions (remove them)
    if (typeof data === 'function') {
      return null;
    }
    
    // Handle regular objects
    if (typeof data === 'object' && data !== null) {
      // Check for special objects that can't be serialized
      if (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Array') {
        // Try to convert to plain object or string
        try {
          return JSON.parse(JSON.stringify(data));
        } catch {
          return String(data);
        }
      }
      
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip undefined values, functions, and keys starting with underscore
        if (value !== undefined && typeof value !== 'function' && !key.startsWith('_')) {
          const cleanedValue = this.cleanEventData(value);
          // Only add if the cleaned value is not undefined and not null
          // Also skip empty arrays and empty objects
          if (cleanedValue !== undefined && cleanedValue !== null) {
            if (Array.isArray(cleanedValue) && cleanedValue.length === 0) {
              // Skip empty arrays
              continue;
            }
            if (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0) {
              // Skip empty objects
              continue;
            }
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    // Handle primitives (string, number, boolean)
    return data;
  }
  
  private async syncToFirebase(events: LearningEvent[]): Promise<void> {
    // DEPRECATED: This method should not be used anymore.
    // LearningEventsService handles all Firebase syncing.
    // This prevents duplicate writes to Firebase.
    return;
  }
  
  private async updateFirebaseStats(userId: string, newEvents: LearningEvent[]): Promise<void> {
    // DEPRECATED: This method should not be used anymore.
    // LearningEventsService handles all Firebase stats updates.
    // This prevents duplicate writes to Firebase.
    return;
  }
  
  private async getCurrentUser(): Promise<{ uid: string } | null> {
    // Import dynamically to avoid circular dependencies
    try {
      const { auth } = await import('@/lib/firebase');
      return auth.currentUser;
    } catch {
      return null;
    }
  }
  
  private async isUserPremium(userId: string): Promise<boolean> {
    try {
      // Check user subscription status
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }
      
      const userData = userDoc.data();
      
      // Check multiple possible locations for plan (handling different data structures)
      const plan = userData?.subscription?.plan || 
                   userData?.plan || 
                   userData?.subscriptionPlan || 
                   'free';
      
      const isPremium = plan === 'monthly' || plan === 'yearly';
      
      
      return isPremium;
    } catch (error) {
      console.error('[EventQueueManager] Failed to check premium status:', error);
      return false;
    }
  }
  
  // Public methods for manual control
  async flush(): Promise<void> {
    await this.syncBatch(true);
  }
  
  getQueueStatus(): {
    queued: number;
    isSyncing: boolean;
  } {
    return {
      queued: this.queue.length,
      isSyncing: this.isSyncing
    };
  }
  
  async getStorageInfo() {
    return await storageManager.getStorageInfo();
  }
  
  async cleanup(daysToKeep: number = 30): Promise<number> {
    return await storageManager.cleanupOldEvents(daysToKeep);
  }
}

// Singleton instance
export const eventQueueManager = new EventQueueManager();