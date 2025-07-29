import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { apiRateLimiter } from '@/lib/rate-limiter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, idToken } = await request.json();

    console.log('Cancel subscription request received');
    console.log('Subscription ID:', subscriptionId);

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      );
    }

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    // Verify Firebase authentication
    const admin = await getFirebaseAdmin();
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Rate limiting - use user ID as identifier
    if (!apiRateLimiter.isAllowed(decodedToken.uid)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Retrieve the subscription to verify ownership
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (stripeError: any) {
      console.error('Error retrieving subscription from Stripe:', stripeError);
      console.error('Subscription ID attempted:', subscriptionId);
      return NextResponse.json(
        { error: 'Invalid subscription ID or subscription not found' },
        { status: 404 }
      );
    }
    
    // Log subscription metadata for debugging
    console.log('Subscription metadata:', subscription.metadata);
    console.log('Expected Firebase UID:', decodedToken.uid);
    console.log('Subscription Firebase UID:', subscription.metadata.firebaseUID);
    
    // Verify the subscription belongs to the authenticated user
    if (subscription.metadata.firebaseUID !== decodedToken.uid) {
      // Also check customer metadata as a fallback
      let customerFirebaseUID = null;
      if (typeof subscription.customer === 'string') {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          if (customer && !customer.deleted && 'metadata' in customer) {
            customerFirebaseUID = customer.metadata?.firebaseUID;
            console.log('Customer Firebase UID:', customerFirebaseUID);
          }
        } catch (error) {
          console.error('Error retrieving customer:', error);
        }
      }
      
      // Check if either subscription or customer metadata matches
      if (customerFirebaseUID !== decodedToken.uid) {
        console.error('Authorization failed:');
        console.error('- User UID:', decodedToken.uid);
        console.error('- Subscription UID:', subscription.metadata.firebaseUID);
        console.error('- Customer UID:', customerFirebaseUID);
        return NextResponse.json(
          { error: 'Unauthorized - subscription does not belong to this user' },
          { status: 403 }
        );
      }
    }

    // Cancel the subscription at the end of the current period
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
