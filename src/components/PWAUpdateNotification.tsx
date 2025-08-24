'use client';

import { useEffect, useState } from 'react';
// Using inline SVG icons instead of lucide-react
import { motion, AnimatePresence } from 'framer-motion';
import { safeNavigator, runInBrowser } from '@/utils/browserCheck';

export default function PWAUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    runInBrowser(() => {
      if (!safeNavigator || !('serviceWorker' in safeNavigator)) {
        return;
      }

      // Check for service worker updates
      const checkForUpdates = async () => {
        try {
          const registration = await safeNavigator.serviceWorker.ready;
          
          // Check if there's already a waiting worker
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setShowUpdatePrompt(true);
          }

          // Listen for new service workers
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && safeNavigator.serviceWorker.controller) {
                // New service worker is ready
                setWaitingWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          });
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      };

      checkForUpdates();

      // Periodically check for updates
      const interval = setInterval(async () => {
        if (safeNavigator.serviceWorker.controller) {
          try {
            const registration = await safeNavigator.serviceWorker.ready;
            await registration.update();
            
            // Check if there's a waiting worker after update check
            if (registration.waiting && !waitingWorker) {
              setWaitingWorker(registration.waiting);
              setShowUpdatePrompt(true);
            }
          } catch (error) {
            console.error('Error checking for updates:', error);
          }
        }
      }, 60 * 60 * 1000); // Check every hour

      return () => clearInterval(interval);
    });
  }, []);

  const handleUpdate = async () => {
    if (!waitingWorker || isUpdating) return;

    try {
      // Show loading state
      setIsUpdating(true);
      
      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('All caches cleared');
      }

      // Clear localStorage except critical auth data
      const authData = localStorage.getItem('auth-storage');
      const settingsData = localStorage.getItem('doshi-sensei-settings');
      localStorage.clear();
      if (authData) localStorage.setItem('auth-storage', authData);
      if (settingsData) localStorage.setItem('doshi-sensei-settings', settingsData);

      // Tell the service worker to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      // Set up controller change listener before skip waiting
      let reloadScheduled = false;
      const controllerChangeHandler = () => {
        if (!reloadScheduled) {
          reloadScheduled = true;
          // Reload after a short delay to ensure everything is ready
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      };

      // Listen for the controlling service worker changing
      runInBrowser(() => {
        if (safeNavigator?.serviceWorker) {
          safeNavigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
        }
      });

      // Fallback reload after 2 seconds if controller doesn't change
      setTimeout(() => {
        if (!reloadScheduled) {
          console.log('Forcing reload after timeout');
          window.location.reload();
        }
      }, 2000);
    } catch (error) {
      console.error('Error during update:', error);
      // Force reload on error
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    // Show again after 24 hours if still available
    setTimeout(() => {
      if (waitingWorker && waitingWorker.state === 'installed') {
        setShowUpdatePrompt(true);
      }
    }, 24 * 60 * 60 * 1000);
  };

  return (
    <AnimatePresence>
      {(showUpdatePrompt || isUpdating) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
        >
          <div className="bg-card rounded-lg shadow-lg p-4 border border-border">
            {isUpdating ? (
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M19 12H5m7-7l-7 7 7 7"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Updating Doshi Sensei...
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Please wait while we refresh the app.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-foreground">
                      Update Available
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A new version of Doshi Sensei is available. Update now for the latest features and improvements.
                    </p>
                    <div className="mt-3 flex space-x-3">
                      <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Update Now
                      </button>
                      <button
                        onClick={handleDismiss}
                        disabled={isUpdating}
                        className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Later
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="flex-shrink-0 ml-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}