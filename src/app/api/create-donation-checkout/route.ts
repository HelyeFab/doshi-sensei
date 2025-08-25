import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Dedicated endpoint for donations - completely separate from subscription system
// This won't interfere with the existing subscription checkout
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
          console.log('Updating customer metadata with Firebase UID for donation');
          await stripe.customers.update(existingCustomerId, {
            metadata: {
              firebaseUID: userId
            }
          });
        }
      }
    } catch (error) {
      console.log('Error checking existing customer for donation:', error);
    }

    // Create checkout session for one-time payment (donation)
    // This is completely separate from subscription checkout
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Dōshi Sensei Support - Thank You! ☕',
              description: 'One-time donation to support Dōshi Sensei development',
              images: ['https://doshisensei.com/doshi.png'],
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment, NOT subscription
      success_url: `${request.headers.get('origin')}/account?donation=success&amount=${amount}`,
      cancel_url: `${request.headers.get('origin')}/account?donation=cancelled`,
      metadata: {
        firebaseUID: userId || 'anonymous_donor',
        type: 'donation', // Mark this as donation to distinguish from subscriptions
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
    
    console.log('Donation checkout session created:', session.id);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error: any) {
    console.error('Create donation checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create donation checkout session' },
      { status: 500 }
    );
  }
}