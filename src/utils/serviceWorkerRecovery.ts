/**
 * Service Worker Recovery Utilities
 * These functions help detect and recover from service worker cache corruption
 * automatically in production.
 */

export class ServiceWorkerRecovery {
  private static instance: ServiceWorkerRecovery;
  private isRecovering = false;
  private lastRecoveryAttempt: number = 0;
  private readonly RECOVERY_COOLDOWN = 60000; // 1 minute between recovery attempts
  
  static getInstance(): ServiceWorkerRecovery {
    if (!ServiceWorkerRecovery.instance) {
      ServiceWorkerRecovery.instance = new ServiceWorkerRecovery();
    }
    return ServiceWorkerRecovery.instance;
  }

  /**
   * Initialize automatic recovery monitoring
   */
  async initialize() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Listen for network errors that might indicate cache corruption
    this.setupErrorMonitoring();
    
    // Check service worker health on load
    await this.checkServiceWorkerHealth();
    
    // Set up periodic health checks
    setInterval(() => this.checkServiceWorkerHealth(), 5 * 60 * 1000); // Every 5 minutes

    // Make recovery function available globally for emergency use
    if (typeof window !== 'undefined') {
      (window as any).pwaRecovery = () => this.manualRecovery();
      (window as any).swHealth = () => this.getHealthStatus();
    }
  }

  /**
   * Set up monitoring for errors that indicate cache problems
   */
  private setupErrorMonitoring() {
    let redirectErrorCount = 0;
    let fetchErrorCount = 0;
    const ERROR_THRESHOLD = 3;
    
    // Monitor fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Only check for actual redirect loop status (508) - not normal redirects
        // 'opaqueredirect' is normal behavior for cross-origin requests
        if (response.status === 508) {
          redirectErrorCount++;
          console.warn('[SW Recovery] Redirect loop detected (508):', args[0]);
          
          if (redirectErrorCount >= ERROR_THRESHOLD) {
            console.error('[SW Recovery] Too many redirect loops - initiating recovery');
            this.autoRecover('redirect-loop');
            redirectErrorCount = 0;
          }
        } else if (response.ok || response.status < 400) {
          // Reset counter on successful request
          redirectErrorCount = Math.max(0, redirectErrorCount - 1);
        }
        
        return response;
      } catch (error: any) {
        // Only count actual network errors, not all failures
        const errorMessage = error?.message || '';
        
        // Check for specific error patterns that indicate real problems
        if (errorMessage.includes('ERR_TOO_MANY_REDIRECTS')) {
          redirectErrorCount++;
          console.warn('[SW Recovery] Browser detected redirect loop:', args[0]);
          
          if (redirectErrorCount >= ERROR_THRESHOLD) {
            console.error('[SW Recovery] Too many redirect errors - initiating recovery');
            this.autoRecover('redirect-loop');
            redirectErrorCount = 0;
          }
        } else if (errorMessage.includes('Failed to fetch') && 
                   !errorMessage.includes('AbortError')) {
          fetchErrorCount++;
          
          if (fetchErrorCount >= ERROR_THRESHOLD) {
            console.error('[SW Recovery] Too many fetch errors - initiating recovery');
            this.autoRecover('fetch-errors');
            fetchErrorCount = 0;
          }
        }
        
        throw error;
      }
    };

    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      if (event.message?.includes('ERR_TOO_MANY_REDIRECTS') || 
          event.message?.includes('Failed to fetch')) {
        console.warn('[SW Recovery] Global error detected:', event.message);
        this.autoRecover('global-error');
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.toString() || '';
      if (reason.includes('ERR_TOO_MANY_REDIRECTS') || 
          reason.includes('Failed to fetch')) {
        console.warn('[SW Recovery] Unhandled rejection detected:', reason);
        this.autoRecover('promise-rejection');
      }
    });
  }

  /**
   * Check service worker health
   */
  async checkServiceWorkerHealth(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.log('[SW Recovery] No service worker registered');
        return true; // No SW is not an error
      }

      // Check if service worker is in a bad state
      if (registration.waiting && registration.active) {
        console.log('[SW Recovery] Service worker update waiting');
        // Auto-update if there's a waiting worker
        this.skipWaiting(registration.waiting);
      }

      // Try to communicate with service worker
      if (registration.active) {
        const healthy = await this.pingServiceWorker(registration.active);
        if (!healthy) {
          console.warn('[SW Recovery] Service worker not responding properly');
          await this.autoRecover('health-check-failed');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[SW Recovery] Health check error:', error);
      return false;
    }
  }

  /**
   * Ping service worker to check if it's responsive
   */
  private async pingServiceWorker(sw: ServiceWorker): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000); // 3 second timeout

      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data?.healthy === true);
      };

      sw.postMessage({ type: 'HEALTH_CHECK' }, [channel.port2]);
    });
  }

  /**
   * Automatic recovery based on detected issues
   */
  private async autoRecover(reason: string) {
    // Check cooldown
    const now = Date.now();
    if (now - this.lastRecoveryAttempt < this.RECOVERY_COOLDOWN) {
      console.log('[SW Recovery] Skipping recovery - cooldown active');
      return;
    }

    if (this.isRecovering) {
      console.log('[SW Recovery] Recovery already in progress');
      return;
    }

    this.isRecovering = true;
    this.lastRecoveryAttempt = now;

    console.log(`[SW Recovery] Starting automatic recovery (reason: ${reason})`);

    try {
      // Step 1: Clear all caches
      await this.clearAllCaches();
      
      // Step 2: Unregister service worker
      await this.unregisterServiceWorkers();
      
      // Step 3: Clear storage
      this.clearStorage();
      
      // Step 4: Show user notification
      this.showRecoveryNotification(reason);
      
      // Step 5: Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('[SW Recovery] Recovery failed:', error);
      // Last resort - hard reload without cache
      window.location.reload();
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Manual recovery triggered by user
   */
  async manualRecovery() {
    console.log('[SW Recovery] Manual recovery initiated');
    
    if (confirm('This will clear all cached data and reload the page. Continue?')) {
      await this.autoRecover('manual');
    }
  }

  /**
   * Clear all caches
   */
  private async clearAllCaches() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`[SW Recovery] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }
  }

  /**
   * Unregister all service workers
   */
  private async unregisterServiceWorkers() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          console.log('[SW Recovery] Unregistering service worker');
          return registration.unregister();
        })
      );
    }
  }

  /**
   * Clear local and session storage
   */
  private clearStorage() {
    try {
      // Only clear cache-related items, not user data
      const keysToKeep = ['user', 'auth', 'preferences', 'settings'];
      
      // Clear localStorage selectively
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (!keysToKeep.some(keep => key.includes(keep))) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage completely
      sessionStorage.clear();
      
      console.log('[SW Recovery] Storage cleared (user data preserved)');
    } catch (error) {
      console.error('[SW Recovery] Failed to clear storage:', error);
    }
  }

  /**
   * Show recovery notification to user
   */
  private showRecoveryNotification(reason: string) {
    // Create a non-intrusive notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <strong>Fixing cache issues...</strong><br>
      <span style="opacity: 0.9; font-size: 13px;">
        The app detected a problem and is recovering automatically. 
        Page will reload in a moment.
      </span><br>
      <span style="opacity: 0.7; font-size: 11px;">Reason: ${reason}</span>
    `;
    
    document.body.appendChild(notification);
  }

  /**
   * Skip waiting for service worker update
   */
  private skipWaiting(sw: ServiceWorker) {
    sw.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Get health status for debugging
   */
  async getHealthStatus() {
    const registration = await navigator.serviceWorker.getRegistration();
    const cacheNames = await caches.keys();
    
    return {
      hasServiceWorker: !!registration,
      swState: registration?.active?.state,
      swUpdateWaiting: !!registration?.waiting,
      cacheCount: cacheNames.length,
      caches: cacheNames,
      lastRecovery: this.lastRecoveryAttempt ? new Date(this.lastRecoveryAttempt).toISOString() : 'never',
      isRecovering: this.isRecovering
    };
  }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ServiceWorkerRecovery.getInstance().initialize();
    });
  } else {
    ServiceWorkerRecovery.getInstance().initialize();
  }
}