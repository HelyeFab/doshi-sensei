const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Firebase Admin
const admin = require('firebase-admin');

let db;
let firebaseInitialized = false;

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account from environment variable
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id
      });
      db = admin.firestore();
      firebaseInitialized = true;
      console.log('Firebase Admin initialized with service account');
    } else {
      console.log('Warning: No Firebase service account found, Firebase operations will be skipped');
      firebaseInitialized = false;
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    firebaseInitialized = false;
  }
}

exports.handler = async (event) => {
  console.log('Netlify Function: api-stripe-webhook called');
  console.log('Method:', event.httpMethod);
  
  // Handle GET requests for testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: 'Stripe webhook endpoint is active',
        timestamp: new Date().toISOString()
      }),
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  // Check if webhook secret is configured
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook secret not configured' }),
    };
  }

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    console.error('Signature header:', signature);
    console.error('Webhook secret exists:', !!webhookSecret);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // Check for idempotency - prevent duplicate processing
  const idempotencyKey = stripeEvent.id;
  
  if (firebaseInitialized && db) {
    try {
      const processedEventRef = db.doc(`webhook_events/${idempotencyKey}`);
      const existingEvent = await processedEventRef.get();
      if (existingEvent.exists) {
        console.log(`Webhook event ${idempotencyKey} already processed, skipping`);
        return {
          statusCode: 200,
          body: JSON.stringify({ received: true, duplicate: true }),
        };
      }
    } catch (error) {
      console.error('Error checking idempotency:', error);
      // Continue processing if idempotency check fails
    }
  }

  try {
    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(stripeEvent.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    // Mark event as processed
    if (firebaseInitialized && db) {
      try {
        const processedEventRef = db.doc(`webhook_events/${stripeEvent.id}`);
        await processedEventRef.set({
          eventId: stripeEvent.id,
          type: stripeEvent.type,
          processedAt: new Date(),
          result: 'success'
        });
      } catch (error) {
        console.error('Error marking event as processed:', error);
      }

      // Log successful processing
      await logWebhookEvent(stripeEvent, 'success');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Event type:', stripeEvent.type);
    console.error('Event data:', JSON.stringify(stripeEvent.data.object, null, 2));

    // Log failed processing
    await logWebhookEvent(stripeEvent, 'error', error.message || 'Unknown error');

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
};

async function handleCheckoutCompleted(session) {
  // Handle donations (one-time payments)
  if (session.mode === 'payment' && session.metadata?.type === 'donation') {
    console.log('Donation received:', session);
    return;
  }

  // Handle subscriptions
  const firebaseUID = session.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('No Firebase UID in checkout session metadata');
    return;
  }

  console.log('Checkout completed for user:', firebaseUID);
  
  // For subscription mode, we need to retrieve the subscription
  if (session.mode === 'subscription' && session.subscription) {
    try {
      // Retrieve the full subscription object
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log('Retrieved subscription from checkout:', subscription.id);
      
      // Process the subscription update
      await handleSubscriptionUpdate(subscription);
    } catch (error) {
      console.error('Error retrieving subscription from checkout:', error);
    }
  }
}

async function handleSubscriptionUpdate(subscription) {
  console.log('🔔 Processing subscription update:', subscription.id);
  console.log('Subscription status:', subscription.status);
  console.log('Customer ID:', subscription.customer);
  
  // First try to get firebaseUID from subscription metadata
  let firebaseUID = subscription.metadata?.firebaseUID;
  console.log('Firebase UID from subscription metadata:', firebaseUID);
  
  // If not found in subscription metadata, try to get it from customer
  if (!firebaseUID && typeof subscription.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer && !customer.deleted && customer.metadata) {
        firebaseUID = customer.metadata?.firebaseUID;
        console.log('Found firebaseUID in customer metadata:', firebaseUID);
      }
    } catch (error) {
      console.error('Error retrieving customer:', error);
    }
  }

  if (!firebaseUID) {
    console.error('❌ No Firebase UID found in subscription or customer metadata.');
    console.error('Subscription ID:', subscription.id);
    console.error('Customer ID:', subscription.customer);
    console.error('Subscription metadata:', subscription.metadata);
    return;
  }

  console.log('✅ Processing subscription for Firebase UID:', firebaseUID);

  // Log subscription event for user history
  await logUserSubscriptionEvent(firebaseUID, {
    type: subscription.status === 'active' ? 'subscription_started' : 'subscription_updated',
    status: subscription.status,
    plan: subscription.items.data[0]?.price.id === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ? 'yearly' : 'monthly',
    timestamp: new Date(),
    details: {
      subscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    }
  });

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan = 'monthly';

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) {
    plan = 'yearly';
  }

  // For Netlify function, we'll use hardcoded limits
  // In production, you might want to fetch these from a config
  const limits = {
    free: {
      maxLists: 3,
      maxDrillsPerDay: 3,
      maxKanjiQuestPerDay: 3,
      maxStoriesPerDay: 1,
      maxArticlesPerDay: 3,
      maxKanaDropPerDay: 3,
      canSync: false,
      canSave: true
    },
    premium: {
      maxLists: -1,
      maxDrillsPerDay: -1,
      maxKanjiQuestPerDay: -1,
      maxStoriesPerDay: -1,
      maxArticlesPerDay: -1,
      maxKanaDropPerDay: -1,
      canSync: true,
      canSave: true
    }
  };

  const isPremium = (plan === 'monthly' || plan === 'yearly') && subscription.status === 'active';
  const userLimits = isPremium ? limits.premium : limits.free;

  // Create subscription object
  const subscriptionData = {
    userId: firebaseUID,
    status: subscription.status,
    plan: subscription.status === 'active' ? plan : 'free',
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    metadata: {
      source: 'stripe',
      createdAt: new Date(subscription.created * 1000),
      updatedAt: new Date()
    }
  };

  // Use transaction to prevent race conditions
  const userDocRef = db.doc(`users/${firebaseUID}`);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    const currentData = userDoc.data() || {};

    // Build the complete user subscription data
    const userSubscriptionData = {
      subscription: subscriptionData,
      limits: userLimits,
      currentUsage: currentData.currentUsage || {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: new Date().toISOString().split('T')[0],
        kanjiQuestToday: 0,
        lastKanjiQuestDate: new Date().toISOString().split('T')[0],
        kanaDropToday: 0,
        lastKanaDropDate: new Date().toISOString().split('T')[0],
        storiesToday: 0,
        lastStoryDate: new Date().toISOString().split('T')[0],
        articlesToday: 0,
        lastArticleDate: new Date().toISOString().split('T')[0]
      }
    };

    // Update the user document
    transaction.set(userDocRef, userSubscriptionData, { merge: true });
    
    console.log(`✅ Updated subscription for user ${firebaseUID}: ${isPremium ? 'premium' : 'free'}`);
  });

  console.log('🎉 Subscription update completed successfully for:', firebaseUID);
  console.log('Plan:', plan);
  console.log('Status:', subscription.status);
}

async function handleSubscriptionDeleted(subscription) {
  // First try to get firebaseUID from subscription metadata
  let firebaseUID = subscription.metadata?.firebaseUID;
  
  // If not found in subscription metadata, try to get it from customer
  if (!firebaseUID && typeof subscription.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer && !customer.deleted && customer.metadata) {
        firebaseUID = customer.metadata?.firebaseUID;
        console.log('Found firebaseUID in customer metadata for deletion:', firebaseUID);
      }
    } catch (error) {
      console.error('Error retrieving customer for deletion:', error);
    }
  }

  if (!firebaseUID) {
    console.error('No Firebase UID found in subscription or customer metadata (deleted event). Subscription ID:', subscription.id);
    return;
  }

  // Log cancellation event
  await logUserSubscriptionEvent(firebaseUID, {
    type: 'subscription_canceled',
    status: 'canceled',
    plan: 'free',
    timestamp: new Date(),
    details: {
      subscriptionId: subscription.id,
      canceledAt: new Date()
    }
  });

  // Free user limits
  const freeLimits = {
    maxLists: 3,
    maxDrillsPerDay: 3,
    maxKanjiQuestPerDay: 3,
    maxStoriesPerDay: 1,
    maxArticlesPerDay: 3,
    maxKanaDropPerDay: 3,
    canSync: false,
    canSave: true
  };

  // Create canceled subscription object
  const subscriptionData = {
    userId: firebaseUID,
    status: 'canceled',
    plan: 'free',
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: null,
    cancelAtPeriodEnd: false,
    metadata: {
      source: 'stripe',
      createdAt: new Date(subscription.created * 1000),
      updatedAt: new Date()
    }
  };

  // Use transaction to prevent race conditions
  const userDocRef = db.doc(`users/${firebaseUID}`);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    const currentData = userDoc.data() || {};

    // Revert to free plan
    const userSubscriptionData = {
      subscription: subscriptionData,
      limits: freeLimits,
      currentUsage: currentData.currentUsage || {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: new Date().toISOString().split('T')[0],
        kanjiQuestToday: 0,
        lastKanjiQuestDate: new Date().toISOString().split('T')[0],
        kanaDropToday: 0,
        lastKanaDropDate: new Date().toISOString().split('T')[0],
        storiesToday: 0,
        lastStoryDate: new Date().toISOString().split('T')[0],
        articlesToday: 0,
        lastArticleDate: new Date().toISOString().split('T')[0]
      }
    };

    transaction.set(userDocRef, userSubscriptionData, { merge: true });
    
    console.log(`Subscription canceled for user ${firebaseUID}, reverted to free plan`);
  });
}

async function handlePaymentSucceeded(invoice) {
  if (invoice.subscription) {
    console.log('Payment succeeded for subscription:', invoice.subscription);
  }
}

async function handlePaymentFailed(invoice) {
  if (invoice.subscription && invoice.customer_email) {
    console.log('Payment failed for subscription:', invoice.subscription);
    
    // Try to find the user by their stripe customer ID
    const customerId = invoice.customer;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.metadata) {
          const firebaseUID = customer.metadata?.firebaseUID;
          if (firebaseUID) {
            await logUserSubscriptionEvent(firebaseUID, {
              type: 'payment_failed',
              status: 'payment_failed',
              plan: 'current',
              timestamp: new Date(),
              details: {
                invoiceId: invoice.id,
                amountDue: invoice.amount_due / 100, // Convert from cents
                currency: invoice.currency
              }
            });
          }
        }
      } catch (error) {
        console.error('Error retrieving customer for payment failure:', error);
      }
    }
  }
}

async function logWebhookEvent(event, status, errorMessage) {
  try {
    const logData = {
      eventId: event.id,
      type: event.type,
      status,
      timestamp: new Date(),
      data: {
        objectId: event.data.object.id || 'unknown',
        customerId: event.data.object.customer || 'unknown'
      }
    };
    
    if (errorMessage) {
      logData.errorMessage = errorMessage;
    }
    
    await db.collection('webhook_logs').add(logData);
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
}

async function logUserSubscriptionEvent(userId, event) {
  try {
    const userSubscriptionRef = db.collection('users').doc(userId).collection('subscription_history');
    await userSubscriptionRef.add(event);
    
    console.log(`Logged subscription event for user ${userId}:`, event.type);
  } catch (error) {
    console.error('Error logging user subscription event:', error);
  }
}