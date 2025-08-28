import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { headers } from 'next/headers';
import { verifyIdToken } from '@/lib/firebase-admin-safe';

export async function GET(request: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const headersList = headers();
    const authorization = headersList.get('authorization');
    
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    if (authorization?.startsWith('Bearer ')) {
      try {
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || null;
      } catch (error) {
        console.error('Failed to verify token:', error);
      }
    }
    
    // If no auth header, try to get from cookies or session
    if (!userId) {
      // For now, we'll return a message to authenticate
      return NextResponse.json({
        error: 'Please provide authentication',
        message: 'Add Authorization header with Bearer token or ensure you are logged in',
        status: {
          hasUser: false,
          hasPreferences: false,
          hasFCMToken: false,
          notificationsEnabled: false,
          lastNotificationSent: null,
          reviewsAvailable: 0,
          recentStudyItems: 0,
          errors: ['Authentication required - please log in first']
        }
      });
    }
    const status = {
      hasUser: true,
      userId: userId,
      userEmail: userEmail,
      hasPreferences: false,
      hasFCMToken: false,
      notificationsEnabled: false,
      preferences: null as any,
      lastNotificationSent: null as string | null,
      reviewsAvailable: 0,
      recentStudyItems: 0,
      userStats: null as any,
      errors: [] as string[]
    };

    // Check notification preferences
    try {
      const prefsRef = doc(db, 'notificationPreferences', userId);
      const prefsSnap = await getDoc(prefsRef);
      
      if (prefsSnap.exists()) {
        const data = prefsSnap.data();
        status.hasPreferences = true;
        status.hasFCMToken = !!data.fcmToken;
        status.notificationsEnabled = data.enabled || false;
        status.preferences = {
          enabled: data.enabled,
          hasFCMToken: !!data.fcmToken,
          timezone: data.timezone,
          studyReminders: data.preferences?.studyReminders,
          reviewReminders: data.preferences?.reviewReminders,
          streakReminders: data.preferences?.streakReminders,
          quietHours: data.quietHours,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        };
        
        if (!data.fcmToken) {
          status.errors.push('FCM token not registered - push notifications won\'t work');
        }
      } else {
        status.errors.push('No notification preferences found - need to enable notifications');
      }
    } catch (error) {
      status.errors.push(`Error fetching preferences: ${error}`);
    }

    // Check for review items in various possible collections
    const reviewCollections = [
      'reviews',
      'reviewItems', 
      'unifiedReviews',
      `users/${userId}/reviews`,
      `users/${userId}/reviewItems`
    ];

    for (const collectionPath of reviewCollections) {
      try {
        let reviewQuery;
        if (collectionPath.includes('/')) {
          // Subcollection
          const parts = collectionPath.split('/');
          reviewQuery = query(
            collection(db, parts[0], parts[1], parts[2]),
            limit(10)
          );
        } else {
          // Top-level collection
          reviewQuery = query(
            collection(db, collectionPath),
            where('userId', '==', userId),
            limit(10)
          );
        }
        
        const reviewSnap = await getDocs(reviewQuery);
        if (!reviewSnap.empty) {
          status.reviewsAvailable += reviewSnap.size;
        }
      } catch (error) {
        // Collection might not exist, that's ok
      }
    }

    // Check user stats for recent activity
    try {
      const statsRef = doc(db, 'userStats', userId);
      const statsSnap = await getDoc(statsRef);
      
      if (statsSnap.exists()) {
        const stats = statsSnap.data();
        status.userStats = {
          lastActiveDate: stats.lastActiveDate?.toDate?.()?.toISOString() || null,
          hasStudiedToday: stats.hasStudiedToday || false,
          currentStreak: stats.currentStreak || 0,
          totalKanjiLearned: stats.totalKanjiLearned || 0,
          totalWordsLearned: stats.totalWordsLearned || 0,
          learnedKanjiSet: stats.learnedKanjiSet?.slice?.(-5) || [],
          learnedWordsSet: stats.learnedWordsSet?.slice?.(-5) || []
        };
        
        // Count recent items
        status.recentStudyItems = 
          (stats.learnedKanjiSet?.length || 0) + 
          (stats.learnedWordsSet?.length || 0);
      } else {
        status.errors.push('No user stats found - tracking might not be working');
      }
    } catch (error) {
      status.errors.push(`Error fetching user stats: ${error}`);
    }

    // Check notification logs
    try {
      const logsQuery = query(
        collection(db, 'notificationLogs'),
        where('userId', '==', userId),
        orderBy('sentAt', 'desc'),
        limit(1)
      );
      
      const logsSnap = await getDocs(logsQuery);
      if (!logsSnap.empty) {
        const lastLog = logsSnap.docs[0].data();
        status.lastNotificationSent = lastLog.sentAt?.toDate?.()?.toISOString() || null;
      }
    } catch (error) {
      // Logs collection might not exist
    }

    // Check local storage for recent study items
    const localStorageCheck = {
      hasRecentStudyItems: false,
      recentStudyItemsCount: 0
    };
    
    // Add recommendation based on status
    const recommendations = [];
    
    if (!status.hasPreferences) {
      recommendations.push('Enable notifications in settings');
    }
    if (!status.hasFCMToken && status.hasPreferences) {
      recommendations.push('Request notification permission to receive push notifications');
    }
    if (status.reviewsAvailable === 0 && status.recentStudyItems === 0) {
      recommendations.push('No items to review - study some content first');
    }
    if (status.notificationsEnabled && status.hasFCMToken) {
      recommendations.push('Notifications are properly configured! You should receive reminders.');
    }

    return NextResponse.json({
      success: true,
      status,
      localStorageCheck,
      recommendations,
      summary: {
        isFullyConfigured: status.hasPreferences && status.hasFCMToken && status.notificationsEnabled,
        canReceivePushNotifications: status.hasFCMToken && status.notificationsEnabled,
        canReceiveInAppNotifications: status.notificationsEnabled,
        hasContentToReview: status.reviewsAvailable > 0 || status.recentStudyItems > 0
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Failed to check notification status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Test endpoint to trigger a test notification
export async function POST(request: NextRequest) {
  try {
    // Get auth from header
    const headersList = headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Trigger a test notification through the existing service
    const response = await fetch(`${request.nextUrl.origin}/api/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || ''
      },
      body: JSON.stringify({ type: 'study_reminder' })
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      testResult: result,
      message: response.ok ? 'Test notification sent!' : 'Failed to send test notification'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}