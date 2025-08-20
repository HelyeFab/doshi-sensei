import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// Types
interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  fcmToken?: string;
  timezone: string;
  preferences: {
    studyReminders?: {
      enabled: boolean;
      times: string[];
      smartScheduling: boolean;
    };
    reviewReminders?: {
      enabled: boolean;
      advanceNotice: number;
    };
    streakReminders?: {
      enabled: boolean;
      time: string;
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface UserStats {
  userId: string;
  lastActiveDate: admin.firestore.Timestamp;
  currentStreak: number;
  totalDaysActive: number;
  hasStudiedToday: boolean;
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Send notification to a user
 */
async function sendNotification(
  token: string,
  notification: {
    title: string;
    body: string;
    data?: { [key: string]: string };
  }
): Promise<void> {
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
          link: notification.data?.url || 'https://doshisensei.com',
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
      userId: notification.data?.userId,
      type: notification.data?.type || 'unknown',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      title: notification.title,
    });
  } catch (error) {
    logger.error('Failed to send notification:', error);
    
    // Log failed send
    await db.collection('notificationLogs').add({
      userId: notification.data?.userId,
      type: notification.data?.type || 'unknown',
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
function isInQuietHours(preferences: NotificationPreferences, userTime: Date): boolean {
  if (!preferences.quietHours?.enabled) {
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
function getUserTime(timezone: string): Date {
  const now = new Date();
  const userTimeString = now.toLocaleString('en-US', { timeZone: timezone });
  return new Date(userTimeString);
}

/**
 * Study reminder function - runs every hour
 */
export const sendStudyReminders = onSchedule('0 * * * *', async (event) => {
  logger.info('Running study reminders job');
  
  try {
    // Get all users with study reminders enabled
    const prefsSnapshot = await db.collection('notificationPreferences')
      .where('enabled', '==', true)
      .where('preferences.studyReminders.enabled', '==', true)
      .get();
    
    logger.info(`Found ${prefsSnapshot.size} users with study reminders enabled`);
    
    const promises: Promise<void>[] = [];
    
    for (const doc of prefsSnapshot.docs) {
      const prefs = doc.data() as NotificationPreferences;
      
      if (!prefs.fcmToken) {
        continue;
      }
      
      // Check user's local time
      const userTime = getUserTime(prefs.timezone);
      const currentHour = userTime.getHours();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
      
      // Check if current hour matches any reminder time
      if (!prefs.preferences.studyReminders?.times.includes(currentTime)) {
        continue;
      }
      
      // Check quiet hours
      if (isInQuietHours(prefs, userTime)) {
        logger.info(`Skipping reminder for user ${prefs.userId} - quiet hours`);
        continue;
      }
      
      // Check if user has already studied today
      const statsDoc = await db.collection('userStats').doc(prefs.userId).get();
      const stats = statsDoc.data() as UserStats | undefined;
      
      if (stats?.hasStudiedToday && prefs.preferences.studyReminders?.smartScheduling) {
        logger.info(`Skipping reminder for user ${prefs.userId} - already studied today`);
        continue;
      }
      
      // Get user's name for personalization
      const userDoc = await db.collection('users').doc(prefs.userId).get();
      const userName = userDoc.data()?.displayName || 'Student';
      
      // Send reminder
      promises.push(
        sendNotification(prefs.fcmToken, {
          title: `Good ${currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'}, ${userName}-san! 📚`,
          body: stats?.currentStreak 
            ? `Ready for today's practice? You're on a ${stats.currentStreak}-day streak!`
            : `Ready to start your Japanese practice?`,
          data: {
            type: 'study_reminder',
            url: '/practice',
            userId: prefs.userId,
          },
        })
      );
    }
    
    await Promise.all(promises);
    logger.info(`Sent ${promises.length} study reminders`);
  } catch (error) {
    logger.error('Error in study reminders job:', error);
  }
});

/**
 * Review reminder function - runs every 30 minutes
 */
export const sendReviewReminders = onSchedule('*/30 * * * *', async (event) => {
  logger.info('Running review reminders job');
  
  try {
    // Get all users with review reminders enabled
    const prefsSnapshot = await db.collection('notificationPreferences')
      .where('enabled', '==', true)
      .where('preferences.reviewReminders.enabled', '==', true)
      .get();
    
    const promises: Promise<void>[] = [];
    
    for (const doc of prefsSnapshot.docs) {
      const prefs = doc.data() as NotificationPreferences;
      
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
      promises.push(
        sendNotification(prefs.fcmToken, {
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
        })
      );
    }
    
    await Promise.all(promises);
    logger.info(`Sent ${promises.length} review reminders`);
  } catch (error) {
    logger.error('Error in review reminders job:', error);
  }
});

/**
 * Streak reminder function - runs daily at multiple times
 */
export const sendStreakReminders = onSchedule('0 20 * * *', async (event) => {
  logger.info('Running streak reminders job');
  
  try {
    // Get all users with streak reminders enabled
    const prefsSnapshot = await db.collection('notificationPreferences')
      .where('enabled', '==', true)
      .where('preferences.streakReminders.enabled', '==', true)
      .get();
    
    const promises: Promise<void>[] = [];
    
    for (const doc of prefsSnapshot.docs) {
      const prefs = doc.data() as NotificationPreferences;
      
      if (!prefs.fcmToken) {
        continue;
      }
      
      // Check user's local time
      const userTime = getUserTime(prefs.timezone);
      const currentHour = userTime.getHours();
      const [targetHour] = (prefs.preferences.streakReminders?.time || '20:00').split(':').map(Number);
      
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
      const stats = statsDoc.data() as UserStats | undefined;
      
      if (stats?.hasStudiedToday) {
        continue;
      }
      
      const currentStreak = stats?.currentStreak || 0;
      
      // Only send if user has a streak to maintain
      if (currentStreak === 0) {
        continue;
      }
      
      // Send reminder
      promises.push(
        sendNotification(prefs.fcmToken, {
          title: `Keep your ${currentStreak}-day streak alive! 🔥`,
          body: `Just 5 minutes to maintain your amazing progress`,
          data: {
            type: 'streak_reminder',
            url: '/practice',
            userId: prefs.userId,
            streak: currentStreak.toString(),
          },
        })
      );
    }
    
    await Promise.all(promises);
    logger.info(`Sent ${promises.length} streak reminders`);
  } catch (error) {
    logger.error('Error in streak reminders job:', error);
  }
});

/**
 * Clean up old notification logs (keep 30 days)
 */
export const cleanupNotificationLogs = onSchedule('0 0 * * 0', async (event) => {
  logger.info('Running notification logs cleanup');
  
  try {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const oldLogsSnapshot = await db.collection('notificationLogs')
      .where('sentAt', '<', thirtyDaysAgo)
      .limit(500) // Process in batches
      .get();
    
    const batch = db.batch();
    oldLogsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    logger.info(`Deleted ${oldLogsSnapshot.size} old notification logs`);
  } catch (error) {
    logger.error('Error in cleanup job:', error);
  }
});

/**
 * Admin function to send test notification
 * This is handled via the admin API endpoint instead of a scheduled function
 * See: /src/app/api/notifications/admin-test/route.ts
 */