/**
 * Service Worker Registration Script
 * Handles PWA registration with proper error handling
 */

(function() {
  'use strict';
  
  // Only register in production
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Wait for window load
  window.addEventListener('load', function() {
    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', { 
        scope: '/',
        updateViaCache: 'none'
      })
      .then(function(registration) {
        console.log('[PWA] Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[PWA] New service worker available');
                // Dispatch custom event for update notification
                window.dispatchEvent(new CustomEvent('sw-update', { detail: { registration } }));
              }
            });
          }
        });
      })
      .catch(function(error) {
        console.error('[PWA] Service Worker registration failed:', error);
      });
      
    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Controller changed, reloading page');
      window.location.reload();
    });
  });
})();