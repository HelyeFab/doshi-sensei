import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, action, timestamp, type, metadata = {} } = body;

    // Create security event directly in Firestore (server-side has full access)
    if (db) {
      const eventId = `${identifier}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const eventRef = doc(db, 'security_events', eventId);
      
      await setDoc(eventRef, {
        id: eventId,
        userId: identifier,
        eventType: type || action || 'suspicious_activity',
        timestamp: serverTimestamp(),
        ipAddress: metadata.ipAddress || request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        userAgent: metadata.userAgent || request.headers.get('user-agent') || 'unknown',
        metadata: {
          ...metadata,
          action,
          clientTimestamp: timestamp,
        },
        riskLevel: 'low', // Default to low, can be enhanced with logic
        resolved: false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}