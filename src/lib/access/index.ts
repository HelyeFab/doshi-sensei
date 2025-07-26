/**
 * Access Control System
 * Unified API for checking feature access across the app
 */

import { AccessCheckResult } from './types';
import { UserType } from '../entitlements/types';
import { entitlementManager } from '../entitlements/manager';
import { featureManager } from '../features/manager';
import { subscriptionManager } from '../subscriptions/manager';
import { usageTracker } from './usage-tracker';

export class AccessControl {
  /**
   * Main access check method
   */
  async canUserAccess(
    userId: string | null,
    featureId: string
  ): Promise<AccessCheckResult> {
    // 1. Get feature info
    const feature = featureManager.getFeature(featureId);
    if (!feature || feature.status !== 'active') {
      return {
        allowed: false,
        reason: 'feature_disabled',
        userType: 'guest'
      };
    }
    
    // 2. Determine user type
    let userType: UserType = 'guest';
    if (userId) {
      const subscription = await subscriptionManager.getSubscription(userId);
      userType = subscriptionManager.getUserType(subscription);
    }
    
    // 3. Check authentication requirement
    if (feature.requiresAuth && !userId) {
      return {
        allowed: false,
        reason: 'not_authenticated',
        userType: 'guest'
      };
    }
    
    // 4. Check subscription requirement
    if (feature.requiresSubscription && (userType === 'guest' || userType === 'free')) {
      return {
        allowed: false,
        reason: 'subscription_required',
        userType
      };
    }
    
    // 5. Check if feature has limits configured
    if (feature.limitType !== 'none') {
      // Get the limit value
      const limitKey = featureManager.getEffectiveLimitKey(featureId);
      const limit = await entitlementManager.getLimit(userType, limitKey, feature.limitType);
      
      // If a limit is explicitly set (0 or higher), this grants access
      // -999 means explicitly no access, anything else means check permissions
      if (limit >= 0) {
        // Access is granted via limit configuration, now check usage
        const limitCheck = await this.checkLimit(userId, featureId, feature.limitType, userType);
        return limitCheck;
      } else if (limit === -999) {
        // Explicitly denied access
        return {
          allowed: false,
          reason: 'no_permission',
          userType
        };
      }
    }
    
    // 6. Check permissions (only if no explicit limit is set)
    const hasPermission = await this.checkPermission(userType, featureId);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'no_permission',
        userType
      };
    }
    
    // 7. If feature has limits and we got here via permissions, check usage
    if (feature.limitType !== 'none') {
      const limitCheck = await this.checkLimit(userId, featureId, feature.limitType, userType);
      if (!limitCheck.allowed) {
        return limitCheck;
      }
    }
    
    // All checks passed
    return {
      allowed: true,
      userType
    };
  }
  
  /**
   * Check if user has permission for a feature
   */
  private async checkPermission(userType: UserType, featureId: string): Promise<boolean> {
    const feature = featureManager.getFeature(featureId);
    if (!feature) {
      console.error(`[Access] Feature not found: ${featureId}`);
      return false;
    }
    
    // Map feature categories to permissions
    const permissionMap: Record<string, string> = {
      'drill_practice': 'do_drills',
      'article_reading': 'read_articles',
      'story_reading': 'read_stories',
      'kanji_quest': 'play_games',
      'kana_drop': 'play_games',
      'sentence_scramble': 'play_games',
      'matching_game': 'play_games',
      'memory_match': 'play_games',
      'reading_routes': 'play_games',
      'kanji_simon': 'play_games',
      'listening_quiz': 'play_games',
      'word_assembly': 'play_games',
      'word_lists': 'create_lists',
      'bookmarks': 'create_lists',
      'sentences-bookmark': 'create_lists',
      'cloud_sync': 'cloud_sync',
      'progress_saving': 'save_progress',
      'kanji_moods': 'kanji_moods',
      'kanji_stroke_order': 'view_stroke_order',
      'stroke_order_practice': 'view_stroke_order',
      'youtube_shadowing': 'youtube_shadowing',
      'anki_import': 'create_lists',
      'anki_set_creation': 'create_lists',
      'flashcard_review': 'do_drills',
      'ai_context_explanation': 'ai_explanations',
      'textbook_vocabulary': 'textbook_vocabulary',
      'kana_study': 'do_drills'
    };
    
    const permission = permissionMap[featureId];
    if (!permission) {
      console.error(`[Access] No permission mapping for feature: ${featureId}`);
      return false;
    }
    
    console.log(`[Access] Checking permission '${permission}' for userType '${userType}' and feature '${featureId}'`);
    const hasPermission = await entitlementManager.hasPermission(userType, permission as any);
    console.log(`[Access] Permission check result: ${hasPermission}`);
    return hasPermission;
  }
  
  /**
   * Check usage limits
   */
  private async checkLimit(
    userId: string | null,
    featureId: string,
    limitType: 'daily' | 'total',
    userType: UserType
  ): Promise<AccessCheckResult> {
    // Get the effective limit key (handles shared limits)
    const limitKey = featureManager.getEffectiveLimitKey(featureId);
    
    // Get the limit value
    const limit = await entitlementManager.getLimit(userType, limitKey, limitType);
    
    // Unlimited (-1) always passes
    if (limit === -1) {
      return { allowed: true, userType };
    }
    
    // Simple access (0) always passes (no numeric limit)
    if (limit === 0) {
      return { allowed: true, userType };
    }
    
    // Get current usage
    const usage = await usageTracker.getUsage(userId, limitKey, limitType);
    
    // Check if limit exceeded
    if (usage >= limit) {
      const resetAt = limitType === 'daily' 
        ? new Date(new Date().setHours(24, 0, 0, 0))
        : undefined;
      
      return {
        allowed: false,
        reason: 'limit_reached',
        limit,
        usage,
        remaining: 0,
        userType,
        resetAt
      };
    }
    
    return {
      allowed: true,
      limit,
      usage,
      remaining: limit - usage,
      userType
    };
  }
  
  /**
   * Track usage after successful access
   */
  async trackUsage(userId: string | null, featureId: string): Promise<void> {
    const feature = featureManager.getFeature(featureId);
    if (!feature || feature.limitType === 'none') return;
    
    const limitKey = featureManager.getEffectiveLimitKey(featureId);
    await usageTracker.incrementUsage(userId, limitKey);
  }
  
  /**
   * Get remaining usage for a feature
   */
  async getRemainingUsage(
    userId: string | null,
    featureId: string
  ): Promise<number | null> {
    const accessCheck = await this.canUserAccess(userId, featureId);
    return accessCheck.remaining ?? null;
  }
  
  /**
   * Get user's complete access summary
   */
  async getUserAccessSummary(userId: string | null) {
    const userType = userId
      ? subscriptionManager.getUserType(await subscriptionManager.getSubscription(userId))
      : 'guest';
    
    const features = featureManager.getActiveFeatures();
    const summary: Record<string, AccessCheckResult> = {};
    
    for (const feature of features) {
      summary[feature.id] = await this.canUserAccess(userId, feature.id);
    }
    
    return {
      userType,
      features: summary
    };
  }
}

// Singleton instance
export const accessControl = new AccessControl();

// Export all the parts for direct access if needed
export { entitlementManager } from '../entitlements/manager';
export { featureManager } from '../features/manager';
export { subscriptionManager } from '../subscriptions/manager';
export { usageTracker } from './usage-tracker';