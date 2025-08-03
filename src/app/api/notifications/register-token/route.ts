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
    
    // Get Firestore instance
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    const { token: fcmToken } = await request.json();

    // Validate token format
    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Store token
    const tokenRef = db.collection('notificationTokens').doc(fcmToken);
    await tokenRef.set({
      token: fcmToken,
      userId,
      platform: 'web',
      createdAt: FieldValue.serverTimestamp(),
      lastUsed: FieldValue.serverTimestamp(),
      active: true,
    });

    // Update user preferences with token
    const prefsRef = db.collection('notificationPreferences').doc(userId);
    await prefsRef.set({
      fcmToken,
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token registration failed:', error);
    return NextResponse.json(
      { error: 'Failed to register token' }, 
      { status: 500 }
    );
  }
}