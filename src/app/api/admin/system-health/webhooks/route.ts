import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function GET(request: NextRequest) {
  try {
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    const idToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const result = await serverFirebaseFunctions.getSystemHealth(
      {},
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in admin/system-health/webhooks:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}