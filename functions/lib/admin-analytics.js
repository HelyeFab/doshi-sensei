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
exports.getArticleStats = exports.getSubscriptionHealth = exports.getSystemHealthConsistency = exports.updateMaintenanceStatus = exports.getUserEntitlements = exports.fixSubscriptions = exports.fixEntitlements = exports.cleanupSubscriptions = exports.getSubscriptionAnalytics = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
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
 * Get Subscription Analytics
 * Previously: /api/admin/subscription-analytics
 */
exports.getSubscriptionAnalytics = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const usersSnapshot = await db.collection('users').get();
        const analytics = {
            total: usersSnapshot.size,
            byStatus: {},
            byPlan: {},
            revenue: {
                monthly: 0,
                annual: 0,
                total: 0
            }
        };
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const subscription = data.subscription;
            if (subscription) {
                // Count by status
                analytics.byStatus[subscription.status] = (analytics.byStatus[subscription.status] || 0) + 1;
                // Count by plan
                analytics.byPlan[subscription.plan || 'free'] = (analytics.byPlan[subscription.plan || 'free'] || 0) + 1;
                // Calculate revenue
                if (subscription.status === 'active' && subscription.amount) {
                    if (subscription.interval === 'month') {
                        analytics.revenue.monthly += subscription.amount / 100;
                    }
                    else if (subscription.interval === 'year') {
                        analytics.revenue.annual += subscription.amount / 100;
                    }
                    analytics.revenue.total += subscription.amount / 100;
                }
            }
        });
        return analytics;
    }
    catch (error) {
        console.error('Error getting subscription analytics:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get analytics');
    }
});
/**
 * Cleanup Subscriptions
 * Previously: /api/admin/cleanup-subscriptions
 */
exports.cleanupSubscriptions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const { dryRun = true } = data;
        const batch = db.batch();
        let cleanupCount = 0;
        // Find subscriptions that need cleanup
        const expiredSubs = await db.collection('users')
            .where('subscription.status', '==', 'active')
            .where('subscription.current_period_end', '<', new Date())
            .get();
        expiredSubs.forEach(doc => {
            if (!dryRun) {
                batch.update(doc.ref, {
                    'subscription.status': 'expired',
                    'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp()
                });
            }
            cleanupCount++;
        });
        if (!dryRun) {
            await batch.commit();
        }
        return {
            success: true,
            cleanupCount,
            dryRun,
            message: dryRun ? `Would clean up ${cleanupCount} subscriptions` : `Cleaned up ${cleanupCount} subscriptions`
        };
    }
    catch (error) {
        console.error('Error cleaning up subscriptions:', error);
        throw new functions.https.HttpsError('internal', 'Failed to cleanup subscriptions');
    }
});
/**
 * Fix Entitlements
 * Previously: /api/admin/fix-entitlements
 */
exports.fixEntitlements = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const batch = db.batch();
        let fixedCount = 0;
        const users = await db.collection('users').get();
        users.forEach(doc => {
            const userData = doc.data();
            const subscription = userData.subscription;
            // Determine correct entitlements based on subscription
            let entitlements = {
                tier: 'free',
                features: ['basic_features'],
                limits: {
                    daily_lessons: 3,
                    saved_words: 100
                }
            };
            if ((subscription === null || subscription === void 0 ? void 0 : subscription.status) === 'active') {
                if (subscription.plan === 'premium' || subscription.plan === 'pro') {
                    entitlements = {
                        tier: 'premium',
                        features: ['all_features', 'unlimited_access', 'priority_support'],
                        limits: {
                            daily_lessons: -1, // unlimited
                            saved_words: -1
                        }
                    };
                }
                else if (subscription.plan === 'plus') {
                    entitlements = {
                        tier: 'plus',
                        features: ['extended_features', 'increased_limits'],
                        limits: {
                            daily_lessons: 10,
                            saved_words: 1000
                        }
                    };
                }
            }
            batch.update(doc.ref, {
                entitlements,
                entitlementsUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            fixedCount++;
        });
        await batch.commit();
        return {
            success: true,
            fixedCount,
            message: `Fixed entitlements for ${fixedCount} users`
        };
    }
    catch (error) {
        console.error('Error fixing entitlements:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fix entitlements');
    }
});
/**
 * Fix Subscriptions
 * Previously: /api/admin/fix-subscriptions
 */
exports.fixSubscriptions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const { userId, updates } = data;
        if (userId) {
            // Fix specific user
            await db.collection('users').doc(userId).update({
                subscription: updates,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, message: `Fixed subscription for user ${userId}` };
        }
        else {
            // Fix all broken subscriptions
            const batch = db.batch();
            let fixedCount = 0;
            const brokenSubs = await db.collection('users')
                .where('subscription.status', '==', null)
                .get();
            brokenSubs.forEach(doc => {
                batch.update(doc.ref, {
                    'subscription.status': 'free',
                    'subscription.plan': 'free',
                    'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp()
                });
                fixedCount++;
            });
            await batch.commit();
            return { success: true, fixedCount, message: `Fixed ${fixedCount} broken subscriptions` };
        }
    }
    catch (error) {
        console.error('Error fixing subscriptions:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fix subscriptions');
    }
});
/**
 * Get User Entitlements
 * Previously: /api/admin/user-entitlements
 */
exports.getUserEntitlements = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId } = data;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        return {
            userId,
            subscription: userData === null || userData === void 0 ? void 0 : userData.subscription,
            entitlements: userData === null || userData === void 0 ? void 0 : userData.entitlements,
            featureLimits: userData === null || userData === void 0 ? void 0 : userData.featureLimits,
            createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
            lastActive: userData === null || userData === void 0 ? void 0 : userData.lastActive
        };
    }
    catch (error) {
        console.error('Error getting user entitlements:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get user entitlements');
    }
});
/**
 * Update Maintenance Status
 * Previously: /api/admin/maintenance-status
 */
exports.updateMaintenanceStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const { enabled, message, estimatedEndTime } = data;
    try {
        await db.collection('system').doc('maintenance').set({
            enabled,
            message,
            estimatedEndTime,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid
        });
        return { success: true, message: 'Maintenance status updated' };
    }
    catch (error) {
        console.error('Error updating maintenance status:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update maintenance status');
    }
});
/**
 * Get System Health Consistency
 * Previously: /api/admin/system-health/consistency
 */
exports.getSystemHealthConsistency = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const issues = [];
        // Check for users without subscriptions
        const usersWithoutSubs = await db.collection('users')
            .where('subscription', '==', null)
            .count()
            .get();
        if (usersWithoutSubs.data().count > 0) {
            issues.push({
                type: 'missing_subscription',
                count: usersWithoutSubs.data().count,
                severity: 'warning'
            });
        }
        // Check for expired subscriptions still marked as active
        const expiredActive = await db.collection('users')
            .where('subscription.status', '==', 'active')
            .where('subscription.current_period_end', '<', new Date())
            .count()
            .get();
        if (expiredActive.data().count > 0) {
            issues.push({
                type: 'expired_active_subscriptions',
                count: expiredActive.data().count,
                severity: 'error'
            });
        }
        // Check for mismatched entitlements
        const users = await db.collection('users').limit(100).get();
        let mismatchCount = 0;
        users.forEach(doc => {
            var _a, _b, _c;
            const data = doc.data();
            if (((_a = data.subscription) === null || _a === void 0 ? void 0 : _a.status) === 'active' && ((_b = data.subscription) === null || _b === void 0 ? void 0 : _b.plan) === 'premium' &&
                ((_c = data.entitlements) === null || _c === void 0 ? void 0 : _c.tier) !== 'premium') {
                mismatchCount++;
            }
        });
        if (mismatchCount > 0) {
            issues.push({
                type: 'entitlement_mismatch',
                count: mismatchCount,
                severity: 'warning'
            });
        }
        return {
            healthy: issues.length === 0,
            issues,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error checking system consistency:', error);
        throw new functions.https.HttpsError('internal', 'Failed to check consistency');
    }
});
/**
 * Get Subscription Health
 * Previously: /api/admin/system-health/subscriptions
 */
exports.getSubscriptionHealth = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const stats = {
            total: 0,
            active: 0,
            canceled: 0,
            expired: 0,
            free: 0,
            premium: 0,
            revenue: {
                mrr: 0, // Monthly Recurring Revenue
                arr: 0 // Annual Recurring Revenue
            }
        };
        const users = await db.collection('users').get();
        users.forEach(doc => {
            const data = doc.data();
            const sub = data.subscription;
            stats.total++;
            if (!sub || sub.status === 'free') {
                stats.free++;
            }
            else if (sub.status === 'active') {
                stats.active++;
                if (sub.plan === 'premium' || sub.plan === 'pro') {
                    stats.premium++;
                }
                // Calculate revenue
                if (sub.amount) {
                    const amount = sub.amount / 100; // Convert from cents
                    if (sub.interval === 'month') {
                        stats.revenue.mrr += amount;
                        stats.revenue.arr += amount * 12;
                    }
                    else if (sub.interval === 'year') {
                        stats.revenue.arr += amount;
                        stats.revenue.mrr += amount / 12;
                    }
                }
            }
            else if (sub.status === 'canceled') {
                stats.canceled++;
            }
            else if (sub.status === 'expired') {
                stats.expired++;
            }
        });
        return {
            stats,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting subscription health:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get subscription health');
    }
});
/**
 * Get Article Stats
 * Previously: /api/admin/articles/stats
 */
exports.getArticleStats = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Admin authentication required');
    }
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        const articlesSnapshot = await db.collection('articles').get();
        const viewsSnapshot = await db.collection('userArticleViews').get();
        const bookmarksSnapshot = await db.collection('bookmarks').get();
        const stats = {
            totalArticles: articlesSnapshot.size,
            totalViews: viewsSnapshot.size,
            totalBookmarks: bookmarksSnapshot.size,
            topArticles: [],
            recentViews: []
        };
        // Get top 10 most viewed articles
        const articleViews = {};
        viewsSnapshot.forEach(doc => {
            const data = doc.data();
            articleViews[data.articleId] = (articleViews[data.articleId] || 0) + 1;
        });
        const sortedArticles = Object.entries(articleViews)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        stats.topArticles = sortedArticles.map(([articleId, views]) => ({
            articleId,
            views
        }));
        return stats;
    }
    catch (error) {
        console.error('Error getting article stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get article stats');
    }
});
//# sourceMappingURL=admin-analytics.js.map