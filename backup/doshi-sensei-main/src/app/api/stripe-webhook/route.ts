import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  console.log('Webhook event received:', event.type);

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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout completed - Mode: ${session.mode}, Type: ${session.metadata?.type}`);

  // Handle donations (one-time payments)
  if (session.mode === 'payment' && session.metadata?.type === 'donation') {
    console.log(`Donation received: $${(session.amount_total || 0) / 100} from ${session.customer_details?.email}`);

    // Log the donation
    try {
      // You could store donation records in Firestore here if needed
      console.log('Donation processed successfully');
    } catch (error) {
      console.error('Error logging donation:', error);
    }
    return;
  }

  // Handle subscriptions
  const firebaseUID = session.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.log('No Firebase UID found in checkout session metadata (possibly a guest donation)');
    return;
  }

  console.log(`Subscription checkout completed for user: ${firebaseUID}`);

  // The subscription will be handled by the subscription.created event
  // This is mainly for logging and any additional setup needed
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const firebaseUID = subscription.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('No Firebase UID found in subscription metadata');
    return;
  }

  console.log(`Updating subscription for user: ${firebaseUID}`);

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan: 'monthly' | 'yearly' = 'monthly';

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) {
    plan = 'yearly';
  }

  // Get current user subscription data
  const userDocRef = doc(db, 'users', firebaseUID);
  const userDoc = await getDoc(userDocRef);
  const currentData = userDoc.data();

  // Update subscription data
  const updatedSubscription = {
    ...currentData?.subscription,
    subscription: {
      status: subscription.status as any,
      plan: plan,
      renewalDate: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
    },
    limits: plan === 'monthly' || plan === 'yearly' ? {
      maxLists: -1,
      maxDrillsPerDay: -1,
      canSync: true,
    } : {
      maxLists: 3,
      maxDrillsPerDay: 3,
      canSync: false,
    },
    currentUsage: currentData?.subscription?.currentUsage || {
      listsCount: 0,
      drillsToday: 0,
      lastDrillDate: new Date().toISOString().split('T')[0],
    },
  };

  await setDoc(userDocRef, { subscription: updatedSubscription }, { merge: true });

  console.log(`Updated subscription for user ${firebaseUID} - Plan: ${plan}, Status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const firebaseUID = subscription.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('No Firebase UID found in subscription metadata');
    return;
  }

  console.log(`Subscription deleted for user: ${firebaseUID}`);

  // Get current user subscription data
  const userDocRef = doc(db, 'users', firebaseUID);
  const userDoc = await getDoc(userDocRef);
  const currentData = userDoc.data();

  // Revert to free plan
  const updatedSubscription = {
    ...currentData?.subscription,
    subscription: {
      status: 'inactive' as any,
      plan: 'free' as any,
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
    limits: {
      maxLists: 3,
      maxDrillsPerDay: 3,
      canSync: false,
    },
    currentUsage: currentData?.subscription?.currentUsage || {
      listsCount: 0,
      drillsToday: 0,
      lastDrillDate: new Date().toISOString().split('T')[0],
    },
  };

  await setDoc(userDocRef, { subscription: updatedSubscription }, { merge: true });

  console.log(`Reverted user ${firebaseUID} to free plan`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription) {
    console.log(`Payment succeeded for subscription: ${(invoice as any).subscription}`);
    // Subscription status will be updated via subscription.updated event
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if ((invoice as any).subscription) {
    console.log(`Payment failed for subscription: ${(invoice as any).subscription}`);
    // Handle payment failure - could send notification to user
  }
}
