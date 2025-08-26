import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, event, timestamp } = body;

    // Store critical security alert
    if (db) {
      const alertRef = doc(db, 'security_alerts', `alert_${Date.now()}`);
      await setDoc(alertRef, {
        userId,
        event,
        timestamp,
        createdAt: serverTimestamp(),
        resolved: false,
        priority: 'critical',
      });
    }

    // In production, this would also:
    // 1. Send email to admin
    // 2. Trigger SMS/push notification
    // 3. Create incident ticket
    // 4. Log to external security service

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send security alert:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}