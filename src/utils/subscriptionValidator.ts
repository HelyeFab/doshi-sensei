/**
 * Single Source of Truth for Subscription Validation
 * 
 * This utility provides consistent subscription validation across the entire app
 * and helps debug subscription-related issues.
 */

import { UserSubscription, UserType } from '@/types/subscription';
import { User } from 'firebase/auth';

export interface SubscriptionValidation {
  isValid: boolean;
  isPremium: boolean;
  userType: UserType;
  hasUnlimitedAccess: boolean;
  debugInfo: {
    user: boolean;
    subscription: boolean;
    plan: string | null;
    status: string | null;
    checks: {
      hasUser: boolean;
      hasSubscription: boolean;
      isActiveStatus: boolean;
      isPremiumPlan: boolean;
    };
    timestamp: string;
  };
}

class SubscriptionValidator {
  private static instance: SubscriptionValidator;

  private constructor() {}

  static getInstance(): SubscriptionValidator {
    if (!SubscriptionValidator.instance) {
      SubscriptionValidator.instance = new SubscriptionValidator();
    }
    return SubscriptionValidator.instance;
  }

  /**
   * Main validation method - Single source of truth for premium status
   */
  validate(
    user: User | null,
    userSubscription: UserSubscription | null,
    loading: boolean = false
  ): SubscriptionValidation {
    const timestamp = new Date().toISOString();
    
    // Debug checks
    const hasUser = !!user;
    const hasSubscription = !!userSubscription;
    const subscriptionPlan = userSubscription?.subscription?.plan || null;
    const subscriptionStatus = userSubscription?.subscription?.status || null;
    const isActiveStatus = subscriptionStatus === 'active';
    const isPremiumPlan = subscriptionPlan === 'monthly' || subscriptionPlan === 'yearly';
    
    // Core validation logic - SINGLE SOURCE OF TRUTH
    const isPremium = hasUser && 
                     hasSubscription && 
                     isActiveStatus && 
                     isPremiumPlan;
    
    // Determine user type
    let userType: UserType = 'guest';
    if (hasUser) {
      userType = isPremium ? 'premium' : 'free';
    }
    
    // Log validation for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Subscription Validation:', {
        isPremium,
        userType,
        userEmail: user?.email || 'guest',
        plan: subscriptionPlan,
        status: subscriptionStatus,
        checks: {
          hasUser,
          hasSubscription,
          isActiveStatus,
          isPremiumPlan
        },
        loading,
        timestamp
      });
    }
    
    return {
      isValid: hasUser && hasSubscription && !loading,
      isPremium,
      userType,
      hasUnlimitedAccess: isPremium,
      debugInfo: {
        user: hasUser,
        subscription: hasSubscription,
        plan: subscriptionPlan,
        status: subscriptionStatus,
        checks: {
          hasUser,
          hasSubscription,
          isActiveStatus,
          isPremiumPlan
        },
        timestamp
      }
    };
  }

  /**
   * Check if a specific feature is available
   */
  canAccessFeature(
    feature: string,
    validation: SubscriptionValidation,
    currentUsage?: { daily?: number; total?: number },
    limits?: { daily?: number; total?: number }
  ): { allowed: boolean; reason?: string } {
    // Premium users have unlimited access
    if (validation.isPremium) {
      return { allowed: true };
    }
    
    // Guest users have limited access
    if (validation.userType === 'guest') {
      // Check guest limits
      if (feature === 'kanjiquest' || feature === 'drills') {
        const dailyLimit = 3;
        const used = currentUsage?.daily || 0;
        if (used >= dailyLimit) {
          return { 
            allowed: false, 
            reason: `Daily limit reached (${used}/${dailyLimit})` 
          };
        }
        return { allowed: true };
      }
      return { allowed: false, reason: 'Feature not available for guests' };
    }
    
    // Free users - check specific limits
    if (!limits) {
      return { allowed: false, reason: 'No limits defined' };
    }
    
    if (limits.daily && limits.daily !== -1) {
      const used = currentUsage?.daily || 0;
      if (used >= limits.daily) {
        return { 
          allowed: false, 
          reason: `Daily limit reached (${used}/${limits.daily})` 
        };
      }
    }
    
    if (limits.total && limits.total !== -1) {
      const used = currentUsage?.total || 0;
      if (used >= limits.total) {
        return { 
          allowed: false, 
          reason: `Total limit reached (${used}/${limits.total})` 
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Debug helper to log current subscription state
   */
  debugSubscriptionState(
    user: User | null,
    userSubscription: UserSubscription | null,
    context: string = 'Unknown'
  ): void {
    const validation = this.validate(user, userSubscription);
    
    console.group(`🔍 Subscription Debug - ${context}`);
    console.table({
      Context: context,
      'User Email': user?.email || 'Not logged in',
      'Is Premium': validation.isPremium,
      'User Type': validation.userType,
      'Has Unlimited': validation.hasUnlimitedAccess,
      'Subscription Plan': validation.debugInfo.plan || 'None',
      'Subscription Status': validation.debugInfo.status || 'None',
      'All Checks Passed': Object.values(validation.debugInfo.checks).every(v => v)
    });
    console.log('Detailed Checks:', validation.debugInfo.checks);
    console.log('Full Validation:', validation);
    console.groupEnd();
  }
}

// Export singleton instance
export const subscriptionValidator = SubscriptionValidator.getInstance();

// Export types
export type { SubscriptionValidation };