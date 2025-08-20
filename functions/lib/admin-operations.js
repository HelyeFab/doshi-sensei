"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPortalSession = exports.updateUserLimit = exports.getSystemHealth = exports.adminDeleteUser = exports.getShareStats = exports.trackShare = exports.updateNotificationPreferences = exports.registerNotificationToken = exports.manageBookmarks = exports.trackArticleView = exports.deleteAccount = exports.cancelSubscription = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Get initialized admin instance from index.ts
const db = admin.firestore();
const auth = admin.auth();
// Helper to verify admin status
async function verifyAdmin(uid) {
    var _a;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists && ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin) === true;
    }
    catch (error) {
        console.error('Error verifying admin:', error);
        return false;
    }
}
/**
 * Cancel Subscription
 * Previously: /api/cancel-subscription
 */
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
    var _a;
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
        const currentSub = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.subscription;
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
            previousStatus: currentSub === null || currentSub === void 0 ? void 0 : currentSub.status,
        });
        return { success: true, message: 'Subscription canceled successfully' };
    }
    catch (error) {
        console.error('Error canceling subscription:', error);
        throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
    }
});
/**
 * Delete User Account
 * Previously: /api/auth/delete-account
 */
exports.deleteAccount = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error deleting account:', error);
        throw new functions.https.HttpsError('internal', 'Failed to delete account');
    }
});
/**
 * Track Article View
 * Previously: /api/articles/view
 */
exports.trackArticleView = functions.https.onCall(async (data, context) => {
    var _a;
    const { articleId, userId } = data;
    try {
        // Update view count
        await db.collection('articles').doc(articleId).update({
            viewCount: admin.firestore.FieldValue.increment(1),
            lastViewed: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Track user view if authenticated
        if (userId || ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
            const uid = userId || context.auth.uid;
            await db.collection('userArticleViews').add({
                userId: uid,
                articleId,
                viewedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error tracking article view:', error);
        throw new functions.https.HttpsError('internal', 'Failed to track view');
    }
});
/**
 * Manage Bookmarks
 * Previously: /api/articles/bookmarks
 */
exports.manageBookmarks = functions.https.onCall(async (data, context) => {
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
                    bookmarks: bookmarks.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())))
                };
            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
        }
    }
    catch (error) {
        console.error('Error managing bookmarks:', error);
        throw new functions.https.HttpsError('internal', 'Failed to manage bookmarks');
    }
});
/**
 * Register Notification Token
 * Previously: /api/notifications/register-token
 */
exports.registerNotificationToken = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error registering notification token:', error);
        throw new functions.https.HttpsError('internal', 'Failed to register token');
    }
});
/**
 * Update Notification Preferences
 * Previously: /api/notifications/preferences
 */
exports.updateNotificationPreferences = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error updating notification preferences:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update preferences');
    }
});
/**
 * Track Share
 * Previously: /api/share/track
 */
exports.trackShare = functions.https.onCall(async (data, context) => {
    var _a;
    const { platform, content, userId } = data;
    try {
        await db.collection('shares').add({
            platform,
            content,
            userId: userId || ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error tracking share:', error);
        throw new functions.https.HttpsError('internal', 'Failed to track share');
    }
});
/**
 * Get Share Stats
 * Previously: /api/share/stats/[userId]
 */
exports.getShareStats = functions.https.onCall(async (data, context) => {
    const { userId } = data;
    try {
        const sharesSnapshot = await db.collection('shares')
            .where('userId', '==', userId)
            .get();
        const stats = {
            totalShares: sharesSnapshot.size,
            platforms: {},
        };
        sharesSnapshot.forEach((doc) => {
            const platform = doc.data().platform;
            stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
        });
        return stats;
    }
    catch (error) {
        console.error('Error getting share stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get stats');
    }
});
/**
 * Admin: Delete User (with elevated permissions)
 * Previously: /api/admin/delete-user
 */
exports.adminDeleteUser = functions.https.onCall(async (data, context) => {
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
        }
        catch (authError) {
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
    }
    catch (error) {
        console.error('Error in admin delete user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to delete user');
    }
});
/**
 * Admin: Get System Health
 * Previously: /api/admin/system-health/*
 */
exports.getSystemHealth = functions.https.onCall(async (data, context) => {
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
            collections: {},
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
    }
    catch (error) {
        console.error('Error getting system health:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get system health');
    }
});
/**
 * Admin: Update User Limits
 * Previously: /api/admin/update-limit
 */
exports.updateUserLimit = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error updating user limit:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update limit');
    }
});
/**
 * Create Portal Session for Stripe Customer Portal
 * Previously: /api/create-portal-session
 */
exports.createPortalSession = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    try {
        // Get user's stripe customer ID
        const userDoc = await db.collection('users').doc(userId).get();
        const stripeCustomerId = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
        if (!stripeCustomerId) {
            throw new functions.https.HttpsError('not-found', 'No Stripe customer found');
        }
        // This will need Stripe initialization - we'll handle this in the main function
        // For now, return the customer ID so Netlify can create the session
        return {
            customerId: stripeCustomerId,
            message: 'Use this customer ID to create portal session'
        };
    }
    catch (error) {
        console.error('Error creating portal session:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create portal session');
    }
});
//# sourceMappingURL=admin-operations.js.map