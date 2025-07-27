import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiRateLimiter } from '@/lib/rate-limiter';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, userEmail } = await request.json();

    if (!priceId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Rate limiting - use email as identifier
    if (!apiRateLimiter.isAllowed(userEmail)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      // Always update customer metadata!
      await stripe.customers.update(customer.id, {
        metadata: { firebaseUID: userId }
      });
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUID: userId,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/account?success=true`,
      cancel_url: `${request.nextUrl.origin}/account?canceled=true`,
      metadata: {
        firebaseUID: userId,
      },
      subscription_data: {
        metadata: {
          firebaseUID: userId,
        },
      },
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more specific error messages based on Stripe error types
    let errorMessage = 'Failed to create checkout session';
    let statusCode = 500;
    
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeCardError':
          errorMessage = 'Card error: ' + error.message;
          statusCode = 400;
          break;
        case 'StripeRateLimitError':
          errorMessage = 'Too many requests. Please try again in a few minutes.';
          statusCode = 429;
          break;
        case 'StripeInvalidRequestError':
          errorMessage = 'Invalid request. Please check your information and try again.';
          statusCode = 400;
          break;
        case 'StripeAPIError':
          errorMessage = 'Payment service temporarily unavailable. Please try again later.';
          statusCode = 503;
          break;
        case 'StripeConnectionError':
          errorMessage = 'Network error. Please check your connection and try again.';
          statusCode = 503;
          break;
        case 'StripeAuthenticationError':
          errorMessage = 'Authentication error. Please contact support.';
          statusCode = 401;
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
