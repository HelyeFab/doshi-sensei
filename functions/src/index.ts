import {https} from 'firebase-functions/v2';
import {defineSecret} from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Define secrets for Stripe configuration
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const stripeMonthlyPriceId = defineSecret('STRIPE_MONTHLY_PRICE_ID');
const stripeYearlyPriceId = defineSecret('STRIPE_YEARLY_PRICE_ID');

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

// Export admin operations (replacing Netlify functions)
export {
  cancelSubscription,
  deleteAccount,
  trackArticleView,
  manageBookmarks,
  registerNotificationToken,
  updateNotificationPreferences,
  trackShare,
  getShareStats,
  adminDeleteUser,
  getSystemHealth,
  updateUserLimit,
  createPortalSession,
  createCheckoutSession
} from './admin-operations';

// Export admin analytics functions
export {
  getSubscriptionAnalytics,
  cleanupSubscriptions,
  fixEntitlements,
  fixSubscriptions,
  getUserEntitlements,
  updateMaintenanceStatus,
  getSystemHealthConsistency,
  getSubscriptionHealth,
  getArticleStats
} from './admin-analytics';

// Export extended operations
export {
  syncBugs,
  getTextbookVocabulary,
  createReferral,
  testNotification,
  trackNotificationClick,
  trackNotificationDismiss,
  adminBroadcast,
  adminTestNotification,
  debugYouTubeLimits,
  rebuildConfig,
  reloadEntitlementRules,
  testStorage,
  updatePricingConfig,
  manageEntitlements
} from './extended-operations';

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
export const stripeWebhook = https.onRequest({
  cors: true,
  secrets: [stripeSecretKey, stripeWebhookSecret, stripeMonthlyPriceId, stripeYearlyPriceId]
}, async (req, res) => {
  console.log('Firebase Function: stripeWebhook called');
  console.log('Method:', req.method);
  
  // Initialize Stripe on first request
  if (!stripe) {
    const secretKey = stripeSecretKey.value();
    if (!secretKey) {
      console.error('STRIPE_SECRET_KEY not found in Secret Manager');
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
  const webhookSecret = stripeWebhookSecret.value();

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured in Secret Manager');
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

  // IDEMPOTENCY CHECK - Prevent duplicate processing
  const idempotencyKey = event.id;
  const processedEventRef = db.collection('webhook_events').doc(idempotencyKey);
  
  try {
    // Check if we've already processed this event
    const existingEvent = await processedEventRef.get();
    if (existingEvent.exists) {
      console.log(`Event ${idempotencyKey} already processed - skipping`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
  } catch (error) {
    console.error('Error checking idempotency:', error);
    // Continue processing if idempotency check fails
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, true);
        break;
        
      case 'customer.subscription.updated':
        // Skip if this is just the initial update after creation
        const subscription = event.data.object as Stripe.Subscription;
        const createdAt = subscription.created;
        const now = Math.floor(Date.now() / 1000);
        
        // If subscription was created less than 10 seconds ago, skip this update
        if (now - createdAt < 10) {
          console.log('Skipping duplicate subscription update immediately after creation');
          break;
        }
        
        await handleSubscriptionUpdate(subscription, false);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.payment_succeeded':
        try {
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        } catch (error) {
          console.error('ERROR in handleInvoicePaymentSucceeded:', error);
          throw error;
        }
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as successfully processed
    try {
      await processedEventRef.set({
        eventId: event.id,
        type: event.type,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        result: 'success'
      });
    } catch (error) {
      console.error('Error marking event as processed:', error);
    }

    // Log successful processing
    await logWebhookEvent(event, 'success');

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Event type:', event.type);
    console.error('Event data:', JSON.stringify(event.data.object, null, 2));
    
    // Log failed processing
    await logWebhookEvent(event, 'error', error instanceof Error ? error.message : 'Unknown error');
    
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
async function handleSubscriptionUpdate(subscription: Stripe.Subscription, isNewSubscription = false) {
  console.log(`Handling subscription ${isNewSubscription ? 'creation' : 'update'}:`, subscription.id);
  
  if (isNewSubscription) {
    console.log('NEW SUBSCRIPTION - will clear any previous cancellation flags');
  }
  
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
  
  console.log('Processing subscription with price ID:', priceId);
  console.log('Subscription status:', status);
  console.log('Is active?:', isActive);
  
  // Determine the plan based on price ID from Secret Manager
  let plan: 'free' | 'monthly' | 'yearly' = 'free';
  
  const monthlyPriceId = stripeMonthlyPriceId.value();
  const yearlyPriceId = stripeYearlyPriceId.value();
  
  if (!monthlyPriceId || !yearlyPriceId) {
    console.error('❌ CRITICAL: Stripe price IDs not configured in Secret Manager');
    console.error('Please set STRIPE_MONTHLY_PRICE_ID and STRIPE_YEARLY_PRICE_ID secrets');
  }
  
  if (priceId === monthlyPriceId) {
    plan = 'monthly';
  } else if (priceId === yearlyPriceId) {
    plan = 'yearly';
  } else if (priceId) {
    console.warn(`Unknown price ID: ${priceId} - defaulting to free plan`);
    console.warn(`Expected monthly: ${monthlyPriceId} or yearly: ${yearlyPriceId}`);
  }
  
  try {
    // Get existing subscription data to preserve invoice information
    const userDoc = await db.collection('users').doc(firebaseUID).get();
    const existingSubscription = userDoc.data()?.subscription || {};
    
    // Build subscription update - preserve ALL existing invoice fields
    const subscriptionUpdate: any = {
      status: status,
      plan: plan,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: priceId,
      currentPeriodEnd: currentPeriodEnd,
      // IMPORTANT: For NEW subscriptions, ALWAYS set cancelAtPeriodEnd to false
      // This clears any previous cancellation from old subscriptions
      cancelAtPeriodEnd: isNewSubscription ? false : (subscription.cancel_at_period_end || false),
      metadata: {
        source: 'stripe',
        createdAt: existingSubscription.metadata?.createdAt || admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        // Preserve lastPaymentUpdate if it exists
        ...(existingSubscription.metadata?.lastPaymentUpdate && {
          lastPaymentUpdate: existingSubscription.metadata.lastPaymentUpdate
        })
      }
    };
    
    // IMPORTANT: Preserve ALL existing invoice-related fields
    // These are set by handleInvoicePaymentSucceeded and should never be lost
    const invoiceFieldsToPreserve = [
      'lastInvoiceAmount',
      'lastInvoiceCurrency', 
      'lastInvoiceDate',
      'lastInvoiceId',
      'lastInvoicePdf',
      'lastHostedInvoiceUrl',
      'lastPaymentMethod'
    ];
    
    // Copy over any existing invoice fields
    for (const field of invoiceFieldsToPreserve) {
      if (existingSubscription[field] !== undefined) {
        subscriptionUpdate[field] = existingSubscription[field];
      }
    }
    
    // Use update with merge to preserve other document fields
    // But completely replace the subscription object with our update
    await db.collection('users').doc(firebaseUID).set({
      subscription: subscriptionUpdate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Save to subscription history ONLY if this is a meaningful update
    // Skip history for new subscriptions (they already have payment_succeeded)
    // Skip "free plan" events unless it's a downgrade from a paid plan
    if (!isNewSubscription && (plan !== 'free' || subscription.cancel_at_period_end)) {
      // Check if this is actually a plan change or just a status update
      const previousPlan = existingSubscription.plan;
      const isActualPlanChange = previousPlan && previousPlan !== plan;
      
      // Only save history for actual changes, not routine updates
      if (isActualPlanChange || subscription.cancel_at_period_end || status === 'past_due') {
        // Determine the event type based on what changed
        let eventType = 'subscription_updated';
        if (subscription.cancel_at_period_end) {
          eventType = 'subscription_scheduled_cancellation';
        } else if (status === 'past_due') {
          eventType = 'payment_failed';
        }
        
        await saveSubscriptionHistory(firebaseUID, eventType, {
          status: status,
          plan: plan,
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toDate().toISOString() : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          previousPlan: previousPlan || null
        });
      }
    }
    
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
    
    // UPDATED: Use set() with merge to handle cases where user document doesn't exist
    await db.collection('users').doc(firebaseUID).set({
      subscription: subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
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
  
  // IMPORTANT: Update the Stripe customer with Firebase UID
  // This ensures future invoices can be linked to the user
  if (session.customer) {
    try {
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
      console.log('Updating customer metadata with Firebase UID:', customerId);
      await stripe.customers.update(customerId, {
        metadata: {
          firebaseUID: firebaseUID
        }
      });
      console.log('Customer metadata updated successfully');
    } catch (error) {
      console.error('Error updating customer metadata:', error);
    }
  }
  
  // For subscription mode, retrieve and process the subscription
  if (session.mode === 'subscription' && session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      console.log('Retrieved subscription from checkout:', subscription.id);
      // DON'T call handleSubscriptionUpdate here - it will be called by the subscription webhook
      // This prevents duplicate history entries
      // await handleSubscriptionUpdate(subscription);
    } catch (error) {
      console.error('Error retrieving subscription from checkout:', error);
    }
  }
}

/**
 * Log webhook events for monitoring and debugging
 */
async function logWebhookEvent(event: Stripe.Event, status: 'success' | 'error', errorMessage?: string) {
  try {
    const logData: any = {
      eventId: event.id,
      type: event.type,
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        // Store minimal relevant data
        objectId: (event.data.object as any).id,
        customerId: (event.data.object as any).customer
      }
    };
    
    // Only add errorMessage if it's defined to avoid Firestore validation errors
    if (errorMessage !== undefined) {
      logData.errorMessage = errorMessage;
    }
    
    await db.collection('webhook_logs').add(logData);
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
}

/**
 * Save subscription history event to Firestore with deduplication
 */
async function saveSubscriptionHistory(
  firebaseUID: string,
  eventType: string,
  details: any
) {
  try {
    console.log(`Starting saveSubscriptionHistory for user ${firebaseUID}, event: ${eventType}`);
    const historyRef = db.collection('users').doc(firebaseUID).collection('subscription_history');
    
    // Simplified deduplication for payment_succeeded events - check by invoiceId
    if (eventType === 'payment_succeeded' && details.invoiceId) {
      try {
        console.log(`Checking for duplicate invoice: ${details.invoiceId}`);
        const existingInvoice = await historyRef
          .where('invoiceId', '==', details.invoiceId)
          .limit(1)
          .get();
        
        if (!existingInvoice.empty) {
          console.log(`Invoice ${details.invoiceId} already exists in history, skipping`);
          return;
        }
      } catch (queryError) {
        console.log('Invoice deduplication query failed, will add anyway:', queryError);
      }
    }
    
    // For other event types, check for recent duplicates
    if (eventType !== 'payment_succeeded') {
      try {
        // Simpler query without compound index requirement
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        const recentEvents = await historyRef
          .where('type', '==', eventType)
          .limit(10)
          .get();
        
        // Check if this is a duplicate event
        for (const doc of recentEvents.docs) {
          const existingEvent = doc.data();
          const eventTime = existingEvent.timestamp?.toDate();
          if (eventTime && eventTime > thirtySecondsAgo &&
              existingEvent.plan === details.plan && 
              existingEvent.status === details.status) {
            console.log(`Skipping duplicate ${eventType} event for user ${firebaseUID} (found within 30s window)`);
            return;
          }
        }
      } catch (queryError) {
        console.log('Deduplication query failed, will add event anyway:', queryError);
      }
    }
    
    // Add event with unique identifier
    const eventData = {
      type: eventType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventId: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...details
    };
    
    console.log('Adding event to subscription_history:', JSON.stringify({
      type: eventData.type,
      plan: eventData.plan,
      amount: eventData.amount,
      invoiceId: eventData.invoiceId
    }));
    
    await historyRef.add(eventData);
    
    console.log(`Successfully saved subscription history event for user ${firebaseUID}: ${eventType}`);
  } catch (error) {
    console.error('Error saving subscription history:', error);
    console.error('Error stack:', error.stack);
    throw error; // Re-throw to be caught by caller
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Handling invoice payment succeeded:', invoice.id);
  console.log('Invoice customer:', invoice.customer);
  console.log('Invoice subscription:', invoice.subscription);
  
  // Get Firebase UID from customer metadata OR from subscription metadata
  let firebaseUID: string | undefined;
  
  if (invoice.customer) {
    try {
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      if ('deleted' in customer && customer.deleted) {
        console.log('Customer is deleted:', customer.id);
      } else {
        const activeCustomer = customer as Stripe.Customer;
        console.log('Customer retrieved:', activeCustomer.id, 'Email:', activeCustomer.email);
      }
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata.firebaseUID;
        console.log('Firebase UID from customer metadata:', firebaseUID || 'NOT FOUND');
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
    }
  }
  
  // If no Firebase UID in customer, try to get it from the subscription
  if (!firebaseUID && invoice.subscription) {
    console.log('Checking subscription for Firebase UID...');
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      console.log('Subscription metadata:', subscription.metadata);
      firebaseUID = subscription.metadata?.firebaseUID;
      console.log('Firebase UID from subscription:', firebaseUID || 'NOT FOUND');
      
      // If we found it in subscription, update the customer for future use
      if (firebaseUID && invoice.customer) {
        await stripe.customers.update(invoice.customer as string, {
          metadata: { firebaseUID }
        });
        console.log('Updated customer with Firebase UID from subscription');
      }
    } catch (error) {
      console.error('Error retrieving subscription for Firebase UID:', error);
    }
  }
  
  // Last resort: try to find user by email
  if (!firebaseUID && invoice.customer) {
    console.log('Trying to find user by email...');
    try {
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      if (customer && !customer.deleted && 'email' in customer && customer.email) {
        console.log('Searching for user with email:', customer.email);
        const usersSnapshot = await db.collection('users')
          .where('email', '==', customer.email)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          firebaseUID = usersSnapshot.docs[0].id;
          console.log(`Found Firebase UID by email: ${customer.email} -> ${firebaseUID}`);
          
          // Update customer metadata for future
          await stripe.customers.update(invoice.customer as string, {
            metadata: { firebaseUID }
          });
          console.log('Updated customer metadata with found Firebase UID');
        } else {
          console.log('No user found with email:', customer.email);
        }
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
    }
  }
  
  if (!firebaseUID) {
    console.error('CRITICAL: No firebaseUID found for invoice customer after all attempts');
    console.error('Invoice will not be saved to user history!');
    return;
  }
  
  console.log('SUCCESS: Found Firebase UID:', firebaseUID);
  
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
  
  // Determine plan - try subscription first, then fall back to line items
  let plan = 'unknown';
  
  // First try to get plan from the subscription itself (most reliable)
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const subPriceId = subscription.items.data[0]?.price.id;
      if (subPriceId) {
        const planMap: { [key: string]: string } = {
          // Production price IDs
          'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',
          'price_1RubMxHdrJomitOwElEo6nys': 'yearly',
          // Test price IDs
          'price_1RzIUUQkBRi5wGMEzm9veY3j': 'monthly',  // TEST monthly
          'price_1RzIVDQkBRi5wGME6v7ECis8': 'yearly'    // TEST yearly
        };
        plan = planMap[subPriceId] || 'unknown';
        console.log(`Plan detected from subscription: ${plan} (price: ${subPriceId})`);
      }
    } catch (error) {
      console.error('Error retrieving subscription for plan detection:', error);
    }
  }
  
  // Fall back to invoice line items if subscription lookup failed
  if (plan === 'unknown' && invoice.lines && invoice.lines.data.length > 0) {
    const priceId = invoice.lines.data[0].price?.id;
    if (priceId) {
      const planMap: { [key: string]: string } = {
        // Production price IDs
        'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',
        'price_1RubMxHdrJomitOwElEo6nys': 'yearly',
        // Test price IDs
        'price_1RzIUUQkBRi5wGMEzm9veY3j': 'monthly',  // TEST monthly
        'price_1RzIVDQkBRi5wGME6v7ECis8': 'yearly'    // TEST yearly
      };
      plan = planMap[priceId] || 'unknown';
      console.log(`Plan detected from invoice lines: ${plan} (price: ${priceId})`);
    }
  }
  
  // Save to subscription history
  console.log('Saving invoice to subscription history for user:', firebaseUID);
  console.log('Invoice data:', {
    id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    pdf: invoice.invoice_pdf ? 'Available' : 'Not available',
    hostedUrl: invoice.hosted_invoice_url ? 'Available' : 'Not available'
  });
  
  try {
    // Build details object, excluding undefined values
    const invoiceDetails: any = {
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining
    };
    
    // Only add optional fields if they have values
    if (invoice.tax !== null && invoice.tax !== undefined) {
      invoiceDetails.tax = invoice.tax;
    }
    if (invoice.subtotal !== null && invoice.subtotal !== undefined) {
      invoiceDetails.subtotal = invoice.subtotal;
    }
    if (invoice.total !== null && invoice.total !== undefined) {
      invoiceDetails.total = invoice.total;
    }
    if (invoice.period_start) {
      invoiceDetails.periodStart = new Date(invoice.period_start * 1000).toISOString();
    }
    if (invoice.period_end) {
      invoiceDetails.periodEnd = new Date(invoice.period_end * 1000).toISOString();
    }
    
    const historyData: any = {
      status: 'paid',
      plan: plan,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      invoiceId: invoice.id,
      details: invoiceDetails
    };
    
    // Add optional fields only if they exist
    if (invoice.number) {
      historyData.invoiceNumber = invoice.number;
    }
    if (invoice.invoice_pdf) {
      historyData.invoicePdf = invoice.invoice_pdf;
    }
    if (invoice.hosted_invoice_url) {
      historyData.hostedInvoiceUrl = invoice.hosted_invoice_url;
    }
    if (paymentMethodDetails) {
      historyData.paymentMethod = paymentMethodDetails;
    }
    
    await saveSubscriptionHistory(firebaseUID, 'payment_succeeded', historyData);
    console.log('Successfully saved invoice to subscription history');
  } catch (error) {
    console.error('ERROR saving invoice to subscription history:', error);
    console.error('Error details:', JSON.stringify(error));
    // Don't throw - continue with subscription update
  }
  
  // CRITICAL: Also update the main subscription record with invoice data
  // This ensures the subscription has the latest payment information
  try {
    await db.collection('users').doc(firebaseUID).update({
      'subscription.lastInvoiceAmount': invoice.amount_paid,
      'subscription.lastInvoiceCurrency': invoice.currency,
      'subscription.lastInvoiceDate': admin.firestore.Timestamp.now(),
      'subscription.lastInvoiceId': invoice.id,
      'subscription.lastInvoicePdf': invoice.invoice_pdf,
      'subscription.lastHostedInvoiceUrl': invoice.hosted_invoice_url,
      'subscription.lastPaymentMethod': paymentMethodDetails,
      'subscription.metadata.lastPaymentUpdate': admin.firestore.Timestamp.now()
    });
    console.log(`Updated main subscription with invoice data for user ${firebaseUID}`);
  } catch (error) {
    console.error('Error updating subscription with invoice data:', error);
  }
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

/**
 * Handle charge refunds with comprehensive business logic
 * 
 * BUSINESS POLICY:
 * - IMMEDIATE downgrade to 'free' plan upon ANY refund (no grace period)
 * - Set subscription status to 'canceled' 
 * - Clear all premium entitlements immediately
 * - Full audit trail for compliance
 * - Handle both partial and full refunds
 * - Robust error handling for edge cases
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const refundId = `refund_${charge.id}_${Date.now()}`;
  console.log(`🔴 REFUND PROCESSING START [${refundId}]`);
  console.log('Charge ID:', charge.id);
  console.log('Original amount:', charge.amount);
  console.log('Refunded amount:', charge.amount_refunded);
  console.log('Currency:', charge.currency);
  
  // Step 1: Validate refund data
  if (!charge.amount_refunded || charge.amount_refunded <= 0) {
    console.error('❌ Invalid refund amount:', charge.amount_refunded);
    await logRefundEvent(refundId, 'error', 'Invalid refund amount', { charge: charge.id });
    return;
  }
  
  // Additional safety checks
  if (!charge.id) {
    console.error('❌ Missing charge ID');
    await logRefundEvent(refundId, 'error', 'Missing charge ID', { charge: charge });
    return;
  }
  
  if (!charge.customer) {
    console.error('❌ No customer associated with refunded charge');
    await logRefundEvent(refundId, 'error', 'No customer in refunded charge', { 
      chargeId: charge.id,
      amount: charge.amount_refunded 
    });
    return;
  }
  
  // Validate refund amount is not larger than original charge
  if (charge.amount_refunded > charge.amount) {
    console.error('❌ Refund amount exceeds original charge amount');
    await logRefundEvent(refundId, 'error', 'Refund exceeds original charge', {
      chargeId: charge.id,
      originalAmount: charge.amount,
      refundAmount: charge.amount_refunded
    });
    return;
  }
  
  // Step 2: Determine refund type
  const isFullRefund = charge.amount_refunded >= charge.amount;
  console.log(`Refund type: ${isFullRefund ? 'FULL' : 'PARTIAL'} (${charge.amount_refunded}/${charge.amount})`);
  
  // Step 3: Get Firebase UID with multiple fallback strategies
  let firebaseUID: string | undefined;
  let userLookupMethod = 'unknown';
  
  // Strategy 1: From customer metadata
  if (typeof charge.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(charge.customer);
      if (!customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata?.firebaseUID;
        if (firebaseUID) {
          userLookupMethod = 'customer_metadata';
          console.log(`✅ Found Firebase UID via customer metadata: ${firebaseUID}`);
        }
      }
    } catch (error) {
      console.error('❌ Error retrieving customer:', error);
    }
  }
  
  // Strategy 2: From associated subscription
  if (!firebaseUID && charge.invoice) {
    try {
      const invoice = await stripe.invoices.retrieve(charge.invoice as string);
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        firebaseUID = subscription.metadata?.firebaseUID;
        if (firebaseUID) {
          userLookupMethod = 'subscription_metadata';
          console.log(`✅ Found Firebase UID via subscription metadata: ${firebaseUID}`);
        }
      }
    } catch (error) {
      console.error('❌ Error retrieving invoice/subscription:', error);
    }
  }
  
  // Strategy 3: From customer email lookup
  if (!firebaseUID && typeof charge.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(charge.customer);
      if (!customer.deleted && 'email' in customer && customer.email) {
        const usersSnapshot = await db.collection('users')
          .where('email', '==', customer.email)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          firebaseUID = usersSnapshot.docs[0].id;
          userLookupMethod = 'email_lookup';
          console.log(`✅ Found Firebase UID via email lookup: ${firebaseUID}`);
        }
      }
    } catch (error) {
      console.error('❌ Error looking up user by email:', error);
    }
  }
  
  // Step 4: Handle case where user cannot be found
  if (!firebaseUID) {
    console.error('❌ CRITICAL: Cannot find Firebase UID for refunded charge');
    console.error('This means a refund occurred but we cannot revoke the user\'s access!');
    
    // Log this critical error for manual intervention
    await logRefundEvent(refundId, 'critical_error', 'User not found for refund', {
      chargeId: charge.id,
      customerId: charge.customer,
      amount: charge.amount_refunded,
      currency: charge.currency,
      requiresManualIntervention: true
    });
    
    // Create alert in dedicated collection for admin monitoring
    await db.collection('critical_alerts').add({
      type: 'refund_user_not_found',
      severity: 'high',
      chargeId: charge.id,
      customerId: charge.customer,
      refundAmount: charge.amount_refunded,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
      message: 'Refund processed but user not found - requires manual access revocation'
    });
    
    return;
  }
  
  console.log(`🎯 Processing refund for user: ${firebaseUID} (found via ${userLookupMethod})`);
  
  // Step 5: Get current user subscription state
  let currentSubscription: any = null;
  try {
    const userDoc = await db.collection('users').doc(firebaseUID).get();
    if (userDoc.exists) {
      currentSubscription = userDoc.data()?.subscription;
      console.log('Current subscription status:', currentSubscription?.status);
      console.log('Current plan:', currentSubscription?.plan);
    } else {
      console.warn('❌ User document does not exist:', firebaseUID);
    }
  } catch (error) {
    console.error('❌ Error fetching current user data:', error);
  }
  
  // Step 6: Handle edge case - user already downgraded
  if (currentSubscription?.plan === 'free' && currentSubscription?.status === 'canceled') {
    console.log('⚠️ User already downgraded to free plan - logging refund but no status change needed');
    
    // Still log the refund for audit purposes
    await saveSubscriptionHistory(firebaseUID, 'refund_duplicate', {
      status: 'already_free',
      plan: 'free',
      refundAmount: charge.amount_refunded,
      chargeId: charge.id,
      refundType: isFullRefund ? 'full' : 'partial',
      note: 'User was already on free plan when refund processed'
    });
    
    await logRefundEvent(refundId, 'success', 'Refund logged for already-free user', {
      firebaseUID,
      chargeId: charge.id,
      amount: charge.amount_refunded
    });
    
    return;
  }
  
  // Step 7: BUSINESS POLICY - Immediate downgrade regardless of refund type
  // Even partial refunds result in immediate cancellation (strict policy)
  try {
    console.log('🔥 IMPLEMENTING IMMEDIATE DOWNGRADE POLICY');
    
    // Build the new subscription data
    const refundedSubscriptionData: any = {
      // IMMEDIATE downgrade - no grace period
      plan: 'free',
      status: 'canceled',
      cancelReason: 'refunded',
      
      // Refund tracking
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundAmount: charge.amount_refunded,
      refundChargeId: charge.id,
      refundType: isFullRefund ? 'full' : 'partial',
      
      // Clear ALL premium entitlements immediately
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      
      // Preserve audit trail
      metadata: {
        source: 'refund_webhook',
        previousPlan: currentSubscription?.plan || 'unknown',
        previousStatus: currentSubscription?.status || 'unknown',
        refundProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        userLookupMethod: userLookupMethod,
        refundId: refundId,
        originalAmount: charge.amount,
        refundedAmount: charge.amount_refunded,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    
    // Step 8: Update user subscription with atomic operation
    await db.collection('users').doc(firebaseUID).set({
      subscription: refundedSubscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ User subscription updated to free plan');
    
    // Step 9: Record in subscription history
    await saveSubscriptionHistory(firebaseUID, 'refunded', {
      status: 'refunded',
      plan: 'free',
      refundAmount: charge.amount_refunded,
      chargeId: charge.id,
      refundType: isFullRefund ? 'full' : 'partial',
      previousPlan: currentSubscription?.plan || 'unknown',
      previousStatus: currentSubscription?.status || 'unknown',
      originalAmount: charge.amount,
      currency: charge.currency,
      userLookupMethod: userLookupMethod,
      refundId: refundId,
      policyApplied: 'immediate_downgrade_no_grace_period'
    });
    
    console.log('✅ Subscription history updated');
    
    // Step 10: Cancel any active Stripe subscription
    if (currentSubscription?.stripeSubscriptionId) {
      try {
        console.log('🔄 Canceling active Stripe subscription:', currentSubscription.stripeSubscriptionId);
        await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId);
        console.log('✅ Stripe subscription canceled');
      } catch (stripeError) {
        console.error('❌ Error canceling Stripe subscription:', stripeError);
        // Don't throw - user is already downgraded in our system
      }
    }
    
    // Step 11: Log successful refund processing
    await logRefundEvent(refundId, 'success', 'Refund processed successfully', {
      firebaseUID,
      chargeId: charge.id,
      amount: charge.amount_refunded,
      refundType: isFullRefund ? 'full' : 'partial',
      previousPlan: currentSubscription?.plan,
      userLookupMethod
    });
    
    console.log(`✅ REFUND PROCESSING COMPLETE [${refundId}] - User ${firebaseUID} downgraded to free`);
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR processing refund:', error);
    
    // Log the error for manual intervention
    await logRefundEvent(refundId, 'processing_error', error instanceof Error ? error.message : 'Unknown error', {
      firebaseUID,
      chargeId: charge.id,
      amount: charge.amount_refunded,
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    // Create high-priority alert
    await db.collection('critical_alerts').add({
      type: 'refund_processing_error',
      severity: 'high',
      firebaseUID,
      chargeId: charge.id,
      refundAmount: charge.amount_refunded,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
      message: 'Refund processing failed - user may still have premium access'
    });
    
    throw error;
  }
}

/**
 * Log refund events for audit trail and monitoring
 * 
 * Creates comprehensive audit logs for all refund-related events:
 * - Successful refund processing
 * - Error conditions 
 * - Critical failures requiring manual intervention
 */
async function logRefundEvent(
  refundId: string,
  status: 'success' | 'error' | 'critical_error' | 'processing_error',
  message: string,
  details: Record<string, unknown>
) {
  try {
    const logEntry = {
      refundId,
      status,
      message,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'stripe_webhook_refund',
      
      // Add severity level for monitoring
      severity: status === 'critical_error' || status === 'processing_error' ? 'high' : 
                status === 'error' ? 'medium' : 'low',
      
      // Flag for manual review if needed
      requiresReview: status === 'critical_error',
      
      // Environment context
      environment: process.env.NODE_ENV || 'unknown'
    };
    
    // Store in dedicated refund audit log collection
    await db.collection('refund_audit_logs').add(logEntry);
    
    // For high-severity issues, also store in general audit collection
    if (status === 'critical_error' || status === 'processing_error') {
      await db.collection('audit_logs').add({
        ...logEntry,
        type: 'refund_processing_issue'
      });
    }
    
    console.log(`📝 Refund event logged: ${status} - ${message}`);
  } catch (error) {
    console.error('❌ Failed to log refund event:', error);
    // Don't throw - logging failure shouldn't break refund processing
  }
}
