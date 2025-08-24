import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    const result = await serverFirebaseFunctions.createPortalSession(
      {},
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in create-portal-session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('unauthenticated') ? 401 : 
               error.message?.includes('permission-denied') ? 403 : 500 }
    );
  }
}