import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the user
    const admin = await getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Get Firestore and Messaging instances
    const db = admin.firestore();
    const messaging = admin.messaging();

    const { type = 'study_reminder' } = await request.json();

    // Get user's FCM token
    const prefsDoc = await db
      .collection('notificationPreferences')
      .doc(userId)
      .get();

    const prefs = prefsDoc.data();
    if (!prefs?.fcmToken) {
      return NextResponse.json(
        { error: 'No FCM token found. Please enable notifications first.' }, 
        { status: 400 }
      );
    }

    // Get user data for personalization
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const displayName = userData?.displayName || 'Learner';

    // Create test notification based on type
    let message;
    
    switch (type) {
      case 'study_reminder':
        message = {
          token: prefs.fcmToken,
          notification: {
            title: `Test: Good morning, ${displayName}-san! 🌅`,
            body: 'This is a test study reminder notification',
          },
          data: {
            type: 'test_study_reminder',
            url: '/practice',
            userId: userId,
          },
          webpush: {
            notification: {
              icon: '/doshi.png',
              badge: '/badge-72x72.png',
              actions: [
                {
                  action: 'start-practice',
                  title: 'Start Practice',
                },
                {
                  action: 'dismiss',
                  title: 'Dismiss',
                }
              ]
            }
          }
        };
        break;
        
      case 'review_reminder':
        message = {
          token: prefs.fcmToken,
          notification: {
            title: 'Test: 15 items ready for review 📚',
            body: 'This is a test review reminder notification',
          },
          data: {
            type: 'test_review_reminder',
            url: '/review',
            userId: userId,
          },
        };
        break;
        
      case 'streak_reminder':
        message = {
          token: prefs.fcmToken,
          notification: {
            title: 'Test: Keep your streak alive! 🔥',
            body: 'This is a test streak reminder notification',
          },
          data: {
            type: 'test_streak_reminder',
            url: '/practice',
            userId: userId,
          },
        };
        break;
        
      default:
        message = {
          token: prefs.fcmToken,
          notification: {
            title: 'Test Notification',
            body: `This is a test ${type} notification`,
          },
          data: {
            type: 'test',
            originalType: type,
            userId: userId,
          },
        };
    }

    // Send test notification
    const response = await messaging.send(message);

    // Log the test notification
    await db.collection('notificationLogs').add({
      userId,
      notificationType: `test_${type}`,
      sentAt: new Date(),
      delivered: true,
      clicked: false,
      messageId: response,
      test: true,
    });

    return NextResponse.json({ 
      success: true, 
      messageId: response,
      message: 'Test notification sent successfully!' 
    });
  } catch (error: any) {
    console.error('Test notification failed:', error);
    
    // Provide helpful error messages
    if (error.code === 'messaging/registration-token-not-registered') {
      return NextResponse.json(
        { error: 'Your notification token is invalid. Please refresh the page and enable notifications again.' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to send test notification' }, 
      { status: 500 }
    );
  }
}