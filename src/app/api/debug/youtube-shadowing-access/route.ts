import { NextResponse } from 'next/server';
import { accessControl, entitlementManager, featureManager } from '@/lib/access';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { ENTITLEMENT_RULES } from '@/lib/entitlements/rules';

export async function GET() {
  try {
    // Get dynamic rules
    const dynamicRulesData = await dynamicRules.getRules();
    
    // Get feature info
    const feature = featureManager.getFeature('youtube_shadowing');
    
    // Check limits for each user type
    const userTypes = ['guest', 'free', 'monthly', 'yearly'] as const;
    const limitChecks: any = {};
    
    for (const userType of userTypes) {
      const dailyLimit = await entitlementManager.getLimit(userType, 'youtube_shadowing', 'daily');
      const accessCheck = await accessControl.canUserAccess(null, 'youtube_shadowing');
      
      limitChecks[userType] = {
        dailyLimit,
        accessCheck,
        staticRule: ENTITLEMENT_RULES.find(r => r.userTypes.includes(userType))?.limits.daily?.youtube_shadowing,
        dynamicRule: dynamicRulesData.find(r => r.userTypes.includes(userType))?.limits.daily?.youtube_shadowing
      };
    }
    
    return NextResponse.json({
      success: true,
      feature,
      limitChecks,
      dynamicRulesCount: dynamicRulesData.length,
      staticRulesCount: ENTITLEMENT_RULES.length
    });
  } catch (error) {
    console.error('Error checking YouTube shadowing access:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check access',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}