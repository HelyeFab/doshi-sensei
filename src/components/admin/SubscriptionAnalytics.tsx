'use client';

import { useState, useEffect } from 'react';
import { calculateSubscriptionMetrics, calculateConversionMetrics, SubscriptionMetrics, ConversionMetrics } from '@/utils/subscriptionAnalytics';

export default function SubscriptionAnalytics() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [conversion, setConversion] = useState<ConversionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      try {
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

    loadMetrics();
  }, []);

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
        <h2 className="text-xl font-bold mb-4">Revenue Metrics</h2>
        
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