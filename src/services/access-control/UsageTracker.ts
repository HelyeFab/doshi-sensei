/**
 * Usage Tracker
 * Enhanced usage tracking with memory storage and Firebase sync
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface UsageData {
  daily: Record<string, number>;
  total: Record<string, number>;
  lastReset: Date;
  lastUpdated: Date;
}

export class UsageTracker {
  private cache: Map<string, UsageData> = new Map();
  private syncQueue: Map<string, UsageData> = new Map();
  private syncInterval?: NodeJS.Timeout;

  constructor() {
    // Start sync interval
    this.startSyncInterval();
  }

  /**
   * Get usage for a user and feature
   */
  async getUsage(
    userId: string | null,
    feature: string,
    type: 'daily' | 'total' = 'daily'
  ): Promise<number> {
    const key = userId || 'anonymous';
    
    // Get from cache first
    let data = this.cache.get(key);
    
    // If not in cache, load from Firebase
    if (!data && userId) {
      data = await this.loadFromFirebase(userId);
      if (data) {
        this.cache.set(key, data);
      }
    }
    
    // If still no data, create new
    if (!data) {
      data = this.createEmptyData();
      this.cache.set(key, data);
    }
    
    // Check if daily counters need reset
    if (this.shouldResetDaily(data.lastReset)) {
      data.daily = {};
      data.lastReset = new Date();
    }
    
    return type === 'daily' 
      ? (data.daily[feature] || 0)
      : (data.total[feature] || 0);
  }

  /**
   * Increment usage for a feature
   */
  async increment(
    userId: string | null,
    feature: string,
    amount: number = 1
  ): Promise<void> {
    const key = userId || 'anonymous';
    
    // Get or create data
    let data = this.cache.get(key);
    if (!data) {
      data = this.createEmptyData();
      this.cache.set(key, data);
    }
    
    // Check if daily counters need reset
    if (this.shouldResetDaily(data.lastReset)) {
      data.daily = {};
      data.lastReset = new Date();
    }
    
    // Increment counters
    data.daily[feature] = (data.daily[feature] || 0) + amount;
    data.total[feature] = (data.total[feature] || 0) + amount;
    data.lastUpdated = new Date();
    
    // Queue for sync if user is authenticated
    if (userId) {
      this.syncQueue.set(userId, data);
    }
    
    console.log(`[UsageTracker] Incremented ${feature} by ${amount} for ${key}`);
  }

  /**
   * Reset usage for a feature
   */
  async reset(userId: string | null, feature: string): Promise<void> {
    const key = userId || 'anonymous';
    
    let data = this.cache.get(key);
    if (!data) {
      data = this.createEmptyData();
      this.cache.set(key, data);
    }
    
    // Reset counters
    delete data.daily[feature];
    delete data.total[feature];
    data.lastUpdated = new Date();
    
    // Sync immediately if user is authenticated
    if (userId) {
      await this.syncToFirebase(userId, data);
    }
    
    console.log(`[UsageTracker] Reset ${feature} for ${key}`);
  }

  /**
   * Reset all usage for a user
   */
  async resetAll(userId: string | null): Promise<void> {
    const key = userId || 'anonymous';
    
    const data = this.createEmptyData();
    this.cache.set(key, data);
    
    // Sync immediately if user is authenticated
    if (userId) {
      await this.syncToFirebase(userId, data);
    }
    
    console.log(`[UsageTracker] Reset all usage for ${key}`);
  }

  /**
   * Get usage statistics
   */
  async getStats(userId: string | null): Promise<{
    daily: Record<string, number>;
    total: Record<string, number>;
    lastReset: Date;
  }> {
    const key = userId || 'anonymous';
    
    let data = this.cache.get(key);
    if (!data && userId) {
      data = await this.loadFromFirebase(userId);
    }
    
    if (!data) {
      data = this.createEmptyData();
    }
    
    // Check if daily counters need reset
    if (this.shouldResetDaily(data.lastReset)) {
      data.daily = {};
      data.lastReset = new Date();
    }
    
    return {
      daily: { ...data.daily },
      total: { ...data.total },
      lastReset: data.lastReset
    };
  }

  /**
   * Get top features by usage
   */
  async getTopFeatures(
    userId: string | null,
    type: 'daily' | 'total' = 'daily',
    limit: number = 10
  ): Promise<Array<{ feature: string; count: number }>> {
    const stats = await this.getStats(userId);
    const usage = type === 'daily' ? stats.daily : stats.total;
    
    const sorted = Object.entries(usage)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return sorted;
  }

  // Private helper methods

  private createEmptyData(): UsageData {
    return {
      daily: {},
      total: {},
      lastReset: new Date(),
      lastUpdated: new Date()
    };
  }

  private shouldResetDaily(lastReset: Date): boolean {
    const now = new Date();
    const resetTime = new Date(lastReset);
    resetTime.setHours(24, 0, 0, 0);
    
    return now >= resetTime;
  }

  private async loadFromFirebase(userId: string): Promise<UsageData | null> {
    try {
      const docRef = doc(db, 'usage', userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return {
        daily: data.daily || {},
        total: data.total || {},
        lastReset: data.lastReset?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      };
    } catch (error) {
      console.error('[UsageTracker] Failed to load from Firebase:', error);
      return null;
    }
  }

  private async syncToFirebase(userId: string, data: UsageData): Promise<void> {
    try {
      const docRef = doc(db, 'usage', userId);
      
      await setDoc(docRef, {
        daily: data.daily,
        total: data.total,
        lastReset: data.lastReset,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log(`[UsageTracker] Synced to Firebase for ${userId}`);
    } catch (error) {
      console.error('[UsageTracker] Failed to sync to Firebase:', error);
      // Re-queue for retry
      this.syncQueue.set(userId, data);
    }
  }

  private startSyncInterval(): void {
    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 30000);
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0) return;
    
    console.log(`[UsageTracker] Processing sync queue with ${this.syncQueue.size} items`);
    
    const queue = new Map(this.syncQueue);
    this.syncQueue.clear();
    
    for (const [userId, data] of queue.entries()) {
      await this.syncToFirebase(userId, data);
    }
  }

  /**
   * Force sync all cached data
   */
  async forceSync(): Promise<void> {
    // Add all cached authenticated users to sync queue
    for (const [key, data] of this.cache.entries()) {
      if (key !== 'anonymous') {
        this.syncQueue.set(key, data);
      }
    }
    
    await this.processSyncQueue();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Sync remaining data
    this.processSyncQueue();
    
    // Clear interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    
    // Clear cache
    this.cache.clear();
    this.syncQueue.clear();
  }

  /**
   * Get global usage statistics (admin)
   */
  async getGlobalStats(): Promise<{
    totalUsers: number;
    totalRequests: number;
    topFeatures: Array<{ feature: string; count: number }>;
    averageDaily: number;
  }> {
    // This would aggregate data from all users
    // For now, return mock data
    return {
      totalUsers: this.cache.size,
      totalRequests: 0,
      topFeatures: [],
      averageDaily: 0
    };
  }
}