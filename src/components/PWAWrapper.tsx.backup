'use client';

import { useEffect, useState } from 'react';
import SplashScreen from './SplashScreen';
import { safeNavigator, runInBrowser } from '@/utils/browserCheck';

interface PWAWrapperProps {
  children: React.ReactNode;
}

export default function PWAWrapper({ children }: PWAWrapperProps) {
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Check if this is a PWA launch
    const isPWALaunch = () => {
      if (!runInBrowser(() => true)) return false;
      
      // Check URL params for PWA source
      const urlParams = new URLSearchParams(window.location.search);
      const isPWASource = urlParams.get('source') === 'pwa';

      // Check if running in standalone mode (PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (safeNavigator as any)?.standalone ||
                          document.referrer.includes('android-app://');

      // Check session storage to see if we've already shown splash
      const hasShownSplash = sessionStorage.getItem('doshi_splash_shown');

      return (isPWASource || isStandalone) && !hasShownSplash;
    };

    // Initialize app
    const initializeApp = async () => {
      try {
        // Clear any stale caches that might cause hanging
        if (safeNavigator && 'serviceWorker' in safeNavigator) {
          const registrations = await safeNavigator.serviceWorker.getRegistrations();
          
          // Wait for service worker to be ready
          if (registrations.length > 0) {
            await safeNavigator.serviceWorker.ready;
          }
          
          // Check for stale cache issues
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            console.log('Active caches:', cacheNames);
            
            // If we have too many caches, it might indicate a problem
            if (cacheNames.length > 10) {
              console.warn('Too many caches detected, cleaning up...');
              // The service worker registration will handle cleanup
            }
          }
        }

        // Force reload of critical resources with timeout
        const criticalResources = ['/doshi.png', '/manifest.json'];
        const fetchWithTimeout = (url: string, timeout = 5000) => {
          return Promise.race([
            fetch(url, { cache: 'no-cache' }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
        };

        await Promise.allSettled(
          criticalResources.map(resource => 
            fetchWithTimeout(resource).catch(err => {
              console.warn(`Failed to fetch ${resource}:`, err);
              return null;
            })
          )
        );
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        // Always set ready after a maximum wait time
        setIsReady(true);
      }
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
  }, [isMounted]);

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
