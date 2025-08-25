/**
 * Service Worker Utilities
 * Helpers for managing cache and updates
 */

export const SW_VERSION = '5.0.0'; // Base version - actual SW adds timestamp

/**
 * Force clear all caches and reload
 * Use this when users experience stale content issues
 */
export async function forceClearCache() {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('Service workers unregistered');
    }

    // Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // Reload the page
    window.location.reload();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Check if service worker needs update
 */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return registration.waiting !== null;
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
  return false;
}

/**
 * Skip waiting and activate new service worker
 */
export async function activateUpdate() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise((resolve) => {
        const checkState = () => {
          if (registration.active) {
            resolve(undefined);
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
      
      // Reload to use the new service worker
      window.location.reload();
    }
  } catch (error) {
    console.error('Error activating update:', error);
  }
}

/**
 * Get current cache size
 */
export async function getCacheSize(): Promise<string> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return 'Unknown';
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const mb = (usage / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 'Unknown';
  }
}

/**
 * Smart cache management - clear old caches but keep essential data
 */
export async function smartCacheClear() {
  if (!('caches' in window)) return;

  try {
    const cacheNames = await caches.keys();
    const currentVersion = `v${SW_VERSION}`;
    
    // Only delete caches that don't match current version
    const oldCaches = cacheNames.filter(name => !name.includes(currentVersion));
    
    await Promise.all(oldCaches.map(name => caches.delete(name)));
    
    console.log(`Cleared ${oldCaches.length} old cache(s)`);
    
    // Trigger service worker update check
    await checkForUpdates();
  } catch (error) {
    console.error('Error in smart cache clear:', error);
  }
}

/**
 * Add cache control headers to fetch requests
 * This helps prevent aggressive caching at the network level
 */
export function fetchWithCacheBusting(url: string, options: RequestInit = {}) {
  // Add cache-busting query parameter for critical resources
  const bustUrl = new URL(url, window.location.origin);
  bustUrl.searchParams.set('v', SW_VERSION);
  
  return fetch(bustUrl.toString(), {
    ...options,
    headers: {
      ...options.headers,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
}