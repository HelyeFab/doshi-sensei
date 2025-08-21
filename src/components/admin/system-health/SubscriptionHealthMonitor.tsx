'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

interface SubscriptionHealthData {
  totalUsers: number;
  activeSubscriptions: number;
  invalidSubscriptions: number;
  nestedStructures: number;
  missingStripeIds: number;
  testSubscriptions: number;
  healthScore: number;
  issues: SubscriptionIssue[];
}

interface SubscriptionIssue {
  userId: string;
  email: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
}

export default function SubscriptionHealthMonitor({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<SubscriptionHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthData();
  }, [refreshKey]);

  const fetchHealthData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/system-health/subscriptions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription health data');
      }

      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      console.error('Error fetching subscription health:', err);
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Subscription Health Monitor</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Subscription Health Monitor</h2>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Subscription Health Monitor</h2>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getHealthColor(healthData.healthScore)}`}>
          {getHealthIcon(healthData.healthScore)}
          <span className="font-semibold">Health Score: {healthData.healthScore}%</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MetricCard
          label="Total Users"
          value={healthData.totalUsers}
          color="blue"
        />
        <MetricCard
          label="Active Subs"
          value={healthData.activeSubscriptions}
          color="green"
        />
        <MetricCard
          label="Invalid Subs"
          value={healthData.invalidSubscriptions}
          color="red"
          showWarning={healthData.invalidSubscriptions > 0}
        />
        <MetricCard
          label="Nested Structures"
          value={healthData.nestedStructures}
          color="yellow"
          showWarning={healthData.nestedStructures > 0}
        />
        <MetricCard
          label="Missing Stripe IDs"
          value={healthData.missingStripeIds}
          color="orange"
          showWarning={healthData.missingStripeIds > 0}
        />
        <MetricCard
          label="Test Subs"
          value={healthData.testSubscriptions}
          color="purple"
          showWarning={healthData.testSubscriptions > 0}
        />
      </div>

      {/* Issues List */}
      {healthData.issues.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Issues Detected ({healthData.issues.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {healthData.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  issue.severity === 'critical'
                    ? 'bg-red-50'
                    : issue.severity === 'warning'
                    ? 'bg-yellow-50'
                    : 'bg-blue-50'
                }`}
              >
                {issue.severity === 'critical' ? (
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                ) : issue.severity === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{issue.email}</div>
                  <div className="text-sm text-gray-600">{issue.issue}</div>
                  <div className="text-xs text-gray-500 mt-1">User ID: {issue.userId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(healthData.invalidSubscriptions > 0 || healthData.nestedStructures > 0 || healthData.testSubscriptions > 0) && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Found {healthData.invalidSubscriptions + healthData.nestedStructures + healthData.testSubscriptions} issues that can be auto-fixed
            </div>
            <button
              onClick={() => {
                if (confirm('This will run the cleanup script to fix subscription issues. Continue?')) {
                  // Trigger cleanup
                  alert('Cleanup would be triggered here');
                }
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Run Cleanup Script
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  color, 
  showWarning = false 
}: { 
  label: string; 
  value: number; 
  color: string;
  showWarning?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="text-2xl font-bold mt-1 flex items-center gap-2">
        {value}
        {showWarning && <AlertCircle className="w-4 h-4" />}
      </div>
    </div>
  );
}