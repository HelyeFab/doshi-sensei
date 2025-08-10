"use client";

import { useEffect, useState } from "react";
import { safeNavigator, runInBrowser } from "@/utils/browserCheck";
import { pwaAnalytics } from "@/utils/pwaAnalytics";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const isIOS = /iPad|iPhone|iPod/.test(safeNavigator?.userAgent || "");
    const isInStandaloneMode = (safeNavigator as any)?.standalone;

    if (isStandalone || (isIOS && isInStandaloneMode)) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if we should show the prompt (once per day)
      const lastPromptTime = localStorage.getItem("pwa-prompt-last-shown");
      const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const now = Date.now();

      if (!lastPromptTime || now - parseInt(lastPromptTime) > ONE_DAY) {
        setShowInstallButton(true);
        localStorage.setItem("pwa-prompt-last-shown", now.toString());
        pwaAnalytics.trackEvent("install_prompt_shown");
      } else {
        // Prompt was shown within the last 24 hours, don't show it
        // console.log('PWA prompt throttled - shown within last 24 hours');
        pwaAnalytics.trackEvent("install_prompt_throttled");
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // console.warn('Install prompt is not available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowInstallButton(false);
        pwaAnalytics.trackEvent("install_accepted");
      } else {
        pwaAnalytics.trackEvent("install_dismissed");
      }
    } catch (error) {
      console.error("Error showing install prompt:", error);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Register service worker
  useEffect(() => {
    runInBrowser(() => {
      if (
        safeNavigator &&
        "serviceWorker" in safeNavigator &&
        process.env.NODE_ENV === "production"
      ) {
        safeNavigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {})
          .catch((registrationError) => {});
      }
    });
  }, []);

  if (isInstalled || !showInstallButton) {
    return null;
  }

  return (
    <>
      {/* Bottom banner for mobile-first design */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-safe">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl mx-auto max-w-md">
          {/* Dismiss button */}
          <button
            onClick={() => {
              setShowInstallButton(false);
              localStorage.setItem(
                "pwa-prompt-last-shown",
                Date.now().toString()
              );
              pwaAnalytics.trackEvent("install_prompt_dismissed_close");
            }}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground leading-tight">
                  Install Doshi Sensei
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-tight">
                  Get the app for offline access and faster loading
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowInstallButton(false);
                  localStorage.setItem(
                    "pwa-prompt-last-shown",
                    Date.now().toString()
                  );
                  pwaAnalytics.trackEvent(
                    "install_prompt_dismissed_maybe_later"
                  );
                }}
                className="flex-1 px-4 py-2.5 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary/80 rounded-xl transition-colors font-medium"
              >
                Later
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
