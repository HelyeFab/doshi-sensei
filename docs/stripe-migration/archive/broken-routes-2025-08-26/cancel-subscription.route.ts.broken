import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  // Check for Stripe secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in environment variables');
    return NextResponse.json(
      { error: 'Server configuration error - Stripe not configured' },
      { status: 500 }
    );
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
  try {
    const body = await request.json();
    const { subscriptionId, idToken, reason, feedback } = body;
    
    console.log('Cancel subscription request:', { subscriptionId, hasIdToken: !!idToken });
    
    if (!subscriptionId) {
      console.error('Missing subscription ID in request');
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      );
    }
    
    // For testing, cancel the subscription at period end
    console.log('Attempting to cancel subscription:', subscriptionId);
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true // Cancel at the end of the billing period
    });
    
    // The Stripe webhook will handle updating Firestore
    // This avoids permission issues with client SDK from server side
    console.log('Subscription canceled in Stripe - webhook will update Firestore');
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription scheduled to cancel at period end',
      cancel_at: subscription.cancel_at,
      current_period_end: subscription.current_period_end
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    
    // Check if subscription doesn't exist (likely test/prod mismatch)
    if (error.message?.includes('No such subscription')) {
      console.warn('Subscription not found in Stripe - may be test/production mismatch');
      return NextResponse.json({ 
        success: false,
        error: 'Subscription not found. This may be because the subscription was created in production mode but you are now in test mode.',
        requiresNewSubscription: true
      }, { status: 404 });
    }
    
    // Check if subscription is already canceled
    if (error.message?.includes('already canceled') || error.message?.includes('already scheduled')) {
      return NextResponse.json({ 
        success: true,
        message: 'Subscription is already scheduled to cancel' 
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}