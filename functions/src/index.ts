import {https} from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Export notification functions
export {
  sendStudyReminders,
  sendReviewReminders,
  sendStreakReminders,
  cleanupNotificationLogs
} from './notifications';

// Initialize Stripe (will be initialized in the function)
let stripe: Stripe;

/**
 * Clean Stripe Webhook using Three-Pillar Architecture
 * 
 * This webhook ONLY manages the subscription data structure.
 * The Three-Pillar system handles all entitlements, features, and access control.
 * 
 * UPDATED: Now replaces entire subscription object to prevent mixing old/new structures
 */
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
      timestamp: new Date().toISOString(),
      architecture: 'Three-Pillar System'
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
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

/**
 * Handle subscription updates - CLEAN STRUCTURE ONLY
 * 
 * The subscription object in Firebase should contain ONLY:
 * - status: 'active' | 'inactive' | 'canceled' | 'past_due'
 * - plan: 'free' | 'monthly' | 'yearly'
 * - stripeSubscriptionId: string
 * - stripeCustomerId: string
 * - stripePriceId: string
 * - currentPeriodEnd: Timestamp
 * - cancelAtPeriodEnd: boolean
 * - metadata: { source, createdAt, updatedAt }
 * 
 * UPDATED: Now uses update() to completely replace subscription object
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Handling subscription update:', subscription.id);
  
  // Check both subscription and customer metadata for firebaseUID
  let firebaseUID = subscription.metadata.firebaseUID;
  
  if (!firebaseUID && subscription.customer) {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata.firebaseUID;
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
    }
  }
  
  if (!firebaseUID) {
    console.error('No firebaseUID found in subscription or customer metadata');
    return;
  }

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end 
    ? admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000))
    : null;
  
  const isActive = ['active', 'trialing'].includes(status);
  
  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price.id || null;
  
  // Determine the plan based on status and price ID
  let plan: 'free' | 'monthly' | 'yearly' = 'free';
  if (isActive && priceId) {
    const planMap: { [key: string]: 'monthly' | 'yearly' } = {
      'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',  // £8.99/month (LIVE)
      'price_1RubMxHdrJomitOwElEo6nys': 'yearly'    // £89.99/year (LIVE)
    };
    
    plan = planMap[priceId] || 'free';
  }
  
  try {
    // CLEAN subscription structure - no nested objects!
    const subscriptionData = {
      status: status,
      plan: plan,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: priceId,
      currentPeriodEnd: currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      metadata: {
        source: 'stripe',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    };
    
    // UPDATED: Use update() to completely replace subscription object
    // This prevents mixing old nested structures with new flat structure
    await db.collection('users').doc(firebaseUID).update({
      subscription: subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Save to subscription history
    await saveSubscriptionHistory(firebaseUID, 'subscription_updated', {
      status: status,
      plan: plan,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toDate().toISOString() : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false
    });
    
    console.log(`Updated subscription for user ${firebaseUID}:`, {
      status,
      plan,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Handling subscription deletion:', subscription.id);
  
  // Check both subscription and customer metadata for firebaseUID
  let firebaseUID = subscription.metadata.firebaseUID;
  
  if (!firebaseUID && subscription.customer) {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata.firebaseUID;
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
    }
  }
  
  if (!firebaseUID) {
    console.error('No firebaseUID found in subscription or customer metadata');
    return;
  }

  try {
    // Set to free plan with canceled status
    const subscriptionData = {
      status: 'canceled',
      plan: 'free',
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: admin.firestore.Timestamp.now(),
      metadata: {
        source: 'stripe',
        updatedAt: admin.firestore.Timestamp.now()
      }
    };
    
    // UPDATED: Use update() to completely replace subscription object
    await db.collection('users').doc(firebaseUID).update({
      subscription: subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Save to subscription history
    await saveSubscriptionHistory(firebaseUID, 'subscription_canceled', {
      status: 'canceled',
      plan: 'free',
      stripeSubscriptionId: subscription.id
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

/**
 * Save subscription history event to Firestore
 */
async function saveSubscriptionHistory(
  firebaseUID: string,
  eventType: string,
  details: any
) {
  try {
    const historyRef = db.collection('users').doc(firebaseUID).collection('subscription_history');
    await historyRef.add({
      type: eventType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...details
    });
    console.log(`Saved subscription history event for user ${firebaseUID}: ${eventType}`);
  } catch (error) {
    console.error('Error saving subscription history:', error);
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Handling invoice payment succeeded:', invoice.id);
  
  // Get Firebase UID from customer metadata
  let firebaseUID: string | undefined;
  
  if (invoice.customer) {
    try {
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata.firebaseUID;
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
    }
  }
  
  if (!firebaseUID) {
    console.error('No firebaseUID found for invoice customer');
    return;
  }
  
  // Get payment method details
  let paymentMethodDetails = null;
  if (invoice.payment_intent) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
      if (paymentIntent.payment_method) {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
        if (paymentMethod.card) {
          paymentMethodDetails = {
            type: 'card',
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year
          };
        }
      }
    } catch (error) {
      console.error('Error retrieving payment method:', error);
    }
  }
  
  // Determine plan from line items
  let plan = 'unknown';
  if (invoice.lines && invoice.lines.data.length > 0) {
    const priceId = invoice.lines.data[0].price?.id;
    if (priceId) {
      const planMap: { [key: string]: string } = {
        'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',
        'price_1RubMxHdrJomitOwElEo6nys': 'yearly'
      };
      plan = planMap[priceId] || 'unknown';
    }
  }
  
  // Save to subscription history
  await saveSubscriptionHistory(firebaseUID, 'payment_succeeded', {
    status: 'paid',
    plan: plan,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    paymentMethod: paymentMethodDetails,
    details: {
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      tax: invoice.tax,
      subtotal: invoice.subtotal,
      total: invoice.total,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
    }
  });
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Handling invoice payment failed:', invoice.id);
  
  // Get Firebase UID from customer metadata
  let firebaseUID: string | undefined;
  
  if (invoice.customer) {
    try {
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata.firebaseUID;
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
    }
  }
  
  if (!firebaseUID) {
    console.error('No firebaseUID found for invoice customer');
    return;
  }
  
  // Save to subscription history
  await saveSubscriptionHistory(firebaseUID, 'payment_failed', {
    status: 'failed',
    plan: 'unknown',
    amount: invoice.amount_due,
    currency: invoice.currency,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
    details: {
      amountDue: invoice.amount_due,
      lastPaymentError: invoice.last_finalization_error
    }
  });
}