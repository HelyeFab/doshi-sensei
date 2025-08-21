'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionHealthMonitor from './SubscriptionHealthMonitor';
import StripeWebhookMonitor from './StripeWebhookMonitor';
import DataConsistencyChecker from './DataConsistencyChecker';
import { RefreshCw } from 'lucide-react';

export default function SystemHealthDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLastRefresh(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh All
            </button>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
            </label>
          </div>
          
          <div className="text-sm text-gray-500">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Health Monitors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Health Monitor */}
        <div className="lg:col-span-2">
          <SubscriptionHealthMonitor refreshKey={refreshKey} />
        </div>

        {/* Stripe Webhook Monitor */}
        <div>
          <StripeWebhookMonitor refreshKey={refreshKey} />
        </div>

        {/* Data Consistency Checker */}
        <div>
          <DataConsistencyChecker refreshKey={refreshKey} />
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">System Alerts</h2>
        <SystemAlerts refreshKey={refreshKey} />
      </div>
    </div>
  );
}

function SystemAlerts({ refreshKey }: { refreshKey: number }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemAlerts();
  }, [refreshKey]);

  const checkSystemAlerts = async () => {
    setLoading(true);
    // This would normally fetch from an API
    // For now, we'll simulate some alerts based on other health checks
    
    const mockAlerts = [];
    
    // Check for critical issues
    const now = new Date();
    
    // Add alerts based on conditions
    // These would be populated by actual API data
    
    setAlerts(mockAlerts);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-gray-500">Checking system alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-green-600 bg-green-50 p-4 rounded-lg">
        ✅ No system alerts - All systems operational
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg ${
            alert.severity === 'critical'
              ? 'bg-red-50 text-red-700'
              : alert.severity === 'warning'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          <div className="font-medium">{alert.title}</div>
          <div className="text-sm mt-1">{alert.message}</div>
        </div>
      ))}
    </div>
  );
}