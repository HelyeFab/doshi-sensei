'use client';

import { useEffect, useState } from 'react';
import { safeNavigator, runInBrowser } from '@/utils/browserCheck';
import { pwaAnalytics } from '@/utils/pwaAnalytics';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(safeNavigator?.userAgent || '');
    const isInStandaloneMode = (safeNavigator as any)?.standalone;

    if (isStandalone || (isIOS && isInStandaloneMode)) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if we should show the prompt (once per day)
      const lastPromptTime = localStorage.getItem('pwa-prompt-last-shown');
      const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const now = Date.now();
      
      if (!lastPromptTime || (now - parseInt(lastPromptTime)) > ONE_DAY) {
        setShowInstallButton(true);
        localStorage.setItem('pwa-prompt-last-shown', now.toString());
        pwaAnalytics.trackEvent('install_prompt_shown');
      } else {
        // Prompt was shown within the last 24 hours, don't show it
        console.log('PWA prompt throttled - shown within last 24 hours');
        pwaAnalytics.trackEvent('install_prompt_throttled');
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('Install prompt is not available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowInstallButton(false);
        pwaAnalytics.trackEvent('install_accepted');
      } else {
        pwaAnalytics.trackEvent('install_dismissed');
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Register service worker
  useEffect(() => {
    runInBrowser(() => {
      if (safeNavigator && 'serviceWorker' in safeNavigator && process.env.NODE_ENV === 'production') {
        safeNavigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
          })
          .catch((registrationError) => {
          });
      }
    });
  }, []);

  if (isInstalled || !showInstallButton) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 md:p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                Install Doshi Sensei
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to home screen for easy access
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setShowInstallButton(false);
                // Update the last shown time when user clicks "Maybe later"
                localStorage.setItem('pwa-prompt-last-shown', Date.now().toString());
                pwaAnalytics.trackEvent('install_prompt_dismissed_maybe_later');
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
