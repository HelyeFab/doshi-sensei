import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Test subscription IDs - removed to prevent Stripe API errors
const TEST_SUBSCRIPTION_IDS: string[] = [];

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

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    let totalUsers = 0;
    let activeSubscriptions = 0;
    let invalidSubscriptions = 0;
    let nestedStructures = 0;
    let missingStripeIds = 0;
    let testSubscriptions = 0;
    const issues: any[] = [];
    
    for (const doc of usersSnapshot.docs) {
      totalUsers++;
      const userData = doc.data();
      const subscription = userData.subscription;
      
      if (!subscription) continue;
      
      // Check for nested structure (old format)
      if (subscription.subscription && typeof subscription.subscription === 'object') {
        nestedStructures++;
        issues.push({
          userId: doc.id,
          email: userData.email || 'Unknown',
          issue: 'Nested subscription structure detected',
          severity: 'critical' as const,
        });
      }
      
      // Check subscription status
      const actualSubscription = subscription.subscription || subscription;
      
      if (actualSubscription.status === 'active') {
        activeSubscriptions++;
        
        // Check for test subscription IDs
        if (actualSubscription.stripeSubscriptionId && 
            TEST_SUBSCRIPTION_IDS.includes(actualSubscription.stripeSubscriptionId)) {
          testSubscriptions++;
          invalidSubscriptions++;
          issues.push({
            userId: doc.id,
            email: userData.email || 'Unknown',
            issue: `Test subscription ID: ${actualSubscription.stripeSubscriptionId}`,
            severity: 'warning' as const,
          });
        } else if (actualSubscription.stripeSubscriptionId) {
          // Validate with Stripe (in production, cache this or limit checks)
          try {
            // For performance, we'll skip actual Stripe validation in this endpoint
            // and rely on cached data or periodic checks
          } catch (error) {
            invalidSubscriptions++;
            issues.push({
              userId: doc.id,
              email: userData.email || 'Unknown',
              issue: 'Invalid Stripe subscription ID',
              severity: 'critical' as const,
            });
          }
        } else if (actualSubscription.plan !== 'free') {
          // Active subscription but no Stripe ID
          missingStripeIds++;
          issues.push({
            userId: doc.id,
            email: userData.email || 'Unknown',
            issue: 'Active premium subscription missing Stripe ID',
            severity: 'critical' as const,
          });
        }
      }
      
      // Check for inconsistencies
      if (actualSubscription.status !== 'active' && 
          actualSubscription.plan !== 'free') {
        issues.push({
          userId: doc.id,
          email: userData.email || 'Unknown',
          issue: `Inactive status but ${actualSubscription.plan} plan`,
          severity: 'warning' as const,
        });
      }
    }
    
    // Calculate health score
    const healthScore = Math.max(0, Math.min(100, 
      100 - (invalidSubscriptions * 10) - (nestedStructures * 15) - (missingStripeIds * 20)
    ));
    
    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      invalidSubscriptions,
      nestedStructures,
      missingStripeIds,
      testSubscriptions,
      healthScore,
      issues: issues.slice(0, 50), // Limit to 50 issues for performance
    });
    
  } catch (error) {
    console.error('Error in subscription health check:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to check subscription health';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}