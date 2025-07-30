import {https} from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe (will be initialized in the function)
let stripe: Stripe;

// Webhook endpoint (v2 function - requires explicit public access)
export const stripeWebhook = https.onRequest({cors: true}, async (req, res) => {
  console.log('Firebase Function: stripeWebhook called');
  console.log('Method:', req.method);
  
  // Initialize Stripe on first request
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error('STRIPE_SECRET_KEY not found in environment');
      res.status(500).json({ error: 'Stripe configuration error' });
      return;
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  // Handle GET requests for testing
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'Stripe webhook endpoint is active',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody.toString(),
      signature as string,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  console.log('Processing webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Handling subscription update:', subscription.id);
  
  const firebaseUID = subscription.metadata.firebaseUID;
  if (!firebaseUID) {
    console.error('No firebaseUID in subscription metadata');
    return;
  }

  const status = subscription.status;
  // Handle cases where current_period_end might be null/undefined
  const currentPeriodEnd = subscription.current_period_end 
    ? admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000))
    : null;
  
  const isActive = ['active', 'trialing'].includes(status);
  
  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price.id || null;
  
  // Determine the plan based on status and price ID
  let plan = 'free';
  if (isActive && priceId) {
    // Map price IDs to plan names that match the app's expectations
    const planMap: { [key: string]: string } = {
      'price_1RakzXHdrJomitOwZc0HJC4J': 'monthly',
      'price_1RakzXHdrJomitOwE7B56erf': 'yearly'
    };
    
    plan = planMap[priceId] || 'free';
  }
  
  try {
    const updateData: any = {
      'subscription.status': status,
      'subscription.plan': plan, // THIS IS THE CRITICAL FIX
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.stripePriceId': priceId,
      'subscription.stripeCustomerId': subscription.customer,
      'entitlements.isPremium': isActive,
      'entitlements.premiumType': isActive ? 'stripe' : null,
      'entitlements.premiumSince': isActive ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Only add currentPeriodEnd if it exists
    if (currentPeriodEnd) {
      updateData['subscription.currentPeriodEnd'] = currentPeriodEnd;
    }
    
    await db.collection('users').doc(firebaseUID).update(updateData);
    
    console.log(`Updated subscription for user ${firebaseUID}: ${status}, plan: ${plan}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Handling subscription deletion:', subscription.id);
  
  const firebaseUID = subscription.metadata.firebaseUID;
  if (!firebaseUID) {
    console.error('No firebaseUID in subscription metadata');
    return;
  }

  try {
    await db.collection('users').doc(firebaseUID).update({
      'subscription.status': 'canceled',
      'subscription.plan': 'free', // Reset plan to free when canceled
      'subscription.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
      'entitlements.isPremium': false,
      'entitlements.premiumType': null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Canceled subscription for user ${firebaseUID}`);
  } catch (error) {
    console.error('Error canceling user subscription:', error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Handling checkout completion:', session.id);
  
  const firebaseUID = session.metadata?.firebaseUID;
  if (!firebaseUID) {
    console.error('No firebaseUID in session metadata');
    return;
  }

  console.log('Checkout completed for user:', firebaseUID);
  
  // For subscription mode, retrieve and process the subscription
  if (session.mode === 'subscription' && session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      console.log('Retrieved subscription from checkout:', subscription.id);
      await handleSubscriptionUpdate(subscription);
    } catch (error) {
      console.error('Error retrieving subscription from checkout:', error);
    }
  }
}