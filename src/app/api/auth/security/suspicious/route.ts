import { NextRequest, NextResponse } from 'next/server';
import { getSecurityMonitor } from '@/lib/auth/security-monitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, action, timestamp, type } = body;

    // Log suspicious activity
    const monitor = getSecurityMonitor();
    await monitor.logEvent(
      identifier,
      'suspicious_activity',
      {
        action,
        timestamp,
        type,
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}