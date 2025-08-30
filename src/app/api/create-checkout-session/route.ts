import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, userEmail, idToken } = await request.json();

    if (!priceId || !idToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // MIGRATION NOTICE: This endpoint now delegates to Cloud Functions
    // The checkout session creation has been moved to Google Cloud Functions
    // to consolidate all Stripe operations in one place
    
    // Pass the idToken for authentication to the Firebase Function
    // The Firebase function will get userId and email from the authenticated context
    const result = await serverFirebaseFunctions.createCheckoutSession(
      { priceId },
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in create-checkout-session proxy:', error);
    
    // Handle Firebase Function errors
    if (error.message?.includes('unauthenticated')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('invalid-argument')) {
      return NextResponse.json(
        { error: error.message || 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}