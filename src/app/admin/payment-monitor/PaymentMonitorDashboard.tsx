'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { 
  Shield,
  Activity,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Clock,
  Zap,
  AlertCircle,
  BarChart3,
  CreditCard
} from 'lucide-react';

interface WebhookHealth {
  status: 'healthy' | 'degraded' | 'down' | 'testing';
  lastSuccess: string | null;
  lastRealSuccess: string | null;
  failureRate: number;
  recentEvents: number;
  lastHourEvents: number;
  lastError?: string;
  processingTime: number;
  requiresTest: boolean;
}

interface SubscriptionMetrics {
  active: {
    total: number;
    monthly: number;
    yearly: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    currency: string;
  };
  recent: {
    newToday: number;
    canceledToday: number;
    failedPayments: number;
    pendingRefunds: number;
  };
  churn: {
    rate: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface SystemIntegrity {
  stripeConnection: boolean;
  firebaseSync: boolean;
  apiRouteStatus: boolean;
  cloudFunctionStatus: boolean;
  inconsistentUsers: number;
}

interface PaymentMetrics {
  webhookHealth: WebhookHealth;
  subscriptions: SubscriptionMetrics;
  systemIntegrity: SystemIntegrity;
  criticalAlerts: Alert[];
  recentEvents: RecentEvent[];
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  action?: string;
  timestamp: string;
}

interface RecentEvent {
  id: string;
  type: string;
  status: 'success' | 'failed';
  user?: string;
  amount?: number;
  timestamp: string;
}

export default function PaymentMonitorDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user || !isAdmin) return;
    
    try {
      setRefreshing(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/payment-metrics', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isAdmin]);

  const testWebhook = async () => {
    if (!user) return;
    
    try {
      setTestingWebhook(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Webhook test result:', result);
        // Wait a moment for logs to be written
        setTimeout(() => fetchMetrics(), 1000);
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
    } finally {
      setTestingWebhook(false);
    }
  };

  const executeAction = async (action: string) => {
    console.log(`Executing action: ${action}`);
    if (!user) {
      console.error('No user found');
      setActionResult({ type: 'error', message: 'Not authenticated' });
      return;
    }
    
    if (runningAction) {
      console.log('Another action is already running');
      return;
    }
    
    try {
      setRunningAction(action);
      setActionResult(null);
      
      console.log('Getting user token...');
      const token = await user.getIdToken();
      
      console.log(`Sending request to /api/admin/payment-actions with action: ${action}`);
      const response = await fetch('/api/admin/payment-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      
      console.log(`Response status: ${response.status}`);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setActionResult({
          type: 'success',
          message: data.message || 'Action completed successfully'
        });
        // Show detailed results in console for debugging
        if (data.results) {
          console.log('Action results:', data.results);
        }
        // Refresh metrics after successful action
        await fetchMetrics();
      } else {
        console.error('Action failed:', data);
        setActionResult({
          type: 'error',
          message: data.error || data.details || 'Action failed'
        });
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setActionResult({
        type: 'error',
        message: error instanceof Error ? error.message : `Failed to execute ${action}`
      });
    } finally {
      setRunningAction(null);
      // Clear result after 7 seconds
      setTimeout(() => setActionResult(null), 7000);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchMetrics();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin, fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh || !user || !isAdmin) return;
    
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, isAdmin, fetchMetrics]);

  if (loading) {
    return (
      <AdminLayout title="Payment System Monitor">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Payment System Monitor">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground mt-2">Admin access required</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!metrics) {
    return (
      <AdminLayout title="Payment System Monitor">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Unable to Load Metrics</h2>
            <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      case 'testing': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': 
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3" /> Healthy
        </span>;
      case 'degraded':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" /> Degraded
        </span>;
      case 'down':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-3 w-3" /> Down
        </span>;
      case 'testing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Zap className="h-3 w-3" /> Testing
        </span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Payment System Monitor">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
              <Shield className="h-6 md:h-8 w-6 md:w-8 text-primary flex-shrink-0" />
              <span className="break-words">Payment System Monitor</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
              Real-time monitoring of payments, webhooks, and system health
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2 text-sm px-3 py-2 sm:py-0">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground whitespace-nowrap">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={fetchMetrics}
              disabled={refreshing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {metrics.criticalAlerts && metrics.criticalAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {metrics.criticalAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 md:p-4 rounded-lg border-2 ${
                alert.type === 'error' 
                  ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' 
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                  : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  {alert.type === 'error' ? <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" /> :
                   alert.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" /> :
                   <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm sm:text-base">{alert.message}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {alert.action && (
                  <button
                    onClick={() => executeAction(alert.action)}
                    className="px-3 py-1 text-sm bg-background hover:bg-muted border border-border rounded-lg transition-colors whitespace-nowrap"
                  >
                    Fix Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Webhook Health */}
        <div className="bg-card border-2 border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 text-primary" />
            {getStatusBadge(metrics.webhookHealth.status)}
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">Webhook Health</h3>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground" title="Success rate for the last 24 hours">24h Success Rate</span>
              <span className={`font-medium ${
                (100 - metrics.webhookHealth.failureRate) >= 95 ? 'text-green-500' :
                (100 - metrics.webhookHealth.failureRate) >= 80 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {(100 - metrics.webhookHealth.failureRate).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Hour</span>
              <span className="font-medium text-foreground">{metrics.webhookHealth.lastHourEvents} events</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Processing</span>
              <span className="font-medium text-foreground">{metrics.webhookHealth.processingTime}ms</span>
            </div>
            {metrics.webhookHealth.lastSuccess && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Last success</p>
                <p className="text-xs font-medium text-foreground">
                  {new Date(metrics.webhookHealth.lastSuccess).toLocaleTimeString()}
                </p>
              </div>
            )}
            {(metrics.webhookHealth.requiresTest || metrics.webhookHealth.status === 'testing') && (
              <button
                onClick={testWebhook}
                disabled={testingWebhook}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors mt-3"
              >
                <Send className={`h-4 w-4 ${testingWebhook ? 'animate-pulse' : ''}`} />
                {testingWebhook ? 'Testing...' : 'Send Test Event'}
              </button>
            )}
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-card border-2 border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">
              {metrics.subscriptions.active.total}
            </span>
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">Active Subscriptions</h3>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly</span>
              <span className="font-medium text-foreground">{metrics.subscriptions.active.monthly}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Yearly</span>
              <span className="font-medium text-foreground">{metrics.subscriptions.active.yearly}</span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className={`font-medium flex items-center gap-1 ${
                  metrics.subscriptions.churn.trend === 'up' ? 'text-red-500' :
                  metrics.subscriptions.churn.trend === 'down' ? 'text-green-500' :
                  'text-foreground'
                }`}>
                  {metrics.subscriptions.churn.rate.toFixed(1)}%
                  {metrics.subscriptions.churn.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {metrics.subscriptions.churn.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-card border-2 border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-primary" />
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">Revenue</h3>
          <div className="space-y-2 mt-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">MRR</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.subscriptions.revenue.currency} {metrics.subscriptions.revenue.mrr.toFixed(2)}
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">ARR</p>
              <p className="text-lg font-semibold text-foreground">
                {metrics.subscriptions.revenue.currency} {metrics.subscriptions.revenue.arr.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-card border-2 border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <div className="flex gap-1">
              {metrics.systemIntegrity.stripeConnection ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />}
              {metrics.systemIntegrity.cloudFunctionStatus ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />}
              {metrics.systemIntegrity.firebaseSync ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">System Health</h3>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stripe API</span>
              {metrics.systemIntegrity.stripeConnection ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cloud Functions</span>
              {metrics.systemIntegrity.cloudFunctionStatus ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Firebase Sync</span>
              {metrics.systemIntegrity.firebaseSync ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            {metrics.systemIntegrity.inconsistentUsers > 0 && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => executeAction('fix-inconsistent-users')}
                  className="text-xs text-red-500 hover:text-red-600 hover:underline"
                >
                  Fix {metrics.systemIntegrity.inconsistentUsers} data issues →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Today's Activity */}
        <div className="lg:col-span-2 bg-card border-2 border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Today's Activity</h3>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <ArrowUpRight className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {metrics.subscriptions.recent.newToday}
              </div>
              <div className="text-xs text-muted-foreground">New Subscriptions</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <ArrowDownRight className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {metrics.subscriptions.recent.canceledToday}
              </div>
              <div className="text-xs text-muted-foreground">Canceled Today</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">
                {metrics.subscriptions.recent.failedPayments}
              </div>
              <div className="text-xs text-muted-foreground">Failed Payments</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border-2 border-border rounded-xl p-4 md:p-6 relative">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Quick Actions</h3>
          <div className="space-y-2 relative z-10">
            <button
              onClick={() => {
                console.log('Sync button clicked');
                executeAction('sync-all-subscriptions');
              }}
              disabled={runningAction !== null}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 touch-manipulation relative z-10"
              type="button"
            >
              {runningAction === 'sync-all-subscriptions' ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Syncing...</>
              ) : (
                'Sync Subscriptions'
              )}
            </button>
            <button
              onClick={() => {
                console.log('Check refunds button clicked');
                executeAction('check-refunds');
              }}
              disabled={runningAction !== null}
              className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 active:bg-secondary/70 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 touch-manipulation relative z-10"
              type="button"
            >
              {runningAction === 'check-refunds' ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</>
              ) : (
                'Check Refunds'
              )}
            </button>
            <button
              onClick={() => {
                console.log('Clear cache button clicked');
                executeAction('clear-webhook-cache');
              }}
              disabled={runningAction !== null}
              className="w-full px-4 py-3 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 active:bg-muted/70 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 touch-manipulation relative z-10"
              type="button"
            >
              {runningAction === 'clear-webhook-cache' ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Clearing...</>
              ) : (
                'Clear Cache'
              )}
            </button>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-lg text-sm hover:bg-accent/80 active:bg-accent/70 transition-colors flex items-center justify-center gap-2 touch-manipulation relative z-10 block"
            >
              Open Stripe Dashboard
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          {actionResult && (
            <div className={`mt-3 p-3 rounded-lg text-xs leading-relaxed ${
              actionResult.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              <div className="font-medium flex items-center gap-1">
                {actionResult.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {actionResult.type === 'success' ? 'Success' : 'Error'}
              </div>
              <div className="mt-1">{actionResult.message}</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Events Table */}
      {metrics.recentEvents && metrics.recentEvents.length > 0 && (
        <div className="bg-card border-2 border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Recent Events</h3>
            <span className="text-xs text-muted-foreground">Last 24 hours</span>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 md:py-3 px-4 text-xs md:text-sm font-medium text-muted-foreground">Date & Time</th>
                  <th className="text-left py-2 md:py-3 px-4 text-xs md:text-sm font-medium text-muted-foreground">Event</th>
                  <th className="text-left py-2 md:py-3 px-4 text-xs md:text-sm font-medium text-muted-foreground hidden sm:table-cell">User</th>
                  <th className="text-left py-2 md:py-3 px-4 text-xs md:text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-2 md:py-3 px-4 text-xs md:text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 md:py-3 px-4 text-xs md:text-sm text-muted-foreground">
                      <div>{new Date(event.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                      <div className="text-[10px] md:text-xs opacity-75">{new Date(event.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-2 md:py-3 px-4 text-xs md:text-sm font-mono text-foreground break-all">{event.type}</td>
                    <td className="py-2 md:py-3 px-4 text-xs md:text-sm text-foreground hidden sm:table-cell">{event.user || '—'}</td>
                    <td className="py-2 md:py-3 px-4 text-xs md:text-sm text-foreground">
                      {event.amount ? `£${event.amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 md:py-3 px-4">
                      {event.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs md:text-sm text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs md:text-sm text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">Failed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}