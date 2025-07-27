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

      // Check session storage to see if we've already shown splash in this session
      const hasShownSplash = sessionStorage.getItem('doshi_splash_shown');
      
      // Check if this is the initial app launch (not a navigation)
      const isInitialLaunch = !document.referrer || document.referrer === '';
      
      // Only show splash on initial PWA launch, not during navigation
      return (isPWASource || isStandalone) && !hasShownSplash && isInitialLaunch;
    };

    // Initialize app with better error handling and timeouts
    const initializeApp = async () => {
      // Set a hard timeout to prevent infinite splash screen
      const initTimeout = setTimeout(() => {
        console.warn('App initialization timeout - forcing ready state');
        setIsReady(true);
      }, 5000); // 5 second maximum wait

      try {
        // Check if we're stuck from a previous session
        const lastStuckTime = localStorage.getItem('pwa_stuck_time');
        if (lastStuckTime) {
          const timeSinceStuck = Date.now() - parseInt(lastStuckTime);
          if (timeSinceStuck < 30000) { // Within 30 seconds
            console.log('Detected recent stuck state, clearing caches...');
            
            // Clear all caches to recover
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map(name => caches.delete(name)));
              console.log('Cleared all caches due to stuck state');
            }
            
            // Clear the stuck flag
            localStorage.removeItem('pwa_stuck_time');
          }
        }

        // Mark that we're attempting to initialize
        localStorage.setItem('pwa_stuck_time', Date.now().toString());

        // Service worker handling with timeout
        if (safeNavigator && 'serviceWorker' in safeNavigator) {
          try {
            // Wait for service worker with timeout
            const swReadyPromise = safeNavigator.serviceWorker.ready;
            const swTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SW timeout')), 3000)
            );
            
            await Promise.race([swReadyPromise, swTimeout]).catch(err => {
              console.warn('Service worker timeout:', err);
            });

            // Check cache health
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              console.log('Active caches:', cacheNames.length);
              
              // Clean up excessive caches
              if (cacheNames.length > 15) {
                console.warn('Too many caches, cleaning oldest...');
                // Keep only caches that start with our prefix
                const toDelete = cacheNames.filter(name => 
                  !name.includes('doshi-sensei-') || cacheNames.indexOf(name) > 10
                );
                await Promise.all(toDelete.map(name => caches.delete(name)));
              }
            }
          } catch (swError) {
            console.error('Service worker error:', swError);
            // Continue initialization even if SW fails
          }
        }

        // Try to load critical resources but don't block on failure
        const criticalResources = ['/manifest.json'];
        const fetchWithTimeout = (url: string, timeout = 2000) => {
          return Promise.race([
            fetch(url, { cache: 'reload' }), // Force fresh fetch
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
        };

        await Promise.allSettled(
          criticalResources.map(resource => 
            fetchWithTimeout(resource).catch(err => {
              console.warn(`Non-critical: Failed to fetch ${resource}`);
              return null;
            })
          )
        );

        // Clear the stuck flag on successful init
        localStorage.removeItem('pwa_stuck_time');
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        clearTimeout(initTimeout);
        // Always set ready
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

    // Don't clear splash flag on navigation, only on actual page unload
    // This prevents splash from showing again during client-side navigation
    const handleUnload = () => {
      sessionStorage.removeItem('doshi_splash_shown');
    };

    // Use 'unload' instead of 'beforeunload' to only clear on actual page leave
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('unload', handleUnload);
    };
  }, [isMounted]);

  const handleSplashComplete = () => {
    setShowSplashScreen(false);
    // Clear any stuck state when splash completes
    localStorage.removeItem('pwa_stuck_time');
  };

  // Add timeout for splash screen
  useEffect(() => {
    if (showSplashScreen) {
      // Force close splash after 8 seconds no matter what
      const splashTimeout = setTimeout(() => {
        console.warn('Splash screen timeout - forcing close');
        setShowSplashScreen(false);
        setIsReady(true);
        localStorage.removeItem('pwa_stuck_time');
      }, 8000);

      return () => clearTimeout(splashTimeout);
    }
  }, [showSplashScreen]);

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
