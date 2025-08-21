import { NextResponse } from 'next/server';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';

export async function GET() {
  try {
    // Clear the cache
    dynamicRules.clearCache();
    
    // Force reload of rules
    const rules = await dynamicRules.getRules();
    
    return NextResponse.json({
      success: true,
      message: 'Entitlement cache cleared successfully',
      rules: rules
    });
  } catch (error) {
    console.error('Error clearing entitlement cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}