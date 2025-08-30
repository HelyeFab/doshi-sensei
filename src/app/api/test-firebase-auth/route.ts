import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing idToken' },
        { status: 400 }
      );
    }

    // Test calling a simple Firebase function with authentication
    // We'll use getSystemHealth which requires auth
    const result = await serverFirebaseFunctions.getSystemHealth(
      {},
      idToken
    );

    return NextResponse.json({
      success: true,
      message: 'Firebase authentication working correctly',
      result
    });
  } catch (error: any) {
    console.error('Firebase auth test error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Firebase authentication test failed',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}