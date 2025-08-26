/**
 * Event Queue Manager - Handles batching and syncing of learning events
 */

import { LearningEvent } from '@/types/analytics';
import { storageManager } from './StorageManager';
import { doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    // Add to memory queue
    this.queue.push(event);
    
    // Save to IndexedDB immediately for persistence
    try {
      await storageManager.saveEvent(event);
    } catch (error) {
      // Silently handle storage save error
    }
    
    // Schedule sync if needed
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
    // Don't sync if already syncing
    if (this.isSyncing && !force) return;
    
    // Don't sync if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Offline - skipping sync
      return;
    }
    
    this.isSyncing = true;
    
    try {
      // Get events to sync (from memory queue and unsynced from storage)
      const eventsToSync = [...this.queue];
      
      if (eventsToSync.length === 0) {
        // Try to sync any unsynced events from storage
        await this.syncFromStorage();
        return;
      }
      
      // Clear memory queue
      this.queue = [];
      
      // Sync to Firebase (for premium users)
      const user = await this.getCurrentUser();
      if (user && await this.isUserPremium(user.uid)) {
        await this.syncToFirebase(eventsToSync);
      }
      
      // Mark events as synced in IndexedDB
      const eventIds = eventsToSync.map(e => e.id);
      await storageManager.markEventsSynced(eventIds);
      
      // Successfully synced events
      
    } catch (error) {
      // Failed to sync batch
      // Re-queue events on failure
      this.queue.push(...this.queue);
    } finally {
      this.isSyncing = false;
      
      // Clear sync timer
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }
    }
  }
  
  private async syncFromStorage(): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;
      
      // Get unsynced events from storage
      const unsyncedEvents = await storageManager.getUnsyncedEvents(user.uid);
      
      if (unsyncedEvents.length === 0) return;
      
      // Sync to Firebase if premium
      if (await this.isUserPremium(user.uid)) {
        await this.syncToFirebase(unsyncedEvents);
        
        // Mark as synced
        const eventIds = unsyncedEvents.map(e => e.id);
        await storageManager.markEventsSynced(eventIds);
        
        // Synced events from storage
      }
    } catch (error) {
      // Failed to sync from storage
    }
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
    
    // Handle functions (remove them)
    if (typeof data === 'function') {
      return null;
    }
    
    // Handle regular objects
    if (typeof data === 'object' && data !== null) {
      // Check for special objects that can't be serialized
      if (data.constructor && data.constructor.name !== 'Object') {
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
    if (events.length === 0) return;
    
    const user = await this.getCurrentUser();
    if (!user) return;
    
    try {
      // Use batch writes for efficiency
      const batch = writeBatch(db);
      
      events.forEach(event => {
        const eventRef = doc(
          collection(db, 'analytics', user.uid, 'events'),
          event.id
        );
        
        // Clean the event data - remove undefined values
        const cleanEvent = this.cleanEventData({
          ...event,
          synced: true,
          syncedAt: Date.now()
        });
        
        // Validate the cleaned event doesn't have any invalid fields
        try {
          // Ensure no invalid field names or values
          const validatedEvent = JSON.parse(JSON.stringify(cleanEvent));
          batch.set(eventRef, validatedEvent);
        } catch (e) {
          // Skip this event if it can't be serialized
          // Silently handle the error
        }
      });
      
      // Only commit if there are valid operations
      try {
        await batch.commit();
      } catch (error: any) {
        // Check if it's a field validation error and handle silently
        if (error?.message?.includes('Unsupported field value')) {
          // Skip this batch silently
          return;
        }
        throw error;
      }
      
      // Also update aggregated stats
      await this.updateFirebaseStats(user.uid, events);
      
    } catch (error) {
      // Failed to sync to Firebase
      throw error;
    }
  }
  
  private async updateFirebaseStats(userId: string, newEvents: LearningEvent[]): Promise<void> {
    try {
      // Get current stats
      const stats = await storageManager.getUserStats(userId);
      if (!stats) return;
      
      // Update stats document in Firebase
      const statsRef = doc(db, 'analytics', userId, 'stats', 'current');
      const cleanStats = this.cleanEventData({
        ...stats,
        lastUpdated: Date.now()
      });
      await setDoc(statsRef, cleanStats, { merge: true });
      
    } catch (error) {
      // Failed to update Firebase stats
    }
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
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      const plan = userData?.subscription?.plan || 'free';
      
      return plan === 'monthly' || plan === 'yearly';
    } catch (error) {
      // Failed to check premium status
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