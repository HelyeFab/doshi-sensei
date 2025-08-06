import { NextResponse } from 'next/server';
import { FEATURE_REGISTRY } from '@/lib/features/registry';
import { ENTITLEMENT_RULES } from '@/lib/entitlements/rules';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { dynamicRegistry } from '@/lib/features/dynamic-registry';
import { getFeaturePermission } from '@/lib/features/permission-map';
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
    
    // Get features from dynamic registry (with static fallback)
    let features = Object.values(FEATURE_REGISTRY);
    try {
      // Clear cache to ensure fresh data
      dynamicRegistry.clearCache();
      const registry = await dynamicRegistry.getRegistry();
      features = Object.values(registry);
      console.log('[FeatureMatrix] Using dynamic registry');
    } catch (error) {
      console.log('[FeatureMatrix] Using static registry as fallback');
    }
    
    // Build feature matrix data
    const userTypes: UserType[] = ['guest', 'free', 'monthly', 'yearly'];
    
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
        
        // Use centralized permission mapping
        const requiredPermission = getFeaturePermission(feature.id);
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
        
        // Get limits - ALWAYS get the limit regardless of allowed status
        // This ensures we can show the actual limits in the UI
        let limit = 0;
        if (feature.limitType !== 'none') {
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