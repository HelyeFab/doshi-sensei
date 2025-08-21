import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { dryRun, idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    const result = await serverFirebaseFunctions.cleanupSubscriptions(
      { dryRun },
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in admin/cleanup-subscriptions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}