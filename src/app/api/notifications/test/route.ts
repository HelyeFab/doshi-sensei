import { NextRequest, NextResponse } from 'next/server';
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie or header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    // Verify the user
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get the request body
    const body = await request.json();
    const { title, body: messageBody, data } = body;
    
    // Get user's FCM token from notificationPreferences collection
    const notifPrefsDoc = await db.collection('notificationPreferences').doc(uid).get();
    let fcmTokenToUse = notifPrefsDoc.data()?.fcmToken;
    
    if (!fcmTokenToUse) {
      // Check if token might be in users collection (backward compatibility)
      const userDoc = await db.collection('users').doc(uid).get();
      fcmTokenToUse = userDoc.data()?.fcmToken;
      
      if (!fcmTokenToUse) {
        return NextResponse.json({ 
          error: 'No FCM token found. Make sure notifications are enabled.' 
        }, { status: 400 });
      }
    }
    
    // Send the test notification
    const message = {
      notification: {
        title: title || 'Test Notification',
        body: messageBody || 'This is a test notification from Doshi Sensei'
      },
      data: data || {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      token: fcmTokenToUse
    };
    
    const response = await getMessaging().send(message);
    
    return NextResponse.json({ 
      success: true, 
      messageId: response,
      message: 'Test notification sent successfully'
    });
    
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send test notification' 
    }, { status: 500 });
  }
}