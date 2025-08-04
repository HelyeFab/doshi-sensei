// PWA Manager - Intelligent Service Worker Management
(function() {
  'use strict';
  
  if (!('serviceWorker' in navigator)) return;
  
  // Configuration
  const SW_VERSION = '2.0.0';
  const CACHE_VERSION_KEY = 'doshi-sw-version';
  
  // Get stored version
  const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
  
  // Check if we need to clear caches due to version change
  if (storedVersion && storedVersion !== SW_VERSION) {
    console.log('[PWA Manager] Version change detected, clearing caches...');
    
    // Clear all caches
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name))).then(() => {
        console.log('[PWA Manager] All caches cleared');
        localStorage.setItem(CACHE_VERSION_KEY, SW_VERSION);
      });
    });
    
    // Unregister old service workers
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => {
        reg.unregister();
      });
    });
  } else {
    localStorage.setItem(CACHE_VERSION_KEY, SW_VERSION);
  }
  
  // Monitor for problematic patterns
  let networkErrorCount = 0;
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
      // Track network errors
      if (error.name === 'NetworkError' || error.message.includes('NetworkError')) {
        networkErrorCount++;
        
        // If we see too many network errors, the SW might be problematic
        if (networkErrorCount > 5) {
          console.warn('[PWA Manager] Multiple network errors detected, refreshing service worker...');
          
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
              reg.update();
            }
          });
          
          networkErrorCount = 0; // Reset counter
        }
      }
      
      throw error; // Re-throw the error
    });
  };
  
  // Add update check on visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          // Check for updates when app becomes visible
          reg.update().catch(err => {
            console.log('[PWA Manager] Update check failed:', err);
          });
        }
      });
    }
  });
  
  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('[PWA Manager] Cache updated, refreshing content...');
      // Optionally reload or notify user
    }
  });
  
  // Periodic cleanup (every 24 hours)
  setInterval(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAN_CACHE' });
    }
  }, 24 * 60 * 60 * 1000);
  
  console.log('[PWA Manager] Initialized - Version', SW_VERSION);
})();