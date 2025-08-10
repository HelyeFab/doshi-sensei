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
        // console.log('PWA prompt throttled - shown within last 24 hours');
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
      // console.warn('Install prompt is not available');
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
    <>
      {/* Backdrop for dismissible interaction */}
      <div 
        className="fixed inset-0 z-[9998]"
        onClick={() => {
          setShowInstallButton(false);
          localStorage.setItem('pwa-prompt-last-shown', Date.now().toString());
          pwaAnalytics.trackEvent('install_prompt_dismissed_backdrop');
        }}
      />
      
      {/* Centered modal popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90vw] max-w-sm">
        <div className="bg-card border border-border rounded-xl shadow-xl p-6">
          {/* App icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Install Doshi Sensei
            </h3>
            <p className="text-sm text-muted-foreground">
              Add to your home screen for the best experience with offline access and faster loading
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowInstallButton(false);
                localStorage.setItem('pwa-prompt-last-shown', Date.now().toString());
                pwaAnalytics.trackEvent('install_prompt_dismissed_maybe_later');
              }}
              className="flex-1 px-4 py-2.5 text-sm text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors font-medium"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Install App
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
