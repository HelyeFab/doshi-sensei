// Chunk loading error recovery for Netlify deployments
// This handles cases where chunks are invalidated after deployment

export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;

  // Track if we've already attempted a recovery
  let hasAttemptedRecovery = false;
  
  // Listen for unhandled chunk loading errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    // Check if this is a chunk loading error
    if (error?.name === 'ChunkLoadError' || 
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Loading CSS chunk')) {

      // Prevent infinite reload loops
      if (!hasAttemptedRecovery) {
        hasAttemptedRecovery = true;
        
        // Store current URL to restore after reload
        const currentUrl = window.location.href;
        sessionStorage.setItem('chunk-error-recovery-url', currentUrl);
        
        // Clear service worker caches if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEAN_CACHE'
          });
        }
        
        // Show user-friendly message
        const message = 'The application has been updated. Refreshing to load the latest version...';
        
        // If we have a UI notification system, use it
        if (typeof window.showNotification === 'function') {
          window.showNotification(message);
        } else {

        }
        
        // Reload after a short delay to allow cache clearing
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  });
  
  // Check if we're recovering from a chunk error
  if (typeof window !== 'undefined' && sessionStorage.getItem('chunk-error-recovery-url')) {
    const recoveryUrl = sessionStorage.getItem('chunk-error-recovery-url');
    sessionStorage.removeItem('chunk-error-recovery-url');
    
    // If we're not on the original URL, navigate back to it
    if (recoveryUrl && window.location.href !== recoveryUrl) {
      window.history.replaceState(null, '', recoveryUrl);
    }
  }
}

// Next.js specific webpack chunk loading error handler
export function handleWebpackChunkError() {
  if (typeof window === 'undefined') return;
  
  // Override webpack's chunk loading error handling
  const originalPush = (window as any).webpackChunkLoad;
  
  if (originalPush) {
    (window as any).webpackChunkLoad = function(...args: any[]) {
      try {
        return originalPush.apply(this, args);
      } catch (error) {
        console.error('Webpack chunk loading error:', error);
        // Trigger recovery
        window.dispatchEvent(new ErrorEvent('error', { error }));
        throw error;
      }
    };
  }
}

// Function to clear all caches (useful for manual recovery)
export async function clearAllCaches() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

  }
  
  // Also clear service worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }

  }
  
  // Clear session storage flags
  sessionStorage.removeItem('chunk-error-recovery-url');
  
  // Reload the page
  window.location.reload();
}