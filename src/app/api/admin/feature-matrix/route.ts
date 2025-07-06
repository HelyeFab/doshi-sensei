import { NextResponse } from 'next/server';
import { FEATURE_REGISTRY } from '@/lib/features/registry';
import { ENTITLEMENT_RULES } from '@/lib/entitlements/rules';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { UserType } from '@/lib/entitlements/types';

export async function GET() {
  try {
    // For now, we'll skip admin authentication since the data is static
    // In production, you'd want to verify the user is an admin
    
    // Get dynamic rules from database (falls back to static if not found)
    let rules = ENTITLEMENT_RULES;
    try {
      rules = await dynamicRules.getRules();
    } catch (error) {
      console.log('Using static rules as fallback');
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
        if (!rule) return;
        
        // Check if feature is allowed for this user type
        let allowed = false;
        
        // Map feature to permission
        const permissionMap: Record<string, string> = {
          'drill_practice': 'do_drills',
          'article_reading': 'read_articles',
          'story_reading': 'read_stories',
          'kanji_quest': 'play_games',
          'kana_drop': 'play_games',
          'word_lists': 'create_lists',
          'bookmarks': 'create_lists',
          'cloud_sync': 'cloud_sync',
          'progress_saving': 'save_progress',
          'kanji_moods': 'kanji_moods',
          'speaking_practice': 'do_drills',
          'ai_tutor': 'premium_features'
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
    
    return NextResponse.json({
      matrix,
      stats,
      userTypes,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Feature matrix API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate feature matrix' },
      { status: 500 }
    );
  }
}