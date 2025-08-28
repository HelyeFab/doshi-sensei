'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationServiceContext';
import { RecentStudyTracker } from '@/utils/recentStudyTracker';
import { notificationService } from '@/services/notifications/NotificationService';

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const { 
    isInitialized, 
    permissionStatus, 
    preferences, 
    requestPermission, 
    testNotification 
  } = useNotifications();
  
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testItems, setTestItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Load debug info on mount
  useEffect(() => {
    if (user) {
      checkNotificationStatus();
      loadRecentItems();
      loadStats();
    }
  }, [user]);

  const checkNotificationStatus = async () => {
    try {
      const response = await fetch('/api/notifications/debug');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Failed to load debug info:', error);
    }
  };

  const loadRecentItems = async () => {
    const items = await RecentStudyTracker.getRecentItems(5);
    setTestItems(items);
  };

  const loadStats = async () => {
    const studyStats = await RecentStudyTracker.getStats();
    setStats(studyStats);
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        // Reload debug info
        await checkNotificationStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async (type: string) => {
    setIsLoading(true);
    try {
      await testNotification(type);
    } catch (error) {
      console.error('Test notification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTestStudyItem = async (type: string, content: string) => {
    await RecentStudyTracker.addItem({ type: type as any, content });
    await loadRecentItems();
    await loadStats();
    alert(`Added ${content} to recent studies!`);
  };

  const triggerManualNotification = async () => {
    try {
      // This would typically be done server-side, but for testing:
      const token = await notificationService.getCurrentToken();
      if (!token) {
        alert('No FCM token available. Please enable notifications first.');
        return;
      }
      
      // Call test endpoint
      const response = await fetch('/api/notifications/debug', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      
      const result = await response.json();
      alert(result.message || 'Test notification triggered!');
    } catch (error) {
      alert(`Failed: ${error}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">Please log in to test notifications</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">🔔 Notification Testing Dashboard</h1>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Service Initialized:</span>{' '}
              <span className={isInitialized ? 'text-green-600' : 'text-red-600'}>
                {isInitialized ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Permission Status:</span>{' '}
              <span className={
                permissionStatus === 'granted' ? 'text-green-600' : 
                permissionStatus === 'denied' ? 'text-red-600' : 'text-yellow-600'
              }>
                {permissionStatus}
              </span>
            </div>
            <div>
              <span className="font-medium">Notifications Enabled:</span>{' '}
              <span className={preferences?.enabled ? 'text-green-600' : 'text-red-600'}>
                {preferences?.enabled ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div>
              <span className="font-medium">FCM Token:</span>{' '}
              <span className={preferences?.fcmToken ? 'text-green-600' : 'text-red-600'}>
                {preferences?.fcmToken ? '✅ Available' : '❌ Missing'}
              </span>
            </div>
          </div>

          {/* Permission Request Button */}
          {permissionStatus !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Requesting...' : 'Request Notification Permission'}
            </button>
          )}
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            
            {/* Summary */}
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Summary:</h3>
              <ul className="space-y-1 text-sm">
                <li>✅ Fully Configured: {debugInfo.summary?.isFullyConfigured ? '✅' : '❌'}</li>
                <li>📱 Can Receive Push: {debugInfo.summary?.canReceivePushNotifications ? '✅' : '❌'}</li>
                <li>📋 Has Content to Review: {debugInfo.summary?.hasContentToReview ? '✅' : '❌'}</li>
              </ul>
            </div>

            {/* Recommendations */}
            {debugInfo.recommendations?.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 rounded">
                <h3 className="font-semibold mb-2">Recommendations:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {debugInfo.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {debugInfo.status?.errors?.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 rounded">
                <h3 className="font-semibold mb-2 text-red-700">Errors:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  {debugInfo.status.errors.map((error: string, i: number) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* User Stats */}
            {debugInfo.status?.userStats && (
              <div className="mb-4 p-4 bg-blue-50 rounded">
                <h3 className="font-semibold mb-2">Your Stats:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Current Streak: {debugInfo.status.userStats.currentStreak || 0}</div>
                  <div>Kanji Learned: {debugInfo.status.userStats.totalKanjiLearned || 0}</div>
                  <div>Words Learned: {debugInfo.status.userStats.totalWordsLearned || 0}</div>
                  <div>Studied Today: {debugInfo.status.userStats.hasStudiedToday ? '✅' : '❌'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Notifications</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTestNotification('study_reminder')}
              disabled={isLoading || permissionStatus !== 'granted'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Test Study Reminder
            </button>
            <button
              onClick={() => handleTestNotification('review_reminder')}
              disabled={isLoading || permissionStatus !== 'granted'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Test Review Reminder
            </button>
            <button
              onClick={() => handleTestNotification('streak_reminder')}
              disabled={isLoading || permissionStatus !== 'granted'}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Test Streak Reminder
            </button>
            <button
              onClick={triggerManualNotification}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Trigger Manual Notification
            </button>
          </div>
        </div>

        {/* Add Test Study Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add Test Study Items</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add items to track them for review reminders
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => addTestStudyItem('kanji', '本')}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Kanji: 本
            </button>
            <button
              onClick={() => addTestStudyItem('word', '勉強')}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Word: 勉強
            </button>
            <button
              onClick={() => addTestStudyItem('kanji', '日')}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add Kanji: 日
            </button>
          </div>
        </div>

        {/* Recent Study Items */}
        {testItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Study Items</h2>
            <div className="space-y-2">
              {testItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{item.content}</span>
                  <span className="text-sm text-gray-600">
                    {item.type} • Next review: {item.nextReview ? new Date(item.nextReview).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Study Stats */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Study Statistics</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Total Items: {stats.totalItems}</div>
              <div>Due Today: <span className="font-bold text-orange-600">{stats.dueTodayCount}</span></div>
              <div>Overdue: <span className="font-bold text-red-600">{stats.overdueCount}</span></div>
              <div>Recently Studied: {stats.recentlyStudiedCount}</div>
            </div>
            {stats.typeBreakdown && Object.keys(stats.typeBreakdown).length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">By Type:</h3>
                <div className="flex gap-3">
                  {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                    <span key={type} className="px-3 py-1 bg-gray-100 rounded">
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📝 How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First, click "Request Notification Permission" if you haven't already</li>
            <li>Add some test study items using the buttons above</li>
            <li>Test different notification types to ensure they're working</li>
            <li>Check the Firebase console logs for the scheduled functions</li>
            <li>The recent study reminder runs daily at 9 AM your local time</li>
            <li>Review reminders run every 30 minutes if you have due items</li>
          </ol>
          
          <div className="mt-4 p-3 bg-orange-100 rounded">
            <p className="text-sm font-medium">🐼 Important:</p>
            <p className="text-sm">All notifications now redirect to <code>/test-panda</code> to show the cute red panda!</p>
          </div>
        </div>
      </div>
    </div>
  );
}