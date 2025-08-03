/**
 * Subscription Manager
 * Handles subscription data and Stripe integration
 */

import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Subscription, SubscriptionPlan, SubscriptionCheckResult } from './types';
import { UserType } from '../entitlements/types';

export class SubscriptionManager {
  private subscriptionCache = new Map<string, Subscription>();
  private listeners = new Map<string, Unsubscribe>();
  
  /**
   * Get subscription for a user
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    // Skip during SSR/build time
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Check cache first
    if (this.subscriptionCache.has(userId)) {
      return this.subscriptionCache.get(userId)!;
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      
      const data = userDoc.data();
      const subscription = data.subscription as Subscription;
      
      if (subscription) {
        this.subscriptionCache.set(userId, subscription);
        return subscription;
      }
      
      // Return default free subscription if none exists
      return this.createDefaultSubscription(userId);
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }
  
  /**
   * Listen to subscription changes
   */
  listenToSubscription(
    userId: string, 
    callback: (subscription: Subscription | null) => void
  ): Unsubscribe {
    // Validate userId before setting up listener
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
      console.warn('Invalid userId provided to subscription listener');
      callback(null);
      return () => {}; // Return empty unsubscribe function
    }

    // Clean up existing listener
    this.stopListening(userId);
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (doc) => {
        if (doc.exists()) {
          const subscription = doc.data().subscription as Subscription;
          this.subscriptionCache.set(userId, subscription);
          callback(subscription);
        } else {
          callback(null);
        }
      },
      (error) => {
        // Only log non-permission errors
        if (error.code !== 'permission-denied') {
          console.error('Subscription listener error:', error);
        }
        callback(null);
      }
    );
    
    this.listeners.set(userId, unsubscribe);
    return unsubscribe;
  }
  
  /**
   * Stop listening to subscription changes
   */
  stopListening(userId: string) {
    const unsubscribe = this.listeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(userId);
    }
  }
  
  /**
   * Update subscription
   */
  async updateSubscription(
    userId: string, 
    updates: Partial<Subscription>
  ): Promise<void> {
    const current = await this.getSubscription(userId);
    const updated: Subscription = {
      ...current!,
      ...updates,
      metadata: {
        ...current?.metadata!,
        updatedAt: new Date()
      }
    };
    
    await setDoc(
      doc(db, 'users', userId),
      { subscription: updated },
      { merge: true }
    );
    
    this.subscriptionCache.set(userId, updated);
  }
  
  /**
   * Create default free subscription
   */
  private createDefaultSubscription(userId: string): Subscription {
    return {
      userId,
      status: 'active',
      plan: 'free',
      metadata: {
        source: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }
  
  /**
   * Get user type from subscription
   */
  getUserType(subscription: Subscription | null): UserType {
    if (!subscription) return 'guest';
    
    if (subscription.status !== 'active') return 'free';
    
    return subscription.plan as UserType;
  }
  
  /**
   * Check subscription status
   */
  checkSubscription(subscription: Subscription | null): SubscriptionCheckResult {
    if (!subscription) {
      return {
        isActive: false,
        plan: 'free'
      };
    }
    
    const isActive = subscription.status === 'active';
    let daysRemaining: number | undefined;
    
    if (subscription.currentPeriodEnd) {
      const endDate = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      isActive,
      plan: subscription.plan,
      daysRemaining
    };
  }
  
  /**
   * Clear cache for a user
   */
  clearCache(userId: string) {
    this.subscriptionCache.delete(userId);
  }
  
  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.subscriptionCache.clear();
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();