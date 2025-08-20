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
exports.cleanupNotificationLogs = exports.sendStreakReminders = exports.sendReviewReminders = exports.sendStudyReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const messaging = admin.messaging();
/**
 * Send notification to a user
 */
async function sendNotification(token, notification) {
    var _a, _b, _c, _d, _e;
    try {
        await messaging.send({
            token,
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: notification.data || {},
            webpush: {
                fcmOptions: {
                    link: ((_a = notification.data) === null || _a === void 0 ? void 0 : _a.url) || 'https://doshisensei.com',
                },
                notification: {
                    icon: '/doshi.png',
                    badge: '/badge-72x72.png',
                    requireInteraction: false,
                },
            },
        });
        // Log successful send
        await db.collection('notificationLogs').add({
            userId: (_b = notification.data) === null || _b === void 0 ? void 0 : _b.userId,
            type: ((_c = notification.data) === null || _c === void 0 ? void 0 : _c.type) || 'unknown',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'sent',
            title: notification.title,
        });
    }
    catch (error) {
        v2_1.logger.error('Failed to send notification:', error);
        // Log failed send
        await db.collection('notificationLogs').add({
            userId: (_d = notification.data) === null || _d === void 0 ? void 0 : _d.userId,
            type: ((_e = notification.data) === null || _e === void 0 ? void 0 : _e.type) || 'unknown',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        // If token is invalid, remove it
        if (error instanceof Error && error.message.includes('registration-token-not-registered')) {
            await db.collection('notificationPreferences')
                .where('fcmToken', '==', token)
                .get()
                .then(snapshot => {
                snapshot.forEach(doc => {
                    doc.ref.update({ fcmToken: admin.firestore.FieldValue.delete() });
                });
            });
        }
    }
}
/**
 * Check if current time is within user's quiet hours
 */
function isInQuietHours(preferences, userTime) {
    var _a;
    if (!((_a = preferences.quietHours) === null || _a === void 0 ? void 0 : _a.enabled)) {
        return false;
    }
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
        return currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
    }
    return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
}
/**
 * Convert UTC time to user's timezone
 */
function getUserTime(timezone) {
    const now = new Date();
    const userTimeString = now.toLocaleString('en-US', { timeZone: timezone });
    return new Date(userTimeString);
}
/**
 * Study reminder function - runs every hour
 */
exports.sendStudyReminders = (0, scheduler_1.onSchedule)('0 * * * *', async (event) => {
    var _a, _b, _c;
    v2_1.logger.info('Running study reminders job');
    try {
        // Get all users with study reminders enabled
        const prefsSnapshot = await db.collection('notificationPreferences')
            .where('enabled', '==', true)
            .where('preferences.studyReminders.enabled', '==', true)
            .get();
        v2_1.logger.info(`Found ${prefsSnapshot.size} users with study reminders enabled`);
        const promises = [];
        for (const doc of prefsSnapshot.docs) {
            const prefs = doc.data();
            if (!prefs.fcmToken) {
                continue;
            }
            // Check user's local time
            const userTime = getUserTime(prefs.timezone);
            const currentHour = userTime.getHours();
            const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
            // Check if current hour matches any reminder time
            if (!((_a = prefs.preferences.studyReminders) === null || _a === void 0 ? void 0 : _a.times.includes(currentTime))) {
                continue;
            }
            // Check quiet hours
            if (isInQuietHours(prefs, userTime)) {
                v2_1.logger.info(`Skipping reminder for user ${prefs.userId} - quiet hours`);
                continue;
            }
            // Check if user has already studied today
            const statsDoc = await db.collection('userStats').doc(prefs.userId).get();
            const stats = statsDoc.data();
            if ((stats === null || stats === void 0 ? void 0 : stats.hasStudiedToday) && ((_b = prefs.preferences.studyReminders) === null || _b === void 0 ? void 0 : _b.smartScheduling)) {
                v2_1.logger.info(`Skipping reminder for user ${prefs.userId} - already studied today`);
                continue;
            }
            // Get user's name for personalization
            const userDoc = await db.collection('users').doc(prefs.userId).get();
            const userName = ((_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.displayName) || 'Student';
            // Send reminder
            promises.push(sendNotification(prefs.fcmToken, {
                title: `Good ${currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'}, ${userName}-san! 📚`,
                body: (stats === null || stats === void 0 ? void 0 : stats.currentStreak)
                    ? `Ready for today's practice? You're on a ${stats.currentStreak}-day streak!`
                    : `Ready to start your Japanese practice?`,
                data: {
                    type: 'study_reminder',
                    url: '/practice',
                    userId: prefs.userId,
                },
            }));
        }
        await Promise.all(promises);
        v2_1.logger.info(`Sent ${promises.length} study reminders`);
    }
    catch (error) {
        v2_1.logger.error('Error in study reminders job:', error);
    }
});
/**
 * Review reminder function - runs every 30 minutes
 */
exports.sendReviewReminders = (0, scheduler_1.onSchedule)('*/30 * * * *', async (event) => {
    v2_1.logger.info('Running review reminders job');
    try {
        // Get all users with review reminders enabled
        const prefsSnapshot = await db.collection('notificationPreferences')
            .where('enabled', '==', true)
            .where('preferences.reviewReminders.enabled', '==', true)
            .get();
        const promises = [];
        for (const doc of prefsSnapshot.docs) {
            const prefs = doc.data();
            if (!prefs.fcmToken) {
                continue;
            }
            // Check quiet hours
            const userTime = getUserTime(prefs.timezone);
            if (isInQuietHours(prefs, userTime)) {
                continue;
            }
            // Check for due reviews
            const reviewsSnapshot = await db.collection('reviews')
                .where('userId', '==', prefs.userId)
                .where('nextReviewDate', '<=', admin.firestore.Timestamp.now())
                .limit(1)
                .get();
            if (reviewsSnapshot.empty) {
                continue;
            }
            // Count total due reviews
            const totalDueSnapshot = await db.collection('reviews')
                .where('userId', '==', prefs.userId)
                .where('nextReviewDate', '<=', admin.firestore.Timestamp.now())
                .count()
                .get();
            const dueCount = totalDueSnapshot.data().count;
            // Check if we've already sent a reminder recently (within 4 hours)
            const recentLogsSnapshot = await db.collection('notificationLogs')
                .where('userId', '==', prefs.userId)
                .where('type', '==', 'review_reminder')
                .where('status', '==', 'sent')
                .where('sentAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)))
                .limit(1)
                .get();
            if (!recentLogsSnapshot.empty) {
                continue;
            }
            // Send reminder
            promises.push(sendNotification(prefs.fcmToken, {
                title: `${dueCount} items ready for review 📝`,
                body: dueCount > 10
                    ? `Quick 5-minute session to maintain your progress`
                    : `Review now to strengthen your memory`,
                data: {
                    type: 'review_reminder',
                    url: '/drill/flashcards',
                    userId: prefs.userId,
                    dueCount: dueCount.toString(),
                },
            }));
        }
        await Promise.all(promises);
        v2_1.logger.info(`Sent ${promises.length} review reminders`);
    }
    catch (error) {
        v2_1.logger.error('Error in review reminders job:', error);
    }
});
/**
 * Streak reminder function - runs daily at multiple times
 */
exports.sendStreakReminders = (0, scheduler_1.onSchedule)('0 20 * * *', async (event) => {
    var _a;
    v2_1.logger.info('Running streak reminders job');
    try {
        // Get all users with streak reminders enabled
        const prefsSnapshot = await db.collection('notificationPreferences')
            .where('enabled', '==', true)
            .where('preferences.streakReminders.enabled', '==', true)
            .get();
        const promises = [];
        for (const doc of prefsSnapshot.docs) {
            const prefs = doc.data();
            if (!prefs.fcmToken) {
                continue;
            }
            // Check user's local time
            const userTime = getUserTime(prefs.timezone);
            const currentHour = userTime.getHours();
            const [targetHour] = (((_a = prefs.preferences.streakReminders) === null || _a === void 0 ? void 0 : _a.time) || '20:00').split(':').map(Number);
            // Only send if it's the right hour in user's timezone
            if (currentHour !== targetHour) {
                continue;
            }
            // Check quiet hours
            if (isInQuietHours(prefs, userTime)) {
                continue;
            }
            // Check if user has studied today
            const statsDoc = await db.collection('userStats').doc(prefs.userId).get();
            const stats = statsDoc.data();
            if (stats === null || stats === void 0 ? void 0 : stats.hasStudiedToday) {
                continue;
            }
            const currentStreak = (stats === null || stats === void 0 ? void 0 : stats.currentStreak) || 0;
            // Only send if user has a streak to maintain
            if (currentStreak === 0) {
                continue;
            }
            // Send reminder
            promises.push(sendNotification(prefs.fcmToken, {
                title: `Keep your ${currentStreak}-day streak alive! 🔥`,
                body: `Just 5 minutes to maintain your amazing progress`,
                data: {
                    type: 'streak_reminder',
                    url: '/practice',
                    userId: prefs.userId,
                    streak: currentStreak.toString(),
                },
            }));
        }
        await Promise.all(promises);
        v2_1.logger.info(`Sent ${promises.length} streak reminders`);
    }
    catch (error) {
        v2_1.logger.error('Error in streak reminders job:', error);
    }
});
/**
 * Clean up old notification logs (keep 30 days)
 */
exports.cleanupNotificationLogs = (0, scheduler_1.onSchedule)('0 0 * * 0', async (event) => {
    v2_1.logger.info('Running notification logs cleanup');
    try {
        const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const oldLogsSnapshot = await db.collection('notificationLogs')
            .where('sentAt', '<', thirtyDaysAgo)
            .limit(500) // Process in batches
            .get();
        const batch = db.batch();
        oldLogsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        v2_1.logger.info(`Deleted ${oldLogsSnapshot.size} old notification logs`);
    }
    catch (error) {
        v2_1.logger.error('Error in cleanup job:', error);
    }
});
/**
 * Admin function to send test notification
 * This is handled via the admin API endpoint instead of a scheduled function
 * See: /src/app/api/notifications/admin-test/route.ts
 */ 
//# sourceMappingURL=notifications.js.map