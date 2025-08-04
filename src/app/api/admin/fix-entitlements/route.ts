import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from '@/lib/entitlements/rules';
import { clearRulesCache } from '@/lib/server-dynamic-rules-admin';

const RULES_DOC_ID = 'entitlement_rules_v1';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user is admin (matching pattern from other admin routes)
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('🔧 Fixing entitlements structure...');
    
    // Get Firestore instance
    const db = admin.firestore();
    const rulesDocRef = db.doc(`config/${RULES_DOC_ID}`);
    
    // Get current rules or use defaults
    const rulesDoc = await rulesDocRef.get();
    let rules = DEFAULT_RULES;
    
    if (rulesDoc.exists) {
      const data = rulesDoc.data();
      // Merge with defaults to ensure all fields are present
      if (data?.rules && Array.isArray(data.rules)) {
        rules = data.rules.map((rule: any, index: number) => {
          const defaultRule = DEFAULT_RULES[index];
          return {
            ...defaultRule,
            ...rule,
            limits: {
              daily: {
                ...(defaultRule.limits.daily || {}),
                ...(rule.limits?.daily || {})
              },
              total: {
                ...defaultRule.limits.total,
                ...(rule.limits?.total || {})
              }
            }
          };
        });
      }
    }
    
    // Ensure YouTube shadowing limits are set for all user types
    rules = rules.map(rule => {
      // Ensure limits structure exists
      if (!rule.limits) {
        rule.limits = { daily: {}, total: {} };
      }
      if (!rule.limits.daily) {
        rule.limits.daily = {};
      }
      if (!rule.limits.total) {
        rule.limits.total = {};
      }
      
      // Set default YouTube shadowing limits if not present
      if (rule.limits.daily.youtube_shadowing === undefined) {
        // Set defaults based on user type
        if (rule.userTypes.includes('guest')) {
          rule.limits.daily.youtube_shadowing = 1;
        } else if (rule.userTypes.includes('free')) {
          rule.limits.daily.youtube_shadowing = 3;
        } else if (rule.userTypes.includes('monthly')) {
          rule.limits.daily.youtube_shadowing = 10;
        } else if (rule.userTypes.includes('yearly')) {
          rule.limits.daily.youtube_shadowing = -1; // Unlimited
        }
      }
      
      return rule;
    });
    
    // Save the fixed structure
    await rulesDocRef.set({
      rules,
      lastUpdated: new Date().toISOString(),
      version: 1
    });
    
    // Clear cache to ensure fresh data
    clearRulesCache();
    
    console.log('✅ Entitlements structure fixed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Entitlements structure fixed and saved',
      rulesCount: rules.length,
      youtubeLimits: rules.map(rule => ({
        userTypes: rule.userTypes,
        daily: rule.limits.daily?.youtube_shadowing || 0
      }))
    });
    
  } catch (error) {
    console.error('Error fixing entitlements:', error);
    return NextResponse.json(
      { error: 'Failed to fix entitlements', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}