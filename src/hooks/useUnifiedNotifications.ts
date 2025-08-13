import { useEffect, useRef, useState } from 'react';
import { useEnhancedToast } from '@/components/ui/EnhancedToast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type ConnectionQuality = 'good' | 'slow' | 'offline';

interface NetworkInfo {
  isOnline: boolean;
  quality: ConnectionQuality;
  downlink?: number;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  rtt?: number;
}

export function useUnifiedNotifications() {
  const { showToast, hideToast, hideAllToasts } = useEnhancedToast();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: true,
    quality: 'good'
  });
  
  // Refs to track state
  const wasOffline = useRef(false);
  const hasShownInstallPrompt = useRef(false);
  const lastNotificationTime = useRef(0);
  const connectionToastId = useRef<string | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const updateAvailableToastId = useRef<string | null>(null);
  const lastUpdatePromptTime = useRef(0);
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Check connection quality
  const checkConnectionQuality = async () => {
    if (!navigator.onLine) {
      setNetworkInfo({ isOnline: false, quality: 'offline' });
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      let quality: ConnectionQuality = 'good';
      
      if (!response.ok || latency > 5000) {
        quality = 'slow';
      }

      setNetworkInfo(prev => ({
        ...prev,
        isOnline: true,
        quality,
        rtt: Math.round(latency)
      }));

      return quality;
    } catch (error) {
      setNetworkInfo(prev => ({
        ...prev,
        quality: 'slow'
      }));
      return 'slow';
    }
  };

  // Update network status
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      setNetworkInfo({ isOnline: false, quality: 'offline' });
      return;
    }

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const downlink = connection.downlink;
        const effectiveType = connection.effectiveType;
        const rtt = connection.rtt;

        let quality: ConnectionQuality = 'good';
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.3 || rtt > 2000) {
          quality = 'slow';
        }

        setNetworkInfo({
          isOnline: true,
          quality,
          downlink,
          effectiveType,
          rtt
        });

        return quality;
      }
    }

    return 'good';
  };

  // Show connection notification
  const showConnectionNotification = (quality: ConnectionQuality) => {
    const now = Date.now();
    if (now - lastNotificationTime.current < 30000) return; // Don't spam notifications
    
    lastNotificationTime.current = now;

    // Hide previous connection toast if exists
    if (connectionToastId.current) {
      hideToast(connectionToastId.current);
    }

    let toastId: string;

    switch (quality) {
      case 'offline':
        toastId = showToast({
          type: 'offline',
          title: 'No Internet Connection',
          description: 'Some features may be unavailable',
          style: 'banner-top',
          duration: 0, // Don't auto-dismiss
          persistent: false // Allow manual dismissal
        });
        break;
      
      case 'slow':
        toastId = showToast({
          type: 'warning',
          title: 'Slow Connection',
          description: 'Loading may take longer than usual',
          style: 'banner-top',
          duration: 10000
        });
        break;
      
      case 'good':
        toastId = showToast({
          type: 'connection',
          title: 'Connection Restored',
          description: "You're back online",
          style: 'banner-top',
          duration: 5000
        });
        break;
    }

    connectionToastId.current = toastId;
  };

  useEffect(() => {
    // Track user engagement for smart install prompt timing
    if (typeof window !== 'undefined') {
      // Initialize session tracking
      if (!sessionStorage.getItem('session_start')) {
        sessionStorage.setItem('session_start', Date.now().toString());
      }
      
      // Track page views
      const currentPageViews = parseInt(sessionStorage.getItem('page_views') || '0');
      sessionStorage.setItem('page_views', (currentPageViews + 1).toString());
    }
    
    // Connection event handlers
    const handleOnline = () => {
      if (wasOffline.current) {
        showConnectionNotification('good');
      }
      wasOffline.current = false;
      checkConnectionQuality();
    };

    const handleOffline = () => {
      wasOffline.current = true;
      showConnectionNotification('offline');
      setNetworkInfo({ isOnline: false, quality: 'offline' });
    };

    // PWA installation prompt - Smart timing for better UX
    // We wait until the user has:
    // 1. Completed onboarding (understands the app)
    // 2. Engaged with the app (3+ pages or 2+ minutes)
    // 3. Not been prompted in the last 24 hours
    // This ensures we only prompt engaged users who see value in the app
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem('doshi_onboarding_completed');
      const isInTutorial = window.location.search.includes('tutorial=true');
      
      if (!hasCompletedOnboarding || isInTutorial) {
        return; // Don't show install prompt during or before onboarding
      }
      
      // Check if we've shown install prompt recently (24 hours)
      const lastInstallPrompt = localStorage.getItem('pwa_last_install_prompt');
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      
      if (lastInstallPrompt && (now - parseInt(lastInstallPrompt)) < TWENTY_FOUR_HOURS) {
        return; // Don't show if shown within 24 hours
      }
      
      // Check if already installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');
      
      if (isInstalled) {
        return; // Don't show if already installed
      }
      
      // Additional check: User should have used the app at least a bit
      // Check if they've visited at least 3 pages or spent 2+ minutes
      const pageViews = parseInt(sessionStorage.getItem('page_views') || '0');
      const sessionStart = parseInt(sessionStorage.getItem('session_start') || Date.now().toString());
      const sessionDuration = Date.now() - sessionStart;
      const TWO_MINUTES = 2 * 60 * 1000;
      
      if (pageViews < 3 && sessionDuration < TWO_MINUTES) {
        return; // Let them explore the app first
      }
      
      if (!hasShownInstallPrompt.current) {
        hasShownInstallPrompt.current = true;
        localStorage.setItem('pwa_last_install_prompt', now.toString());
        showToast({
          type: 'install',
          title: 'Install Doshi Sensei',
          description: 'Get the app for offline access and faster loading',
          style: 'banner-bottom',
          duration: 0, // Don't auto-dismiss
          persistent: true,
          actions: [
            {
              label: 'Install',
              onClick: async () => {
                if (deferredPrompt.current) {
                  await deferredPrompt.current.prompt();
                  const { outcome } = await deferredPrompt.current.userChoice;
                  if (outcome === 'accepted') {
                    showToast({
                      type: 'success',
                      title: 'Installing...',
                      description: 'Doshi Sensei is being added to your device',
                      duration: 3000
                    });
                  }
                  deferredPrompt.current = null;
                }
              },
              variant: 'primary'
            },
            {
              label: 'Later',
              onClick: () => {
                // Just close the toast
              },
              variant: 'secondary'
            }
          ]
        });
      }
    };

    // PWA installation success
    const handleAppInstalled = () => {
      showToast({
        type: 'success',
        title: 'App Installed',
        description: 'Doshi Sensei has been added to your device',
        duration: 5000
      });
    };

    // Service Worker updates
    const handleServiceWorkerUpdate = () => {
      // Prevent showing update immediately after an update
      const now = Date.now();
      const COOLDOWN_PERIOD = 60 * 1000; // 1 minute cooldown after update
      
      if (now - lastUpdatePromptTime.current < COOLDOWN_PERIOD) {
        return; // Too soon after last update
      }
      
      // Check if we just performed an update
      const lastUpdateTime = localStorage.getItem('pwa_last_update');
      if (lastUpdateTime && (now - parseInt(lastUpdateTime)) < COOLDOWN_PERIOD) {
        return; // Just updated, don't show again
      }
      
      if (updateAvailableToastId.current) {
        hideToast(updateAvailableToastId.current);
      }
      
      lastUpdatePromptTime.current = now;

      const toastId = showToast({
        type: 'update',
        title: 'Update Available',
        description: 'New version ready with latest features',
        style: 'banner-bottom',
        persistent: true,
        duration: 0,
        actions: [
          {
            label: 'Update',
            onClick: async () => {
              localStorage.setItem('pwa_last_update', Date.now().toString());
              
              // Try to activate the waiting service worker
              if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration?.waiting) {
                  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  
                  // Wait for the new service worker to take control
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                  }, { once: true });
                } else {
                  window.location.reload();
                }
              } else {
                window.location.reload();
              }
            },
            variant: 'primary'
          },
          {
            label: 'Later',
            onClick: () => {
              hideToast(toastId);
            },
            variant: 'secondary'
          }
        ]
      });

      updateAvailableToastId.current = toastId;
    };

    // Network connection changes
    const handleConnectionChange = () => {
      const quality = updateNetworkStatus();
      if (quality === 'slow') {
        showConnectionNotification('slow');
      }
    };

    // Initial setup
    wasOffline.current = !navigator.onLine;
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange);
    }

    // Service Worker registration and updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          handleServiceWorkerUpdate();
        }
      });

      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  handleServiceWorkerUpdate();
                }
              });
            }
          });
        }
      });
    }

    // Check connection quality periodically
    const interval = setInterval(() => {
      checkConnectionQuality().then(quality => {
        if (quality === 'slow' && networkInfo.quality !== 'slow') {
          showConnectionNotification('slow');
        }
      });
    }, 10000); // Every 10 seconds

    // Store cleanup functions
    cleanupFunctions.current = [
      () => window.removeEventListener('online', handleOnline),
      () => window.removeEventListener('offline', handleOffline),
      () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt),
      () => window.removeEventListener('appinstalled', handleAppInstalled),
      () => clearInterval(interval),
      () => {
        if ('connection' in navigator) {
          (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
        }
      }
    ];
    
    // Cleanup
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
    };
  }, [showToast, hideToast]); // Removed networkInfo.quality to prevent re-renders

  // Manual trigger functions for testing
  const testConnectionOffline = () => {
    showConnectionNotification('offline');
  };

  const testConnectionSlow = () => {
    showConnectionNotification('slow');
  };

  const testConnectionRestored = () => {
    showConnectionNotification('good');
  };

  const testUpdateAvailable = () => {
    const toastId = showToast({
      type: 'update',
      title: 'Update Available',
      description: 'A new version is available',
      style: 'toast',
      persistent: true,
      duration: 0,
      actions: [
        {
          label: 'Update',
          onClick: () => {
            window.location.reload();
          },
          variant: 'primary'
        },
        {
          label: 'Later',
          onClick: () => {
            hideToast(toastId);
          },
          variant: 'secondary'
        }
      ]
    });
  };

  const testInstallPrompt = () => {
    showToast({
      type: 'info',
      title: 'Install Doshi Sensei',
      description: 'Add to your home screen for a better experience',
      style: 'toast',
      persistent: true,
      duration: 0,
      actions: [
        {
          label: 'Install',
          onClick: () => {
            showToast({
              type: 'success',
              title: 'Installing...',
              description: 'App is being installed',
              duration: 3000
            });
          },
          variant: 'primary'
        },
        {
          label: 'Not now',
          onClick: () => {},
          variant: 'secondary'
        }
      ]
    });
  };

  return {
    networkInfo,
    testConnectionOffline,
    testConnectionSlow,
    testConnectionRestored,
    testUpdateAvailable,
    testInstallPrompt
  };
}

// Export a compatibility hook for components using the old useNetworkStatus
export function useNetworkStatus() {
  const { networkInfo } = useUnifiedNotifications();
  
  return {
    isOnline: networkInfo.isOnline,
    isSlowConnection: networkInfo.quality === 'slow'
  };
}