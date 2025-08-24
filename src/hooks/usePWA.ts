'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/useToast';

// Types for PWA
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  isOnline: boolean;
  isLoadingCache: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  registration: ServiceWorkerRegistration | null;
  waitingWorker: ServiceWorker | null;
  pushSubscription: PushSubscription | null;
  notificationPermission: NotificationPermission;
  networkQuality: 'fast' | 'slow' | 'poor' | 'offline';
  cacheSize: number;
}

interface PWAHookOptions {
  enableNotifications?: boolean;
  autoUpdate?: boolean;
  skipWaitingDelay?: number;
}

// Default state
const defaultState: PWAState = {
  isInstallable: false,
  isInstalled: false,
  isInstalling: false,
  isUpdateAvailable: false,
  isUpdating: false,
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  isLoadingCache: false,
  installPrompt: null,
  registration: null,
  waitingWorker: null,
  pushSubscription: null,
  notificationPermission: 'default',
  networkQuality: 'fast',
  cacheSize: 0,
};

export function usePWA(options: PWAHookOptions = {}) {
  const {
    enableNotifications = false,
    autoUpdate = false,
    skipWaitingDelay = 0,
  } = options;

  const [state, setState] = useState<PWAState>(defaultState);
  const { toast } = useToast();
  
  // Create a wrapper for the old showToast API
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    if (toast && toast[type]) {
      toast[type](message);
    }
  };
  
  const initRef = useRef(false);
  const updateCheckRef = useRef<NodeJS.Timeout>();
  const skipWaitingTimerRef = useRef<NodeJS.Timeout>();

  // Check if app is installed (standalone mode)
  const checkInstallStatus = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt || state.isInstalling) {
      return false;
    }

    setState(prev => ({ ...prev, isInstalling: true }));

    try {
      await state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;

      if (outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstalled: true,
          isInstalling: false,
          isInstallable: false,
          installPrompt: null,
        }));
        showToast('App installed successfully!', 'success');
        return true;
      } else {
        setState(prev => ({ ...prev, isInstalling: false }));
        showToast('Installation cancelled', 'info');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
      setState(prev => ({ ...prev, isInstalling: false }));
      showToast('Installation failed', 'error');
      return false;
    }
  }, [state.installPrompt, state.isInstalling, showToast]);

  // Update service worker
  const updateServiceWorker = useCallback(async (): Promise<void> => {
    if (!state.waitingWorker || state.isUpdating) {
      return;
    }

    setState(prev => ({ ...prev, isUpdating: true }));

    try {
      // Post message to service worker to skip waiting
      state.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Clear cache for fresh start
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      showToast('App updated! Reloading...', 'success');
      
      // Reload will happen automatically via controllerchange event
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setState(prev => ({ ...prev, isUpdating: false }));
      showToast('Update failed. Please reload manually.', 'error');
    }
  }, [state.waitingWorker, state.isUpdating, showToast]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, notificationPermission: permission }));
      
      if (permission === 'granted') {
        showToast('Notifications enabled!', 'success');
        return true;
      } else if (permission === 'denied') {
        showToast('Notifications blocked. Enable in browser settings.', 'warning');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Failed to request notification permission:', error);
      return false;
    }
  }, [showToast]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.registration) {
      console.warn('[PWA] No service worker registration');
      return null;
    }

    if (state.notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return null;
    }

    try {
      // Check if already subscribed
      const existingSubscription = await state.registration.pushManager.getSubscription();
      if (existingSubscription) {
        setState(prev => ({ ...prev, pushSubscription: existingSubscription }));
        return existingSubscription;
      }
      
      // Create new subscription (requires VAPID key in production)
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.warn('[PWA] VAPID public key not configured');
        return null;
      }
      
      const subscription = await state.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });
      
      setState(prev => ({ ...prev, pushSubscription: subscription }));
      
      // Send subscription to server
      try {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON())
        });
        
        showToast('Push notifications enabled!', 'success');
      } catch (serverError) {
        console.error('[PWA] Failed to register subscription on server:', serverError);
        // Don't fail completely - subscription still works locally
      }
      
      return subscription;
    } catch (error) {
      console.error('[PWA] Failed to subscribe to push:', error);
      showToast('Failed to enable push notifications', 'error');
      return null;
    }
  }, [state.registration, state.notificationPermission, requestNotificationPermission, showToast]);

  // Get cache size
  const getCacheSize = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) {
      return;
    }
    
    try {
      const channel = new MessageChannel();
      
      // Set up response handler
      const responsePromise = new Promise<number>((resolve) => {
        const timeout = setTimeout(() => resolve(0), 5000); // 5s timeout
        
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          if (event.data.type === 'CACHE_SIZE') {
            const sizeInMB = (event.data.size / (1024 * 1024));
            resolve(sizeInMB);
          } else {
            resolve(0);
          }
        };
      });
      
      // Send request to service worker
      state.registration.active.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );
      
      const size = await responsePromise;
      setState(prev => ({ ...prev, cacheSize: Math.round(size * 100) / 100 }));
    } catch (error) {
      console.error('[PWA] Failed to get cache size:', error);
    }
  }, [state.registration]);

  // Clear all caches
  const clearCache = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) {
      return;
    }
    
    try {
      const channel = new MessageChannel();
      
      // Set up response handler
      const responsePromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 10000); // 10s timeout
        
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          resolve();
        };
      });
      
      // Send clear request to service worker
      state.registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );
      
      await responsePromise;
      
      setState(prev => ({ ...prev, cacheSize: 0 }));
      showToast('Cache cleared successfully', 'success');
    } catch (error) {
      console.error('[PWA] Failed to clear cache:', error);
      showToast('Failed to clear cache', 'error');
    }
  }, [state.registration, showToast]);

  // Cache learning content
  const cacheLearningContent = useCallback(async (textbook?: string, level?: number): Promise<void> => {
    if (!state.registration?.active) {
      return;
    }
    
    setState(prev => ({ ...prev, isLoadingCache: true }));
    
    try {
      const channel = new MessageChannel();
      
      // Set up response handler
      const responsePromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 30000); // 30s timeout
        
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          if (event.data.type === 'CACHE_COMPLETE') {
            const { cached, total } = event.data;
            showToast(`Cached ${cached}/${total} learning resources`, 'success');
          }
          resolve();
        };
      });
      
      // Send cache request to service worker
      state.registration.active.postMessage(
        { 
          type: 'CACHE_LEARNING_CONTENT',
          data: { textbook, level }
        },
        [channel.port2]
      );
      
      await responsePromise;
    } catch (error) {
      console.error('[PWA] Failed to cache learning content:', error);
      showToast('Failed to cache content for offline use', 'error');
    } finally {
      setState(prev => ({ ...prev, isLoadingCache: false }));
    }
  }, [state.registration, showToast]);

  // Initialize PWA
  useEffect(() => {
    if (typeof window === 'undefined' || initRef.current) {
      return;
    }
    
    initRef.current = true;
    
    // Check install status
    setState(prev => ({ ...prev, isInstalled: checkInstallStatus() }));
    
    // Set up event listeners
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setState(prev => ({
        ...prev,
        installPrompt: event,
        isInstallable: true,
      }));
    };
    
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
      
      showToast('App installed successfully!', 'success');
    };
    
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      showToast('Back online! Syncing data...', 'success');
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      showToast('You are offline. Some features may be limited.', 'warning');
    };
    
    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInstallStatus, showToast]);

  // Initialize Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    
    let mounted = true;
    
    const initServiceWorker = async () => {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        });
        
        if (!mounted) return;
        
        setState(prev => ({ ...prev, registration }));
        
        // Check for waiting worker immediately
        if (registration.waiting) {
          setState(prev => ({
            ...prev,
            waitingWorker: registration.waiting,
            isUpdateAvailable: true,
          }));
          
          // Auto-update if enabled
          if (autoUpdate && skipWaitingDelay > 0) {
            skipWaitingTimerRef.current = setTimeout(() => {
              if (mounted) {
                updateServiceWorker();
              }
            }, skipWaitingDelay);
          }
        }
        
        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker || !mounted) return;
          
          newWorker.addEventListener('statechange', () => {
            if (!mounted) return;
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({
                ...prev,
                waitingWorker: newWorker,
                isUpdateAvailable: true,
              }));
              
              // Auto-update if enabled
              if (autoUpdate && skipWaitingDelay > 0) {
                skipWaitingTimerRef.current = setTimeout(() => {
                  if (mounted) {
                    updateServiceWorker();
                  }
                }, skipWaitingDelay);
              }
            }
          });
        });
        
        // Listen for controller change (service worker update)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (mounted) {
            window.location.reload();
          }
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (!mounted) return;
          
          const { type, ...data } = event.data || {};
          
          switch (type) {
            case 'SYNC_COMPLETE':
              if (data.count > 0) {
                showToast(`Synced ${data.count} pending changes`, 'success');
              }
              break;
              
            case 'CACHE_COMPLETE':
              showToast(`Cached ${data.cached}/${data.total} resources`, 'success');
              break;
              
            default:
              // Handle other message types as needed
              break;
          }
        });
        
        // Check notification permission
        if (enableNotifications && 'Notification' in window) {
          setState(prev => ({ 
            ...prev, 
            notificationPermission: Notification.permission 
          }));
        }
        
        // Check existing push subscription
        if (enableNotifications) {
          try {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription && mounted) {
              setState(prev => ({ ...prev, pushSubscription: subscription }));
            }
          } catch (error) {
            console.error('[PWA] Failed to check push subscription:', error);
          }
        }
        
        // Get initial cache size
        getCacheSize();
        
        // Set up periodic update checks (every 30 minutes)
        const checkForUpdates = () => {
          if (mounted && document.visibilityState === 'visible') {
            registration.update().catch(error => {
              console.error('[PWA] Update check failed:', error);
            });
          }
        };
        
        updateCheckRef.current = setInterval(checkForUpdates, 30 * 60 * 1000);
        
        // Check for updates when page becomes visible
        const handleVisibilityChange = () => {
          if (!document.hidden && mounted) {
            registration.update().catch(error => {
              console.error('[PWA] Update check failed:', error);
            });
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Initial update check
        registration.update().catch(error => {
          console.error('[PWA] Initial update check failed:', error);
        });
        
        // Cleanup function
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
        if (mounted) {
          showToast('Failed to enable offline mode', 'error');
        }
      }
    };
    
    const cleanup = initServiceWorker();
    
    // Cleanup on unmount
    return () => {
      mounted = false;
      
      if (updateCheckRef.current) {
        clearInterval(updateCheckRef.current);
      }
      
      if (skipWaitingTimerRef.current) {
        clearTimeout(skipWaitingTimerRef.current);
      }
      
      // Call the cleanup function from initServiceWorker if it exists
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => {
          if (typeof cleanupFn === 'function') {
            cleanupFn();
          }
        });
      }
    };
  }, [getCacheSize, showToast, updateServiceWorker, enableNotifications, autoUpdate, skipWaitingDelay]);

  return {
    // State
    ...state,
    
    // Actions
    install,
    updateServiceWorker,
    cacheLearningContent,
    clearCache,
    getCacheSize,
    requestNotificationPermission,
    subscribeToPush,
    
    // Computed properties
    canInstall: state.isInstallable && !state.isInstalled && !state.isInstalling,
    needsUpdate: state.isUpdateAvailable && !state.isUpdating,
    isOfflineReady: state.cacheSize > 0,
    
    // Status helpers
    isPWAEnabled: !!state.registration,
    hasNotificationSupport: typeof window !== 'undefined' && 'Notification' in window,
    hasPushSupport: typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator,
  };
}

export type { PWAState, PWAHookOptions };