"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { safeNavigator, runInBrowser } from "@/utils/browserCheck";

export default function OfflineNotification() {
  const [isOnline, setIsOnline] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = safeNavigator?.onLine ?? true;
      setIsOnline(online);

      if (!online) {
        setShowNotification(true);
        setIsDismissed(false); // Reset dismiss state when going offline
      } else if (showNotification && !isDismissed) {
        // Show "back online" message briefly, then auto-hide
        setTimeout(() => setShowNotification(false), 3000);
      }
    };

    // Check initial status
    updateOnlineStatus();

    // Add event listeners
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [showNotification, isDismissed]);

  const handleDismiss = () => {
    setShowNotification(false);
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {showNotification && !isDismissed && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 p-4 pt-safe"
        >
          <div
            className={`mx-auto max-w-md rounded-2xl shadow-lg backdrop-blur-sm border ${
              isOnline
                ? "bg-green-500/90 border-green-400/50 text-white"
                : "bg-destructive/90 border-destructive/50 text-destructive-foreground"
            }`}
          >
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-current/70 hover:text-current transition-colors"
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

            <div className="p-4 pr-10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {isOnline ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {isOnline
                      ? "You're back online!"
                      : "No internet connection"}
                  </p>
                  {!isOnline && (
                    <p className="text-xs opacity-90 mt-1 leading-tight">
                      Some features may be limited
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
