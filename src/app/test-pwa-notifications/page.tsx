'use client';

import { useState, useEffect } from 'react';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { AlertBanner } from '@/components/AlertBanner';

export default function TestPWANotifications() {
  const { 
    permission, 
    isSupported, 
    requestPermission, 
    showNotification,
    scheduleNotification,
    cancelScheduledNotification
  } = usePWANotifications();
  
  const { isReady, hasUpdate, updateServiceWorker } = useServiceWorker();
  const [notificationLog, setNotificationLog] = useState<string[]>([]);
  const [scheduledId, setScheduledId] = useState<number | null>(null);
  const { showDialog, DialogComponent } = useConfirmDialog();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setNotificationLog(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  useEffect(() => {
    addLog(`PWA Notifications Support: ${isSupported ? 'Yes' : 'No'}`);
    addLog(`Current Permission: ${permission}`);
    addLog(`Service Worker Ready: ${isReady ? 'Yes' : 'No'}`);
  }, [isSupported, permission, isReady]);

  const handleRequestPermission = async () => {
    // Show informational dialog first
    showDialog({
      title: '🔔 Enable Notifications',
      message: (
        <div className="space-y-3">
          <p>Doshi Sensei would like to send you notifications for:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted">
            <li>Study reminders and practice sessions</li>
            <li>Achievement unlocks and progress updates</li>
            <li>New features and content updates</li>
            <li>Offline sync completion</li>
          </ul>
          <p className="text-sm text-muted mt-3">
            After clicking Continue, your browser will ask for permission.
            You can change this setting anytime in your browser preferences.
          </p>
        </div>
      ),
      type: 'info',
      confirmText: 'Continue',
      cancelText: 'Not Now',
      onConfirm: async () => {
        addLog('Requesting notification permission...');
        const result = await requestPermission();
        addLog(`Permission result: ${result}`);
        
        if (result === 'denied') {
          // Show help dialog if denied
          setTimeout(() => {
            showDialog({
              title: '❌ Notifications Blocked',
              message: (
                <div className="space-y-3">
                  <p>Notifications have been blocked in your browser.</p>
                  <p className="text-sm text-muted">
                    To enable notifications:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
                    <li>Click the lock/info icon in your address bar</li>
                    <li>Find "Notifications" in the permissions</li>
                    <li>Change from "Block" to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              ),
              type: 'warning',
              confirmText: 'Got it',
              showCancel: false
            });
          }, 500);
        }
      },
      onCancel: () => {
        addLog('User declined to enable notifications');
      }
    });
  };

  const handleBasicNotification = async () => {
    addLog('Sending basic notification...');
    console.log('Button clicked - permission:', permission);
    console.log('Is supported:', isSupported);
    console.log('Service worker ready:', isReady);
    
    try {
      await showNotification('Basic Notification', {
        body: 'This is a simple test notification',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png'
      });
      addLog('Basic notification sent successfully');
    } catch (error) {
      console.error('Notification error:', error);
      addLog(`Error: ${error}`);
    }
  };

  const handleRichNotification = async () => {
    addLog('Sending rich notification...');
    try {
      await showNotification('Rich Notification', {
        body: 'This notification has actions and an image',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        image: '/og-image.jpg',
        tag: 'rich-notification',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View', icon: '/icon-72x72.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icon-72x72.png' }
        ],
        data: { type: 'rich', timestamp: Date.now() }
      });
      addLog('Rich notification sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleVibrationNotification = async () => {
    addLog('Sending notification with vibration...');
    try {
      await showNotification('Vibration Test', {
        body: 'This notification should vibrate your device',
        icon: '/icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'vibration-test'
      });
      addLog('Vibration notification sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleSilentNotification = async () => {
    addLog('Sending silent notification...');
    try {
      await showNotification('Silent Notification', {
        body: 'This notification should not make a sound',
        icon: '/icon-192x192.png',
        silent: true,
        tag: 'silent-test'
      });
      addLog('Silent notification sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleScheduledNotification = async () => {
    addLog('Scheduling notification for 5 seconds from now...');
    try {
      const id = await scheduleNotification(
        'Scheduled Notification',
        {
          body: 'This was scheduled 5 seconds ago!',
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: 'scheduled-test'
        },
        5000
      );
      setScheduledId(id);
      addLog(`Notification scheduled with ID: ${id}`);
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleCancelScheduled = () => {
    if (scheduledId !== null) {
      cancelScheduledNotification(scheduledId);
      addLog(`Cancelled scheduled notification with ID: ${scheduledId}`);
      setScheduledId(null);
    } else {
      addLog('No scheduled notification to cancel');
    }
  };

  const handleUpdateNotification = async () => {
    addLog('Sending update notification (simulating SW update)...');
    try {
      await showNotification('App Update Available', {
        body: 'A new version of Doshi Sensei is available. Click to update.',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          { action: 'update', title: 'Update Now' },
          { action: 'later', title: 'Later' }
        ]
      });
      addLog('Update notification sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleOfflineNotification = async () => {
    addLog('Sending offline notification...');
    try {
      await showNotification('You are offline', {
        body: 'Some features may be limited while offline',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'offline-status'
      });
      addLog('Offline notification sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleSyncNotification = async () => {
    addLog('Sending background sync notification...');
    try {
      await showNotification('Data Synced', {
        body: 'Your offline changes have been synced to the server',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'sync-complete'
      });
      addLog('Sync notification sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const handleMultipleNotifications = async () => {
    addLog('Sending multiple notifications...');
    try {
      for (let i = 1; i <= 3; i++) {
        await showNotification(`Notification ${i}`, {
          body: `This is notification number ${i}`,
          icon: '/icon-192x192.png',
          tag: `multi-${i}`
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      addLog('Multiple notifications sent successfully');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const clearLog = () => {
    setNotificationLog([]);
    addLog('Log cleared');
  };

  return (
    <>
      {DialogComponent}
      <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-4">PWA Notifications Test Page</h1>
          
          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="text-sm text-muted mb-1">Support Status</div>
              <div className="font-semibold text-foreground">
                {isSupported ? '✅ Supported' : '❌ Not Supported'}
              </div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="text-sm text-muted mb-1">Permission</div>
              <div className="font-semibold text-foreground">
                {permission === 'granted' ? '✅' : permission === 'denied' ? '❌' : '⏳'} {permission}
              </div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="text-sm text-muted mb-1">Service Worker</div>
              <div className="font-semibold text-foreground">
                {isReady ? '✅ Ready' : '⏳ Loading'}
                {hasUpdate && ' (Update Available)'}
              </div>
            </div>
          </div>

          {/* Permission Status Alert */}
          {permission === 'denied' && (
            <AlertBanner
              type="error"
              message="Notifications are blocked. Check your browser settings to enable them."
              dismissible={false}
            />
          )}
          
          {permission === 'default' && (
            <AlertBanner
              type="warning"
              message={
                <div className="flex items-center justify-between">
                  <span>Notifications are not enabled yet.</span>
                  <button
                    onClick={handleRequestPermission}
                    className="ml-4 bg-white text-yellow-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-50"
                    disabled={!isSupported}
                  >
                    Enable Notifications
                  </button>
                </div>
              }
              dismissible={false}
            />
          )}
          
          {permission === 'granted' && (
            <AlertBanner
              type="success"
              message="Notifications are enabled! Test them using the buttons below."
              dismissible={true}
            />
          )}

          {/* Notification Triggers */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Test Notifications</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleBasicNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Basic Notification
              </button>
              
              <button
                onClick={handleRichNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Rich Notification (with actions)
              </button>
              
              <button
                onClick={handleVibrationNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Vibration Notification
              </button>
              
              <button
                onClick={handleSilentNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Silent Notification
              </button>
              
              <button
                onClick={handleScheduledNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Schedule (5 seconds)
              </button>
              
              <button
                onClick={handleCancelScheduled}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={scheduledId === null}
              >
                Cancel Scheduled
              </button>
              
              <button
                onClick={handleUpdateNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Update Notification
              </button>
              
              <button
                onClick={handleOfflineNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Offline Notification
              </button>
              
              <button
                onClick={handleSyncNotification}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Sync Complete
              </button>
              
              <button
                onClick={handleMultipleNotifications}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                disabled={permission !== 'granted'}
              >
                Multiple (3 notifications)
              </button>
            </div>

            {hasUpdate && (
              <button
                onClick={updateServiceWorker}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Apply Service Worker Update
              </button>
            )}
          </div>
        </div>

        {/* Notification Log */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">Notification Log</h2>
            <button
              onClick={clearLog}
              className="text-sm text-muted hover:text-foreground"
            >
              Clear Log
            </button>
          </div>
          
          <div className="bg-background rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
            {notificationLog.length > 0 ? (
              <div className="space-y-1">
                {notificationLog.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-muted">
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted">No logs yet. Try sending a notification!</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Instructions</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>• First, request notification permission if not already granted</li>
            <li>• Test different notification types by clicking the buttons</li>
            <li>• Check your system notification center to see the notifications</li>
            <li>• The log shows what actions were performed</li>
            <li>• Some features (like vibration) depend on device capabilities</li>
            <li>• Actions in rich notifications can be clicked in the notification itself</li>
            <li>• Scheduled notifications will appear after the specified delay</li>
          </ul>
        </div>
      </div>
    </div>
    </>
  );
}