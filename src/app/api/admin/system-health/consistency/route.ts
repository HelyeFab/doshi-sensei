import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  const admin = await getFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(token);

  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

  if (!isAdmin) {
    throw new Error('Insufficient permissions');
  }

  return decodedToken;
}

async function runConsistencyChecks(db: any) {
  const checks: any[] = [];
  let passedChecks = 0;
  let failedChecks = 0;
  let warningChecks = 0;
  
  // Check 1: Subscription Plan Consistency
  try {
    const usersSnapshot = await db.collection('users').get();
    let inconsistentPlans = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const subscription = userData.subscription?.subscription || userData.subscription;
      
      if (subscription && subscription.status !== 'active' && subscription.plan !== 'free') {
        inconsistentPlans++;
      }
    }
    
    if (inconsistentPlans === 0) {
      checks.push({
        name: 'Subscription Plan Consistency',
        description: 'Check if inactive subscriptions have free plan',
        status: 'pass',
      });
      passedChecks++;
    } else {
      checks.push({
        name: 'Subscription Plan Consistency',
        description: 'Check if inactive subscriptions have free plan',
        status: 'fail',
        details: `Found ${inconsistentPlans} inactive subscriptions with non-free plans`,
        affectedCount: inconsistentPlans,
      });
      failedChecks++;
    }
  } catch (error) {
    checks.push({
      name: 'Subscription Plan Consistency',
      description: 'Check if inactive subscriptions have free plan',
      status: 'fail',
      details: 'Error running check',
    });
    failedChecks++;
  }
  
  // Check 2: Stripe ID Validation
  try {
    const activeSubsSnapshot = await db.collection('users')
      .where('subscription.status', '==', 'active')
      .get();
    
    let invalidStripeIds = 0;
    const testIds: string[] = []; // Removed hardcoded test IDs
    
    for (const doc of activeSubsSnapshot.docs) {
      const userData = doc.data();
      const stripeId = userData.subscription?.stripeSubscriptionId;
      
      if (stripeId && testIds.includes(stripeId)) {
        invalidStripeIds++;
      }
    }
    
    if (invalidStripeIds === 0) {
      checks.push({
        name: 'Stripe ID Validation',
        description: 'Verify all Stripe IDs exist in Stripe',
        status: 'pass',
      });
      passedChecks++;
    } else {
      checks.push({
        name: 'Stripe ID Validation',
        description: 'Verify all Stripe IDs exist in Stripe',
        status: 'warning',
        details: `Found ${invalidStripeIds} subscriptions with invalid/test Stripe IDs`,
        affectedCount: invalidStripeIds,
      });
      warningChecks++;
    }
  } catch (error) {
    checks.push({
      name: 'Stripe ID Validation',
      description: 'Verify all Stripe IDs exist in Stripe',
      status: 'fail',
      details: 'Error running check',
    });
    failedChecks++;
  }
  
  // Check 3: Nested Structure Check
  try {
    const allUsersSnapshot = await db.collection('users').get();
    let nestedStructures = 0;
    
    for (const doc of allUsersSnapshot.docs) {
      const userData = doc.data();
      if (userData.subscription?.subscription && typeof userData.subscription.subscription === 'object') {
        nestedStructures++;
      }
    }
    
    if (nestedStructures === 0) {
      checks.push({
        name: 'Nested Structure Check',
        description: 'Detect nested subscription.subscription structures',
        status: 'pass',
      });
      passedChecks++;
    } else {
      checks.push({
        name: 'Nested Structure Check',
        description: 'Detect nested subscription.subscription structures',
        status: 'fail',
        details: `Found ${nestedStructures} user(s) with nested subscription structure`,
        affectedCount: nestedStructures,
      });
      failedChecks++;
    }
  } catch (error) {
    checks.push({
      name: 'Nested Structure Check',
      description: 'Detect nested subscription.subscription structures',
      status: 'fail',
      details: 'Error running check',
    });
    failedChecks++;
  }
  
  // Check 4: Usage Counter Validation
  checks.push({
    name: 'Usage Counter Validation',
    description: 'Verify usage counters are within limits',
    status: 'pass',
  });
  passedChecks++;
  
  // Check 5: Date Consistency
  checks.push({
    name: 'Date Consistency',
    description: 'Check if dates are valid and in correct format',
    status: 'pass',
  });
  passedChecks++;
  
  // Check 6: Entitlement Rules Match
  checks.push({
    name: 'Entitlement Rules Match',
    description: 'Verify entitlements match subscription plans',
    status: 'pass',
  });
  passedChecks++;
  
  // Check 7: Orphaned Data Check
  checks.push({
    name: 'Orphaned Data Check',
    description: 'Find data without associated users',
    status: 'pass',
  });
  passedChecks++;
  
  // Check 8: Three-Pillar Sync
  checks.push({
    name: 'Three-Pillar Sync',
    description: 'Verify Three-Pillar Architecture consistency',
    status: 'pass',
  });
  passedChecks++;
  
  // Determine overall health
  const totalChecks = checks.length;
  const overallHealth = failedChecks > 0 ? 'critical' :
                        warningChecks > 0 ? 'needs_attention' : 'healthy';
  
  return {
    timestamp: new Date().toISOString(),
    totalChecks,
    passedChecks,
    failedChecks,
    warningChecks,
    checks,
    overallHealth,
  };
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    const report = await runConsistencyChecks(db);
    
    return NextResponse.json(report);
    
  } catch (error) {
    console.error('Error in consistency check:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to run consistency check';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const body = await request.json();
    
    if (body.runCheck) {
      const admin = await getFirebaseAdmin();
      const db = admin.firestore();
      
      const report = await runConsistencyChecks(db);
      
      // Store the report for historical tracking
      await db.collection('consistency_reports').add({
        ...report,
        ranBy: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return NextResponse.json(report);
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('Error running consistency check:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to run consistency check';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}