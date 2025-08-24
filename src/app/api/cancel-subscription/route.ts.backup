import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, idToken, reason, feedback } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    // Extract user ID from token
    let userId: string | undefined;
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      userId = payload.sub || payload.user_id;
    } catch (e) {
      console.error('Failed to extract user ID from token:', e);
    }
    
    const result = await serverFirebaseFunctions.cancelSubscription(
      { userId, reason, feedback },
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in cancel-subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}