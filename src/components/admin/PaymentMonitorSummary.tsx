'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  Webhook,
  Activity
} from 'lucide-react';

interface QuickMetrics {
  webhookStatus: 'healthy' | 'degraded' | 'down';
  activeSubscriptions: number;
  mrr: number;
  failureRate: number;
  recentRefunds: number;
  criticalAlerts: number;
}

export function PaymentMonitorSummary() {
  const { user } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickMetrics();
    // Refresh every minute
    const interval = setInterval(fetchQuickMetrics, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchQuickMetrics = async () => {
    try {
      const response = await fetch('/api/admin/payment-metrics', {
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics({
          webhookStatus: data.webhookHealth.status,
          activeSubscriptions: data.subscriptions.active.total,
          mrr: data.subscriptions.revenue.mrr,
          failureRate: data.webhookHealth.failureRate,
          recentRefunds: data.subscriptions.recent.pendingRefunds,
          criticalAlerts: data.criticalAlerts.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch payment metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'degraded': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'down': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment System Health
        </h3>
        <button
          onClick={() => router.push('/admin/payment-monitor')}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View Full Monitor
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      {metrics.criticalAlerts > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {metrics.criticalAlerts} critical alert{metrics.criticalAlerts !== 1 ? 's' : ''} require attention
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="text-center p-3 bg-background rounded-lg border border-border">
          <Webhook className={`h-5 w-5 mx-auto mb-1 ${
            metrics.webhookStatus === 'healthy' ? 'text-green-500' : 
            metrics.webhookStatus === 'degraded' ? 'text-yellow-500' : 
            'text-red-500'
          }`} />
          <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(metrics.webhookStatus)}`}>
            {metrics.webhookStatus.toUpperCase()}
          </div>
          <div className="text-xs text-muted mt-1">Webhook</div>
        </div>

        <div className="text-center p-3 bg-background rounded-lg border border-border">
          <Activity className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-lg font-bold text-foreground">{metrics.activeSubscriptions}</div>
          <div className="text-xs text-muted">Active Subs</div>
        </div>

        <div className="text-center p-3 bg-background rounded-lg border border-border">
          <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-foreground">£{metrics.mrr.toFixed(0)}</div>
          <div className="text-xs text-muted">MRR</div>
        </div>

        <div className="text-center p-3 bg-background rounded-lg border border-border">
          <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${
            metrics.failureRate > 10 ? 'text-red-500' : 
            metrics.failureRate > 5 ? 'text-yellow-500' : 
            'text-green-500'
          }`} />
          <div className="text-lg font-bold text-foreground">{metrics.failureRate.toFixed(1)}%</div>
          <div className="text-xs text-muted">Failure Rate</div>
        </div>

        <div className="text-center p-3 bg-background rounded-lg border border-border">
          <RefreshCw className={`h-5 w-5 mx-auto mb-1 ${
            metrics.recentRefunds > 0 ? 'text-yellow-500' : 'text-muted'
          }`} />
          <div className="text-lg font-bold text-foreground">{metrics.recentRefunds}</div>
          <div className="text-xs text-muted">Refunds</div>
        </div>

        <div className="text-center p-3 bg-background rounded-lg border border-border">
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-foreground">
            {metrics.webhookStatus === 'healthy' && metrics.failureRate < 10 ? '✓' : '✗'}
          </div>
          <div className="text-xs text-muted">All Good</div>
        </div>
      </div>
    </div>
  );
}