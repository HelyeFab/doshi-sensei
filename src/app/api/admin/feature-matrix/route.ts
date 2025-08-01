import { NextResponse } from 'next/server';
import { FEATURE_REGISTRY } from '@/lib/features/registry';
import { ENTITLEMENT_RULES } from '@/lib/entitlements/rules';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { UserType } from '@/lib/entitlements/types';

// Add cache control headers
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // For now, we'll skip admin authentication since the data is static
    // In production, you'd want to verify the user is an admin
    
    // Mark this as an admin request for dynamic rules loading
    (global as any).__adminRequest = true;
    
    // Get dynamic rules from database (falls back to static if not found)
    let rules = ENTITLEMENT_RULES;
    try {
      // Clear cache to ensure we get the latest rules
      dynamicRules.clearCache();
      rules = await dynamicRules.getRules();
    } catch (error) {
      console.log('Using static rules as fallback:', error);
    }
    
    // Build feature matrix data
    const userTypes: UserType[] = ['guest', 'free', 'monthly', 'yearly'];
    const features = Object.values(FEATURE_REGISTRY);
    
    // Create matrix
    const matrix = features.map(feature => {
      const accessByUserType: Record<UserType, any> = {
        guest: { allowed: false, limit: 0 },
        free: { allowed: false, limit: 0 },
        monthly: { allowed: false, limit: 0 },
        yearly: { allowed: false, limit: 0 }
      };
      
      // Check each user type
      userTypes.forEach(userType => {
        const rule = rules.find(r => r.userTypes.includes(userType));
        if (!rule) {
          console.warn(`No rule found for user type: ${userType}`);
          return;
        }
        
        // Debug which rule is being used
        if (feature.id === 'youtube_shadowing') {
          console.log(`Rule for ${userType}:`, {
            ruleId: rule.id,
            userTypes: rule.userTypes,
            youtubeShadowingLimit: rule.limits.daily?.youtube_shadowing
          });
        }
        
        // Check if feature is allowed for this user type
        let allowed = false;
        
        // Map feature to permission
        const permissionMap: Record<string, string> = {
          'drill_practice': 'do_drills',
          'kana_study': 'do_drills', // Add kana_study mapping
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
          'speaking_practice': 'do_drills',
          'ai_tutor': 'premium_features',
          'youtube_shadowing': 'youtube_shadowing',
          'textbook_vocabulary': 'textbook_vocabulary',
          'kanji_stroke_order': 'view_stroke_order',
          'stroke_order_practice': 'view_stroke_order',
          'flashcard_review': 'do_drills',
          'offline_articles': 'premium_features',
          'offline_stories': 'premium_features',
          'resource_caching': 'premium_features',
          'background_sync': 'premium_features',
          'ai_context_explanation': 'ai_explanations',
          'anki_import': 'anki_import',
          'anki_set_creation': 'anki_set_creation',
          'kanji_mastery': 'learn_kanji',
          'leaderboard': 'view_leaderboard'
        };
        
        const requiredPermission = permissionMap[feature.id];
        if (rule.permissions.includes('*') || rule.permissions.includes(requiredPermission as any)) {
          allowed = true;
        }
        
        // Additional checks
        if (feature.requiresAuth && userType === 'guest') {
          allowed = false;
        }
        
        if (feature.requiresSubscription && (userType === 'guest' || userType === 'free')) {
          allowed = false;
        }
        
        // Get limits
        let limit = 0;
        if (allowed && feature.limitType !== 'none') {
          const limitKey = feature.sharedLimitGroup || feature.id;
          const limits = rule.limits[feature.limitType];
          limit = limits?.[limitKey] ?? 0;
        }
        
        accessByUserType[userType] = { allowed, limit };
      });
      
      return {
        feature,
        access: accessByUserType
      };
    });
    
    // Calculate statistics
    const stats = {
      totalFeatures: features.length,
      activeFeatures: features.filter(f => f.status === 'active').length,
      plannedFeatures: features.filter(f => f.status === 'planned').length,
      guestAccessible: matrix.filter(m => m.access.guest.allowed).length,
      freeAccessible: matrix.filter(m => m.access.free.allowed).length,
      premiumExclusive: matrix.filter(m => 
        !m.access.guest.allowed && !m.access.free.allowed && 
        (m.access.monthly.allowed || m.access.yearly.allowed)
      ).length
    };
    
    // Debug specific feature
    const youtubeShadowingData = matrix.find(m => m.feature.id === 'youtube_shadowing');
    if (youtubeShadowingData) {
      console.log('YouTube Shadowing Access Data:', {
        guest: youtubeShadowingData.access.guest,
        free: youtubeShadowingData.access.free,
        monthly: youtubeShadowingData.access.monthly,
        yearly: youtubeShadowingData.access.yearly
      });
    }
    
    const response = NextResponse.json({
      matrix,
      stats,
      userTypes,
      lastUpdated: new Date().toISOString()
    });
    
    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('Feature matrix API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate feature matrix' },
      { status: 500 }
    );
  }
}