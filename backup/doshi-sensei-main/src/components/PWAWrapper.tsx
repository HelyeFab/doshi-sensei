'use client';

import { useEffect, useState } from 'react';
import SplashScreen from './SplashScreen';

interface PWAWrapperProps {
  children: React.ReactNode;
}

export default function PWAWrapper({ children }: PWAWrapperProps) {
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if this is a PWA launch
    const isPWALaunch = () => {
      // Check URL params for PWA source
      const urlParams = new URLSearchParams(window.location.search);
      const isPWASource = urlParams.get('source') === 'pwa';

      // Check if running in standalone mode (PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');

      // Check session storage to see if we've already shown splash
      const hasShownSplash = sessionStorage.getItem('doshi_splash_shown');

      return (isPWASource || isStandalone) && !hasShownSplash;
    };

    // Initialize app
    const initializeApp = () => {
      // Clear any stale caches that might cause hanging
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          // Ensure service worker is active
          registrations.forEach(registration => {
            if (registration.active) {
              console.log('Service worker is active');
            }
          });
        });
      }

      // Force reload of critical resources
      const criticalResources = ['/doshi.png', '/manifest.json'];

      Promise.all(
        criticalResources.map(resource =>
          fetch(resource, { cache: 'reload' }).catch(() => null)
        )
      ).finally(() => {
        setIsReady(true);
      });
    };

    if (isPWALaunch()) {
      setShowSplashScreen(true);
      // Mark that we've shown the splash screen
      sessionStorage.setItem('doshi_splash_shown', 'true');

      // Initialize app in background
      setTimeout(initializeApp, 500);
    } else {
      // Not a PWA launch, show app immediately
      initializeApp();
    }

    // Clear splash screen flag when leaving the page
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('doshi_splash_shown');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleSplashComplete = () => {
    setShowSplashScreen(false);
  };

  // Show splash screen if needed
  if (showSplashScreen) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show loading state until app is ready
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show the main app
  return <>{children}</>;
}
