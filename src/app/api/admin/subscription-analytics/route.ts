import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  const admin = await getFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(token);

  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

  if (!isAdmin) {
    throw new Error('Insufficient permissions');
  }

  return decodedToken;
}

// GET /api/admin/subscription-analytics - Get real subscription data from Stripe
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get all users with active subscriptions from Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('subscription.status', '==', 'active')
      .get();
    
    console.log(`Found ${snapshot.size} users with active subscriptions in Firebase`);
    
    let totalMRR = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;
    const subscriptionDetails: any[] = [];
    const errors: any[] = [];
    const debugInfo: any[] = [];
    
    // For each active subscription, get the real data from Stripe
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const stripeSubId = userData.subscription?.stripeSubscriptionId;
      
      debugInfo.push({
        userId: doc.id,
        email: userData.email,
        firebaseStatus: userData.subscription?.status,
        stripeSubId: stripeSubId || 'NO_STRIPE_ID',
        subscription: userData.subscription
      });
      
      if (stripeSubId) {
        try {
          // Fetch the actual subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId, {
            expand: ['items.data.price.product']
          });
          
          // Check if subscription is actually active in Stripe
          if (stripeSubscription.status !== 'active') {
            errors.push({
              userId: doc.id,
              email: userData.email,
              error: `Subscription status mismatch - Firebase: active, Stripe: ${stripeSubscription.status}`,
              stripeStatus: stripeSubscription.status
            });
            continue;
          }
          
          // Get the price info
          const price = stripeSubscription.items.data[0]?.price;
          if (price) {
            const amount = price.unit_amount || 0;
            const interval = price.recurring?.interval;
            const currency = price.currency;
            
            // Calculate MRR
            let monthlyAmount = 0;
            if (interval === 'month') {
              monthlyAmount = amount / 100; // Convert from cents
              monthlyCount++;
            } else if (interval === 'year') {
              monthlyAmount = (amount / 100) / 12; // Convert yearly to monthly
              yearlyCount++;
            }
            
            totalMRR += monthlyAmount;
            
            subscriptionDetails.push({
              userId: doc.id,
              email: userData.email,
              stripeSubscriptionId: stripeSubId,
              status: stripeSubscription.status,
              amount: amount / 100,
              interval,
              currency,
              monthlyAmount,
              priceId: price.id,
              productName: (price.product as any)?.name || 'Unknown',
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
            });
          }
        } catch (stripeError: any) {
          console.error(`Error fetching Stripe subscription ${stripeSubId}:`, stripeError);
          errors.push({
            userId: doc.id,
            email: userData.email,
            error: stripeError.message
          });
        }
      } else {
        // No Stripe subscription ID
        errors.push({
          userId: doc.id,
          email: userData.email,
          error: 'No stripeSubscriptionId found'
        });
      }
    }
    
    const totalARR = totalMRR * 12;
    const totalSubscribers = monthlyCount + yearlyCount;
    const averageRevenue = totalSubscribers > 0 ? totalMRR / totalSubscribers : 0;
    
    return NextResponse.json({
      success: true,
      metrics: {
        mrr: Math.round(totalMRR * 100) / 100,
        arr: Math.round(totalARR * 100) / 100,
        totalSubscribers,
        monthlySubscribers: monthlyCount,
        yearlySubscribers: yearlyCount,
        averageRevenue: Math.round(averageRevenue * 100) / 100
      },
      details: subscriptionDetails,
      errors,
      debugInfo,
      summary: {
        totalActiveInFirestore: snapshot.size,
        successfullyFetchedFromStripe: subscriptionDetails.length,
        failedToFetch: errors.length
      }
    });
    
  } catch (error) {
    console.error('Error in subscription analytics:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST /api/admin/subscription-analytics/sync - Sync subscription data from Stripe
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get all users with active subscriptions
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('subscription.status', '==', 'active')
      .get();
    
    let updated = 0;
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const stripeSubId = userData.subscription?.stripeSubscriptionId;
      
      if (stripeSubId) {
        try {
          // Fetch the actual subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId, {
            expand: ['items.data.price']
          });
          
          // Get the price info
          const price = stripeSubscription.items.data[0]?.price;
          if (price) {
            const interval = price.recurring?.interval;
            
            // Determine plan type
            const plan = interval === 'year' ? 'yearly' : 'monthly';
            
            // Update the subscription with the correct plan and price info
            const updatedSubscription = {
              ...userData.subscription,
              plan,
              priceId: price.id,
              amount: price.unit_amount || 0,
              currency: price.currency,
              interval
            };
            
            batch.update(doc.ref, {
              subscription: updatedSubscription
            });
            
            updated++;
          }
        } catch (stripeError) {
          console.error(`Error syncing subscription ${stripeSubId}:`, stripeError);
        }
      }
    }
    
    if (updated > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${updated} subscriptions from Stripe`,
      details: {
        totalActive: snapshot.size,
        synced: updated,
        failed: snapshot.size - updated
      }
    });
    
  } catch (error) {
    console.error('Error syncing subscriptions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync subscriptions';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}