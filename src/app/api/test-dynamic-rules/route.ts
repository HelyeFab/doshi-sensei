import { NextResponse } from 'next/server';
import { getServerDynamicRules } from '@/lib/server-dynamic-rules';

export async function GET() {
  try {
    console.log('🧪 Testing dynamic rules system...');
    
    // Get fresh rules using server-specific function
    const rules = await getServerDynamicRules();
    
    console.log('📊 Rules loaded:', rules.length);
    
    // Find monthly rule and check YouTube limits
    const monthlyRule = rules.find(r => r.userTypes.includes('monthly'));
    const youtubeLimit = monthlyRule?.limits?.daily?.youtube_shadowing;
    
    console.log('🎥 YouTube limit for monthly users:', youtubeLimit);
    
    return NextResponse.json({
      success: true,
      rulesCount: rules.length,
      monthlyYouTubeLimit: youtubeLimit,
      monthlyRule: monthlyRule ? {
        id: monthlyRule.id,
        userTypes: monthlyRule.userTypes,
        dailyLimits: monthlyRule.limits?.daily
      } : null
    });
    
  } catch (error) {
    console.error('❌ Dynamic rules test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}