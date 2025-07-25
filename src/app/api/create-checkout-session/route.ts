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
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
