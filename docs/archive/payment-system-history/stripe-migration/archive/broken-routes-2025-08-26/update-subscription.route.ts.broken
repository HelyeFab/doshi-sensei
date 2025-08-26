import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// TEMPORARY: Direct Stripe integration for testing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentSubscriptionId, newPriceId, idToken, userEmail } = body;
    
    console.log('Update subscription request:', { 
      currentSubscriptionId, 
      newPriceId,
      hasIdToken: !!idToken 
    });
    
    if (!currentSubscriptionId || !newPriceId) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { error: 'Missing subscription ID or price ID' },
        { status: 400 }
      );
    }
    
    try {
      // Retrieve the current subscription
      const subscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // Check if it's already the same price
      const currentPriceId = subscription.items.data[0]?.price.id;
      if (currentPriceId === newPriceId) {
        return NextResponse.json({ 
          success: false,
          message: 'Already on this plan' 
        });
      }
      
      console.log('Updating subscription from', currentPriceId, 'to', newPriceId);
      
      // Update the subscription with proration
      const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // This ensures fair billing
        payment_behavior: 'pending_if_incomplete', // Require payment if needed
        expand: ['latest_invoice.payment_intent'] // Get payment info if needed
      });
      
      // Check if payment is required (for upgrades)
      let paymentUrl = null;
      if (updatedSubscription.latest_invoice && 
          typeof updatedSubscription.latest_invoice !== 'string') {
        const invoice = updatedSubscription.latest_invoice as Stripe.Invoice;
        
        // If there's a payment intent that needs action
        if (invoice.payment_intent && 
            typeof invoice.payment_intent !== 'string') {
          const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          if (paymentIntent.status === 'requires_action' || 
              paymentIntent.status === 'requires_payment_method') {
            // Create a checkout session for the payment
            const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              mode: 'setup',
              customer: subscription.customer as string,
              success_url: `${request.headers.get('origin')}/account?upgrade=success`,
              cancel_url: `${request.headers.get('origin')}/account?upgrade=cancelled`,
            });
            paymentUrl = session.url;
          }
        }
      }
      
      // Calculate proration amount for user information
      const prorationDate = Math.floor(Date.now() / 1000);
      const invoiceItems = await stripe.invoiceItems.list({
        customer: subscription.customer as string,
        limit: 10,
      });
      
      // Find proration items
      const prorationItems = invoiceItems.data.filter(item => 
        item.proration && item.date >= prorationDate - 60
      );
      
      const prorationAmount = prorationItems.reduce((sum, item) => sum + item.amount, 0);
      
      return NextResponse.json({ 
        success: true,
        message: 'Subscription updated successfully',
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          newPriceId: newPriceId,
          prorationAmount: prorationAmount / 100, // Convert cents to dollars
        },
        paymentUrl, // Will be null for downgrades or if no payment needed
      });
      
    } catch (stripeError: any) {
      console.error('Stripe error during update:', stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({ 
          success: false,
          error: 'Subscription not found',
          requiresNewSubscription: true
        }, { status: 404 });
      }
      
      throw stripeError;
    }
    
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}