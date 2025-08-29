/**
 * Review Access Control Service
 * 
 * Implements the Three-Pillar Architecture access control for the review system:
 * 1. Guest users (no uid): NO ACCESS - show login prompt
 * 2. Free users: LIMITED to 10 reviews per day across ALL sources combined
 * 3. Monthly/Yearly subscribers: UNLIMITED reviews
 * 
 * This service also provides wrappers for processReview methods to enforce limits.
 */

import type { ReviewResponse, ReviewResult, ReviewItem, ReviewProgress } from '@/lib/unified-review/types';

interface AccessControlResult {
  canReview: boolean;
  remainingCount?: number;
  reason?: string;
}

interface DailyReviewCount {
  count: number;
  date: string;
  lastUpdated: number;
}

export class ReviewAccessControlService {
  private static readonly MAX_FREE_REVIEWS = 10;
  private static readonly STORAGE_KEY_PREFIX = 'reviewCount_';

  /**
   * Check if user can perform a review based on Three-Pillar Architecture
   */
  static checkAccess(
    userId?: string | null,
    subscriptionTier: 'free' | 'monthly' | 'yearly' = 'free'
  ): AccessControlResult {
    // Guest users (no uid): NO ACCESS
    if (!userId) {
      return {
        canReview: false,
        reason: 'authentication_required'
      };
    }

    // Subscribers have unlimited access
    if (subscriptionTier === 'monthly' || subscriptionTier === 'yearly') {
      return {
        canReview: true
      };
    }

    // Free users: Check daily limit
    const { count } = this.getTodayCount(userId);
    const remaining = Math.max(0, this.MAX_FREE_REVIEWS - count);

    return {
      canReview: count < this.MAX_FREE_REVIEWS,
      remainingCount: remaining,
      reason: count >= this.MAX_FREE_REVIEWS ? 'daily_limit_reached' : undefined
    };
  }

  /**
   * Increment review count for user (call after successful review)
   */
  static incrementCount(userId: string): void {
    if (!userId) return;

    const { count, date } = this.getTodayCount(userId);
    const newCount = count + 1;

    const updatedData: DailyReviewCount = {
      count: newCount,
      date,
      lastUpdated: Date.now()
    };

    this.saveToStorage(userId, updatedData);
  }

  /**
   * Get today's review count for user
   */
  static getTodayCount(userId: string): { count: number; date: string } {
    const today = this.getTodayDateString();
    const storageKey = this.getStorageKey(userId, today);

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return { count: 0, date: today };
      }

      const data: DailyReviewCount = JSON.parse(stored);
      
      // Verify the date matches (safety check)
      if (data.date !== today) {
        // Old data, return 0 for today
        return { count: 0, date: today };
      }

      return { count: data.count || 0, date: today };
    } catch (error) {
      console.error('Error reading review count from localStorage:', error);
      return { count: 0, date: today };
    }
  }

  /**
   * Get remaining reviews for free users
   */
  static getRemainingReviews(userId?: string | null, subscriptionTier: 'free' | 'monthly' | 'yearly' = 'free'): number {
    if (!userId) return 0;
    if (subscriptionTier === 'monthly' || subscriptionTier === 'yearly') return -1; // unlimited

    const { count } = this.getTodayCount(userId);
    return Math.max(0, this.MAX_FREE_REVIEWS - count);
  }

  /**
   * Reset count for user (for testing purposes)
   */
  static resetCount(userId: string): void {
    const today = this.getTodayDateString();
    const storageKey = this.getStorageKey(userId, today);
    localStorage.removeItem(storageKey);
  }

  /**
   * Clean up old storage entries (call periodically)
   */
  static cleanupOldEntries(): void {
    const today = this.getTodayDateString();
    const yesterday = this.getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    try {
      // Clean up entries older than yesterday
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
          // Extract date from key: reviewCount_userId_YYYY-MM-DD
          const parts = key.split('_');
          if (parts.length >= 3) {
            const keyDate = parts.slice(2).join('_');
            if (keyDate < yesterday) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old review count entries:', error);
    }
  }

  /**
   * Wrapper for processReview methods that enforces access control
   * Call this BEFORE processing any review to ensure limits are respected
   */
  static async processReviewWithAccessControl<T extends ReviewResult>(
    userId?: string | null,
    subscriptionTier: 'free' | 'monthly' | 'yearly' = 'free',
    processReviewFn: () => Promise<T>
  ): Promise<T> {
    // Check access before processing
    const accessResult = this.checkAccess(userId, subscriptionTier);
    
    if (!accessResult.canReview) {
      const reason = accessResult.reason || 'unknown_error';
      throw new Error(`Review access denied: ${reason}`);
    }
    
    try {
      // Process the review
      const result = await processReviewFn();
      
      // Increment count only on successful review processing
      if (userId) {
        this.incrementCount(userId);
      }
      
      return result;
    } catch (error) {
      // Don't increment count on failure
      throw error;
    }
  }

  /**
   * Unified wrapper for all review engines and sources
   * This ensures consistent access control across the entire system
   */
  static wrapProcessReview<T extends ReviewResult>(
    originalProcessReview: (...args: any[]) => Promise<T>,
    userId?: string | null,
    subscriptionTier: 'free' | 'monthly' | 'yearly' = 'free'
  ) {
    return async (...args: any[]): Promise<T> => {
      return this.processReviewWithAccessControl(
        userId,
        subscriptionTier,
        () => originalProcessReview(...args)
      );
    };
  }

  // Private helper methods

  private static getTodayDateString(): string {
    return this.getDateString(new Date());
  }

  private static getDateString(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private static getStorageKey(userId: string, date: string): string {
    return `${this.STORAGE_KEY_PREFIX}${userId}_${date}`;
  }

  private static saveToStorage(userId: string, data: DailyReviewCount): void {
    const storageKey = this.getStorageKey(userId, data.date);
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving review count to localStorage:', error);
    }
  }
}

// Export types for use in components
export type { AccessControlResult };