// Force service worker update on page load
// This ensures users get the latest RSC fixes immediately
(function() {
  if ('serviceWorker' in navigator) {
    // Add timestamp to force cache bypass
    const SW_VERSION = Date.now();
    
    navigator.serviceWorker.ready.then(function(registration) {
      console.log('[SW Update] Checking for updates...');
      
      // Force update check
      registration.update().then(function() {
        console.log('[SW Update] Update check completed');
      }).catch(function(error) {
        console.error('[SW Update] Update check failed:', error);
      });
    });
    
    // Listen for new service worker activation
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('[SW Update] New service worker activated, reloading page...');
      // Only reload if we're not already reloading
      if (!window.location.href.includes('sw_updated=1')) {
        window.location.href = window.location.href + 
          (window.location.href.includes('?') ? '&' : '?') + 
          'sw_updated=1';
      }
    });
    
    // Check for RSC errors and force SW unregistration if needed
    let rscErrorCount = 0;
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const [resource, init] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      
      // Track RSC requests
      if (url && url.includes('_rsc=')) {
        return originalFetch.apply(this, args).catch(error => {
          console.error('[SW Update] RSC fetch error:', error);
          rscErrorCount++;
          
          // If we get too many RSC errors, force service worker refresh
          if (rscErrorCount > 3) {
            console.warn('[SW Update] Too many RSC errors, forcing service worker refresh...');
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                registration.unregister().then(function() {
                  console.log('[SW Update] Service worker unregistered, reloading...');
                  window.location.reload();
                });
              }
            });
          }
          
          throw error;
        });
      }
      
      return originalFetch.apply(this, args);
    };
  }
})();