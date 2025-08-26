'use client';

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { getSecurityMonitor } from '@/lib/auth/security-monitor';
import { getRateLimiter } from '@/lib/auth/rate-limiter';
import { SecurityEvent } from '@/lib/auth/types';
import { AUTH_CONFIG } from '@/lib/auth/constants';
import { 
  Shield, 
  AlertTriangle, 
  User, 
  Lock, 
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Filter,
  Search,
  XCircle,
  CheckCircle,
  Clock,
  Globe,
  Smartphone,
  Mail,
  Key
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SecuritySummary {
  totalEvents: number;
  criticalEvents: number;
  highRiskEvents: number;
  failedLogins: number;
  suspiciousActivities: number;
  lockedAccounts: number;
  uniqueUsers: number;
  eventsByType: Record<string, number>;
  recentCriticalEvents: SecurityEvent[];
}

function SecurityMonitoringContent() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [rateLimits, setRateLimits] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Fetch security data
  const fetchSecurityData = async () => {
    try {
      const monitor = getSecurityMonitor();
      const summaryData = await monitor.getSecuritySummary();
      setSummary(summaryData);

      const limiter = getRateLimiter();
      setRateLimits(limiter.getCurrentLimits());
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchSecurityData();

    if (autoRefresh) {
      const interval = setInterval(fetchSecurityData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filter events
  const filterEvents = (events: SecurityEvent[]) => {
    return events.filter(event => {
      if (filterType !== 'all' && event.eventType !== filterType) return false;
      if (searchTerm && !event.userId.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-50';
      case 'high': return 'text-orange-500 bg-orange-50';
      case 'medium': return 'text-yellow-500 bg-yellow-50';
      case 'low': return 'text-green-500 bg-green-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  // Get event type icon
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login_success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'login_failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'magic_link_sent': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'account_locked': return <Lock className="w-4 h-4 text-red-500" />;
      case 'suspicious_activity': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'email_verified': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'password_reset_requested': return <Key className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Security Monitoring</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg border ${
                  autoRefresh 
                    ? 'bg-green-50 border-green-300 text-green-600' 
                    : 'bg-gray-50 border-gray-300 text-gray-600'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={fetchSecurityData}
                className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            Real-time security monitoring and threat detection
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-6 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Total Events (24h)</span>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary?.totalEvents || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.uniqueUsers || 0} unique users
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-red-50 p-6 rounded-xl border border-red-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-700 text-sm">Critical Events</span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-700">{summary?.criticalEvents || 0}</div>
            <div className="text-xs text-red-600 mt-1">
              {summary?.lockedAccounts || 0} accounts locked
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-orange-50 p-6 rounded-xl border border-orange-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-700 text-sm">Failed Logins</span>
              <XCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-700">{summary?.failedLogins || 0}</div>
            <div className="text-xs text-orange-600 mt-1">
              {summary?.suspiciousActivities || 0} suspicious activities
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-yellow-50 p-6 rounded-xl border border-yellow-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-700 text-sm">High Risk Events</span>
              <Shield className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-700">{summary?.highRiskEvents || 0}</div>
            <div className="text-xs text-yellow-600 mt-1">
              Requires attention
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-xl border border-border mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
              >
                <option value="all">All Events</option>
                <option value="login_failed">Failed Logins</option>
                <option value="suspicious_activity">Suspicious Activity</option>
                <option value="account_locked">Locked Accounts</option>
                <option value="magic_link_sent">Magic Links</option>
                <option value="email_verified">Email Verifications</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by user ID..."
                  className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Critical Events */}
        {summary?.recentCriticalEvents && summary.recentCriticalEvents.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700">Critical Security Events</h2>
            </div>
            <div className="space-y-3">
              {filterEvents(summary.recentCriticalEvents).map((event) => (
                <div
                  key={event.id}
                  className="bg-white p-4 rounded-lg border border-red-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getEventIcon(event.eventType)}
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {event.eventType.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          User: {event.userId}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(event.riskLevel)}`}>
                      {event.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <div className="font-medium mb-1">Metadata:</div>
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key}>
                          {key}: {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rate Limits */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Active Rate Limits</h2>
          </div>
          {rateLimits.size > 0 ? (
            <div className="space-y-2">
              {Array.from(rateLimits.entries()).map(([key, entry]) => {
                const [action, identifier] = key.split(':');
                const config = AUTH_CONFIG.RATE_LIMITS[action as keyof typeof AUTH_CONFIG.RATE_LIMITS];
                const isBlocked = entry.blockedUntil && entry.blockedUntil > Date.now();
                
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border ${
                      isBlocked ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {action.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {identifier}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {entry.attempts} / {config?.maxAttempts || 'N/A'}
                        </div>
                        {isBlocked && (
                          <div className="text-xs text-red-600 mt-1">
                            Blocked for {Math.ceil((entry.blockedUntil - Date.now()) / 1000)}s
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No active rate limits</p>
          )}
        </div>

        {/* Event Type Distribution */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Event Distribution</h2>
          {summary?.eventsByType && Object.keys(summary.eventsByType).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(summary.eventsByType).map(([type, count]) => (
                <div
                  key={type}
                  className="p-3 bg-background rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getEventIcon(type)}
                    <span className="text-xs text-muted-foreground">
                      {type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">{count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No events to display</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main export with AdminGuard wrapper
export default function SecurityMonitoringPage() {
  return (
    <AdminGuard>
      <SecurityMonitoringContent />
    </AdminGuard>
  );
}