'use client';

import { useEffect } from 'react';
import { CacheInitializer } from '@/lib/cache/cacheInitializer';
import { register } from '@/utils/serviceWorkerRegistration';

export default function CacheInitializerComponent() {
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Initialize the caching system
        await CacheInitializer.initialize();

        // Register service worker
        register({
          onSuccess: (registration) => {
            console.log('Service Worker registered successfully:', registration);
          },
          onUpdate: (registration) => {
            console.log('Service Worker updated:', registration);
            // Optionally show update notification to user
          },
          onError: (error) => {
            console.error('Service Worker registration failed:', error);
          }
        });
      } catch (error) {
        console.error('Failed to initialize cache system:', error);
      }
    };

    initializeCache();
  }, []);

  // This component doesn't render anything
  return null;
}
