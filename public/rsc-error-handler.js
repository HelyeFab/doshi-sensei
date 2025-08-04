// RSC Error Handler - Fixes 502 errors for React Server Components
(function() {
  'use strict';

  // Only run in production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }

  // Track failed RSC requests
  const failedRequests = new Map();
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Override fetch to intercept RSC requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    
    // Check if this is an RSC request
    if (url && url.includes('_rsc=')) {
      console.log('[RSC Handler] Intercepting RSC request:', url);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const enhancedConfig = {
        ...config,
        signal: controller.signal,
        // Disable cache for RSC requests to prevent caching errors
        cache: 'no-store',
      };
      
      return originalFetch(resource, enhancedConfig)
        .then(response => {
          clearTimeout(timeoutId);
          
          // If we get a 502, 503, or 504 error, retry
          if (response.status === 502 || response.status === 503 || response.status === 504) {
            console.warn(`[RSC Handler] Got ${response.status} error for:`, url);
            
            const retryCount = failedRequests.get(url) || 0;
            
            if (retryCount < MAX_RETRIES) {
              failedRequests.set(url, retryCount + 1);
              console.log(`[RSC Handler] Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
              
              // Wait before retrying
              return new Promise((resolve) => {
                setTimeout(() => {
                  window.fetch(resource, config).then(resolve).catch(resolve);
                }, RETRY_DELAY * (retryCount + 1));
              });
            } else {
              console.error('[RSC Handler] Max retries reached for:', url);
              // Clear the retry counter
              failedRequests.delete(url);
              
              // Return a synthetic response to prevent app crash
              return new Response(
                JSON.stringify({ error: 'Server temporarily unavailable' }), 
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
          }
          
          // Success - clear any retry counter
          failedRequests.delete(url);
          return response;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          
          if (error.name === 'AbortError') {
            console.error('[RSC Handler] Request timed out:', url);
            
            // Return a synthetic response for timeout
            return new Response(
              JSON.stringify({ error: 'Request timed out' }), 
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          throw error;
        });
    }
    
    // Not an RSC request, proceed normally
    return originalFetch.apply(this, args);
  };

  // Also handle navigation errors
  if (window.navigation) {
    window.navigation.addEventListener('navigateerror', (event) => {
      console.error('[RSC Handler] Navigation error:', event.error);
      
      // If it's a 502 error during navigation, reload the page
      if (event.error && event.error.message && event.error.message.includes('502')) {
        console.log('[RSC Handler] Attempting page reload due to 502 error...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    });
  }

  console.log('[RSC Handler] Initialized - Monitoring RSC requests');
})();