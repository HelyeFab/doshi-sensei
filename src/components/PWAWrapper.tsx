'use client';

import { useEffect, useState } from 'react';
import SplashScreen from './SplashScreen';
import { safeNavigator, runInBrowser } from '@/utils/browserCheck';

interface PWAWrapperProps {
  children: React.ReactNode;
}

export default function PWAWrapper({ children }: PWAWrapperProps) {
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Check if app was already initialized to avoid loading state on navigation
  const [isReady, setIsReady] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    // Check if app was already initialized (persists across navigations)
    const wasInitialized = typeof window !== 'undefined' && 
      (sessionStorage.getItem('doshi_app_initialized') === 'true' || 
       localStorage.getItem('doshi_app_ever_initialized') === 'true');
    
    if (wasInitialized) {
      setIsReady(true);
      setIsFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // If already initialized, we've already set ready state above
    if (sessionStorage.getItem('doshi_app_initialized')) {
      console.log('App already initialized, skipping all init logic');
      return; // Exit early - don't run any initialization
    }

    // Only run initialization on true first load
    console.log('First load detected, running initialization...');

    // Initialize app with better error handling and timeouts
    const initializeApp = async () => {
      // Set a hard timeout to prevent infinite splash screen
      const initTimeout = setTimeout(() => {
        console.warn('App initialization timeout - forcing ready state');
        setIsReady(true);
        setIsFirstLoad(false);
        sessionStorage.setItem('doshi_app_initialized', 'true');
        localStorage.setItem('doshi_app_ever_initialized', 'true');
      }, 5000); // 5 second maximum wait

      try {
        // Mark app as initialized immediately to prevent re-runs
        sessionStorage.setItem('doshi_app_initialized', 'true');
        // Also mark in localStorage for persistence across browser sessions
        localStorage.setItem('doshi_app_ever_initialized', 'true');
        
        // Clear the stuck flag on successful init
        localStorage.removeItem('pwa_stuck_time');
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        clearTimeout(initTimeout);
        // Always set ready
        setIsReady(true);
        setIsFirstLoad(false);
      }
    };

    // Run minimal initialization
    initializeApp();
  }, [isMounted]);

  const handleSplashComplete = () => {
    setShowSplashScreen(false);
    setIsFirstLoad(false);
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
        setIsFirstLoad(false);
        localStorage.removeItem('pwa_stuck_time');
      }, 8000);

      return () => clearTimeout(splashTimeout);
    }
  }, [showSplashScreen]);

  // Show splash screen if needed
  if (showSplashScreen) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Only show loading state on the very first load, not on navigation
  if (!isReady && isFirstLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show the main app (even if not ready on navigation)
  return <>{children}</>;
}
