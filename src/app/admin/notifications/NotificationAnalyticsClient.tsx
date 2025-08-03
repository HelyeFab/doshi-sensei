'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import Link from 'next/link';
import { format } from 'date-fns';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import BroadcastNotificationForm from '@/components/admin/BroadcastNotificationForm';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface NotificationLog {
  id: string;
  userId: string;
  type: 'study_reminder' | 'review_reminder' | 'streak_reminder' | 'test' | 'achievement';
  sentAt: Timestamp;
  status: 'sent' | 'failed' | 'clicked';
  title?: string;
  error?: string;
  clickedAt?: Timestamp;
}

interface NotificationStats {
  totalSent: number;
  totalClicked: number;
  totalFailed: number;
  clickRate: number;
  byType: {
    [key: string]: {
      sent: number;
      clicked: number;
      failed: number;
    };
  };
  dailyStats: {
    date: string;
    sent: number;
    clicked: number;
  }[];
  hourlyDistribution: number[];
}

interface UserPreferences {
  enabled: number;
  disabled: number;
  byType: {
    studyReminders: number;
    reviewReminders: number;
    streakReminders: number;
  };
}

export default function NotificationAnalyticsClient() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [testUserId, setTestUserId] = useState('');
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadAnalytics();
  }, [user, selectedTimeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const daysAgo = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Load notification logs
      const logsQuery = query(
        collection(db, 'notificationLogs'),
        where('sentAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('sentAt', 'desc'),
        limit(1000)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logs: NotificationLog[] = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NotificationLog));

      // Calculate stats
      const stats: NotificationStats = {
        totalSent: 0,
        totalClicked: 0,
        totalFailed: 0,
        clickRate: 0,
        byType: {},
        dailyStats: [],
        hourlyDistribution: new Array(24).fill(0)
      };

      // Process logs
      const dailyMap = new Map<string, { sent: number; clicked: number }>();
      
      logs.forEach(log => {
        // Overall stats
        if (log.status === 'sent') stats.totalSent++;
        else if (log.status === 'clicked') stats.totalClicked++;
        else if (log.status === 'failed') stats.totalFailed++;

        // By type stats
        if (!stats.byType[log.type]) {
          stats.byType[log.type] = { sent: 0, clicked: 0, failed: 0 };
        }
        if (log.status === 'sent') stats.byType[log.type].sent++;
        else if (log.status === 'clicked') stats.byType[log.type].clicked++;
        else if (log.status === 'failed') stats.byType[log.type].failed++;

        // Daily stats
        const date = format(log.sentAt.toDate(), 'yyyy-MM-dd');
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { sent: 0, clicked: 0 });
        }
        const daily = dailyMap.get(date)!;
        if (log.status === 'sent') daily.sent++;
        else if (log.status === 'clicked') daily.clicked++;

        // Hourly distribution
        const hour = log.sentAt.toDate().getHours();
        stats.hourlyDistribution[hour]++;
      });

      // Convert daily map to array
      stats.dailyStats = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate click rate
      stats.clickRate = stats.totalSent > 0 
        ? Math.round((stats.totalClicked / stats.totalSent) * 100) 
        : 0;

      // Load user preferences
      const prefsSnapshot = await getDocs(collection(db, 'notificationPreferences'));
      const prefs: UserPreferences = {
        enabled: 0,
        disabled: 0,
        byType: {
          studyReminders: 0,
          reviewReminders: 0,
          streakReminders: 0
        }
      };

      prefsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.enabled) {
          prefs.enabled++;
          if (data.preferences?.studyReminders?.enabled) prefs.byType.studyReminders++;
          if (data.preferences?.reviewReminders?.enabled) prefs.byType.reviewReminders++;
          if (data.preferences?.streakReminders?.enabled) prefs.byType.streakReminders++;
        } else {
          prefs.disabled++;
        }
      });

      // Get recent logs
      const recentLogsQuery = query(
        collection(db, 'notificationLogs'),
        orderBy('sentAt', 'desc'),
        limit(20)
      );
      const recentSnapshot = await getDocs(recentLogsQuery);
      const recent = recentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NotificationLog));

      setStats(stats);
      setPreferences(prefs);
      setRecentLogs(recent);
    } catch (error) {
      console.error('Error loading notification analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!testUserId.trim()) {
      showNotification({
        title: 'Please enter a user ID',
        type: 'error',
      });
      return;
    }

    setTestSending(true);
    try {
      const response = await fetch('/api/notifications/admin-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user!.getIdToken()}`
        },
        body: JSON.stringify({
          userId: testUserId,
          type: 'test'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showNotification({
          title: 'Failed to send test notification',
          message: data.error || 'Unknown error occurred',
          type: 'error',
        });
        return;
      }

      showNotification({
        title: 'Test notification sent successfully!',
        type: 'success',
      });
      setTestUserId('');
      
      // Reload analytics to show the new notification
      setTimeout(loadAnalytics, 2000);
    } catch (error) {
      console.error('Error sending test notification:', error);
      showNotification({
        title: 'Failed to send test notification',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
      });
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats || !preferences) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">No analytics data available.</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart data
  const deliveryRateData = {
    labels: ['Sent', 'Clicked', 'Failed'],
    datasets: [{
      data: [stats.totalSent, stats.totalClicked, stats.totalFailed],
      backgroundColor: ['#3B82F6', '#10B981', '#EF4444'],
      borderWidth: 0
    }]
  };

  const dailyTrendData = {
    labels: stats.dailyStats.map(d => format(new Date(d.date), 'MMM d')),
    datasets: [
      {
        label: 'Sent',
        data: stats.dailyStats.map(d => d.sent),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      },
      {
        label: 'Clicked',
        data: stats.dailyStats.map(d => d.clicked),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1
      }
    ]
  };

  const hourlyData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Notifications Sent',
      data: stats.hourlyDistribution,
      backgroundColor: '#8B5CF6',
      borderWidth: 0
    }]
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Notification Analytics</h1>
          <p className="text-gray-600 mt-2">Monitor push notification performance and engagement</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Sent</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSent.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Clicked</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalClicked.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Click Rate</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.clickRate}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600">Opt-in Rate</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {Math.round((preferences.enabled / (preferences.enabled + preferences.disabled)) * 100)}%
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Delivery Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status</h3>
            <div className="h-64">
              <Doughnut data={deliveryRateData} options={chartOptions} />
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend</h3>
            <div className="h-64">
              <Line data={dailyTrendData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Distribution</h3>
          <div className="h-64">
            <Bar data={hourlyData} options={chartOptions} />
          </div>
        </div>

        {/* Notification Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Type Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">By Notification Type</h3>
            <div className="space-y-4">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {type.replace(/_/g, ' ')}
                  </h4>
                  <div className="flex gap-6 text-sm text-gray-600 mt-1">
                    <span>Sent: {data.sent}</span>
                    <span>Clicked: {data.clicked}</span>
                    <span>Failed: {data.failed}</span>
                    {data.sent > 0 && (
                      <span>CTR: {Math.round((data.clicked / data.sent) * 100)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Preferences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Preferences</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Notifications Enabled</span>
                <span className="font-semibold">{preferences.enabled} users</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Notifications Disabled</span>
                <span className="font-semibold">{preferences.disabled} users</span>
              </div>
              <hr className="my-4" />
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Study Reminders</span>
                  <span className="text-sm text-gray-600">{preferences.byType.studyReminders} users</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Review Reminders</span>
                  <span className="text-sm text-gray-600">{preferences.byType.reviewReminders} users</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Streak Reminders</span>
                  <span className="text-sm text-gray-600">{preferences.byType.streakReminders} users</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Notification */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Test Notification</h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="Enter user ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendTestNotification}
              disabled={testSending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Send a test notification to verify the system is working correctly.
          </p>
        </div>

        {/* Broadcast Notification */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Broadcast Notification</h3>
          <BroadcastNotificationForm />
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {format(log.sentAt.toDate(), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className="capitalize text-gray-700">
                        {log.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        log.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        log.status === 'clicked' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.title || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {log.userId.substring(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}