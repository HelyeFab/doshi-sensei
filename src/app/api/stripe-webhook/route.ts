import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, setDoc, getDoc, runTransaction, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getEntitlementsForUserType, getFeatureLimit } from '@/utils/userEntitlements';
import { UserType } from '@/types/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
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
      console.log(`Webhook event ${idempotencyKey} already processed, skipping`);
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
    await setDoc(processedEventRef, {
      eventId: event.id,
      eventType: event.type,
      processedAt: new Date().toISOString(),
      success: true
    });

    // Log successful processing
    await logWebhookEvent(event, 'success');

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);

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
    return;
  }


  // The subscription will be handled by the subscription.created event
  // This is mainly for logging and any additional setup needed
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const firebaseUID = subscription.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('No Firebase UID found in subscription metadata. Full subscription object:', JSON.stringify(subscription, null, 2));
    return;
  }

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan: 'monthly' | 'yearly' = 'monthly';

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) {
    plan = 'yearly';
  }

  // Use transaction to prevent race conditions
  const userDocRef = doc(db, 'users', firebaseUID);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    const currentData = userDoc.data();

    // Validate subscription status
    const validStatuses = ['active', 'trialing', 'past_due', 'canceled', 'unpaid'];
    if (!validStatuses.includes(subscription.status)) {
      throw new Error(`Invalid subscription status: ${subscription.status}`);
    }

    // Build updated subscription data
    const updatedSubscription = {
      ...currentData?.subscription,
      subscription: {
        status: subscription.status,
        plan: plan,
        renewalDate: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        updatedAt: new Date().toISOString(),
      },
      limits: (() => {
        // Determine user type based on plan and subscription status
        let userType: UserType = 'free';
        if ((plan === 'monthly' || plan === 'yearly') && subscription.status === 'active') {
          userType = plan as 'monthly' | 'yearly';
        }
        
        // Get entitlements from centralized system
        const entitlements = getEntitlementsForUserType(userType);
        return {
          maxLists: getFeatureLimit(userType, 'storage.lists', 'total') || 3,
          maxDrillsPerDay: getFeatureLimit(userType, 'learning.drills', 'daily') || 3,
          maxKanjiQuestPerDay: getFeatureLimit(userType, 'games.kanjiQuest', 'daily') || 3,
          maxStoriesPerDay: getFeatureLimit(userType, 'learning.stories', 'daily') || 3,
          maxArticlesPerDay: getFeatureLimit(userType, 'learning.articles', 'daily') || 3,
          canSync: entitlements.system.cloudSync.enabled,
          canSave: entitlements.system.progressTracking.enabled,
        };
      })(),
      currentUsage: currentData?.subscription?.currentUsage || {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: new Date().toISOString().split('T')[0],
      },
    };

    transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const firebaseUID = subscription.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('No Firebase UID found in subscription metadata (deleted event). Full subscription object:', JSON.stringify(subscription, null, 2));
    return;
  }

  // Use transaction to prevent race conditions
  const userDocRef = doc(db, 'users', firebaseUID);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    const currentData = userDoc.data();

    // Revert to free plan
    const updatedSubscription = {
      ...currentData?.subscription,
      subscription: {
        status: 'inactive',
        plan: 'free',
        stripeSubscriptionId: null,
        stripePriceId: null,
        canceledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      limits: (() => {
        // User reverted to free plan
        const userType: UserType = 'free';
        const entitlements = getEntitlementsForUserType(userType);
        return {
          maxLists: getFeatureLimit(userType, 'storage.lists', 'total') || 3,
          maxDrillsPerDay: getFeatureLimit(userType, 'learning.drills', 'daily') || 3,
          maxKanjiQuestPerDay: getFeatureLimit(userType, 'games.kanjiQuest', 'daily') || 3,
          maxStoriesPerDay: getFeatureLimit(userType, 'learning.stories', 'daily') || 3,
          maxArticlesPerDay: getFeatureLimit(userType, 'learning.articles', 'daily') || 3,
          canSync: entitlements.system.cloudSync.enabled,
          canSave: entitlements.system.progressTracking.enabled,
        };
      })(),
      currentUsage: currentData?.subscription?.currentUsage || {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: new Date().toISOString().split('T')[0],
      },
    };

    transaction.set(userDocRef, { subscription: updatedSubscription }, { merge: true });
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription) {
    // Subscription status will be updated via subscription.updated event
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription) {
    // Handle payment failure - could send notification to user
    const subscriptionId = (invoice as any).subscription;
    console.error(`Payment failed for subscription: ${subscriptionId}`);

    // Log payment failure for monitoring
    await logWebhookEvent({
      id: invoice.id,
      type: 'invoice.payment_failed',
      data: { object: invoice }
    } as Stripe.Event, 'payment_failed', `Payment failed for subscription ${subscriptionId}`);
  }
}

// Logging function for webhook events
async function logWebhookEvent(event: Stripe.Event, status: 'success' | 'error' | 'payment_failed', errorMessage?: string) {
  try {
    const logData = {
      eventId: event.id,
      eventType: event.type,
      status: status,
      timestamp: new Date().toISOString(),
      error: errorMessage || null,
      data: {
        // Store relevant event data for debugging
        objectId: (event.data.object as any)?.id,
        customerId: (event.data.object as any)?.customer,
        subscriptionId: (event.data.object as any)?.subscription || (event.data.object as any)?.id,
      }
    };

    // Store in webhook_logs collection for monitoring
    await addDoc(collection(db, 'webhook_logs'), logData);
  } catch (error) {
    console.error('Failed to log webhook event:', error);
    // Don't throw error to avoid disrupting webhook processing
  }
}
