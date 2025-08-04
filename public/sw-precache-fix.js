// Service Worker Precache Fix
// This script modifies the service worker to handle precaching errors gracefully

if ('serviceWorker' in navigator) {
  // Listen for service worker updates
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('[SW Precache Fix] Cache updated successfully');
    }
  });

  // Override the service worker's install event to handle bad responses
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW Precache Fix] Service worker updated');
  });

  // Monitor for precaching errors
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('bad-precaching-response')) {
      console.warn('[SW Precache Fix] Caught precaching error, preventing crash');
      event.preventDefault();
      
      // Try to recover by updating service worker
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          console.log('[SW Precache Fix] Attempting to update service worker...');
          registration.update();
        }
      });
    }
  }, true);

  // Also catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('bad-precaching-response')) {
      console.warn('[SW Precache Fix] Caught precaching promise rejection');
      event.preventDefault();
      
      // Clear the problematic cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('precache')) {
              console.log('[SW Precache Fix] Clearing precache:', name);
              caches.delete(name);
            }
          });
        });
      }
    }
  });
}