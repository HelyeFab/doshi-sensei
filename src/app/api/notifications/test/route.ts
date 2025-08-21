import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin-safe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { type = 'study_reminder' } = await request.json();

    // Verify the ID token
    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get user's notification preferences to check for FCM token
    const prefsRef = doc(db, 'notificationPreferences', userId);
    const prefsSnap = await getDoc(prefsRef);
    
    if (!prefsSnap.exists()) {
      return NextResponse.json(
        { error: 'Notification preferences not found' },
        { status: 404 }
      );
    }

    const preferences = prefsSnap.data();
    
    if (!preferences.enabled) {
      return NextResponse.json(
        { error: 'Notifications are disabled' },
        { status: 400 }
      );
    }

    if (!preferences.fcmToken) {
      return NextResponse.json(
        { error: 'No FCM token found - notifications may be in-app only' },
        { status: 400 }
      );
    }

    // TODO: Implement actual FCM notification sending
    // For now, we'll just simulate a successful test
    
    // This would use Firebase Admin SDK to send a notification:
    // await getMessaging().send({
    //   token: preferences.fcmToken,
    //   notification: {
    //     title: 'Test Notification',
    //     body: 'This is a test notification from Doshi Sensei!'
    //   },
    //   data: {
    //     type: type,
    //     timestamp: Date.now().toString()
    //   }
    // });

    return NextResponse.json({ 
      success: true,
      message: 'Test notification sent successfully',
      type: type
    });
  } catch (error: any) {
    console.error('Error in notifications/test:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('auth') ? 401 : 500 }
    );
  }
}