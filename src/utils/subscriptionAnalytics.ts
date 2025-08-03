import { collection, query, where, getDocs, Timestamp, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SubscriptionMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalSubscribers: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
  churnRate: number;
  conversionRate: number;
  averageRevenue: number;
}

export interface ConversionMetrics {
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
  conversionRate: number;
  trialToPayConversion: number;
}

// Default prices - will be overridden by pricing config if available
let MONTHLY_PRICE = 3.99;
let YEARLY_PRICE = 39.99;

// Fetch pricing config from Firestore
async function fetchPricingConfig() {
  try {
    const configRef = doc(db, 'config', 'pricing');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const pricing = configSnap.data();
      MONTHLY_PRICE = pricing.monthly?.amount || 3.99;
      YEARLY_PRICE = pricing.yearly?.amount || 39.99;
      console.log('[SubscriptionAnalytics] Loaded pricing config:', { MONTHLY_PRICE, YEARLY_PRICE });
    }
  } catch (error) {
    console.error('[SubscriptionAnalytics] Error fetching pricing config:', error);
  }
}

export async function calculateSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  try {
    // Fetch latest pricing config
    await fetchPricingConfig();
    
    // Get all users with subscriptions
    const usersRef = collection(db, 'users');
    const activeSubQuery = query(
      usersRef,
      where('subscription.status', '==', 'active')
    );
    
    const snapshot = await getDocs(activeSubQuery);
    
    console.log('[SubscriptionAnalytics] Active subscribers found:', snapshot.size);
    
    let monthlyCount = 0;
    let yearlyCount = 0;
    let debugSubscriptions: any[] = [];
    
    // Hard-coded price IDs since env vars aren't available in browser
    const MONTHLY_PRICE_ID = 'price_1RakzXHdrJomitOwZc0HJC4J';
    const YEARLY_PRICE_ID = 'price_1RakzXHdrJomitOwE7B56erf';
    
    console.log('[SubscriptionAnalytics] Using price IDs:', {
      monthly: MONTHLY_PRICE_ID,
      yearly: YEARLY_PRICE_ID
    });
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const subData = {
        userId: doc.id,
        email: data.email,
        plan: data.subscription?.plan,
        status: data.subscription?.status,
        priceId: data.subscription?.priceId,
        productId: data.subscription?.productId,
        stripeSubscriptionId: data.subscription?.stripeSubscriptionId,
        stripeCustomerId: data.subscription?.stripeCustomerId,
        currentPeriodEnd: data.subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: data.subscription?.cancelAtPeriodEnd,
        // Check for legacy fields
        legacyPlan: data.plan,
        legacySubscription: data.subscriptionPlan,
        legacyStatus: data.subscriptionStatus
      };
      debugSubscriptions.push(subData);
      
      // Determine plan type - check explicit plan field first
      if (data.subscription?.plan === 'monthly') {
        monthlyCount++;
      } else if (data.subscription?.plan === 'yearly') {
        yearlyCount++;
      } else if (!data.subscription?.plan && data.subscription?.status === 'active') {
        // No plan field but subscription is active - try to infer from price ID
        const priceId = data.subscription?.priceId;
        
        if (priceId === MONTHLY_PRICE_ID) {
          console.log(`[SubscriptionAnalytics] User ${doc.id} inferred as monthly from price ID`);
          monthlyCount++;
        } else if (priceId === YEARLY_PRICE_ID) {
          console.log(`[SubscriptionAnalytics] User ${doc.id} inferred as yearly from price ID`);
          yearlyCount++;
        } else {
          // Can't determine from price ID, default to monthly
          console.warn(`[SubscriptionAnalytics] User ${doc.id} has unknown price ID ${priceId}, defaulting to monthly:`, subData);
          monthlyCount++;
        }
      }
    });
    
    console.log('[SubscriptionAnalytics] Subscription breakdown:', {
      total: snapshot.size,
      monthly: monthlyCount,
      yearly: yearlyCount,
      subscriptions: debugSubscriptions
    });
    
    const totalSubscribers = monthlyCount + yearlyCount;
    const monthlyMRR = monthlyCount * MONTHLY_PRICE;
    const yearlyMRR = (yearlyCount * YEARLY_PRICE) / 12; // Convert to monthly
    const totalMRR = monthlyMRR + yearlyMRR;
    const totalARR = totalMRR * 12;
    
    // Calculate average revenue per user
    const averageRevenue = totalSubscribers > 0 ? totalMRR / totalSubscribers : 0;
    
    console.log('[SubscriptionAnalytics] Revenue calculation:', {
      monthlyCount,
      yearlyCount,
      monthlyPrice: MONTHLY_PRICE,
      yearlyPrice: YEARLY_PRICE,
      monthlyMRR: monthlyMRR.toFixed(2),
      yearlyMRR: yearlyMRR.toFixed(2),
      totalMRR: totalMRR.toFixed(2),
      totalARR: totalARR.toFixed(2)
    });
    
    // TODO: Calculate actual churn rate based on cancellations
    const churnRate = 0; // Placeholder - would need historical data
    
    // TODO: Calculate conversion rate
    const conversionRate = 0; // Placeholder - would need total user count
    
    return {
      mrr: Math.round(totalMRR * 100) / 100,
      arr: Math.round(totalARR * 100) / 100,
      totalSubscribers,
      monthlySubscribers: monthlyCount,
      yearlySubscribers: yearlyCount,
      churnRate,
      conversionRate,
      averageRevenue: Math.round(averageRevenue * 100) / 100
    };
  } catch (error) {
    console.error('Error calculating subscription metrics:', error);
    return {
      mrr: 0,
      arr: 0,
      totalSubscribers: 0,
      monthlySubscribers: 0,
      yearlySubscribers: 0,
      churnRate: 0,
      conversionRate: 0,
      averageRevenue: 0
    };
  }
}

export async function calculateConversionMetrics(): Promise<ConversionMetrics> {
  try {
    // Get total user count
    const usersRef = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    const totalUsers = allUsersSnapshot.size;
    
    // Get paid users
    const paidQuery = query(
      usersRef,
      where('subscription.status', '==', 'active')
    );
    const paidSnapshot = await getDocs(paidQuery);
    const paidUsers = paidSnapshot.size;
    
    const freeUsers = totalUsers - paidUsers;
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
    
    return {
      totalUsers,
      freeUsers,
      paidUsers,
      conversionRate: Math.round(conversionRate * 100) / 100,
      trialToPayConversion: 0 // Placeholder - would need trial tracking
    };
  } catch (error) {
    console.error('Error calculating conversion metrics:', error);
    return {
      totalUsers: 0,
      freeUsers: 0,
      paidUsers: 0,
      conversionRate: 0,
      trialToPayConversion: 0
    };
  }
}

// Track when users hit the paywall
export async function trackPaywallView(userId: string, feature: string) {
  try {
    const paywallRef = collection(db, 'analytics_paywall_views');
    await addDoc(paywallRef, {
      userId,
      feature,
      timestamp: Timestamp.now(),
      converted: false // Will be updated if they subscribe
    });
  } catch (error) {
    console.error('Error tracking paywall view:', error);
  }
}

// Debug function to check all subscriptions regardless of status
export async function debugAllSubscriptions() {
  try {
    const usersRef = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    
    let allSubscriptions: any[] = [];
    let statusCounts: Record<string, number> = {};
    
    allUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.subscription) {
        const sub = data.subscription;
        allSubscriptions.push({
          userId: doc.id,
          email: data.email,
          subscription: sub
        });
        
        const status = sub.status || 'no_status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    });
    
    console.log('[SubscriptionAnalytics] Debug - All subscriptions:', {
      totalUsers: allUsersSnapshot.size,
      usersWithSubscription: allSubscriptions.length,
      statusBreakdown: statusCounts,
      allSubscriptions
    });
    
    return allSubscriptions;
  } catch (error) {
    console.error('Error in debugAllSubscriptions:', error);
    return [];
  }
}

// Get paywall conversion rate
export async function getPaywallConversionRate(days: number = 30): Promise<number> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const paywallRef = collection(db, 'analytics_paywall_views');
    const q = query(
      paywallRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate))
    );
    
    const snapshot = await getDocs(q);
    let totalViews = 0;
    let conversions = 0;
    
    snapshot.forEach((doc) => {
      totalViews++;
      if (doc.data().converted) {
        conversions++;
      }
    });
    
    return totalViews > 0 ? (conversions / totalViews) * 100 : 0;
  } catch (error) {
    console.error('Error calculating paywall conversion rate:', error);
    return 0;
  }
}