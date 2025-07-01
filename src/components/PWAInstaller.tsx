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
      setShowInstallButton(true);
      pwaAnalytics.trackEvent('install_prompt_shown');
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
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
      pwaAnalytics.trackEvent('install_accepted');
    } else {
      pwaAnalytics.trackEvent('install_dismissed');
    }

    setDeferredPrompt(null);
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Install Doshi Sensei
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add to home screen for easy access
            </p>
          </div>
          <div className="flex gap-2 ml-3">
            <button
              onClick={() => setShowInstallButton(false)}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Maybe later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
