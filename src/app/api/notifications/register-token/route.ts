import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin-safe';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Save the FCM token to Firestore
    const prefsRef = doc(db, 'notificationPreferences', userId);
    const prefsSnap = await getDoc(prefsRef);
    
    if (prefsSnap.exists()) {
      // Update existing preferences
      await updateDoc(prefsRef, {
        fcmToken: token,
        updatedAt: new Date(),
      });
    } else {
      // Create new preferences - this should not happen in normal flow
      // as preferences should be created when requesting permission
      return NextResponse.json(
        { error: 'Notification preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Token registered successfully' 
    });
  } catch (error: any) {
    console.error('Error in notifications/register-token:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('auth') ? 401 : 500 }
    );
  }
}