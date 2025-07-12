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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
            {isUpdating ? (
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Updating Doshi Sensei...
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Please wait while we refresh the app.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Update Available
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      A new version of Doshi Sensei is available. Update now for the latest features and improvements.
                    </p>
                    <div className="mt-3 flex space-x-3">
                      <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Update Now
                      </button>
                      <button
                        onClick={handleDismiss}
                        disabled={isUpdating}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Later
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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