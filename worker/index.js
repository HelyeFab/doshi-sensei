// Custom service worker extensions
// This file is automatically merged with the next-pwa generated service worker

// Listen for SKIP_WAITING messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Also listen for skip-waiting message (for compatibility)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});