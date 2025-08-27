import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const idToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    // Verify the ID token and check admin status
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
      console.log('[SubscriptionAnalytics] Token verified for user:', decodedToken.uid);
    } catch (tokenError: any) {
      console.error('[SubscriptionAnalytics] Token verification failed:', tokenError.message);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // Check admin status from custom claims or email
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || (adminEmail && decodedToken.email === adminEmail);
    
    console.log('[SubscriptionAnalytics] Admin check:', { 
      uid: decodedToken.uid,
      email: decodedToken.email,
      hasAdminClaim: decodedToken.admin === true,
      isAdmin
    });
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get subscription analytics directly from Firestore
    const usersSnapshot = await adminDb.collection('users').get();
    
    const analytics = {
      total: usersSnapshot.size,
      byStatus: {} as Record<string, number>,
      byPlan: {} as Record<string, number>,
      revenue: {
        monthly: 0,
        annual: 0,
        total: 0,
        mrr: 0, // Monthly Recurring Revenue
        arr: 0  // Annual Recurring Revenue
      },
      users: {
        free: 0,
        premium: 0,
        monthly: 0,
        yearly: 0
      }
    };

    usersSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const subscription = data.subscription;
      
      if (subscription) {
        // Count by status
        const status = subscription.status || 'free';
        analytics.byStatus[status] = (analytics.byStatus[status] || 0) + 1;
        
        // Count by plan
        const plan = subscription.plan || 'free';
        analytics.byPlan[plan] = (analytics.byPlan[plan] || 0) + 1;
        
        // Count users by type
        if (status === 'active' && (plan === 'premium' || plan === 'pro')) {
          analytics.users.premium++;
          
          if (subscription.interval === 'month') {
            analytics.users.monthly++;
          } else if (subscription.interval === 'year') {
            analytics.users.yearly++;
          }
        } else {
          analytics.users.free++;
        }
        
        // Calculate revenue
        if (subscription.status === 'active' && subscription.amount) {
          const amount = subscription.amount / 100; // Convert from cents
          
          if (subscription.interval === 'month') {
            analytics.revenue.monthly += amount;
            analytics.revenue.mrr += amount;
            analytics.revenue.arr += amount * 12;
          } else if (subscription.interval === 'year') {
            analytics.revenue.annual += amount;
            analytics.revenue.arr += amount;
            analytics.revenue.mrr += amount / 12;
          }
          analytics.revenue.total += amount;
        }
      } else {
        // No subscription means free user
        analytics.byStatus['free'] = (analytics.byStatus['free'] || 0) + 1;
        analytics.byPlan['free'] = (analytics.byPlan['free'] || 0) + 1;
        analytics.users.free++;
      }
    });

    // Round revenue values to 2 decimal places
    analytics.revenue.monthly = Math.round(analytics.revenue.monthly * 100) / 100;
    analytics.revenue.annual = Math.round(analytics.revenue.annual * 100) / 100;
    analytics.revenue.total = Math.round(analytics.revenue.total * 100) / 100;
    analytics.revenue.mrr = Math.round(analytics.revenue.mrr * 100) / 100;
    analytics.revenue.arr = Math.round(analytics.revenue.arr * 100) / 100;

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Error in admin/subscription-analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}