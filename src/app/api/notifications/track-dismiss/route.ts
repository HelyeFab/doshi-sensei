import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function POST(request: NextRequest) {
  try {
    const { type, timestamp } = await request.json();
    
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    // Store dismiss event
    await db.collection('notificationEvents').add({
      event: 'dismiss',
      type,
      timestamp: new Date(timestamp),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track dismiss:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}