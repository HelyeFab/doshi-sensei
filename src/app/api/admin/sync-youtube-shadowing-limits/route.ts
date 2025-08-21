import { NextResponse } from 'next/server';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { ENTITLEMENT_RULES } from '@/lib/entitlements/rules';

export async function POST() {
  try {
    // Mark this as an admin request
    (global as any).__adminRequest = true;
    
    // Get current dynamic rules
    const currentRules = await dynamicRules.getRules();
    
    // Update youtube_shadowing limits from static rules
    const updatedRules = currentRules.map(rule => {
      const staticRule = ENTITLEMENT_RULES.find(r => 
        r.userTypes.some(ut => rule.userTypes.includes(ut))
      );
      
      if (staticRule && staticRule.limits.daily?.youtube_shadowing !== undefined) {
        return {
          ...rule,
          limits: {
            ...rule.limits,
            daily: {
              ...rule.limits.daily,
              youtube_shadowing: staticRule.limits.daily.youtube_shadowing
            }
          }
        };
      }
      
      return rule;
    });
    
    // Save the updated rules
    await dynamicRules.saveRules(updatedRules);
    
    // Clear the cache to ensure fresh data
    dynamicRules.clearCache();
    
    // Clean up
    delete (global as any).__adminRequest;
    
    return NextResponse.json({
      success: true,
      message: 'YouTube shadowing limits synced successfully',
      updates: {
        guest: updatedRules.find(r => r.userTypes.includes('guest'))?.limits.daily?.youtube_shadowing,
        free: updatedRules.find(r => r.userTypes.includes('free'))?.limits.daily?.youtube_shadowing,
        monthly: updatedRules.find(r => r.userTypes.includes('monthly'))?.limits.daily?.youtube_shadowing,
        yearly: updatedRules.find(r => r.userTypes.includes('yearly'))?.limits.daily?.youtube_shadowing
      }
    });
  } catch (error) {
    console.error('Error syncing YouTube shadowing limits:', error);
    delete (global as any).__adminRequest;
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync limits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}