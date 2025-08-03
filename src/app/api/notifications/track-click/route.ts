import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function POST(request: NextRequest) {
  try {
    const { type, action, timestamp } = await request.json();
    
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    // Store click event
    await db.collection('notificationEvents').add({
      event: 'click',
      type,
      action,
      timestamp: new Date(timestamp),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update notification log if we can find it
    // This is a simplified version - in production you'd pass a notification ID
    const recentLogs = await db
      .collection('notificationLogs')
      .where('notificationType', '==', type)
      .orderBy('sentAt', 'desc')
      .limit(1)
      .get();

    if (!recentLogs.empty) {
      const logDoc = recentLogs.docs[0];
      await logDoc.ref.update({
        clicked: true,
        clickedAt: new Date(timestamp),
        clickAction: action,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track click:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}