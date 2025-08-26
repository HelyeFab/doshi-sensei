import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebase';

// TEMPORARY: Direct Stripe integration for testing
// This bypasses Cloud Functions for testing purposes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, userEmail, idToken } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing price ID' },
        { status: 400 }
      );
    }

    // Check if customer already exists with this email
    let customer = null;
    let existingCustomerId = null;
    
    try {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        customer = customers.data[0];
        existingCustomerId = customer.id;
        console.log('Found existing customer:', existingCustomerId);
        
        // Update customer metadata with Firebase UID if not set
        if (userId && (!customer.metadata?.firebaseUID || customer.metadata.firebaseUID !== userId)) {
          console.log('Updating customer metadata with Firebase UID');
          await stripe.customers.update(existingCustomerId, {
            metadata: {
              firebaseUID: userId
            }
          });
        }
        
        // Check for active or canceled subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: existingCustomerId,
          status: 'all',
          limit: 10
        });
        
        // Find any subscription that's active or scheduled to cancel
        const activeOrScheduledSub = subscriptions.data.find(sub => 
          sub.status === 'active' || 
          (sub.status === 'active' && sub.cancel_at_period_end)
        );
        
        if (activeOrScheduledSub) {
          console.log('Customer has active/scheduled-to-cancel subscription:', activeOrScheduledSub.id);
          console.log('Cancel at period end:', activeOrScheduledSub.cancel_at_period_end);
          
          // IMPORTANT: If they have a subscription scheduled to cancel,
          // we must create a fresh checkout to prevent silent auto-upgrade
          if (activeOrScheduledSub.cancel_at_period_end) {
            console.log('WARNING: Subscription is scheduled to cancel - creating fresh checkout');
            console.log('This prevents Stripe from silently upgrading the canceled subscription');
            // Use email instead of customer ID to force a new checkout session
            // This ensures transparency about charges
            existingCustomerId = null;
          }
        }
      }
    } catch (error) {
      console.log('Error checking existing customer:', error);
    }

    // Create checkout session with customer if exists (for proration)
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin')}/account?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/account?subscription=cancelled`,
      metadata: {
        firebaseUID: userId || 'test_user',
      },
      subscription_data: {
        metadata: {
          firebaseUID: userId || 'test_user',
        },
      },
    };
    
    // IMPORTANT: Only apply proration for subscription changes, NOT for new subscriptions
    // Proration only makes sense when switching between active paid plans
    if (existingCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: existingCustomerId,
          status: 'active',  // Only check active subscriptions
          limit: 1
        });
        
        // Only apply proration if customer has an ACTIVE subscription they're changing
        if (subscriptions.data.length > 0) {
          const activeSub = subscriptions.data[0];
          console.log('Customer has active subscription:', activeSub.id);
          
          // Don't add proration_behavior to checkout session - it causes errors
          // Instead, let Stripe handle this automatically when the customer 
          // already has an active subscription
          console.log('Customer has existing subscription - Stripe will handle proration automatically');
        } else {
          console.log('No active subscription found - this is a new subscription');
        }
      } catch (error) {
        console.log('Could not check subscriptions:', error);
      }
    } else {
      console.log('New customer - creating first subscription');
    }

    // If existing customer WITHOUT a canceled subscription, use their ID
    // If they have a canceled subscription, we set existingCustomerId to null above
    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
      // Also allow them to update their payment method if needed
      sessionParams.customer_update = {
        address: 'auto',
      };
      console.log('Using existing customer for checkout:', existingCustomerId);
    } else {
      sessionParams.customer_email = userEmail;
      console.log('Creating checkout with email (new or canceled customer):', userEmail);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}