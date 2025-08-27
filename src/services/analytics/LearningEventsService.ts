/**
 * Learning Events Service
 * 
 * Handles tiered storage of learning events:
 * - Guests: No storage (memory only during session)
 * - Free users: Local storage only (IndexedDB)
 * - Premium users: Local + Cloud storage (IndexedDB + Firestore)
 */

import { LearningEvent } from '@/types/analytics';
import { User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc,
  writeBatch,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { storageManager } from './StorageManager';

export type UserTier = 'guest' | 'free' | 'monthly' | 'yearly';

interface StorageConfig {
  enableLocal: boolean;
  enableCloud: boolean;
  retentionDays: number;
  maxEvents: number;
}

class LearningEventsService {
  private static instance: LearningEventsService;
  private currentUser: User | null = null;
  private userTier: UserTier = 'guest';
  private memoryCache: LearningEvent[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  // Storage configurations per tier
  private readonly STORAGE_CONFIG: Record<UserTier, StorageConfig> = {
    guest: {
      enableLocal: false,
      enableCloud: false,
      retentionDays: 0,
      maxEvents: 100 // Only in memory during session
    },
    free: {
      enableLocal: true,
      enableCloud: false,
      retentionDays: 30,
      maxEvents: 5000
    },
    monthly: {
      enableLocal: true,
      enableCloud: true,
      retentionDays: 90,
      maxEvents: 50000
    },
    yearly: {
      enableLocal: true,
      enableCloud: true,
      retentionDays: 365,
      maxEvents: 100000
    }
  };

  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly BATCH_SIZE = 100;

  private constructor() {
    // Initialize storage
    this.initializeStorage();
  }

  static getInstance(): LearningEventsService {
    if (!LearningEventsService.instance) {
      LearningEventsService.instance = new LearningEventsService();
    }
    return LearningEventsService.instance;
  }

  /**
   * Initialize storage and set up sync
   */
  private async initializeStorage() {
    try {
      await storageManager.init();
      
      // Set up periodic cleanup
      setInterval(() => {
        this.cleanupOldEvents();
      }, 24 * 60 * 60 * 1000); // Daily cleanup
      
      // Listen for online/offline events
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.syncToCloud());
        window.addEventListener('beforeunload', () => this.syncToCloud(true));
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  /**
   * Set the current user and determine their tier
   */
  async setUser(user: User | null, subscription?: any): Promise<void> {
    this.currentUser = user;
    
    if (!user) {
      this.userTier = 'guest';
      this.stopSync();
      // Clear memory cache for guests when they "log out"
      this.memoryCache = [];
      return;
    }

    // Determine user tier based on subscription
    if (subscription?.plan === 'monthly') {
      this.userTier = 'monthly';
    } else if (subscription?.plan === 'yearly') {
      this.userTier = 'yearly';
    } else {
      this.userTier = 'free';
    }

    // Start sync for premium users
    if (this.userTier === 'monthly' || this.userTier === 'yearly') {
      this.startSync();
    } else {
      this.stopSync();
    }

    console.log(`[LearningEvents] User tier set to: ${this.userTier}`);
  }

  /**
   * Track a learning event
   */
  async trackEvent(event: LearningEvent): Promise<void> {
    const config = this.STORAGE_CONFIG[this.userTier];
    
    // Add user context
    const enrichedEvent: LearningEvent = {
      ...event,
      userId: this.currentUser?.uid || 'guest',
      timestamp: event.timestamp || Date.now(),
      metadata: {
        ...event.metadata,
        userTier: this.userTier,
        clientTimestamp: Date.now()
      }
    };

    // Always add to memory cache (for immediate retrieval)
    this.memoryCache.push(enrichedEvent);
    
    // Enforce memory cache limit
    if (this.memoryCache.length > config.maxEvents) {
      this.memoryCache = this.memoryCache.slice(-config.maxEvents);
    }

    // Store locally if enabled (free, monthly, yearly)
    if (config.enableLocal && this.currentUser) {
      try {
        await storageManager.saveEvent(enrichedEvent);
        console.log(`[LearningEvents] Event saved locally for ${this.userTier} user`);
      } catch (error) {
        console.error('[LearningEvents] Failed to save locally:', error);
      }
    }

    // Queue for cloud sync if enabled (monthly, yearly)
    if (config.enableCloud && this.currentUser) {
      // Cloud sync happens in batches via the sync timer
      console.log(`[LearningEvents] Event queued for cloud sync (${this.userTier})`);
    }
  }

  /**
   * Get recent events for the current user
   */
  async getRecentEvents(limitCount: number = 100): Promise<LearningEvent[]> {
    const config = this.STORAGE_CONFIG[this.userTier];
    
    // Guests only get memory cache
    if (this.userTier === 'guest') {
      return this.memoryCache.slice(-limitCount);
    }

    // Free users get from IndexedDB
    if (this.userTier === 'free' && this.currentUser) {
      try {
        const events = await storageManager.getRecentEvents(
          this.currentUser.uid,
          limitCount
        );
        return events;
      } catch (error) {
        console.error('[LearningEvents] Failed to get local events:', error);
        return this.memoryCache.slice(-limitCount);
      }
    }

    // Premium users try cloud first, fall back to local
    if ((this.userTier === 'monthly' || this.userTier === 'yearly') && this.currentUser) {
      try {
        // Try cloud first
        const cloudEvents = await this.getCloudEvents(limitCount);
        if (cloudEvents.length > 0) {
          return cloudEvents;
        }
      } catch (error) {
        console.error('[LearningEvents] Cloud fetch failed, using local:', error);
      }

      // Fall back to local storage
      try {
        const events = await storageManager.getRecentEvents(
          this.currentUser.uid,
          limitCount
        );
        return events;
      } catch (error) {
        console.error('[LearningEvents] Failed to get local events:', error);
        return this.memoryCache.slice(-limitCount);
      }
    }

    return [];
  }

  /**
   * Get events from cloud storage
   */
  private async getCloudEvents(limitCount: number): Promise<LearningEvent[]> {
    if (!this.currentUser) return [];

    try {
      const eventsRef = collection(db, 'learning_events', this.currentUser.uid, 'events');
      const q = query(
        eventsRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const events: LearningEvent[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp
        } as LearningEvent);
      });
      
      return events;
    } catch (error) {
      console.error('[LearningEvents] Failed to get cloud events:', error);
      return [];
    }
  }

  /**
   * Get learning statistics for a date range
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<any> {
    const config = this.STORAGE_CONFIG[this.userTier];
    
    // Guests don't get stats
    if (this.userTier === 'guest') {
      return {
        totalEvents: this.memoryCache.length,
        userTier: 'guest',
        message: 'Sign in to track your learning progress'
      };
    }

    if (!this.currentUser) return null;

    // Get events based on user tier
    let events: LearningEvent[] = [];
    
    if (config.enableCloud) {
      // Premium users: get from cloud
      events = await this.getCloudEvents(1000);
    } else if (config.enableLocal) {
      // Free users: get from local storage
      events = await storageManager.getRecentEvents(this.currentUser.uid, 1000);
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      events = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
        return true;
      });
    }

    // Calculate statistics
    const stats = {
      totalEvents: events.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      uniqueContent: new Set<string>(),
      successRate: 0,
      userTier: this.userTier
    };

    let successCount = 0;
    let totalWithOutcome = 0;

    events.forEach(event => {
      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
      
      // Count by category
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
      
      // Track unique content
      if (event.content?.id) {
        stats.uniqueContent.add(event.content.id);
      }
      
      // Calculate success rate
      if (event.type === 'success' || event.type === 'failure') {
        totalWithOutcome++;
        if (event.type === 'success') successCount++;
      }
    });

    stats.successRate = totalWithOutcome > 0 
      ? Math.round((successCount / totalWithOutcome) * 100) 
      : 0;

    return {
      ...stats,
      uniqueContentCount: stats.uniqueContent.size
    };
  }

  /**
   * Sync events to cloud (for premium users only)
   */
  private async syncToCloud(force: boolean = false): Promise<void> {
    // Only sync for premium users
    if (this.userTier !== 'monthly' && this.userTier !== 'yearly') {
      return;
    }

    if (!this.currentUser) return;
    if (this.isSyncing && !force) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isSyncing = true;

    try {
      // Get unsynced events from local storage
      const unsyncedEvents = await storageManager.getUnsyncedEvents(
        this.currentUser.uid
      );

      if (unsyncedEvents.length === 0) {
        return;
      }

      console.log(`[LearningEvents] Syncing ${unsyncedEvents.length} events to cloud`);

      // Batch write to Firestore
      const batch = writeBatch(db);
      const processedIds: string[] = [];

      for (const event of unsyncedEvents.slice(0, this.BATCH_SIZE)) {
        const eventRef = doc(
          collection(db, 'learning_events', this.currentUser.uid, 'events'),
          event.id
        );

        batch.set(eventRef, {
          ...this.cleanEventForFirestore(event),
          syncedAt: serverTimestamp()
        });

        processedIds.push(event.id);
      }

      await batch.commit();

      // Mark events as synced in local storage
      await storageManager.markEventsSynced(processedIds);

      console.log(`[LearningEvents] Successfully synced ${processedIds.length} events`);

      // Update user stats document
      await this.updateCloudStats();

    } catch (error) {
      console.error('[LearningEvents] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Clean event data for Firestore
   */
  private cleanEventForFirestore(event: any): any {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(event)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'function') continue;
      if (key.startsWith('_')) continue;
      
      if (value instanceof Date) {
        cleaned[key] = Timestamp.fromDate(value);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = this.cleanEventForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  /**
   * Update aggregated stats in cloud
   */
  private async updateCloudStats(): Promise<void> {
    if (!this.currentUser) return;

    try {
      const stats = await this.getStats();
      const statsRef = doc(db, 'learning_events', this.currentUser.uid, 'stats', 'current');
      
      await setDoc(statsRef, {
        ...stats,
        lastUpdated: serverTimestamp(),
        userTier: this.userTier
      }, { merge: true });
    } catch (error) {
      console.error('[LearningEvents] Failed to update cloud stats:', error);
    }
  }

  /**
   * Clean up old events based on retention policy
   */
  private async cleanupOldEvents(): Promise<void> {
    const config = this.STORAGE_CONFIG[this.userTier];
    
    if (!config.enableLocal || !this.currentUser) return;

    const cutoffDate = Date.now() - (config.retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      // Clean local storage
      const deletedCount = await storageManager.cleanupOldEvents(
        config.retentionDays
      );
      
      console.log(`[LearningEvents] Cleaned up ${deletedCount} old events`);

      // Clean cloud storage for premium users
      if (config.enableCloud) {
        await this.cleanupCloudEvents(cutoffDate);
      }
    } catch (error) {
      console.error('[LearningEvents] Cleanup failed:', error);
    }
  }

  /**
   * Clean up old cloud events
   */
  private async cleanupCloudEvents(cutoffDate: number): Promise<void> {
    if (!this.currentUser) return;

    try {
      const eventsRef = collection(db, 'learning_events', this.currentUser.uid, 'events');
      const q = query(
        eventsRef,
        where('timestamp', '<', cutoffDate)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`[LearningEvents] Cleaned up ${snapshot.size} old cloud events`);
    } catch (error) {
      console.error('[LearningEvents] Cloud cleanup failed:', error);
    }
  }

  /**
   * Start periodic sync for premium users
   */
  private startSync(): void {
    this.stopSync();
    
    // Initial sync
    this.syncToCloud();
    
    // Set up periodic sync
    this.syncTimer = setInterval(() => {
      this.syncToCloud();
    }, this.SYNC_INTERVAL);
    
    console.log('[LearningEvents] Started cloud sync for premium user');
  }

  /**
   * Stop periodic sync
   */
  private stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[LearningEvents] Stopped cloud sync');
    }
  }

  /**
   * Export user data (for GDPR compliance)
   */
  async exportUserData(): Promise<LearningEvent[]> {
    if (this.userTier === 'guest') {
      return this.memoryCache;
    }

    if (!this.currentUser) return [];

    // Get all events (local + cloud)
    const events = await this.getRecentEvents(this.STORAGE_CONFIG[this.userTier].maxEvents);
    return events;
  }

  /**
   * Delete all user data
   */
  async deleteAllUserData(): Promise<void> {
    if (this.userTier === 'guest') {
      this.memoryCache = [];
      return;
    }

    if (!this.currentUser) return;

    // Delete local data
    if (this.STORAGE_CONFIG[this.userTier].enableLocal) {
      await storageManager.clearUserData(this.currentUser.uid);
    }

    // Delete cloud data for premium users
    if (this.STORAGE_CONFIG[this.userTier].enableCloud) {
      try {
        // Delete all events
        const eventsRef = collection(db, 'learning_events', this.currentUser.uid, 'events');
        const snapshot = await getDocs(eventsRef);
        const batch = writeBatch(db);
        
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Delete stats
        const statsRef = doc(db, 'learning_events', this.currentUser.uid, 'stats', 'current');
        batch.delete(statsRef);
        
        await batch.commit();
        
        console.log('[LearningEvents] Deleted all user data');
      } catch (error) {
        console.error('[LearningEvents] Failed to delete cloud data:', error);
      }
    }

    // Clear memory cache
    this.memoryCache = [];
  }
}

// Export singleton instance
export const learningEventsService = LearningEventsService.getInstance();