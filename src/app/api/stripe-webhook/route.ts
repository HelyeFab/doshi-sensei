import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, setDoc, getDoc, runTransaction, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { entitlementManager } from '@/lib/entitlements/manager';
import { subscriptionManager } from '@/lib/subscriptions/manager';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { UserType } from '@/lib/entitlements/types';
import { Subscription } from '@/lib/subscriptions/types';
import { InvoiceService } from '@/services/invoiceService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function GET() {
  return NextResponse.json({ 
    status: 'DISABLED - Webhook processing moved to Cloud Functions',
    message: 'This endpoint has been disabled to prevent race conditions. All webhook processing is now handled by Google Cloud Functions.',
    timestamp: new Date().toISOString(),
    migrationDate: '2025-01-23'
  });
}

// PRODUCTION CRITICAL: This endpoint is PERMANENTLY DISABLED
// All Stripe webhooks MUST be processed by Cloud Functions at:
// https://stripewebhook-jtmxvmnera-uc.a.run.app
// RE-ENABLING THIS WILL CAUSE DUPLICATE CHARGES AND DATA CORRUPTION

export async function POST(request: NextRequest) {
  console.error('🚨 CRITICAL: Webhook sent to disabled endpoint - check Stripe Dashboard configuration');
  console.error('Correct webhook URL: https://stripewebhook-jtmxvmnera-uc.a.run.app');
  
  return NextResponse.json(
    { 
      error: 'Webhook endpoint disabled', 
      message: 'This endpoint has been disabled to prevent duplicate processing. Webhooks are now handled by Google Cloud Functions.',
      migration: 'Please update your Stripe Dashboard webhook URL to use the Cloud Function endpoint instead.'
    }, 
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
  
  // ORIGINAL CODE BELOW - DO NOT DELETE YET (for reference during migration)
  /*
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Check for idempotency - prevent duplicate processing
  const idempotencyKey = event.id;
  const processedEventRef = doc(db, 'webhook_events', idempotencyKey);

  try {
    const existingEvent = await getDoc(processedEventRef);
    if (existingEvent.exists()) {

      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (error) {
    console.error('Error checking idempotency:', error);
    // Continue processing if idempotency check fails
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:

    }

    // Mark event as processed
    try {
      await setDoc(processedEventRef, {
        eventId: event.id,
        type: event.type,
        processedAt: new Date(),
        result: 'success'
      });
    } catch (error) {
      console.error('Error marking event as processed:', error);
    }

    // Log successful processing
    await logWebhookEvent(event, 'success');

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Event type:', event.type);
    console.error('Event data:', JSON.stringify(event.data.object, null, 2));

    // Log failed processing
    await logWebhookEvent(event, 'error', error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Handle donations (one-time payments)
  if (session.mode === 'payment' && session.metadata?.type === 'donation') {
    // Log the donation
    try {
      // You could store donation records in Firestore here if needed

    } catch (error) {
      console.error('Error logging donation:', error);
    }
    return;
  }

  // Handle subscriptions
  const firebaseUID = session.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('No Firebase UID in checkout session metadata');
    return;
  }

  // The subscription will be handled by the subscription.created event
  // This is mainly for logging and any additional setup needed

}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {

  // First try to get firebaseUID from subscription metadata
  let firebaseUID = subscription.metadata?.firebaseUID;

  // If not found in subscription metadata, try to get it from customer
  if (!firebaseUID && typeof subscription.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata?.firebaseUID;

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

  // Determine the event type based on subscription state changes
  let eventType: 'subscription_started' | 'subscription_updated' | 'subscription_canceled' = 'subscription_updated';
  
  // Check if this is a new subscription (first time active)
  const userDocRef = doc(db, 'users', firebaseUID);
  const userDoc = await getDoc(userDocRef);
  const currentSubscription = userDoc.data()?.subscription;
  
  if (subscription.status === 'active' && (!currentSubscription || currentSubscription.status !== 'active')) {
    eventType = 'subscription_started';
  } else if (subscription.cancel_at_period_end && !currentSubscription?.cancelAtPeriodEnd) {
    // User just initiated cancellation
    eventType = 'subscription_canceled';
  }

  // Log subscription event for user history with deduplication
  await logUserSubscriptionEvent(firebaseUID, {
    type: eventType,
    status: subscription.status,
    plan: subscription.items.data[0]?.price.id === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ? 'yearly' : 'monthly',
    timestamp: new Date(),
    details: {
      subscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    }
  }, subscription.id);

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan: 'monthly' | 'yearly' = 'monthly';

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) {
    plan = 'yearly';
  }

  // Get current entitlement rules (dynamic or static)
  const rules = await dynamicRules.getRules();
  
  // Determine user type based on plan (not status!)
  // Users keep their plan benefits even with payment issues
  let userType: UserType = 'free';
  if (plan === 'monthly' || plan === 'yearly') {
    userType = plan;
  }
  
  // Get entitlements for this user type
  const entitlementRule = rules.find(r => r.userTypes.includes(userType));
  const limits = entitlementRule?.limits || { daily: {}, total: {} };

  // Create subscription object using our new structure
  const subscriptionData: Subscription = {
    userId: firebaseUID,
    status: subscription.status as any,
    plan: plan,  // Always use actual plan, regardless of status
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    metadata: {
      source: 'stripe',
      createdAt: new Date(subscription.created * 1000),
      updatedAt: new Date()
    }
  };

  // Use transaction to prevent race conditions (reuse userDocRef from above)

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    const currentData = userDoc.data();

    // Build the complete user subscription data
    const userSubscriptionData = {
      subscription: subscriptionData,
      limits: {
        maxLists: limits.total?.word_lists ?? (userType === 'free' ? 3 : -1),
        maxDrillsPerDay: limits.daily?.drill_practice ?? (userType === 'free' ? 3 : -1),
        maxKanjiQuestPerDay: limits.daily?.games ?? (userType === 'free' ? 3 : -1),
        maxStoriesPerDay: limits.daily?.story_reading ?? (userType === 'free' ? 1 : -1),
        maxArticlesPerDay: limits.daily?.article_reading ?? (userType === 'free' ? 3 : -1),
        maxKanaDropPerDay: limits.daily?.games ?? (userType === 'free' ? 3 : -1),
        canSync: userType !== 'free',
        canSave: true
      },
      currentUsage: currentData?.currentUsage || {
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

    // Update the user document with the new structure
    transaction.set(userDocRef, userSubscriptionData, { merge: true });

  });

}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // First try to get firebaseUID from subscription metadata
  let firebaseUID = subscription.metadata?.firebaseUID;
  
  // If not found in subscription metadata, try to get it from customer
  if (!firebaseUID && typeof subscription.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer && !customer.deleted && 'metadata' in customer) {
        firebaseUID = customer.metadata?.firebaseUID;

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

  // Get free user entitlements
  const rules = await dynamicRules.getRules();
  const freeRule = rules.find(r => r.userTypes.includes('free'));
  const limits = freeRule?.limits || { daily: {}, total: {} };

  // Create canceled subscription object
  const subscriptionData: Subscription = {
    userId: firebaseUID,
    status: 'canceled',
    plan: 'free',
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: undefined,
    cancelAtPeriodEnd: false,
    metadata: {
      source: 'stripe',
      createdAt: new Date(subscription.created * 1000),
      updatedAt: new Date()
    }
  };

  // Use transaction to prevent race conditions
  const userDocRef = doc(db, 'users', firebaseUID);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    const currentData = userDoc.data();

    // Revert to free plan with free limits
    const userSubscriptionData = {
      subscription: subscriptionData,
      limits: {
        maxLists: limits.total?.word_lists ?? 3,
        maxDrillsPerDay: limits.daily?.drill_practice ?? 3,
        maxKanjiQuestPerDay: limits.daily?.games ?? 3,
        maxStoriesPerDay: limits.daily?.story_reading ?? 1,
        maxArticlesPerDay: limits.daily?.article_reading ?? 3,
        maxKanaDropPerDay: limits.daily?.games ?? 3,
        canSync: false,
        canSave: true
      },
      currentUsage: currentData?.currentUsage || {
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

  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription) {
    // Subscription status will be updated via subscription.updated event
    console.log('Payment succeeded for subscription:', (invoice as any).subscription);
    
    // Generate and store custom invoice PDF
    try {
      // Get customer details
      const customerId = invoice.customer as string;
      let firebaseUID: string | undefined;
      let customer: Stripe.Customer | Stripe.DeletedCustomer | string | undefined;
      
      if (customerId) {
        customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && 'metadata' in customer) {
          firebaseUID = customer.metadata?.firebaseUID;
        }
      }
      
      if (firebaseUID) {
        // Format the invoice data
        const invoiceData = InvoiceService.formatStripeInvoice(invoice, customer);
        
        // Generate and upload the PDF
        const pdfUrl = await InvoiceService.generateAndUploadInvoice(invoiceData, firebaseUID);
        
        // Store the PDF URL in the subscription history
        await logUserSubscriptionEvent(firebaseUID, {
          type: 'payment_succeeded',
          status: 'paid',
          plan: 'premium',
          timestamp: new Date(),
          amount: invoice.total / 100,
          currency: invoice.currency,
          invoiceId: invoice.id,
          invoicePdf: pdfUrl,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          paymentMethod: invoiceData.paymentMethod,
          details: {
            invoiceNumber: invoice.number || invoice.id,
            customInvoicePdf: pdfUrl,
            stripeInvoiceUrl: invoice.hosted_invoice_url,
            amountPaid: invoice.amount_paid / 100,
            currency: invoice.currency
          }
        }, invoice.id);

      } else {

      }
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      // Don't fail the webhook - invoice generation is not critical
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription && invoice.customer_email) {
    // Subscription status will be updated via subscription.updated event
    console.log('Payment failed for subscription:', (invoice as any).subscription);
    
    // Try to find the user by their stripe customer ID
    const customerId = invoice.customer as string;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && 'metadata' in customer) {
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
            }, invoice.id);
          }
        }
      } catch (error) {
        console.error('Error retrieving customer for payment failure:', error);
      }
    }
  }
}

async function logWebhookEvent(event: Stripe.Event, status: 'success' | 'error', errorMessage?: string) {
  try {
    await addDoc(collection(db, 'webhook_logs'), {
      eventId: event.id,
      type: event.type,
      status,
      errorMessage,
      timestamp: new Date(),
      data: {
        // Store minimal relevant data
        objectId: (event.data.object as any).id,
        customerId: (event.data.object as any).customer
      }
    });
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
}

async function logUserSubscriptionEvent(userId: string, event: {
  type: 'subscription_started' | 'subscription_updated' | 'subscription_canceled' | 'payment_failed' | 'payment_succeeded';
  status: string;
  plan: string;
  timestamp: Date;
  amount?: number;
  currency?: string;
  invoiceId?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  paymentMethod?: string;
  details?: any;
}, deduplicationKey?: string) {
  try {
    // Create a user-friendly subscription event log
    const userSubscriptionRef = collection(db, 'users', userId, 'subscription_history');
    
    // STRONG DEDUPLICATION: Check for ANY recent event of the same type within 30 seconds
    // This will prevent multiple webhook endpoints from creating duplicate entries
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    
    // Query for recent events with the same type
    const recentEventsQuery = query(
      userSubscriptionRef, 
      where('type', '==', event.type),
      orderBy('timestamp', 'desc'),
      limit(5) // Check last 5 events
    );
    
    try {
      const recentEvents = await getDocs(recentEventsQuery);
      
      for (const doc of recentEvents.docs) {
        const existingEvent = doc.data();
        const eventTime = existingEvent.timestamp?.toDate ? existingEvent.timestamp.toDate() : new Date(existingEvent.timestamp);
        
        // Check if this is a duplicate event (same type, plan, and status within 30 seconds)
        if (eventTime > thirtySecondsAgo && 
            existingEvent.plan === event.plan && 
            existingEvent.status === event.status) {
          
          // For subscription updates, also check if the subscription ID matches
          if (event.details?.subscriptionId && existingEvent.details?.subscriptionId) {
            if (event.details.subscriptionId === existingEvent.details.subscriptionId) {
              console.log(`Skipping duplicate ${event.type} event for user ${userId} (found within 30s window)`);
              return;
            }
          } else {
            // For events without subscription ID, just check type/plan/status match
            console.log(`Skipping duplicate ${event.type} event for user ${userId} (no subscription ID, but same type/plan/status within 30s)`);
            return;
          }
        }
      }
    } catch (queryError) {
      // If the query fails (possibly due to missing index), fall back to adding the event
      console.log('Deduplication query failed, will add event anyway:', queryError);
    }
    
    // Add a unique identifier to help with debugging
    const eventWithId = {
      ...event,
      eventId: `${event.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date() // Track when this was actually added to help debug duplicates
    };
    
    await addDoc(userSubscriptionRef, eventWithId);
    console.log(`Added ${event.type} event to subscription history for user ${userId}`);

  } catch (error) {
    console.error('Error logging user subscription event:', error);
    // Don't throw - this is not critical to the webhook processing
  }
}
*/
}