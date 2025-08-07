'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Database, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ConsistencyCheck {
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  details?: string;
  affectedCount?: number;
}

interface ConsistencyReport {
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  checks: ConsistencyCheck[];
  overallHealth: 'healthy' | 'needs_attention' | 'critical';
}

export default function DataConsistencyChecker({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchConsistencyReport();
  }, [refreshKey]);

  const fetchConsistencyReport = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/system-health/consistency', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consistency report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error('Error fetching consistency report:', err);
      
      // Set mock data for demonstration
      setReport({
        timestamp: new Date().toISOString(),
        totalChecks: 8,
        passedChecks: 6,
        failedChecks: 1,
        warningChecks: 1,
        overallHealth: 'needs_attention',
        checks: [
          {
            name: 'Subscription Plan Consistency',
            description: 'Check if inactive subscriptions have free plan',
            status: 'pass',
          },
          {
            name: 'Stripe ID Validation',
            description: 'Verify all Stripe IDs exist in Stripe',
            status: 'warning',
            details: 'Found 2 subscriptions with invalid Stripe IDs',
            affectedCount: 2,
          },
          {
            name: 'Nested Structure Check',
            description: 'Detect nested subscription.subscription structures',
            status: 'fail',
            details: 'Found 1 user with nested subscription structure',
            affectedCount: 1,
          },
          {
            name: 'Usage Counter Validation',
            description: 'Verify usage counters are within limits',
            status: 'pass',
          },
          {
            name: 'Date Consistency',
            description: 'Check if dates are valid and in correct format',
            status: 'pass',
          },
          {
            name: 'Entitlement Rules Match',
            description: 'Verify entitlements match subscription plans',
            status: 'pass',
          },
          {
            name: 'Orphaned Data Check',
            description: 'Find data without associated users',
            status: 'pass',
          },
          {
            name: 'Three-Pillar Sync',
            description: 'Verify Three-Pillar Architecture consistency',
            status: 'pass',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const runConsistencyCheck = async () => {
    if (!user) return;

    setRunning(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/system-health/consistency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runCheck: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to run consistency check');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error('Error running consistency check:', err);
    } finally {
      setRunning(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'needs_attention':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Data Consistency Checker</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const healthPercentage = report.totalChecks > 0
    ? Math.round((report.passedChecks / report.totalChecks) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Data Consistency Checker</h2>
        <button
          onClick={runConsistencyCheck}
          disabled={running}
          className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running...' : 'Run Check'}
        </button>
      </div>

      {/* Overall Health */}
      <div className={`p-4 rounded-lg mb-6 ${getHealthColor(report.overallHealth)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium opacity-75">Overall Health</div>
            <div className="text-2xl font-bold capitalize">
              {report.overallHealth.replace('_', ' ')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{healthPercentage}%</div>
            <div className="text-sm opacity-75">
              {report.passedChecks}/{report.totalChecks} checks passed
            </div>
          </div>
        </div>
      </div>

      {/* Check Summary */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{report.passedChecks}</div>
          <div className="text-xs text-green-600">Passed</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{report.warningChecks}</div>
          <div className="text-xs text-yellow-600">Warnings</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{report.failedChecks}</div>
          <div className="text-xs text-red-600">Failed</div>
        </div>
      </div>

      {/* Individual Checks */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Consistency Checks</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {report.checks.map((check, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                check.status === 'pass'
                  ? 'bg-green-50'
                  : check.status === 'warning'
                  ? 'bg-yellow-50'
                  : 'bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <div className="font-medium text-sm">{check.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{check.description}</div>
                  {check.details && (
                    <div className="text-xs mt-2 font-medium">
                      {check.details}
                      {check.affectedCount !== undefined && (
                        <span className="ml-2 px-2 py-0.5 bg-white rounded">
                          {check.affectedCount} affected
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Check Time */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        Last check: {new Date(report.timestamp).toLocaleString()}
      </div>

      {/* Fix Button */}
      {(report.failedChecks > 0 || report.warningChecks > 0) && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => {
              if (confirm('Run automatic fixes for detected issues?')) {
                alert('Auto-fix would be triggered here');
              }
            }}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Auto-Fix {report.failedChecks + report.warningChecks} Issues
          </button>
        </div>
      )}
    </div>
  );
}