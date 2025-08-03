'use client';

import { useState, useEffect } from 'react';
import { calculateSubscriptionMetrics, calculateConversionMetrics, SubscriptionMetrics, ConversionMetrics, debugAllSubscriptions } from '@/utils/subscriptionAnalytics';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionAnalytics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [conversion, setConversion] = useState<ConversionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // First try to get real data from Stripe
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/admin/subscription-analytics', {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setMetrics(data.metrics);
              console.log('[SubscriptionAnalytics] Loaded from Stripe:', data);
              
              // Still load conversion metrics separately
              const convMetrics = await calculateConversionMetrics();
              setConversion(convMetrics);
              return;
            }
          }
        } catch (stripeError) {
          console.error('Error fetching from Stripe, falling back to local calculation:', stripeError);
        }
      }
      
      // Fallback to local calculation if Stripe fetch fails
      const [subMetrics, convMetrics] = await Promise.all([
        calculateSubscriptionMetrics(),
        calculateConversionMetrics()
      ]);
      setMetrics(subMetrics);
      setConversion(convMetrics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleDebug = async () => {
    setIsDebugging(true);
    try {
      await debugAllSubscriptions();
      console.log('Debug complete - check browser console for subscription details');
    } catch (error) {
      console.error('Debug error:', error);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleSyncSubscriptions = async () => {
    setIsFixing(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        alert('Please sign in to continue');
        return;
      }

      const confirmSync = confirm('Sync all subscription data from Stripe? This will update plan types and pricing information.');
      
      if (confirmSync) {
        const syncResponse = await fetch('/api/admin/subscription-analytics/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        const syncData = await syncResponse.json();
        
        if (syncData.success) {
          alert(syncData.message);
          // Reload metrics
          await loadMetrics();
        } else {
          alert(`Error: ${syncData.error}`);
        }
      }
    } catch (error) {
      console.error('Error syncing subscriptions:', error);
      alert('Error syncing subscriptions. Check console for details.');
    } finally {
      setIsFixing(false);
    }
  };

  const handleCleanupPhantom = async () => {
    setIsCleaning(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        alert('Please sign in to continue');
        return;
      }

      // First check what needs cleaning
      const checkResponse = await fetch('/api/admin/cleanup-subscriptions', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const checkData = await checkResponse.json();
      
      if (checkData.summary?.phantom > 0) {
        const confirmClean = confirm(
          `Found ${checkData.summary.phantom} phantom subscriptions (active in Firebase but no Stripe ID).\n\n` +
          `These are likely test subscriptions that were never properly connected to Stripe.\n\n` +
          `Clean them up now?`
        );
        
        if (confirmClean) {
          const cleanResponse = await fetch('/api/admin/cleanup-subscriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          const cleanData = await cleanResponse.json();
          
          if (cleanData.success) {
            alert(cleanData.message);
            // Reload metrics
            await loadMetrics();
          } else {
            alert(`Error: ${cleanData.error}`);
          }
        }
      } else {
        alert('No phantom subscriptions found! All subscriptions have valid Stripe IDs.');
      }
    } catch (error) {
      console.error('Error cleaning subscriptions:', error);
      alert('Error cleaning subscriptions. Check console for details.');
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Subscription Analytics</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Revenue Metrics</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCleanupPhantom}
              disabled={isCleaning}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isCleaning ? 'Cleaning...' : 'Clean Phantom'}
            </button>
            <button
              onClick={handleSyncSubscriptions}
              disabled={isFixing}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isFixing ? 'Syncing...' : 'Sync from Stripe'}
            </button>
            <button
              onClick={handleDebug}
              disabled={isDebugging}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isDebugging ? 'Debugging...' : 'Debug'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
            <p className="text-3xl font-bold text-primary">${metrics?.mrr || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">MRR</p>
          </div>
          
          <div className="bg-green-500/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Annual Recurring Revenue</p>
            <p className="text-3xl font-bold text-green-600">${metrics?.arr || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ARR</p>
          </div>
          
          <div className="bg-blue-500/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Average Revenue per User</p>
            <p className="text-3xl font-bold text-blue-600">${metrics?.averageRevenue || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ARPU</p>
          </div>
        </div>
      </div>

      {/* Subscriber Breakdown */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Subscriber Breakdown</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
            <p className="text-2xl font-bold">{metrics?.totalSubscribers || 0}</p>
            {metrics?.totalSubscribers > 0 && metrics?.monthlySubscribers === 0 && metrics?.yearlySubscribers === 0 && (
              <p className="text-xs text-orange-600 mt-1">⚠️ No plan types detected</p>
            )}
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Monthly Plans</p>
            <p className="text-2xl font-bold">{metrics?.monthlySubscribers || 0}</p>
            <p className="text-xs text-muted-foreground">$3.99/month</p>
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Yearly Plans</p>
            <p className="text-2xl font-bold">{metrics?.yearlySubscribers || 0}</p>
            <p className="text-xs text-muted-foreground">$39.99/year</p>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Conversion Metrics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{conversion?.totalUsers || 0}</p>
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Free Users</p>
            <p className="text-2xl font-bold">{conversion?.freeUsers || 0}</p>
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Paid Users</p>
            <p className="text-2xl font-bold text-green-600">{conversion?.paidUsers || 0}</p>
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold text-primary">{conversion?.conversionRate || 0}%</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Growth Opportunity</h4>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {conversion && conversion.freeUsers > 0 ? (
            <>
              You have <strong>{conversion.freeUsers} free users</strong>. 
              Converting just 10% more would add <strong>${Math.round(conversion.freeUsers * 0.1 * 3.99)}</strong> to your MRR.
            </>
          ) : (
            'No free users to convert yet. Focus on user acquisition!'
          )}
        </p>
      </div>
    </div>
  );
}