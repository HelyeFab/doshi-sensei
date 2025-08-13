'use client';

import { useUnifiedNotifications } from '@/hooks/useUnifiedNotifications';

function PWATestContent() {
  const {
    networkInfo,
    testConnectionOffline,
    testConnectionSlow,
    testConnectionRestored,
    testUpdateAvailable,
    testInstallPrompt
  } = useUnifiedNotifications();

  // Trigger real browser events
  const triggerRealOffline = () => {
    window.dispatchEvent(new Event('offline'));
  };

  const triggerRealOnline = () => {
    window.dispatchEvent(new Event('online'));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Unified Notification System Test</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current Network Status</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              networkInfo.isOnline ? 
                (networkInfo.quality === 'good' ? 'bg-green-500' : 'bg-yellow-500') : 
                'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-gray-700">
              {!networkInfo.isOnline ? 'Offline' : 
               networkInfo.quality === 'slow' ? 'Slow Connection' : 
               'Online'}
            </span>
            {networkInfo.rtt && (
              <span className="text-xs text-gray-500 ml-2">
                ({networkInfo.rtt}ms latency)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Connection Notifications (Top Banner Style)</h2>
          <p className="text-sm text-gray-600 mb-4">These appear as banners at the top of the screen</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={testConnectionOffline}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              No Internet Connection
            </button>
            <button
              onClick={testConnectionSlow}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Slow Connection
            </button>
            <button
              onClick={testConnectionRestored}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Connection Restored
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">PWA Notifications (Bottom Banner Style with Actions)</h2>
          <p className="text-sm text-gray-600 mb-4">These appear as banners at the bottom of the screen with action buttons</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={testUpdateAvailable}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Update Available (with Update button)
            </button>
            <button
              onClick={testInstallPrompt}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Install App (with Install button)
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Trigger Real Browser Events</h2>
          <p className="text-sm text-gray-600 mb-4">
            These trigger actual browser events that the app listens to
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={triggerRealOffline}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Trigger Real Offline Event
            </button>
            <button
              onClick={triggerRealOnline}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Trigger Real Online Event
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-2">What\'s New:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li><strong>ONE unified component</strong> handles all notifications</li>
            <li><strong>Connection status</strong> shows as top banner (important, temporary)</li>
            <li><strong>PWA notifications</strong> show as bottom banner (less intrusive)</li>
            <li><strong>Action buttons</strong> - Install, Update, Dismiss, etc.</li>
            <li><strong>Theme-aware</strong> - Uses card colors, respects all color schemes</li>
            <li><strong>No duplicate notifications</strong> - Single source of truth</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function PWATestPage() {
  return <PWATestContent />;
}