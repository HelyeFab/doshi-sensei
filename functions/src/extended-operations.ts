import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

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
 * Sync Bugs
 * Previously: /api/bugs/sync
 */
export const syncBugs = functions.https.onCall(async (data: any, context: any) => {
  const { bugs, userId } = data;

  try {
    if (!bugs || !Array.isArray(bugs)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid bugs data');
    }

    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    bugs.forEach(bug => {
      const bugRef = db.collection('bugs').doc(bug.id || db.collection('bugs').doc().id);
      batch.set(bugRef, {
        ...bug,
        userId: userId || context.auth?.uid || 'anonymous',
        syncedAt: timestamp,
        status: bug.status || 'new'
      }, { merge: true });
    });

    await batch.commit();

    return { success: true, syncedCount: bugs.length };
  } catch (error) {
    console.error('Error syncing bugs:', error);
    throw new functions.https.HttpsError('internal', 'Failed to sync bugs');
  }
});

/**
 * Get Textbook Vocabulary
 * Previously: /api/textbook-vocabulary/[textbook]/[lesson]
 */
export const getTextbookVocabulary = functions.https.onCall(async (data: any, context: any) => {
  const { textbook, lesson, userId } = data;

  try {
    // Track access
    if (userId || context.auth?.uid) {
      await db.collection('textbookAccess').add({
        userId: userId || context.auth?.uid,
        textbook,
        lesson,
        accessedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Get vocabulary data
    const vocabDoc = await db.collection('textbookVocabulary')
      .doc(`${textbook}_${lesson}`)
      .get();

    if (!vocabDoc.exists) {
      // Return empty if not found (client will use local data)
      return { vocabulary: [] };
    }

    return {
      vocabulary: vocabDoc.data()?.vocabulary || [],
      textbook,
      lesson
    };
  } catch (error) {
    console.error('Error getting textbook vocabulary:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get vocabulary');
  }
});

/**
 * Create Referral
 * Previously: /api/share/create-referral
 */
export const createReferral = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { referralCode } = data;
  const userId = context.auth.uid;

  try {
    // Check if user already has a referral code
    const existingRef = await db.collection('referrals')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingRef.empty) {
      return {
        success: true,
        referralCode: existingRef.docs[0].data().code,
        existing: true
      };
    }

    // Create new referral code
    const code = referralCode || `REF${userId.substring(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    
    await db.collection('referrals').doc(code).set({
      userId,
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usedCount: 0,
      rewards: []
    });

    return {
      success: true,
      referralCode: code,
      existing: false
    };
  } catch (error) {
    console.error('Error creating referral:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create referral');
  }
});

/**
 * Test Notification
 * Previously: /api/notifications/test
 */
export const testNotification = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      throw new functions.https.HttpsError('failed-precondition', 'No FCM token found');
    }

    // Send test notification
    const message = {
      token: fcmToken,
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from Doshi Sensei!'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    const response = await messaging.send(message);

    // Log notification
    await db.collection('notificationLogs').add({
      userId,
      type: 'test',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: response
    });

    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

/**
 * Track Notification Click
 * Previously: /api/notifications/track-click
 */
export const trackNotificationClick = functions.https.onCall(async (data: any, context: any) => {
  const { notificationId, userId } = data;

  try {
    await db.collection('notificationClicks').add({
      notificationId,
      userId: userId || context.auth?.uid || 'anonymous',
      clickedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update notification log if exists
    if (notificationId) {
      const logRef = db.collection('notificationLogs').doc(notificationId);
      const logDoc = await logRef.get();
      
      if (logDoc.exists) {
        await logRef.update({
          clicked: true,
          clickedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking notification click:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track click');
  }
});

/**
 * Track Notification Dismiss
 * Previously: /api/notifications/track-dismiss
 */
export const trackNotificationDismiss = functions.https.onCall(async (data: any, context: any) => {
  const { notificationId, userId } = data;

  try {
    await db.collection('notificationDismissals').add({
      notificationId,
      userId: userId || context.auth?.uid || 'anonymous',
      dismissedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update notification log if exists
    if (notificationId) {
      const logRef = db.collection('notificationLogs').doc(notificationId);
      const logDoc = await logRef.get();
      
      if (logDoc.exists) {
        await logRef.update({
          dismissed: true,
          dismissedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking notification dismiss:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track dismiss');
  }
});

/**
 * Admin Broadcast Notification
 * Previously: /api/notifications/admin-broadcast
 */
export const adminBroadcast = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { title, body, targetAudience = 'all', data: notificationData } = data;

  try {
    let tokens: string[] = [];
    
    // Get target audience tokens
    if (targetAudience === 'all') {
      const users = await db.collection('users')
        .where('fcmToken', '!=', null)
        .get();
      tokens = users.docs.map(doc => doc.data().fcmToken).filter(Boolean);
    } else if (targetAudience === 'premium') {
      const users = await db.collection('users')
        .where('subscription.status', '==', 'active')
        .where('fcmToken', '!=', null)
        .get();
      tokens = users.docs.map(doc => doc.data().fcmToken).filter(Boolean);
    }

    if (tokens.length === 0) {
      return { success: false, message: 'No tokens found for target audience' };
    }

    // Send multicast message
    const message = {
      notification: { title, body },
      data: notificationData || {},
      tokens
    };

    const response = await messaging.sendEachForMulticast(message);

    // Log broadcast
    await db.collection('broadcasts').add({
      title,
      body,
      targetAudience,
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTargets: tokens.length
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTargets: tokens.length
    };
  } catch (error) {
    console.error('Error sending broadcast:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send broadcast');
  }
});

/**
 * Admin Test Notification
 * Previously: /api/notifications/admin-test
 */
export const adminTestNotification = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { userId, title, body } = data;

  try {
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      throw new functions.https.HttpsError('failed-precondition', 'User has no FCM token');
    }

    // Send test notification
    const message = {
      token: fcmToken,
      notification: {
        title: title || 'Admin Test',
        body: body || 'This is a test notification from admin'
      },
      data: {
        type: 'admin_test',
        sentBy: context.auth.uid,
        timestamp: new Date().toISOString()
      }
    };

    const response = await messaging.send(message);

    // Log notification
    await db.collection('notificationLogs').add({
      userId,
      type: 'admin_test',
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: response
    });

    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending admin test notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

/**
 * Debug YouTube Limits
 * Previously: /api/admin/debug-youtube-limits
 */
export const debugYouTubeLimits = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      limits: {},
      usage: {},
      cache: {}
    };

    // Get YouTube API limits from config
    const configDoc = await db.collection('config').doc('youtube').get();
    debugInfo.limits = configDoc.data()?.limits || {};

    // Get current usage stats
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = await db.collection('apiUsage').doc(`youtube_${today}`).get();
    debugInfo.usage = usageDoc.data() || {};

    // Get cache stats
    const cacheSnapshot = await db.collection('transcriptCache')
      .orderBy('accessCount', 'desc')
      .limit(10)
      .get();
    
    debugInfo.cache = {
      totalCached: cacheSnapshot.size,
      topAccessed: cacheSnapshot.docs.map(doc => ({
        videoId: doc.id,
        accessCount: doc.data().accessCount
      }))
    };

    return debugInfo;
  } catch (error) {
    console.error('Error debugging YouTube limits:', error);
    throw new functions.https.HttpsError('internal', 'Failed to debug YouTube limits');
  }
});

/**
 * Rebuild Config
 * Previously: /api/admin/rebuild-config
 */
export const rebuildConfig = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    // Default configurations
    const defaultConfigs = {
      features: {
        youtube_shadowing: { enabled: true, dailyLimit: 10 },
        textbook_vocabulary: { enabled: true, dailyLimit: 50 },
        stroke_order: { enabled: true, dailyLimit: 20 }
      },
      pricing: {
        monthly: { amount: 999, currency: 'usd' },
        annual: { amount: 9999, currency: 'usd' }
      },
      entitlements: {
        free: { features: ['basic'], limits: { daily: 5 } },
        premium: { features: ['all'], limits: { daily: -1 } }
      }
    };

    const batch = db.batch();
    
    Object.entries(defaultConfigs).forEach(([key, value]) => {
      batch.set(db.collection('config').doc(key), {
        ...value,
        rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
        rebuiltBy: context.auth.uid
      }, { merge: true });
    });

    await batch.commit();

    return { success: true, message: 'Configuration rebuilt successfully' };
  } catch (error) {
    console.error('Error rebuilding config:', error);
    throw new functions.https.HttpsError('internal', 'Failed to rebuild config');
  }
});

/**
 * Reload Entitlement Rules
 * Previously: /api/admin/reload-entitlement-rules
 */
export const reloadEntitlementRules = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    // Clear cache (in a real implementation, this would clear Redis or similar)
    await db.collection('cache').doc('entitlementRules').delete();

    // Reload rules from database
    const rulesDoc = await db.collection('config').doc('entitlements').get();
    const rules = rulesDoc.data() || {};

    // Cache the reloaded rules
    await db.collection('cache').doc('entitlementRules').set({
      rules,
      reloadedAt: admin.firestore.FieldValue.serverTimestamp(),
      reloadedBy: context.auth.uid
    });

    return { success: true, rules, message: 'Entitlement rules reloaded' };
  } catch (error) {
    console.error('Error reloading entitlement rules:', error);
    throw new functions.https.HttpsError('internal', 'Failed to reload rules');
  }
});

/**
 * Test Storage
 * Previously: /api/admin/test-storage
 */
export const testStorage = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const testDoc = {
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      testedBy: context.auth.uid
    };

    // Test write
    const writeRef = await db.collection('storageTests').add(testDoc);
    
    // Test read
    await writeRef.get();
    
    // Test update
    await writeRef.update({ updated: true });
    
    // Test delete
    await writeRef.delete();

    return {
      success: true,
      operations: {
        write: 'success',
        read: 'success',
        update: 'success',
        delete: 'success'
      }
    };
  } catch (error) {
    console.error('Error testing storage:', error);
    throw new functions.https.HttpsError('internal', 'Storage test failed');
  }
});

/**
 * Update Pricing Config
 * Previously: /api/admin/pricing-config
 */
export const updatePricingConfig = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { pricing } = data;

  try {
    await db.collection('config').doc('pricing').set({
      ...pricing,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    });

    return { success: true, message: 'Pricing configuration updated' };
  } catch (error) {
    console.error('Error updating pricing config:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update pricing');
  }
});

/**
 * Manage Entitlements
 * Previously: /api/admin/entitlements-management
 */
export const manageEntitlements = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
  }

  const isAdmin = await verifyAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { action, entitlements } = data;

  try {
    switch (action) {
      case 'update':
        await db.collection('config').doc('entitlements').set({
          ...entitlements,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: context.auth.uid
        });
        return { success: true, message: 'Entitlements updated' };

      case 'get':
        const doc = await db.collection('config').doc('entitlements').get();
        return { success: true, entitlements: doc.data() };

      case 'reset':
        await db.collection('config').doc('entitlements').set({
          free: { features: ['basic'], limits: {} },
          premium: { features: ['all'], limits: {} },
          resetAt: admin.firestore.FieldValue.serverTimestamp(),
          resetBy: context.auth.uid
        });
        return { success: true, message: 'Entitlements reset to defaults' };

      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
    }
  } catch (error) {
    console.error('Error managing entitlements:', error);
    throw new functions.https.HttpsError('internal', 'Failed to manage entitlements');
  }
});