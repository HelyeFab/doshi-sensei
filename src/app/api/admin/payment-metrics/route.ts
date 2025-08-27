import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Only initialize Stripe if we have the key
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
    const admin = await getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = decodedToken.admin === true || 
                    (adminEmail && decodedToken.email === adminEmail) ||
                    decodedToken.email === 'hove.international+3@gmail.com' || 
                    decodedToken.email === 'admin@doshisensei.com';
    return isAdmin ? decodedToken : null;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminToken = await verifyAdminToken(request);
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();

    // Gather all metrics in parallel for better performance
    const [webhookHealth, subscriptions, criticalAlerts, systemIntegrity, recentEvents] = await Promise.all([
      getWebhookHealth(db),
      getSubscriptionMetrics(db),
      getCriticalAlerts(db),
      getSystemIntegrity(db),
      getRecentEvents(db)
    ]);

    return NextResponse.json({
      webhookHealth,
      subscriptions,
      criticalAlerts,
      systemIntegrity,
      recentEvents
    });
  } catch (error) {
    console.error('Error fetching payment metrics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWebhookHealth(db: any) {
  try {
    // Check webhook_logs collection for recent events
    const logsRef = db.collection('webhook_logs');
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 86400000); // 24 hours ago
    const oneHourAgo = new Date(now - 3600000); // 1 hour ago

    // Get recent logs from the last 24 hours
    let logs = [];
    try {
      const snapshot = await logsRef
        .orderBy('timestamp', 'desc')
        .limit(500) // Get more logs for better analysis
        .get();
      
      logs = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        // Parse timestamp properly
        let timestamp = null;
        if (data.timestamp) {
          if (data.timestamp._seconds) {
            timestamp = new Date(data.timestamp._seconds * 1000);
          } else if (data.timestamp.toDate) {
            timestamp = data.timestamp.toDate();
          } else {
            timestamp = new Date(data.timestamp);
          }
        }
        return {
          id: doc.id,
          ...data,
          parsedTimestamp: timestamp
        };
      });
    } catch (error) {
      // Collection might not exist yet
      console.log('webhook_logs collection not found or empty');
    }

    // Filter out test events for metrics (but keep them for last success tracking)
    const realEvents = logs.filter(log => !log.metadata?.isTest);
    const recentRealEvents = realEvents.filter(log => 
      log.parsedTimestamp && log.parsedTimestamp > twentyFourHoursAgo
    );
    const lastHourEvents = realEvents.filter(log => 
      log.parsedTimestamp && log.parsedTimestamp > oneHourAgo
    );

    // Calculate metrics based on real events only
    const successCount = recentRealEvents.filter(log => log.status === 'success' || log.status === 'completed').length;
    const failCount = recentRealEvents.filter(log => log.status === 'error' || log.status === 'failed').length;
    const totalEvents = successCount + failCount;
    
    // Get last successful event (including test events for verification)
    const lastSuccess = logs.find(log => log.status === 'success' || log.status === 'completed');
    const lastRealSuccess = realEvents.find(log => log.status === 'success' || log.status === 'completed');
    const lastError = realEvents.find(log => log.status === 'error' || log.status === 'failed');
    
    // Calculate average processing time
    const processingTimes = recentRealEvents
      .filter(log => log.processingTime && log.processingTime > 0)
      .map(log => log.processingTime);
    const avgProcessing = processingTimes.length > 0 
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 1500; // Default 1.5 seconds

    // Determine health status with better logic
    const failureRate = totalEvents > 0 ? (failCount / totalEvents) * 100 : 0;
    let status: 'healthy' | 'degraded' | 'down' | 'testing' = 'healthy';
    
    // Check if webhook is actively receiving events
    if (lastSuccess) {
      const timeSinceLastSuccess = now - (lastSuccess.parsedTimestamp?.getTime() || 0);
      const timeSinceLastRealSuccess = lastRealSuccess?.parsedTimestamp 
        ? now - lastRealSuccess.parsedTimestamp.getTime() 
        : Infinity;
      
      // If we have test events succeeding recently, webhook is working
      if (timeSinceLastSuccess < 300000) { // Less than 5 minutes
        status = 'testing';
      } 
      // If no real events in 24 hours but tests work, it's healthy (just no activity)
      else if (timeSinceLastRealSuccess > 86400000 && lastSuccess.metadata?.isTest) {
        status = 'healthy';
      }
      // If high failure rate with recent volume
      else if (failureRate > 50 && lastHourEvents.length > 5) {
        status = 'down';
      } else if (failureRate > 25 && totalEvents > 10) {
        status = 'degraded';
      }
    } else if (logs.length === 0) {
      // No logs at all - needs testing
      status = 'testing';
    }

    return {
      status,
      lastSuccess: lastSuccess?.parsedTimestamp?.toISOString() || null,
      lastRealSuccess: lastRealSuccess?.parsedTimestamp?.toISOString() || null,
      failureRate,
      recentEvents: totalEvents,
      lastHourEvents: lastHourEvents.length,
      lastError: lastError?.errorMessage || lastError?.error || null,
      processingTime: avgProcessing,
      requiresTest: !lastSuccess || (lastSuccess.parsedTimestamp && 
                     now - lastSuccess.parsedTimestamp.getTime() > 3600000) // Over 1 hour old
    };
  } catch (error) {
    console.error('Error getting webhook health:', error);
    return {
      status: 'testing' as const,
      lastSuccess: null,
      lastRealSuccess: null,
      failureRate: 0,
      recentEvents: 0,
      lastHourEvents: 0,
      processingTime: 0,
      requiresTest: true
    };
  }
}

async function getSubscriptionMetrics(db: any) {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    let activeMonthly = 0;
    let activeYearly = 0;
    let totalRevenue = 0;
    let newToday = 0;
    let canceledToday = 0;
    let failedPayments = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription) continue;
      
      // Count active subscriptions
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        if (subscription.plan === 'monthly') {
          activeMonthly++;
          totalRevenue += 8.99; // Monthly price
        } else if (subscription.plan === 'yearly') {
          activeYearly++;
          totalRevenue += 89.99 / 12; // Yearly price as MRR
        }
      }
      
      // Check for today's activity
      if (subscription.createdAt && subscription.createdAt._seconds) {
        const createdDate = new Date(subscription.createdAt._seconds * 1000);
        if (createdDate >= today) {
          newToday++;
        }
      }
      
      if (subscription.canceledAt && subscription.canceledAt._seconds) {
        const canceledDate = new Date(subscription.canceledAt._seconds * 1000);
        if (canceledDate >= today) {
          canceledToday++;
        }
      }
      
      // Count failed payments
      if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        failedPayments++;
      }
    }
    
    const totalActive = activeMonthly + activeYearly;
    
    // Calculate churn (simplified - would need historical data for accurate calculation)
    const churnRate = totalActive > 0 ? (canceledToday / totalActive) * 100 : 0;
    const churnTrend = canceledToday > newToday ? 'up' : canceledToday < newToday ? 'down' : 'stable';
    
    // Check Stripe for pending refunds if available
    let pendingRefunds = 0;
    if (stripe) {
      try {
        const refunds = await stripe.refunds.list({
          limit: 10
        });
        pendingRefunds = refunds.data.filter(r => r.status === 'pending').length;
      } catch (error) {
        console.log('Could not fetch refunds from Stripe');
      }
    }
    
    return {
      active: {
        total: totalActive,
        monthly: activeMonthly,
        yearly: activeYearly
      },
      revenue: {
        mrr: totalRevenue,
        arr: totalRevenue * 12,
        currency: 'GBP'
      },
      recent: {
        newToday,
        canceledToday,
        failedPayments,
        pendingRefunds
      },
      churn: {
        rate: churnRate,
        trend: churnTrend as 'up' | 'down' | 'stable'
      }
    };
  } catch (error) {
    console.error('Error getting subscription metrics:', error);
    return {
      active: { total: 0, monthly: 0, yearly: 0 },
      revenue: { mrr: 0, arr: 0, currency: 'GBP' },
      recent: { newToday: 0, canceledToday: 0, failedPayments: 0, pendingRefunds: 0 },
      churn: { rate: 0, trend: 'stable' as const }
    };
  }
}

async function getCriticalAlerts(db: any) {
  const alerts = [];
  
  try {
    // Check for webhook failures
    const webhookHealth = await getWebhookHealth(db);
    if (webhookHealth.status === 'down') {
      alerts.push({
        id: 'webhook-down',
        type: 'error' as const,
        message: 'Webhook endpoint is down - no events processed in the last hour',
        timestamp: new Date().toISOString(),
        action: 'check-webhook-endpoint'
      });
    } else if (webhookHealth.status === 'degraded') {
      alerts.push({
        id: 'webhook-degraded',
        type: 'warning' as const,
        message: `High webhook failure rate: ${webhookHealth.failureRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        action: 'process-failed-webhooks'
      });
    }
    
    // Check for inconsistent users
    const usersSnapshot = await db.collection('users').get();
    let inconsistentCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription) continue;
      
      // Check for expired subscriptions still marked active
      if (subscription.status === 'active' && subscription.currentPeriodEnd) {
        let periodEnd;
        if (subscription.currentPeriodEnd._seconds) {
          periodEnd = new Date(subscription.currentPeriodEnd._seconds * 1000);
        } else {
          periodEnd = new Date(subscription.currentPeriodEnd);
        }
          
        if (periodEnd < new Date() && !subscription.cancelAtPeriodEnd) {
          inconsistentCount++;
        }
      }
      
      // Check for users with premium plan but no Stripe ID
      if ((subscription.plan === 'monthly' || subscription.plan === 'yearly') && 
          !subscription.stripeSubscriptionId) {
        inconsistentCount++;
      }
    }
    
    if (inconsistentCount > 0) {
      alerts.push({
        id: 'inconsistent-users',
        type: 'warning' as const,
        message: `${inconsistentCount} users have inconsistent subscription data`,
        timestamp: new Date().toISOString(),
        action: 'fix-inconsistent-users'
      });
    }
    
    // Check Stripe connection
    if (stripe) {
      try {
        await stripe.customers.list({ limit: 1 });
      } catch (error) {
        alerts.push({
          id: 'stripe-connection-failed',
          type: 'error' as const,
          message: 'Cannot connect to Stripe API - check API keys',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      alerts.push({
        id: 'stripe-not-configured',
        type: 'warning' as const,
        message: 'Stripe is not configured - missing API key',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error getting critical alerts:', error);
  }
  
  return alerts;
}

async function getSystemIntegrity(db: any) {
  let stripeConnection = false;
  let firebaseSync = true;
  let inconsistentUsers = 0;
  
  // Check Stripe connection
  if (stripe) {
    try {
      await stripe.customers.list({ limit: 1 });
      stripeConnection = true;
    } catch (error) {
      stripeConnection = false;
    }
  }
  
  // Check API routes
  const apiRouteStatus = true; // We're running, so this is true
  
  // Check Cloud Function (based on webhook logs)
  const webhookHealth = await getWebhookHealth(db);
  const cloudFunctionStatus = webhookHealth.status !== 'down';
  
  // Check for inconsistent users
  try {
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      if (!subscription) continue;
      
      // Various consistency checks
      if (subscription.status === 'active' && subscription.currentPeriodEnd) {
        let periodEnd;
        if (subscription.currentPeriodEnd._seconds) {
          periodEnd = new Date(subscription.currentPeriodEnd._seconds * 1000);
        } else {
          periodEnd = new Date(subscription.currentPeriodEnd);
        }
          
        if (periodEnd < new Date() && !subscription.cancelAtPeriodEnd) {
          inconsistentUsers++;
        }
      }
      
      if ((subscription.plan === 'monthly' || subscription.plan === 'yearly') && 
          !subscription.stripeSubscriptionId) {
        inconsistentUsers++;
      }
    }
  } catch (error) {
    console.error('Error checking user consistency:', error);
  }
  
  return {
    stripeConnection,
    firebaseSync,
    apiRouteStatus,
    cloudFunctionStatus,
    inconsistentUsers
  };
}

async function getRecentEvents(db: any) {
  const events = [];
  
  try {
    // Get recent webhook events
    const logsRef = db.collection('webhook_logs');
    
    try {
      const snapshot = await logsRef
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let timestamp = new Date().toISOString();
        
        if (data.timestamp) {
          if (data.timestamp._seconds) {
            timestamp = new Date(data.timestamp._seconds * 1000).toISOString();
          } else {
            timestamp = new Date(data.timestamp).toISOString();
          }
        }
        
        events.push({
          id: doc.id,
          type: data.type || data.event || 'unknown',
          status: (data.status === 'success' || data.status === 'completed') ? 'success' : 'failed',
          user: data.customerId || data.userId || data.email,
          amount: data.amount,
          timestamp
        });
      }
    } catch (error) {
      // Collection might not exist
      console.log('Could not fetch webhook events');
    }
    
    // If no webhook logs, try to get recent subscription changes from users
    if (events.length === 0) {
      const usersSnapshot = await db.collection('users')
        .orderBy('subscription.updatedAt', 'desc')
        .limit(10)
        .get();
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.subscription?.updatedAt) {
          let timestamp = new Date().toISOString();
          if (userData.subscription.updatedAt._seconds) {
            timestamp = new Date(userData.subscription.updatedAt._seconds * 1000).toISOString();
          }
          
          events.push({
            id: doc.id,
            type: 'subscription.updated',
            status: 'success' as const,
            user: userData.email,
            amount: userData.subscription.plan === 'monthly' ? 8.99 : userData.subscription.plan === 'yearly' ? 89.99 : 0,
            timestamp
          });
        }
      }
    }
  } catch (error) {
    console.error('Error getting recent events:', error);
  }
  
  return events;
}