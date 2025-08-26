import { NextRequest, NextResponse } from 'next/server';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';

export async function POST(request: NextRequest) {
  try {
    const { currentSubscriptionId, newPriceId, idToken, userEmail } = await request.json();
    
    if (!currentSubscriptionId || !newPriceId || !idToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // MIGRATION NOTICE: This endpoint now delegates to Cloud Functions
    // The subscription update has been moved to Google Cloud Functions
    // to consolidate all Stripe operations in one place
    
    const result = await serverFirebaseFunctions.updateSubscription(
      { 
        subscriptionId: currentSubscriptionId, 
        newPriceId,
        userEmail 
      },
      idToken
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in update-subscription proxy:', error);
    
    // Handle Firebase Function errors
    if (error.message?.includes('unauthenticated')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('already on this plan')) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('subscription not found')) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}