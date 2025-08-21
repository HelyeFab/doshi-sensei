/**
 * Usage Tracker
 * Tracks feature usage for enforcing limits
 */

import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UsageRecord, UserUsageSummary } from './types';

export class UsageTracker {
  private usageCache = new Map<string, UserUsageSummary>();
  
  /**
   * Get usage for a specific feature
   */
  async getUsage(
    userId: string | null, 
    featureId: string, 
    limitType: 'daily' | 'total'
  ): Promise<number> {
    if (!userId) {
      return this.getGuestUsage(featureId, limitType);
    }
    
    const usage = await this.getUserUsage(userId);
    
    if (limitType === 'daily') {
      // Check if we need to reset daily usage
      const today = new Date().toISOString().split('T')[0];
      const lastReset = usage.lastReset.toISOString().split('T')[0];
      
      if (today !== lastReset) {
        await this.resetDailyUsage(userId);
        return 0;
      }
      
      return usage.daily[featureId] || 0;
    } else {
      return usage.totals[featureId] || 0;
    }
  }
  
  /**
   * Increment usage for a feature
   */
  async incrementUsage(
    userId: string | null, 
    featureId: string
  ): Promise<void> {
    if (!userId) {
      return this.incrementGuestUsage(featureId);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Update in Firestore
    await setDoc(
      doc(db, 'users', userId, 'usage', 'current'),
      {
        daily: {
          [featureId]: increment(1),
          [`${featureId}_lastUsed`]: new Date()
        },
        totals: {
          [featureId]: increment(1)
        },
        lastUpdated: new Date()
      },
      { merge: true }
    );
    
    // Update cache
    if (this.usageCache.has(userId)) {
      const cached = this.usageCache.get(userId)!;
      cached.daily[featureId] = (cached.daily[featureId] || 0) + 1;
      cached.totals[featureId] = (cached.totals[featureId] || 0) + 1;
    }
  }
  
  /**
   * Get complete usage summary for a user
   */
  async getUserUsage(userId: string): Promise<UserUsageSummary> {
    // Check cache
    if (this.usageCache.has(userId)) {
      return this.usageCache.get(userId)!;
    }
    
    try {
      const usageDoc = await getDoc(doc(db, 'users', userId, 'usage', 'current'));
      
      if (usageDoc.exists()) {
        const data = usageDoc.data();
        const summary: UserUsageSummary = {
          daily: data.daily || {},
          totals: data.totals || {},
          lastReset: data.lastReset?.toDate() || new Date()
        };
        
        this.usageCache.set(userId, summary);
        return summary;
      }
      
      // Return empty usage
      const emptyUsage: UserUsageSummary = {
        daily: {},
        totals: {},
        lastReset: new Date()
      };
      
      this.usageCache.set(userId, emptyUsage);
      return emptyUsage;
    } catch (error) {
      console.error('Error getting usage:', error);
      return {
        daily: {},
        totals: {},
        lastReset: new Date()
      };
    }
  }
  
  /**
   * Reset daily usage for a user
   */
  async resetDailyUsage(userId: string): Promise<void> {
    await setDoc(
      doc(db, 'users', userId, 'usage', 'current'),
      {
        daily: {},
        lastReset: new Date()
      },
      { merge: true }
    );
    
    // Update cache
    if (this.usageCache.has(userId)) {
      const cached = this.usageCache.get(userId)!;
      cached.daily = {};
      cached.lastReset = new Date();
    }
  }
  
  /**
   * Get guest usage from localStorage
   */
  private getGuestUsage(featureId: string, limitType: 'daily' | 'total'): number {
    if (typeof window === 'undefined') return 0;
    
    const stored = localStorage.getItem('doshi_guest_usage');
    if (!stored) return 0;
    
    try {
      const usage = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0];
      
      if (limitType === 'daily') {
        // Reset if it's a new day
        if (usage.date !== today) {
          return 0;
        }
        return usage.daily[featureId] || 0;
      } else {
        return usage.totals?.[featureId] || 0;
      }
    } catch {
      return 0;
    }
  }
  
  /**
   * Increment guest usage in localStorage
   */
  private incrementGuestUsage(featureId: string): void {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('doshi_guest_usage');
    
    let usage = {
      date: today,
      daily: {} as Record<string, number>,
      totals: {} as Record<string, number>
    };
    
    if (stored) {
      try {
        usage = JSON.parse(stored);
        // Reset daily if it's a new day
        if (usage.date !== today) {
          usage.date = today;
          usage.daily = {};
        }
      } catch {
        // Use default
      }
    }
    
    // Increment
    usage.daily[featureId] = (usage.daily[featureId] || 0) + 1;
    usage.totals[featureId] = (usage.totals[featureId] || 0) + 1;
    
    localStorage.setItem('doshi_guest_usage', JSON.stringify(usage));
  }
  
  /**
   * Clear cache for a user
   */
  clearCache(userId: string) {
    this.usageCache.delete(userId);
  }
}

// Singleton instance
export const usageTracker = new UsageTracker();