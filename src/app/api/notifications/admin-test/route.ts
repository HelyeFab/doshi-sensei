import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const admin = await getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is admin (matching pattern from other admin routes)
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get request body
    const { userId, type = 'test' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's FCM token
    const prefsDoc = await admin.firestore().collection('notificationPreferences').doc(userId).get();
    const prefs = prefsDoc.data();

    if (!prefs?.fcmToken) {
      return NextResponse.json({ 
        error: 'User has no FCM token registered' 
      }, { status: 400 });
    }

    // Get user details
    const targetUserDoc = await admin.firestore().collection('users').doc(userId).get();
    const targetUser = targetUserDoc.data();
    const userName = targetUser?.displayName || 'User';

    // Send test notification
    const message = {
      token: prefs.fcmToken,
      notification: {
        title: `Test Notification 🧪`,
        body: `Hello ${userName}! This is a test notification from the admin dashboard.`,
      },
      data: {
        type: 'test',
        url: '/',
        userId: userId,
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: 'https://doshisensei.com',
        },
        notification: {
          icon: '/doshi.png',
          badge: '/badge-72x72.png',
          requireInteraction: false,
        },
      },
    };

    const messaging = admin.messaging();
    const response = await messaging.send(message);

    // Log the notification
    await admin.firestore().collection('notificationLogs').add({
      userId: userId,
      type: 'test',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      title: message.notification.title,
      sentBy: decodedToken.uid,
      adminTest: true,
    });

    return NextResponse.json({ 
      success: true,
      messageId: response,
      message: 'Test notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending admin test notification:', error);
    
    if (error instanceof Error) {
      // Check for specific FCM errors
      if (error.message.includes('registration-token-not-registered')) {
        return NextResponse.json({ 
          error: 'User\'s notification token is invalid or expired' 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to send test notification' 
    }, { status: 500 });
  }
}