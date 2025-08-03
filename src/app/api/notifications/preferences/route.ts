import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { NotificationPreferences } from '@/types/notifications';

export async function GET(request: NextRequest) {
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
    
    // Get Firestore instance
    const db = admin.firestore();

    // Get preferences
    const prefsDoc = await db.collection('notificationPreferences').doc(userId).get();
    
    if (!prefsDoc.exists) {
      return NextResponse.json(null);
    }

    return NextResponse.json(prefsDoc.data());
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    
    // Get Firestore instance
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    const preferences: Partial<NotificationPreferences> = await request.json();

    // Update preferences
    const prefsRef = db.collection('notificationPreferences').doc(userId);
    
    await prefsRef.set({
      ...preferences,
      userId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' }, 
      { status: 500 }
    );
  }
}