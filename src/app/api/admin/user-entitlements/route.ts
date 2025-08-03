import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { getServerDynamicRules } from '@/lib/server-dynamic-rules';
import { FEATURE_REGISTRY } from '@/lib/features/registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email required' }, { status: 400 });
    }

    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Find user
    let userDoc;
    if (userId) {
      userDoc = await db.collection('users').doc(userId).get();
    } else if (email) {
      const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!usersSnapshot.empty) {
        userDoc = usersSnapshot.docs[0];
      }
    }

    if (!userDoc || !userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const uid = userDoc.id;

    // Determine user type
    let userType = 'free';
    if (!userData?.email) {
      userType = 'guest';
    } else if (userData?.subscription?.plan === 'monthly' && userData?.subscription?.status === 'active') {
      userType = 'monthly';
    } else if (userData?.subscription?.plan === 'yearly' && userData?.subscription?.status === 'active') {
      userType = 'yearly';
    }

    // Get dynamic rules
    const dynamicRules = await getServerDynamicRules();
    const userRule = dynamicRules.find(rule => rule.userTypes.includes(userType as any));
    
    // Get usage data
    const usageDoc = await db.collection('users').doc(uid).collection('usageTracking').doc('current').get();
    const usageData = usageDoc.exists ? usageDoc.data() : { daily: {}, total: {} };

    // Build feature usage data
    const features = Object.entries(FEATURE_REGISTRY).map(([featureId, feature]) => {
      const limitType = feature.limitType || 'none';
      let limit = 0;
      let used = 0;
      let remaining = 0;
      let percentUsed = 0;
      let status = 'available';
      let resetTime = undefined;

      if (limitType === 'daily' && userRule?.limits?.daily) {
        limit = userRule.limits.daily[featureId] || 0;
        used = usageData?.daily?.[featureId] || 0;
        // Calculate next reset time (midnight UTC)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        resetTime = tomorrow.toISOString();
      } else if (limitType === 'total' && userRule?.limits?.total) {
        limit = userRule.limits.total[featureId] || 0;
        used = usageData?.total?.[featureId] || 0;
      }

      if (limit === -1) {
        // Unlimited
        remaining = -1;
        percentUsed = 0;
        status = 'available';
      } else if (limit > 0) {
        remaining = Math.max(0, limit - used);
        percentUsed = Math.min(100, (used / limit) * 100);
        
        if (percentUsed >= 100) {
          status = 'exhausted';
        } else if (percentUsed >= 80) {
          status = 'warning';
        }
      } else {
        // No access
        status = 'blocked';
      }

      return {
        id: featureId,
        name: feature.name,
        category: feature.category,
        limitType,
        limit,
        used,
        remaining,
        percentUsed: Math.round(percentUsed),
        status,
        resetTime,
        sharedLimitGroup: feature.sharedLimitGroup
      };
    });

    // Get recent activity
    const activitySnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('adminActivity')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    const recentActivity = activitySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }));

    // Get user stats from userStats collection
    let userStats = null;
    try {
      const userStatsDoc = await db.collection('userStats').doc(uid).collection('current').doc('current').get();
      if (userStatsDoc.exists) {
        userStats = userStatsDoc.data();
      }
    } catch (statsError) {
      console.log('Could not fetch userStats:', statsError);
    }

    // Get daily activities from userStats
    let dailyActivities: any[] = [];
    try {
      const dailyActivitiesSnapshot = await db
        .collection('userStats')
        .doc(uid)
        .collection('dailyActivities')
        .orderBy('lastStoryDate', 'desc')
        .limit(30)
        .get();
      
      dailyActivities = dailyActivitiesSnapshot.docs.map(doc => ({
        date: doc.id,
        ...doc.data()
      }));
    } catch (dailyError) {
      console.log('Could not fetch daily activities:', dailyError);
    }

    const response = {
      user: {
        uid,
        email: userData?.email || 'Guest User',
        displayName: userData?.displayName,
        userType,
        lastActive: userData?.lastActive?.toDate?.() || userData?.lastActive,
        createdAt: userData?.createdAt?.toDate?.() || userData?.createdAt
      },
      subscription: userData?.subscription ? {
        plan: userData.subscription.plan,
        status: userData.subscription.status,
        stripeCustomerId: userData.subscription.stripeCustomerId,
        stripeSubscriptionId: userData.subscription.stripeSubscriptionId,
        currentPeriodEnd: userData.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: userData.subscription.cancelAtPeriodEnd,
        renewalDate: userData.subscription.renewalDate
      } : null,
      limits: userRule?.limits || {},
      usage: usageData,
      features,
      recentActivity,
      userStats,
      dailyActivities,
      debug: {
        rawUsageData: usageData,
        appliedRule: userRule,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user entitlements:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch user entitlements',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

// POST endpoint to reset usage for testing
export async function POST(request: NextRequest) {
  try {
    const { userId, feature, type = 'daily' } = await request.json();
    
    if (!userId || !feature) {
      return NextResponse.json({ error: 'userId and feature required' }, { status: 400 });
    }

    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Reset the specific feature usage
    const usageRef = db.collection('users').doc(userId).collection('usageTracking').doc('current');
    const usageDoc = await usageRef.get();
    
    if (usageDoc.exists) {
      const currentData = usageDoc.data() || {};
      if (currentData[type] && currentData[type][feature] !== undefined) {
        currentData[type][feature] = 0;
        await usageRef.update(currentData);
      }
    }

    // Log admin action
    await db.collection('users').doc(userId).collection('adminActivity').add({
      action: 'reset_usage',
      feature,
      type,
      adminId: request.headers.get('x-admin-id') || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: `Reset ${type} usage for ${feature}` });
  } catch (error) {
    console.error('Error resetting usage:', error);
    return NextResponse.json(
      { error: 'Failed to reset usage' },
      { status: 500 }
    );
  }
}