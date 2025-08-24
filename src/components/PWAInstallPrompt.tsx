'use client';

import { useEffect, useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { AlertBanner } from '@/components/AlertBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Spinner } from '@/components/Spinner';
import { Switch } from '@/components/Switch';
import { useToast } from '@/hooks/useToast';

export function PWAInstallPrompt() {
  const {
    canInstall,
    isInstalling,
    isInstalled,
    install,
    needsUpdate,
    isUpdating,
    updateServiceWorker,
    isOnline,
    networkQuality,
    cacheSize,
    isOfflineReady,
    cacheLearningContent,
    notificationPermission,
    requestNotificationPermission,
    subscribeToPush,
  } = usePWA();

  const { toast } = useToast();
  
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showOfflineSettings, setShowOfflineSettings] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [dismissedInstall, setDismissedInstall] = useState(false);

  // Show install prompt after user has spent some time on the site
  useEffect(() => {
    // Check if dismissed today
    const dismissedDate = localStorage.getItem('pwa-install-dismissed-date');
    const today = new Date().toDateString();
    const isDismissedToday = dismissedDate === today;
    
    if (canInstall && !isDismissedToday) {
      const timer = setTimeout(() => {
        setShowInstallDialog(true);
      }, 180000); // Show after 3 minutes
      
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  // Handle notification toggle
  const handleNotificationToggle = async (enabled: boolean) => {
    setEnableNotifications(enabled);
    
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await subscribeToPush();
      } else {
        setEnableNotifications(false);
      }
    }
  };

  // Handle install
  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowInstallDialog(false);
      
      // Prompt for offline content caching
      setTimeout(() => {
        setShowOfflineSettings(true);
      }, 2000);
    }
  };

  // Handle dismiss
  const handleDismissInstall = () => {
    setShowInstallDialog(false);
    setDismissedInstall(true);
    
    // Store today's date when dismissed
    const today = new Date().toDateString();
    localStorage.setItem('pwa-install-dismissed-date', today);
  };

  // Cache textbooks
  const handleCacheTextbooks = async () => {
    toast.info('Downloading learning content for offline use...');

    // Cache common textbooks
    await cacheLearningContent('genki-1');
    await cacheLearningContent('genki-2');
    await cacheLearningContent('minna-1');
    
    setShowOfflineSettings(false);
  };

  // Check if install was dismissed today
  const isDismissedToday = () => {
    const dismissedDate = localStorage.getItem('pwa-install-dismissed-date');
    const today = new Date().toDateString();
    return dismissedDate === today;
  };

  return (
    <>
      {/* Update Available Banner - PRIORITY: Shows immediately and cannot be dismissed */}
      {needsUpdate && (
        <div className="animate-pulse">
          <AlertBanner
            type="warning"
            message="🔄 A new version of Doshi Sensei is available. Please update to get the latest features and improvements."
            dismissible={false}  // Cannot be dismissed
            action={{
              label: isUpdating ? '⏳ Updating...' : '🚀 Update Now',
              onClick: updateServiceWorker,
              disabled: isUpdating,
            }}
          />
        </div>
      )}

      {/* Install Banner - Shows at top of page (only if no update pending) */}
      {!needsUpdate && canInstall && !isDismissedToday() && !showInstallDialog && (
        <AlertBanner
          type="info"
          message="Install Doshi Sensei for offline learning, faster loading, and study reminders!"
          dismissible
          onDismiss={handleDismissInstall}
          action={{
            label: 'Install App',
            onClick: () => setShowInstallDialog(true),
          }}
        />
      )}

      {/* Offline Status Banner */}
      {!isOnline && (
        <AlertBanner
          type="warning"
          message={`You're offline. ${isOfflineReady ? 'Using cached content.' : 'Some features may be unavailable.'}`}
          dismissible={false}
        />
      )}

      {/* Poor Network Quality Banner */}
      {isOnline && networkQuality === 'poor' && (
        <AlertBanner
          type="info"
          message="Slow connection detected. Content will be cached for better performance."
          dismissible
        />
      )}

      {/* Install Dialog */}
      <ConfirmDialog
        isOpen={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        onConfirm={handleInstall}
        onCancel={handleDismissInstall}
        title="Install Doshi Sensei"
        message={
          <div className="space-y-4">
            <p>Install the app for the best learning experience:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>📱 Access from your home screen</li>
              <li>🔌 Works offline - study anywhere</li>
              <li>⚡ Faster loading and smoother performance</li>
              <li>🔔 Optional study reminders</li>
              <li>💾 Save your progress locally</li>
            </ul>
            {isInstalling && (
              <div className="flex items-center justify-center py-4">
                <Spinner size="md" message="Installing..." />
              </div>
            )}
          </div>
        }
        confirmText={isInstalling ? 'Installing...' : 'Install Now'}
        cancelText="Maybe Later"
        type="info"
        confirmDisabled={isInstalling}
      />

      {/* Offline Settings Dialog */}
      <ConfirmDialog
        isOpen={showOfflineSettings}
        onClose={() => setShowOfflineSettings(false)}
        onConfirm={handleCacheTextbooks}
        title="Setup Offline Learning"
        message={
          <div className="space-y-4">
            <p>Would you like to download learning content for offline use?</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Enable Notifications</span>
                <Switch
                  checked={enableNotifications || notificationPermission === 'granted'}
                  onChange={handleNotificationToggle}
                  label=""
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>This will download:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Genki textbook vocabulary</li>
                  <li>Minna no Nihongo vocabulary</li>
                  <li>Common kanji data</li>
                </ul>
                <p className="mt-2">Approximately 25MB of data</p>
              </div>
            </div>

            {cacheSize > 0 && (
              <p className="text-xs text-muted-foreground">
                Current cache size: {cacheSize}MB
              </p>
            )}
          </div>
        }
        confirmText="Download Content"
        cancelText="Skip for Now"
        type="info"
      />

      {/* iOS Install Instructions */}
      {canInstall && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
        <ConfirmDialog
          isOpen={showInstallDialog}
          onClose={() => setShowInstallDialog(false)}
          title="Install on iOS"
          message={
            <div className="space-y-4">
              <p>To install Doshi Sensei on your iPhone/iPad:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Tap the Share button <span className="text-primary">⬆️</span> in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                The app will appear on your home screen like a native app!
              </p>
            </div>
          }
          confirmText="Got It"
          type="info"
          showCancel={false}
        />
      )}
    </>
  );
}