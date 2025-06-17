import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { amount, userEmail, userName } = await request.json();

    if (!amount || amount < 100) { // Minimum $1.00
      return NextResponse.json(
        { error: 'Minimum donation amount is $1.00' },
        { status: 400 }
      );
    }

    // Create or retrieve customer if email provided
    let customer;
    if (userEmail) {
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          name: userName || undefined,
          metadata: {
            source: 'doshi-sensei-donation',
          },
        });
      }
    }

    // Create one-time payment session for donation
    const session = await stripe.checkout.sessions.create({
      customer: customer?.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount, // Amount in cents
            product_data: {
              name: 'Support Doshi Sensei ☕',
              description: 'Thank you for supporting the development of this Japanese learning app!',
              images: [`${request.nextUrl.origin}/doshi.png`],
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment, not subscription
      success_url: `${request.nextUrl.origin}/?donation_success=true`,
      cancel_url: `${request.nextUrl.origin}/?donation_canceled=true`,
      metadata: {
        type: 'donation',
        source: 'doshi-sensei',
      },
      custom_fields: [
        {
          key: 'message',
          label: {
            type: 'custom',
            custom: 'Optional message (public)',
          },
          type: 'text',
          optional: true,
        },
      ],
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating donation session:', error);
    return NextResponse.json(
      { error: 'Failed to create donation session' },
      { status: 500 }
    );
  }
}
