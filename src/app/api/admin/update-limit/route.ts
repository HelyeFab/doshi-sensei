import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { ENTITLEMENT_RULES as DEFAULT_RULES } from '@/lib/entitlements/rules';
import { EntitlementRule } from '@/lib/entitlements/types';
import { clearRulesCache } from '@/lib/server-dynamic-rules-admin';
import type { UpdateLimitRequest, UpdateLimitResponse, AdminAPIError } from '@/types/admin-api';
import { updateLimitRateLimiter, createRateLimitMiddleware } from '@/lib/rate-limiter';

const RULES_DOC_ID = 'entitlement_rules_v1';
const rateLimitMiddleware = createRateLimitMiddleware(updateLimitRateLimiter);

export async function POST(request: NextRequest) {
  console.log('🚀 Update limit API called');
  try {
    // Get request body
    const body: UpdateLimitRequest = await request.json();
    const { userType, featureId, limitType, newValue } = body;
    
    console.log('📝 Updating limit:', { userType, featureId, limitType, newValue });
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Get Firebase Admin instance
    console.log('🔐 Getting Firebase Admin instance...');
    const admin = await getFirebaseAdmin();
    console.log('✅ Firebase Admin obtained');
    const decodedToken = await admin.auth.verifyIdToken(token);

    // Check if user is admin (matching pattern from other admin routes)
    const userEmail = decodedToken.email || '';
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Apply rate limiting
    const rateLimitResult = rateLimitMiddleware(userEmail);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // Get Firestore instance
    const db = admin.firestore;
    const rulesDocRef = db.collection('config').doc(RULES_DOC_ID);
    
    // Get current rules
    const rulesDoc = await rulesDocRef.get();
    let rules: EntitlementRule[] = DEFAULT_RULES;
    
    if (rulesDoc.exists) {
      const data = rulesDoc.data();
      if (data?.rules) {
        rules = data.rules as EntitlementRule[];
      }
    }
    
    // Find and update the specific rule
    const ruleIndex = rules.findIndex(r => r.userTypes.includes(userType as any));
    if (ruleIndex === -1) {
      return NextResponse.json({ error: `Rule not found for user type: ${userType}` }, { status: 400 });
    }
    
    // Deep clone to avoid mutations
    const updatedRules = JSON.parse(JSON.stringify(rules));
    const rule = updatedRules[ruleIndex];
    
    // Ensure the limits structure exists
    if (!rule.limits[limitType]) {
      rule.limits[limitType] = {};
    }
    
    // Update the specific limit
    rule.limits[limitType][featureId] = newValue;
    
    console.log(`✅ Updated ${userType} ${limitType} ${featureId} to ${newValue}`);
    
    // Save back to Firestore
    await rulesDocRef.set({
      rules: updatedRules,
      lastUpdated: new Date().toISOString(),
      version: 1
    });
    
    // Clear the server-side cache to ensure fresh data on next read
    clearRulesCache();
    console.log('🧽 Cleared server rules cache after update');
    
    const response: UpdateLimitResponse = {
      success: true, 
      message: `Updated ${featureId} limit for ${userType} to ${newValue}`,
      updatedRule: rule
    };
    
    return NextResponse.json(response, {
      headers: rateLimitResult.headers
    });
    
  } catch (error) {
    console.error('Error updating limit:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // More specific error messages
    let errorMessage = 'Failed to update limit';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Check for specific error types
      if (error.message.includes('auth/id-token-expired')) {
        errorMessage = 'Authentication token expired';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission denied to update Firestore';
      } else if (error.message.includes('Firebase Admin')) {
        errorMessage = 'Firebase Admin SDK initialization error';
      }
    }
    
    const errorResponse: AdminAPIError = {
      error: errorMessage,
      details: errorDetails
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}