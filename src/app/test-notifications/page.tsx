'use client';

import { useToast } from '@/contexts/ToastContext';
import { useUnifiedNotifications } from '@/hooks/useUnifiedNotifications';
import { usePWANotifications } from '@/hooks/usePWANotifications';

export default function TestNotificationsPage() {
  const { toast } = useToast();
  const { 
    testConnectionOffline, 
    testConnectionSlow, 
    testConnectionRestored, 
    testUpdateAvailable, 
    testInstallPrompt,
    networkInfo 
  } = useUnifiedNotifications();
  
  const {
    notifyInstallAvailable,
    notifyUpdateInstalled,
    notifyCacheCleared,
    notifyNotificationEnabled
  } = usePWANotifications();

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notification System Test</h1>
      
      <div className="space-y-6">
        {/* Basic Toast Tests */}
        <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Basic Toast Notifications</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toast.success('Success!', 'This is a success message')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Success Toast
            </button>
            <button
              onClick={() => toast.error('Error!', 'This is an error message')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Error Toast
            </button>
            <button
              onClick={() => toast.warning('Warning!', 'This is a warning message')}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Warning Toast
            </button>
            <button
              onClick={() => toast.info('Info', 'This is an info message')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Info Toast
            </button>
          </div>
        </section>

        {/* Unified Notifications Tests */}
        <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Unified Notification System</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Network Status: {networkInfo.isOnline ? 'Online' : 'Offline'} 
            ({networkInfo.quality})
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testConnectionOffline}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Test Offline
            </button>
            <button
              onClick={testConnectionSlow}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Test Slow Connection
            </button>
            <button
              onClick={testConnectionRestored}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Connection Restored
            </button>
            <button
              onClick={testUpdateAvailable}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Update Available
            </button>
            <button
              onClick={testInstallPrompt}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test Install Prompt
            </button>
          </div>
        </section>

        {/* PWA Notifications Tests */}
        <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">PWA Notification System</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={notifyInstallAvailable}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Install Available
            </button>
            <button
              onClick={notifyUpdateInstalled}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Update Installed
            </button>
            <button
              onClick={notifyCacheCleared}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Cache Cleared
            </button>
            <button
              onClick={notifyNotificationEnabled}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Notifications Enabled
            </button>
          </div>
        </section>

        {/* Status Info */}
        <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Toast System:</span>
              <span className="text-green-600">✅ Working</span>
            </div>
            <div className="flex justify-between">
              <span>Unified Notifications:</span>
              <span className="text-green-600">✅ Migrated to Toast</span>
            </div>
            <div className="flex justify-between">
              <span>PWA Notifications:</span>
              <span className="text-green-600">✅ Using Toast</span>
            </div>
            <div className="flex justify-between">
              <span>Global Toast Container:</span>
              <span className="text-green-600">✅ Added to Layout</span>
            </div>
            <div className="flex justify-between">
              <span>Legacy EnhancedToast:</span>
              <span className="text-yellow-600">⚠️ Can be removed</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}