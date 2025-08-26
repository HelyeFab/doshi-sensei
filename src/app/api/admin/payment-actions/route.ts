import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import { serverFirebaseFunctions } from '@/lib/call-firebase-function';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const adminInstance = await getFirebaseAdmin();
    const decodedToken = await adminInstance.auth().verifyIdToken(token);
    const isAdmin = decodedToken.email === 'emmanuelfabiani23@gmail.com' || 
                    decodedToken.email === 'hove.international+3@gmail.com' || 
                    decodedToken.email === 'admin@doshisensei.com';
    return isAdmin ? decodedToken : null;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const adminToken = await verifyAdminToken(request);
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await request.json();

    switch (action) {
      case 'sync-all-subscriptions':
        return await syncAllSubscriptions();
      
      case 'process-failed-webhooks':
        return await processFailedWebhooks();
      
      case 'check-refunds':
        return await checkRefunds();
      
      case 'clear-webhook-cache':
        return await clearWebhookCache();
      
      case 'fix-inconsistent-users':
        return await fixInconsistentUsers();
      
      case 'check-webhook-endpoint':
        return await checkWebhookEndpoint();
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error executing payment action:', error);
    return NextResponse.json({ 
      error: 'Action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function syncAllSubscriptions() {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Use Admin SDK to bypass security rules
    const adminInstance = await getFirebaseAdmin();
    const db = adminInstance.firestore();
    
    // Get all users with subscriptions
    const snapshot = await db.collection('users').get();

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription?.stripeSubscriptionId) continue;

      try {
        // Fetch current subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );

        // Determine plan from price ID
        const priceId = stripeSubscription.items.data[0]?.price.id;
        let plan: 'monthly' | 'yearly' | 'free' = 'free';
        
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) {
          plan = 'monthly';
        } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) {
          plan = 'yearly';
        }

        // Update user's subscription data
        await db.collection('users').doc(userDoc.id).update({
          'subscription.status': stripeSubscription.status,
          'subscription.plan': plan,
          'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromDate(
            new Date(stripeSubscription.current_period_end * 1000)
          ),
          'subscription.cancelAtPeriodEnd': stripeSubscription.cancel_at_period_end,
          'subscription.metadata.updatedAt': admin.firestore.Timestamp.now()
        });

        synced++;
      } catch (error) {
        failed++;
        errors.push(`User ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} subscriptions, ${failed} failed`,
      synced,
      failed,
      errors: errors.slice(0, 5) // Only show first 5 errors
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processFailedWebhooks() {
  // In a real implementation, this would retry failed webhook events
  // For now, we'll just clear old failed events from the logs
  
  try {
    const adminInstance = await getFirebaseAdmin();
    const db = adminInstance.firestore();
    
    const logsRef = db.collection('webhook_logs');
    const snapshot = await logsRef
      .where('status', '==', 'error')
      .get();
    
    let processed = 0;
    
    // Delete old failed logs (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const logDoc of snapshot.docs) {
      const data = logDoc.data();
      const timestamp = data.timestamp?._seconds 
        ? new Date(data.timestamp._seconds * 1000)
        : new Date(data.timestamp);
      
      if (timestamp < sevenDaysAgo) {
        await logDoc.ref.delete();
        processed++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${processed} old failed webhook logs`,
      processed
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to process webhooks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function checkRefunds() {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const adminInstance = await getFirebaseAdmin();
    const db = adminInstance.firestore();
    
    // Get recent refunds from Stripe
    const refunds = await stripe.refunds.list({
      limit: 10,
      created: {
        gte: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
      }
    });

    const results = [];
    
    for (const refund of refunds.data) {
      // Check if user was properly downgraded
      const charge = typeof refund.charge === 'string' 
        ? await stripe.charges.retrieve(refund.charge)
        : refund.charge;
        
      if (charge && charge.customer) {
        // Find user by Stripe customer ID
        const snapshot = await db.collection('users')
          .where('subscription.stripeCustomerId', '==', charge.customer)
          .get();
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          const subscription = userData.subscription;
          
          const isProperlyDowngraded = subscription.plan === 'free';
          
          results.push({
            refundId: refund.id,
            amount: refund.amount / 100,
            customerId: charge.customer as string,
            userId: userDoc.id,
            currentPlan: subscription.plan,
            properlyDowngraded: isProperlyDowngraded,
            refundDate: new Date(refund.created * 1000).toISOString()
          });
          
          // If not properly downgraded, fix it
          if (!isProperlyDowngraded) {
            await db.collection('users').doc(userDoc.id).update({
              'subscription.plan': 'free',
              'subscription.status': 'canceled',
              'subscription.stripeSubscriptionId': null,
              'subscription.metadata.updatedAt': admin.firestore.Timestamp.now(),
              'subscription.metadata.refundedAt': admin.firestore.Timestamp.fromDate(new Date(refund.created * 1000))
            });
          }
        }
      }
    }
    
    const notDowngraded = results.filter(r => !r.properlyDowngraded);
    
    return NextResponse.json({
      success: true,
      message: notDowngraded.length > 0 
        ? `Fixed ${notDowngraded.length} users who weren't properly downgraded after refund`
        : 'All refunded users are properly downgraded',
      results,
      fixed: notDowngraded.length
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check refunds',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function clearWebhookCache() {
  try {
    const adminInstance = await getFirebaseAdmin();
    const db = adminInstance.firestore();
    
    // Clear old webhook events from cache
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const eventsRef = db.collection('webhook_events');
    const snapshot = await eventsRef.get();
    
    let deleted = 0;
    for (const eventDoc of snapshot.docs) {
      const data = eventDoc.data();
      const processedAt = data.processedAt?._seconds 
        ? new Date(data.processedAt._seconds * 1000)
        : new Date(data.processedAt);
      
      if (processedAt < thirtyDaysAgo) {
        await eventDoc.ref.delete();
        deleted++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${deleted} old webhook events from cache`,
      deleted
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to clear webhook cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fixInconsistentUsers() {
  let fixed = 0;
  const issues: string[] = [];
  
  try {
    const adminInstance = await getFirebaseAdmin();
    const db = adminInstance.firestore();
    
    const snapshot = await db.collection('users').get();
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription) continue;
      
      let needsUpdate = false;
      const updates: any = {};
      
      // Check for expired subscriptions still marked active
      if (subscription.status === 'active' && subscription.currentPeriodEnd) {
        const periodEnd = subscription.currentPeriodEnd._seconds 
          ? new Date(subscription.currentPeriodEnd._seconds * 1000)
          : new Date(subscription.currentPeriodEnd);
          
        if (periodEnd < new Date() && !subscription.cancelAtPeriodEnd) {
          needsUpdate = true;
          updates['subscription.status'] = 'canceled';
          updates['subscription.plan'] = 'free';
          issues.push(`User ${userDoc.id}: Expired subscription still marked active`);
        }
      }
      
      // Check for users with premium plan but no Stripe ID
      if ((subscription.plan === 'monthly' || subscription.plan === 'yearly') && 
          !subscription.stripeSubscriptionId) {
        needsUpdate = true;
        updates['subscription.plan'] = 'free';
        updates['subscription.status'] = 'canceled';
        issues.push(`User ${userDoc.id}: Premium plan without Stripe subscription ID`);
      }
      
      // Apply fixes
      if (needsUpdate) {
        updates['subscription.metadata.updatedAt'] = admin.firestore.Timestamp.now();
        updates['subscription.metadata.fixedBy'] = 'payment-monitor';
        
        await db.collection('users').doc(userDoc.id).update(updates);
        fixed++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} users with inconsistent subscription data`,
      fixed,
      issues: issues.slice(0, 10) // Show first 10 issues
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fix inconsistent users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function checkWebhookEndpoint() {
  try {
    const webhookUrl = 'https://stripewebhook-jtmxvmnera-uc.a.run.app';
    
    // Test webhook endpoint accessibility
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint is accessible',
        endpoint: webhookUrl,
        response: data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Webhook endpoint returned status ${response.status}`,
        endpoint: webhookUrl,
        status: response.status
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check webhook endpoint',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}