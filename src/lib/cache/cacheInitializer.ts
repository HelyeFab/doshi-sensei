import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { register } from '@/utils/serviceWorkerRegistration';
import { requestPersistentStorage } from '@/utils/serviceWorkerRegistration';
import { ArticleIndexedDB } from './articleIndexedDB';

export class CacheInitializer {
  private static initialized = false;
  
  /**
   * Initialize the caching system
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      console.log('[CacheInitializer] Starting initialization...');
      
      // Initialize enhanced storage manager
      await EnhancedStorageManager2.initialize();
      
      // Initialize ArticleIndexedDB
      await ArticleIndexedDB.initialize();
      console.log('[CacheInitializer] ArticleIndexedDB initialized');
      console.log('[CacheInitializer] Enhanced storage manager initialized');
      
      // Register service worker
      if ('serviceWorker' in navigator) {
        register({
          onSuccess: (registration) => {
            console.log('[CacheInitializer] Service worker registered successfully');
            
            // Request persistent storage for premium users
            const isPremium = localStorage.getItem('userType') === 'premium';
            if (isPremium) {
              requestPersistentStorage();
            }
          },
          onUpdate: (registration) => {
            console.log('[CacheInitializer] Service worker update available');
            // Could show a notification to user about update
          },
          onError: (error) => {
            console.error('[CacheInitializer] Service worker registration failed:', error);
          }
        });
      }
      
      // Set up periodic cleanup
      this.setupPeriodicCleanup();
      
      // Pre-cache essential resources
      await this.preCacheEssentials();
      
      this.initialized = true;
      console.log('[CacheInitializer] Initialization complete');
    } catch (error) {
      console.error('[CacheInitializer] Initialization failed:', error);
      // App should still work without caching
    }
  }
  
  /**
   * Pre-cache essential resources
   */
  private static async preCacheEssentials(): Promise<void> {
    // Currently no essential resources to pre-cache
    // This method is kept for future use when we have critical assets
    console.log('[CacheInitializer] Pre-cache essentials skipped - no critical assets defined');
  }
  
  /**
   * Set up periodic cleanup tasks
   */
  private static setupPeriodicCleanup(): void {
    // Clean up expired cache every hour
    setInterval(async () => {
      try {
        console.log('[CacheInitializer] Running periodic cleanup...');
        
        // Get storage stats
        const stats = await EnhancedStorageManager2.getStorageStats('free');
        
        // If storage is getting full, clean up old items
        if (stats.percentage > 80) {
          console.log('[CacheInitializer] Storage usage high, cleaning up...');
          // Cleanup logic would be implemented here
        }
      } catch (error) {
        console.error('[CacheInitializer] Periodic cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Check if the app is ready for offline use
   */
  static isOfflineReady(): boolean {
    return this.initialized && 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
  }
  
  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    initialized: boolean;
    offlineReady: boolean;
    storageStats: any;
  }> {
    const userType = localStorage.getItem('userType') as 'guest' | 'free' | 'premium' || 'free';
    
    return {
      initialized: this.initialized,
      offlineReady: this.isOfflineReady(),
      storageStats: await EnhancedStorageManager2.getStorageStats(userType)
    };
  }
}