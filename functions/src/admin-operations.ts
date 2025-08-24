import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Get initialized admin instance from index.ts
const db = admin.firestore();
const auth = admin.auth();

// Initialize Stripe (will be initialized on first use)
let stripe: Stripe;

// Helper to verify admin status
async function verifyAdmin(uid: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error('Error verifying admin:', error);
    return false;
  }
}

/**
 * Cancel Subscription
 * Previously: /api/cancel-subscription
 */
export const cancelSubscription = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, reason, feedback } = data;
  
  // User can cancel their own subscription
  if (userId !== context.auth.uid) {
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }
  }

  try {
    // Get current subscription
    const userDoc = await db.collection('users').doc(userId).get();
    const currentSub = userDoc.data()?.subscription;

    // Update subscription status
    await db.collection('users').doc(userId).update({
      'subscription.status': 'canceled',
      'subscription.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
      'subscription.cancellationReason': reason,
      'subscription.cancellationFeedback': feedback,
    });

    // Log cancellation
    await db.collection('subscriptionHistory').add({
      userId,
      action: 'canceled',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason,
      feedback,
      performedBy: context.auth.uid,
      previousStatus: currentSub?.status,
    });

    return { success: true, message: 'Subscription canceled successfully' };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
  }
});

/**
 * Delete User Account
 * Previously: /api/auth/delete-account
 */
export const deleteAccount = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = data.userId || context.auth.uid;
  
  // Only allow users to delete their own account or admin to delete any
  if (userId !== context.auth.uid) {
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }
  }

  try {
    // Delete user data from Firestore
    const batch = db.batch();
    
    // Delete user document
    batch.delete(db.collection('users').doc(userId));
    
    // Delete related collections
    const collections = [
      'userProgress',
      'userSettings', 
      'bookmarks',
      'studySessions',
      'notifications',
      'bugs',
    ];
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .limit(500)
        .get();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    
    await batch.commit();
    
    // Delete from Authentication
    await auth.deleteUser(userId);

    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete account');
  }
});

/**
 * Track Article View
 * Previously: /api/articles/view
 */
export const trackArticleView = functions.https.onCall(async (data: any, context: any) => {
  const { articleId, userId } = data;

  try {
    // Update view count
    await db.collection('articles').doc(articleId).update({
      viewCount: admin.firestore.FieldValue.increment(1),
      lastViewed: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Track user view if authenticated
    if (userId || context.auth?.uid) {
      const uid = userId || context.auth.uid;
      await db.collection('userArticleViews').add({
        userId: uid,
        articleId,
        viewedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking article view:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track view');
  }
});

/**
 * Manage Bookmarks
 * Previously: /api/articles/bookmarks
 */
export const manageBookmarks = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { action, articleId, articleTitle } = data;
  const userId = context.auth.uid;

  try {
    const bookmarkRef = db.collection('bookmarks').doc(`${userId}_${articleId}`);

    switch (action) {
      case 'add':
        await bookmarkRef.set({
          userId,
          articleId,
          articleTitle,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, action: 'added' };

      case 'remove':
        await bookmarkRef.delete();
        return { success: true, action: 'removed' };

      case 'check':
        const doc = await bookmarkRef.get();
        return { exists: doc.exists };

      case 'list':
        const bookmarks = await db.collection('bookmarks')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();
        return { 
          bookmarks: bookmarks.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        };

      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
    }
  } catch (error) {
    console.error('Error managing bookmarks:', error);
    throw new functions.https.HttpsError('internal', 'Failed to manage bookmarks');
  }
});

/**
 * Register Notification Token
 * Previously: /api/notifications/register-token
 */
export const registerNotificationToken = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { token, platform } = data;
  const userId = context.auth.uid;

  try {
    await db.collection('users').doc(userId).update({
      fcmToken: token,
      notificationPlatform: platform || 'web',
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error registering notification token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to register token');
  }
});

/**
 * Update Notification Preferences
 * Previously: /api/notifications/preferences
 */
export const updateNotificationPreferences = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { preferences } = data;
  const userId = context.auth.uid;

  try {
    await db.collection('users').doc(userId).update({
      notificationPreferences: preferences,
      notificationPreferencesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update preferences');
  }
});

/**
 * Track Share
 * Previously: /api/share/track
 */
export const trackShare = functions.https.onCall(async (data: any, context: any) => {
  const { platform, content, userId } = data;

  try {
    await db.collection('shares').add({
      platform,
      content,
      userId: userId || context.auth?.uid || 'anonymous',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error tracking share:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track share');
  }
});

/**
 * Get Share Stats
 * Previously: /api/share/stats/[userId]
 */
export const getShareStats = functions.https.onCall(async (data: any, context: any) => {
  const { userId } = data;

  try {
    const sharesSnapshot = await db.collection('shares')
      .where('userId', '==', userId)
      .get();

    const stats = {
      totalShares: sharesSnapshot.size,
      platforms: {} as Record<string, number>,
    };

    sharesSnapshot.forEach((doc: any) => {
      const platform = doc.data().platform;
      stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting share stats:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get stats');
  }
});

/**
 * Admin: Delete User (with elevated permissions)
 * Previously: /api/admin/delete-user
 */
export const adminDeleteUser = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { userId } = data;

  try {
    // More thorough deletion for admin
    const batch = db.batch();
    
    // Get all collections that might have user data
    const collections = [
      'users',
      'userProgress',
      'userSettings',
      'bookmarks',
      'studySessions',
      'notifications',
      'subscriptionHistory',
      'bugs',
      'shares',
      'userArticleViews',
    ];

    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('userId', '==', userId)
        .limit(500)
        .get();
      
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }

    // Also delete the user document itself
    batch.delete(db.collection('users').doc(userId));
    
    await batch.commit();

    // Delete from Authentication
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      console.log('User might not exist in Auth:', authError);
    }

    // Log admin action
    await db.collection('adminActions').add({
      action: 'deleteUser',
      targetUserId: userId,
      performedBy: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error in admin delete user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete user');
  }
});

/**
 * Admin: Get System Health
 * Previously: /api/admin/system-health/*
 */
export const getSystemHealth = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const health = {
      timestamp: new Date().toISOString(),
      database: 'connected',
      collections: {} as Record<string, number>,
    };

    // Get document counts for main collections
    const collections = ['users', 'subscriptionHistory', 'articles', 'notifications'];
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection).count().get();
      health.collections[collection] = snapshot.data().count;
    }

    // Get active subscriptions count
    const activeSubsSnapshot = await db.collection('users')
      .where('subscription.status', '==', 'active')
      .count()
      .get();
    
    health.collections['activeSubscriptions'] = activeSubsSnapshot.data().count;

    return health;
  } catch (error) {
    console.error('Error getting system health:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get system health');
  }
});

/**
 * Admin: Update User Limits
 * Previously: /api/admin/update-limit
 */
export const updateUserLimit = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { userId, featureId, newLimit } = data;

  try {
    // Update user's feature limit
    await db.collection('users').doc(userId).update({
      [`featureLimits.${featureId}`]: newLimit,
      [`featureLimitsUpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log admin action
    await db.collection('adminActions').add({
      action: 'updateLimit',
      targetUserId: userId,
      featureId,
      newLimit,
      performedBy: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Limit updated successfully' };
  } catch (error) {
    console.error('Error updating user limit:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update limit');
  }
});

/**
 * Create Portal Session for Stripe Customer Portal
 * Previously: /api/create-portal-session
 */
export const createPortalSession = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  // Initialize Stripe if not already done
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  try {
    // Get user's stripe customer ID
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const stripeCustomerId = userData?.subscription?.stripeCustomerId || userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new functions.https.HttpsError('not-found', 'No Stripe customer found');
    }

    // Create the portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doshisensei.com'}/account`,
    });

    return { 
      url: session.url,
      success: true 
    };
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create portal session');
  }
});

/**
 * Create Checkout Session for new subscriptions
 * Migrated from: /api/create-checkout-session
 */
export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { priceId } = data;
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;

  if (!priceId) {
    throw new functions.https.HttpsError('invalid-argument', 'Price ID is required');
  }

  // Initialize Stripe if not already done
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  try {
    // Get or create Stripe customer
    let customer;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const existingCustomerId = userData?.subscription?.stripeCustomerId || userData?.stripeCustomerId;

    if (existingCustomerId) {
      // Retrieve existing customer
      try {
        customer = await stripe.customers.retrieve(existingCustomerId);
        // Update metadata if needed
        if (customer && !customer.deleted) {
          await stripe.customers.update(existingCustomerId, {
            metadata: { firebaseUID: userId }
          });
        }
      } catch (error) {
        console.log('Could not retrieve customer, will create new one');
      }
    }

    // If no customer exists or retrieval failed, create new one
    if (!customer || customer.deleted) {
      // Check if customer exists by email
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        // Update metadata
        await stripe.customers.update(customer.id, {
          metadata: { firebaseUID: userId }
        });
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            firebaseUID: userId,
          },
        });
      }

      // Save customer ID to Firestore (use set with merge in case user doc doesn't exist)
      await db.collection('users').doc(userId).set({
        subscription: {
          stripeCustomerId: customer.id
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doshisensei.com'}/account?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doshisensei.com'}/account?canceled=true`,
      metadata: {
        firebaseUID: userId,
      },
      subscription_data: {
        metadata: {
          firebaseUID: userId,
        },
      },
    });

    return { 
      sessionUrl: session.url,
      sessionId: session.id,
      success: true 
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide specific error messages
    let errorMessage = 'Failed to create checkout session';
    if (error instanceof Error) {
      if (error.message.includes('No such price')) {
        errorMessage = 'Invalid price ID';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please try again later.';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});