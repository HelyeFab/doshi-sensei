import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin-safe';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const preferences = await request.json();

    // Verify the ID token
    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Update user preferences in Firestore
    const prefsRef = doc(db, 'notificationPreferences', userId);
    
    await updateDoc(prefsRef, {
      ...preferences,
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Preferences updated successfully' 
    });
  } catch (error: any) {
    console.error('Error in notifications/preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('auth') ? 401 : 500 }
    );
  }
}