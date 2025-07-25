import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { apiRateLimiter } from '@/lib/rate-limiter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, idToken } = await request.json();

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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Verify the subscription belongs to the authenticated user
    if (subscription.metadata.firebaseUID !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'Unauthorized - subscription does not belong to this user' },
        { status: 403 }
      );
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
