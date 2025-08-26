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

// Permission mapping for features
const permissionMap: Record<string, string> = {
  // Learning permissions
  'hiragana_practice': 'practice_hiragana',
  'katakana_practice': 'practice_katakana',
  'drill_practice': 'do_drills',
  'vocabulary_search': 'search_vocabulary',
  'kanji_study': 'study_kanji',
  'verb_conjugation': 'conjugate_verbs',
  'conjugation_practice': 'practice_conjugation',
  'flashcard_review': 'review_flashcards',
  'textbook_vocabulary': 'study_textbooks',
  
  // Game permissions
  'kanji_quest': 'play_games',
  'kana_drop': 'play_games',
  'memory_match': 'play_games',
  'stroke_order_practice': 'practice_strokes',
  'kanji_mastery': 'study_kanji_advanced',
  'kanji_browser': 'browse_kanji',
  'kanji_moods': 'create_mood_boards',
  'kanji_simon': 'play_memory_games',
  'sentence_scramble': 'play_games',
  
  // Tool permissions
  'ai_stories': 'generate_stories',
  'youtube_shadowing': 'shadow_videos',
  'uploaded_media_shadowing': 'shadow_uploads',
  'news_reader': 'read_news',
  'article_reading': 'read_articles',
  'article_bookmarks': 'bookmark_articles',
  'anki_import': 'import_anki',
  'youtube_series': 'browse_series',
  'my_videos': 'manage_videos',
  
  // Kanji advanced features
  'kanji_families': 'explore_kanji_families',
  'kanji_radicals': 'explore_kanji_radicals',
  'kanji_visual_layout': 'explore_kanji_patterns',
  'kanji_connections': 'access_kanji_connections',
  
  // AI Feature permissions
  'ai_context_explanation': 'explain_context',
  'ai_transcript_formatting': 'format_transcripts',
  'ai_article_validation': 'validate_articles',
  'audio_transcription': 'transcribe_audio',
  'ai_cover_generation': 'generate_covers',
  'quick_context': 'use_quick_context',
  
  // Storage permissions
  'study_lists': 'manage_lists',
  'saved_items': 'save_items',
  'bookmarks': 'manage_bookmarks',
  
  // System permissions
  'cloud_sync': 'sync_data',
  'offline_mode': 'use_offline',
  'advanced_analytics': 'view_analytics',
  
  // Achievement system permissions
  'achievement_view': 'view_achievements',
  'achievement_tracking': 'track_achievements',
  'pokedex_view': 'view_pokedex',
  'pokemon_catching': 'catch_pokemon',
  'achievement_admin': 'admin_achievements',
  
  // Unified Review Engine permissions
  'unified_review_system': 'use_review_system',
  'review_session': 'start_review_sessions',
  'review_notifications': 'manage_review_notifications',
  'progress_dashboard': 'view_progress_dashboard',
  'advanced_srs_algorithms': 'use_advanced_algorithms',
  'cross_device_sync': 'sync_review_progress',
};

// Reverse mapping for convenience
const featureMap: Record<string, string> = Object.entries(permissionMap).reduce(
  (acc, [feature, permission]) => {
    if (!acc[permission]) {
      acc[permission] = feature;
    }
    return acc;
  },
  {} as Record<string, string>
);

// Export functions for permission mapping
export function getPermissionForFeature(featureId: string): string {
  return permissionMap[featureId] || 'unknown_permission';
}

export function getFeatureForPermission(permission: string): string | undefined {
  return featureMap[permission];
}

export function getAllPermissions(): string[] {
  return Array.from(new Set(Object.values(permissionMap)));
}

export function getFeaturesForPermission(permission: string): string[] {
  return Object.entries(permissionMap)
    .filter(([_, perm]) => perm === permission)
    .map(([feature, _]) => feature);
}

// Permission groups for UI organization
export const permissionGroups = {
  learning: [
    'practice_hiragana',
    'practice_katakana',
    'do_drills',
    'search_vocabulary',
    'study_kanji',
    'study_kanji_advanced',
    'browse_kanji',
    'conjugate_verbs',
    'practice_conjugation',
    'review_flashcards',
    'study_textbooks',
  ],
  games: [
    'play_games',
    'practice_strokes',
    'play_memory_games',
    'view_pokedex',
    'catch_pokemon',
  ],
  tools: [
    'generate_stories',
    'shadow_videos',
    'read_news',
    'read_articles',
    'import_anki',
    'create_mood_boards',
  ],
  storage: [
    'manage_lists',
    'save_items',
    'manage_bookmarks',
    'bookmark_articles',
  ],
  system: [
    'sync_data',
    'use_offline',
    'view_analytics',
    'view_achievements',
    'track_achievements',
    'admin_achievements',
  ],
};

// Check if a permission belongs to a group
export function isInPermissionGroup(permission: string, group: keyof typeof permissionGroups): boolean {
  return permissionGroups[group].includes(permission);
}

// Get all features in a permission group
export function getFeaturesInGroup(group: keyof typeof permissionGroups): string[] {
  const permissions = permissionGroups[group];
  return permissions.flatMap(permission => getFeaturesForPermission(permission));
}

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
      
      // Handle limits based on value:
      // -1 = unlimited (check via checkLimit which handles -1)
      // 0 = no access (check via checkLimit which denies)
      // > 0 = limited access (check usage via checkLimit)
      // -999 = explicitly denied
      // any other negative = fall through to permissions
      
      if (limit === -1 || limit >= 0) {
        // Let checkLimit handle all these cases
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
    
    // Use centralized permission mapping
    const { getFeaturePermission } = await import('../features/permission-map');
    
    const permission = getFeaturePermission(featureId);
    if (!permission) {
      console.error(`[Access] No permission mapping for feature: ${featureId}`);
      return false;
    }

    const hasPermission = await entitlementManager.hasPermission(userType, permission as any);

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
    
    // Unlimited (-1) always passes, expose remaining = -1 for UI
    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        usage: 0,
        remaining: -1,
        userType
      };
    }
    
    // Limit of 0 means NO ACCESS AT ALL
    if (limit === 0) {
      return { 
        allowed: false,
        reason: 'no_permission',
        limit: 0,
        usage: 0,
        remaining: 0,
        userType
      };
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
    if (!feature) return;
    
    // Always track usage for statistics, even if there are no limits
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