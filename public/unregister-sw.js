// Emergency: Unregister all service workers to fix RSC errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(success) {
        if (success) {
          console.log('[SW Unregister] Service worker unregistered successfully');
        }
      });
    }
  });
  
  // Also clear all caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('[SW Unregister] Cache deleted:', name);
      }
    });
  }
}