import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// TEMPORARY: Direct Stripe integration for testing
// This bypasses Cloud Functions for testing purposes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { amount, userId, userEmail, idToken } = await request.json();

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid donation amount (minimum $1.00)' },
        { status: 400 }
      );
    }

    // Check if customer already exists with this email
    let existingCustomerId = null;
    
    try {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        const customer = customers.data[0];
        existingCustomerId = customer.id;
        console.log('Found existing customer for donation:', existingCustomerId);
        
        // Update customer metadata with Firebase UID if not set
        if (userId && (!customer.metadata?.firebaseUID || customer.metadata.firebaseUID !== userId)) {
          console.log('Updating customer metadata with Firebase UID');
          await stripe.customers.update(existingCustomerId, {
            metadata: {
              firebaseUID: userId
            }
          });
        }
      }
    } catch (error) {
      console.log('Error checking existing customer:', error);
    }

    // Create checkout session for one-time payment (donation)
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Dōshi Sensei Support',
              description: 'One-time donation to support Dōshi Sensei development',
              images: ['https://doshisensei.com/doshi.png'],
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment, not subscription
      success_url: `${request.headers.get('origin')}/account?donation=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/account?donation=cancelled`,
      metadata: {
        firebaseUID: userId || 'anonymous_donor',
        type: 'donation',
        amount: amount.toString(),
      },
    };

    // If existing customer, use their ID
    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
      console.log('Using existing customer for donation:', existingCustomerId);
    } else {
      sessionParams.customer_email = userEmail;
      console.log('Creating donation with email:', userEmail);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error: any) {
    console.error('Create donation session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create donation session' },
      { status: 500 }
    );
  }
}