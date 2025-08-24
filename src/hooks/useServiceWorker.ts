import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isUpdateAvailable: boolean;
  isInstalling: boolean;
  registration: ServiceWorkerRegistration | null;
  waitingWorker: ServiceWorker | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    isInstalling: false,
    registration: null,
    waitingWorker: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    async function initServiceWorker() {
      try {
        // Wait for existing SW registration
        const registration = await navigator.serviceWorker.ready;
        
        setState(prev => ({ ...prev, registration }));

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setState(prev => ({
            ...prev,
            isUpdateAvailable: true,
            waitingWorker: registration.waiting,
          }));
        }

        // Listen for new service workers installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          setState(prev => ({ ...prev, isInstalling: true }));

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({
                ...prev,
                isUpdateAvailable: true,
                isInstalling: false,
                waitingWorker: newWorker,
              }));
            }
          });
        });

        // Listen for controller changes (when SW takes control)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Reload the page when new SW takes control
          window.location.reload();
        });

        // Periodic update checks
        const interval = setInterval(async () => {
          try {
            await registration.update();
          } catch (error) {
            console.error('SW update check failed:', error);
          }
        }, 60 * 60 * 1000); // Check every hour

        return () => {
          clearInterval(interval);
        };
      } catch (error) {
        console.error('ServiceWorker initialization failed:', error);
      }
    }

    initServiceWorker();
  }, []);

  const skipWaiting = async () => {
    if (state.waitingWorker) {
      // Clear all caches before updating
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Tell the waiting SW to skip waiting
      state.waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      setState(prev => ({
        ...prev,
        isUpdateAvailable: false,
        waitingWorker: null,
      }));
    }
  };

  const checkForUpdate = async () => {
    if (state.registration) {
      try {
        await state.registration.update();
      } catch (error) {
        console.error('Manual update check failed:', error);
      }
    }
  };

  return {
    isReady: !!state.registration,
    hasUpdate: state.isUpdateAvailable,
    updateServiceWorker: skipWaiting,
    ...state,
    skipWaiting,
    checkForUpdate,
  };
}