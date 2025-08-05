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
    // Clear all caches silently
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name))).then(() => {
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
    const url = args[0]?.toString() || '';
    
    return originalFetch.apply(this, args).then(response => {
      // Check if this is an RSC request with 502 error
      const isRSCRequest = url.includes('?_rsc=') || url.includes('&_rsc=');
      if (isRSCRequest && response.status === 502) {
        // Return a silent failed response instead of throwing
        return new Response(null, { status: 502, statusText: 'Bad Gateway (Expected)' });
      }
      return response;
    }).catch(error => {
      // Check if this is an RSC request (has _rsc parameter)
      const isRSCRequest = url.includes('?_rsc=') || url.includes('&_rsc=');
      
      // For RSC requests with network errors, return a failed response instead of throwing
      if (isRSCRequest) {
        return new Response(null, { status: 502, statusText: 'Network Error (Expected)' });
      }
      
      // Track other network errors
      if (error.name === 'NetworkError' || error.message.includes('NetworkError')) {
        networkErrorCount++;
        
        // If we see too many network errors, the SW might be problematic
        if (networkErrorCount > 5) {
          // Silently refresh service worker
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
              reg.update();
            }
          });
          
          networkErrorCount = 0; // Reset counter
        }
      }
      
      throw error; // Re-throw the error for non-RSC requests
    });
  };
  
  // Add update check on visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          // Check for updates when app becomes visible
          reg.update().catch(() => {
            // Silently handle update check failure
          });
        }
      });
    }
  });
  
  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      // Silently handle cache updates
    }
  });
  
  // Periodic cleanup (every 24 hours)
  setInterval(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAN_CACHE' });
    }
  }, 24 * 60 * 60 * 1000);
  
  // PWA Manager initialized silently
})();