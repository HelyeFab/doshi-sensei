import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, action, timestamp, type, metadata = {} } = body;

    // Check if Firebase is properly initialized
    if (!db) {
      console.error('Firebase Firestore is not initialized');
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 503 }
      );
    }

    // Create security event directly in Firestore (server-side has full access)
    const eventId = `${identifier}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const eventRef = doc(db, 'security_events', eventId);
    
    await setDoc(eventRef, {
      id: eventId,
      userId: identifier,
      eventType: type || action || 'suspicious_activity',
      timestamp: serverTimestamp(),
      ipAddress: metadata.ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: metadata.userAgent || request.headers.get('user-agent') || 'unknown',
      metadata: {
        ...metadata,
        action,
        clientTimestamp: timestamp,
      },
      riskLevel: 'low', // Default to low, can be enhanced with logic
      resolved: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}