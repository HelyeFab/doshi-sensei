// PWA Health Check - Monitor and report PWA issues
(function() {
  'use strict';
  
  const PWA_HEALTH_CHECK = {
    issues: [],
    
    checkServiceWorker: async function() {
      if (!('serviceWorker' in navigator)) {
        this.issues.push('Service Worker not supported');
        return false;
      }
      
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) {
          console.log('[PWA Health] No service workers registered');
          return false;
        }
        
        for (const reg of registrations) {
          if (reg.active) {
            console.log('[PWA Health] Active SW:', reg.active.scriptURL);
          }
          if (reg.waiting) {
            console.log('[PWA Health] Waiting SW:', reg.waiting.scriptURL);
            this.issues.push('Service Worker update waiting');
          }
          if (reg.installing) {
            console.log('[PWA Health] Installing SW:', reg.installing.scriptURL);
          }
        }
        return true;
      } catch (error) {
        console.error('[PWA Health] SW check failed:', error);
        this.issues.push('Service Worker check failed: ' + error.message);
        return false;
      }
    },
    
    checkCaches: async function() {
      if (!('caches' in window)) {
        this.issues.push('Cache API not supported');
        return false;
      }
      
      try {
        const cacheNames = await caches.keys();
        console.log('[PWA Health] Active caches:', cacheNames.length);
        
        // Check for orphaned or old caches
        const validPrefixes = ['workbox', 'next', 'doshi'];
        const orphanedCaches = cacheNames.filter(name => 
          !validPrefixes.some(prefix => name.toLowerCase().includes(prefix))
        );
        
        if (orphanedCaches.length > 0) {
          console.warn('[PWA Health] Orphaned caches found:', orphanedCaches);
          this.issues.push(`${orphanedCaches.length} orphaned cache(s) found`);
        }
        
        return true;
      } catch (error) {
        console.error('[PWA Health] Cache check failed:', error);
        this.issues.push('Cache check failed: ' + error.message);
        return false;
      }
    },
    
    checkIndexedDB: async function() {
      if (!('indexedDB' in window)) {
        this.issues.push('IndexedDB not supported');
        return false;
      }
      
      try {
        // Just check if we can open a test database
        const testDB = indexedDB.open('pwa-health-test', 1);
        
        return new Promise((resolve) => {
          testDB.onsuccess = () => {
            testDB.result.close();
            // Clean up test database
            indexedDB.deleteDatabase('pwa-health-test');
            console.log('[PWA Health] IndexedDB is functional');
            resolve(true);
          };
          
          testDB.onerror = () => {
            console.error('[PWA Health] IndexedDB test failed');
            this.issues.push('IndexedDB not accessible');
            resolve(false);
          };
        });
      } catch (error) {
        console.error('[PWA Health] IndexedDB check failed:', error);
        this.issues.push('IndexedDB check failed: ' + error.message);
        return false;
      }
    },
    
    checkQuota: async function() {
      if (!navigator.storage || !navigator.storage.estimate) {
        console.log('[PWA Health] Storage API not available');
        return true; // Not an error, just not supported
      }
      
      try {
        const estimate = await navigator.storage.estimate();
        const percentUsed = (estimate.usage / estimate.quota) * 100;
        
        console.log('[PWA Health] Storage quota:', {
          used: Math.round(estimate.usage / 1024 / 1024) + ' MB',
          total: Math.round(estimate.quota / 1024 / 1024) + ' MB',
          percent: percentUsed.toFixed(2) + '%'
        });
        
        if (percentUsed > 90) {
          this.issues.push('Storage quota nearly full: ' + percentUsed.toFixed(0) + '%');
        }
        
        return true;
      } catch (error) {
        console.error('[PWA Health] Quota check failed:', error);
        return false;
      }
    },
    
    runHealthCheck: async function() {
      console.log('[PWA Health] Starting health check...');
      this.issues = [];
      
      const checks = [
        this.checkServiceWorker(),
        this.checkCaches(),
        this.checkIndexedDB(),
        this.checkQuota()
      ];
      
      await Promise.all(checks);
      
      if (this.issues.length === 0) {
        console.log('[PWA Health] ✅ All checks passed');
      } else {
        console.warn('[PWA Health] ⚠️ Issues detected:', this.issues);
      }
      
      return {
        healthy: this.issues.length === 0,
        issues: this.issues
      };
    },
    
    // Auto-fix common issues
    autoFix: async function() {
      console.log('[PWA Health] Attempting auto-fix...');
      
      for (const issue of this.issues) {
        if (issue.includes('update waiting')) {
          // Skip waiting SW
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              console.log('[PWA Health] Triggered SW update');
            }
          }
        }
        
        if (issue.includes('orphaned cache')) {
          // Clean orphaned caches
          const cacheNames = await caches.keys();
          const validPrefixes = ['workbox', 'next', 'doshi'];
          
          for (const name of cacheNames) {
            if (!validPrefixes.some(prefix => name.toLowerCase().includes(prefix))) {
              await caches.delete(name);
              console.log('[PWA Health] Deleted orphaned cache:', name);
            }
          }
        }
      }
      
      // Re-run health check
      return this.runHealthCheck();
    }
  };
  
  // Make available globally
  window.pwaHealthCheck = PWA_HEALTH_CHECK;
  
  // Run initial check after page load
  if (document.readyState === 'complete') {
    setTimeout(() => PWA_HEALTH_CHECK.runHealthCheck(), 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => PWA_HEALTH_CHECK.runHealthCheck(), 1000);
    });
  }
  
  // Monitor for SW updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA Health] Service Worker updated, running health check...');
      PWA_HEALTH_CHECK.runHealthCheck();
    });
  }
})();