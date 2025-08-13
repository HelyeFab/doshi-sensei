// PWA Recovery Script - Force clear all caches and service workers
(function() {
  'use strict';
  
  const clearAllPWAData = async () => {
    console.log('[PWA Recovery] Starting complete cache and service worker cleanup...');
    
    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`[PWA Recovery] Found ${registrations.length} service worker(s) to unregister`);
        
        await Promise.all(
          registrations.map(registration => {
            console.log(`[PWA Recovery] Unregistering SW: ${registration.scope}`);
            return registration.unregister();
          })
        );
      }
      
      // 2. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`[PWA Recovery] Found ${cacheNames.length} cache(s) to delete`);
        
        await Promise.all(
          cacheNames.map(name => {
            console.log(`[PWA Recovery] Deleting cache: ${name}`);
            return caches.delete(name);
          })
        );
      }
      
      // 3. Clear IndexedDB (if used)
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || [];
        console.log(`[PWA Recovery] Found ${databases.length} IndexedDB database(s)`);
        
        for (const db of databases) {
          if (db.name) {
            console.log(`[PWA Recovery] Deleting IndexedDB: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
          }
        }
      }
      
      // 4. Clear localStorage PWA-related items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('pwa') || 
          key.includes('sw') || 
          key.includes('cache') ||
          key.includes('workbox') ||
          key.includes('precache')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        console.log(`[PWA Recovery] Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
      });
      
      // 5. Clear sessionStorage PWA-related items
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('pwa') || 
          key.includes('sw') || 
          key.includes('cache') ||
          key.includes('workbox') ||
          key.includes('precache')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        console.log(`[PWA Recovery] Removing sessionStorage key: ${key}`);
        sessionStorage.removeItem(key);
      });
      
      console.log('[PWA Recovery] Cleanup complete! Reloading page...');
      
      // 6. Force hard reload
      setTimeout(() => {
        // Use location.href to force a complete page reload
        window.location.href = window.location.origin + window.location.pathname;
      }, 100);
      
    } catch (error) {
      console.error('[PWA Recovery] Error during cleanup:', error);
      // Try to reload anyway
      window.location.reload(true);
    }
  };
  
  // Check if we need to run recovery
  const urlParams = new URLSearchParams(window.location.search);
  const forceRecovery = urlParams.get('pwa-recovery') === 'true';
  
  // Check for chunk loading errors
  window.addEventListener('error', (event) => {
    const isChunkError = 
      event.message?.includes('Loading chunk') ||
      event.message?.includes('ChunkLoadError') ||
      event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Unexpected token');
    
    if (isChunkError) {
      console.error('[PWA Recovery] Detected chunk loading error:', event.message);
      
      // Show user-friendly message
      const recoveryMessage = document.createElement('div');
      recoveryMessage.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 999999;
          text-align: center;
          max-width: 400px;
        ">
          <h2 style="margin: 0 0 10px 0; color: #dc2626;">App Update Required</h2>
          <p style="margin: 0 0 20px 0; color: #4b5563;">
            We've detected an issue with cached files. 
            Click below to clear the cache and reload.
          </p>
          <button onclick="window.pwaRecovery()" style="
            background: #6366f1;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          ">
            Clear Cache & Reload
          </button>
        </div>
      `;
      document.body.appendChild(recoveryMessage);
    }
  });
  
  // Make recovery function globally available
  window.pwaRecovery = clearAllPWAData;
  
  // Auto-run if recovery parameter is present
  if (forceRecovery) {
    clearAllPWAData();
  }
  
  // Also check for specific error patterns in console
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (
      message.includes('ChunkLoadError') ||
      message.includes('Loading chunk') ||
      message.includes('Unexpected token') ||
      message.includes('Failed to fetch')
    ) {
      console.warn('[PWA Recovery] Detected potential cache issue. Run window.pwaRecovery() to fix.');
    }
    originalError.apply(console, args);
  };
})();