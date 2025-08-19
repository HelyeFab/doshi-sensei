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
  
  // Smart chunk error detection with auto-recovery
  let chunkErrorCount = 0;
  const MAX_CHUNK_ERRORS = 2;
  
  window.addEventListener('error', (event) => {
    const isChunkError = 
      event.message?.includes('Loading chunk') ||
      event.message?.includes('ChunkLoadError') ||
      event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Unexpected token');
    
    if (isChunkError) {
      console.error('[PWA Recovery] Detected chunk loading error:', event.message);
      chunkErrorCount++;
      
      // Auto-recover after 2 chunk errors
      if (chunkErrorCount >= MAX_CHUNK_ERRORS) {
        console.log('[PWA Recovery] Auto-recovering after multiple chunk errors...');
        // First try to update service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        // Then clear caches and reload
        setTimeout(() => {
          clearAllPWAData();
        }, 500);
      } else {
        // Show non-intrusive notification for first error
        console.warn('[PWA Recovery] Chunk error detected, will auto-recover if it persists');
      }
    }
  });
  
  // Make recovery function globally available
  window.pwaRecovery = clearAllPWAData;
  
  // Auto-run if recovery parameter is present
  if (forceRecovery) {
    clearAllPWAData();
  }
  
  // Also check for specific error patterns in console
  const originalError = console.error.bind(console);
  console.error = function(...args) {
    try {
      // Safely convert args to string, handling special cases
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'number') {
          // Handle NaN and Infinity properly
          if (isNaN(arg)) return 'NaN';
          if (!isFinite(arg)) return 'Infinity';
          return String(arg);
        }
        if (typeof arg === 'object') {
          // Don't try to stringify DOM elements or React components
          if (arg instanceof Element || arg instanceof HTMLDocument) {
            return '[DOM Element]';
          }
          // Check for React elements (they have $$typeof property)
          if (arg && arg.$$typeof) {
            return '[React Element]';
          }
          // Check for errors
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}`;
          }
          try {
            // Try to stringify, but with a depth limit to avoid circular references
            return JSON.stringify(arg, (key, value) => {
              // Handle NaN in nested objects
              if (typeof value === 'number' && isNaN(value)) {
                return 'NaN';
              }
              // Limit depth to prevent infinite recursion
              if (key && typeof value === 'object' && value !== null) {
                return '[Object]';
              }
              return value;
            });
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      if (
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('Unexpected token') ||
        message.includes('Failed to fetch')
      ) {
        console.warn('[PWA Recovery] Detected potential cache issue. Run window.pwaRecovery() to fix.');
      }
    } catch (e) {
      // If anything fails, just pass through to original
    }
    return originalError(...args);
  };
})();