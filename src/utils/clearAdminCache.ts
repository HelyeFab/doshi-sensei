'use client';

/**
 * Utility to clear service worker cache for admin pages
 * This helps ensure fresh data is loaded when navigating to admin pages
 */
export async function clearAdminCache() {
  if ('serviceWorker' in navigator && 'caches' in window) {
    try {
      // Get all cache names
      const cacheNames = await caches.keys();
      
      // Clear specific caches that might contain admin data
      const cachesToClear = cacheNames.filter(name => 
        name.includes('doshi-pages') || 
        name.includes('doshi-api') ||
        name.includes('start-url')
      );
      
      await Promise.all(
        cachesToClear.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('Admin caches cleared:', cachesToClear);
    } catch (error) {
      console.error('Error clearing admin caches:', error);
    }
  }
}

/**
 * Clear cache and reload the page
 * Useful for ensuring fresh data after updates
 */
export async function clearCacheAndReload() {
  await clearAdminCache();
  
  // Force reload from server, bypassing cache
  window.location.reload();
}