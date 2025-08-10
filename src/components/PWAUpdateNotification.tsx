"use client";

import { useEffect, useState } from "react";
// Using inline SVG icons instead of lucide-react
import { motion, AnimatePresence } from "framer-motion";
import { safeNavigator, runInBrowser } from "@/utils/browserCheck";

export default function PWAUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    runInBrowser(() => {
      if (!safeNavigator || !("serviceWorker" in safeNavigator)) {
        return;
      }

      // Check for service worker updates
      const checkForUpdates = async () => {
        try {
          const registration = await safeNavigator.serviceWorker.ready;

          // Check if we just performed an update (within last 10 seconds)
          const lastUpdateTime = localStorage.getItem("pwa-last-update");
          const justUpdated =
            lastUpdateTime && Date.now() - parseInt(lastUpdateTime) < 10000;

          // Check if there's already a waiting worker
          if (registration.waiting && !justUpdated) {
            setWaitingWorker(registration.waiting);
            setShowUpdatePrompt(true);
          }

          // Listen for new service workers
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                safeNavigator.serviceWorker.controller
              ) {
                // New service worker is ready
                setWaitingWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          });
        } catch (error) {
          console.error("Error checking for updates:", error);
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
            const lastUpdateTime = localStorage.getItem("pwa-last-update");
            const justUpdated =
              lastUpdateTime && Date.now() - parseInt(lastUpdateTime) < 10000;

            if (registration.waiting && !waitingWorker && !justUpdated) {
              setWaitingWorker(registration.waiting);
              setShowUpdatePrompt(true);
            }
          } catch (error) {
            console.error("Error checking for updates:", error);
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
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
        console.log("All caches cleared");
      }

      // Clear localStorage except critical auth data
      const authData = localStorage.getItem("auth-storage");
      const settingsData = localStorage.getItem("doshi-sensei-settings");
      const devHelperMode = localStorage.getItem("devHelperMode");
      localStorage.clear();
      if (authData) localStorage.setItem("auth-storage", authData);
      if (settingsData)
        localStorage.setItem("doshi-sensei-settings", settingsData);
      if (devHelperMode) localStorage.setItem("devHelperMode", devHelperMode);

      // Tell the service worker to skip waiting
      waitingWorker.postMessage({ type: "SKIP_WAITING" });

      // Hide the notification immediately after triggering update
      setShowUpdatePrompt(false);

      // Mark that we just performed an update
      localStorage.setItem("pwa-last-update", Date.now().toString());

      // Set up controller change listener before skip waiting
      let reloadScheduled = false;
      const controllerChangeHandler = () => {
        if (!reloadScheduled) {
          reloadScheduled = true;
          console.log("Service worker controller changed, reloading...");
          // Reload after a short delay to ensure everything is ready
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      };

      // Listen for the controlling service worker changing
      runInBrowser(() => {
        if (safeNavigator?.serviceWorker) {
          safeNavigator.serviceWorker.addEventListener(
            "controllerchange",
            controllerChangeHandler
          );
        }
      });

      // Also listen for state changes on the waiting worker
      waitingWorker.addEventListener("statechange", () => {
        if (waitingWorker.state === "activated" && !reloadScheduled) {
          reloadScheduled = true;
          console.log("Service worker activated, reloading...");
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      });

      // Fallback reload after 3 seconds if controller doesn't change
      setTimeout(() => {
        if (!reloadScheduled) {
          console.log("Forcing reload after timeout");
          window.location.reload();
        }
      }, 3000);
    } catch (error) {
      console.error("Error during update:", error);
      // Force reload on error
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    // Show again after 24 hours if still available
    setTimeout(() => {
      if (waitingWorker && waitingWorker.state === "installed") {
        setShowUpdatePrompt(true);
      }
    }, 24 * 60 * 60 * 1000);
  };

  return (
    <AnimatePresence>
      {(showUpdatePrompt || isUpdating) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-safe"
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl mx-auto max-w-md">
            {isUpdating ? (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="animate-spin h-5 w-5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground leading-tight">
                      Updating Doshi Sensei
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-tight">
                      Please wait while we refresh the app...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Dismiss button */}
                <button
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label="Dismiss"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="p-4 pt-6">
                  {/* Header with icon and title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground leading-tight">
                        Update Available
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-tight">
                        New version ready with latest features
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDismiss}
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2.5 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary/80 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Later
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Now
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
