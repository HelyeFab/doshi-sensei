import { safeNavigator, runInBrowser } from './browserCheck';

export interface PWAMetrics {
  installSource?: string;
  displayMode: 'standalone' | 'browser' | 'minimal-ui' | 'fullscreen';
  isInstalled: boolean;
  platform: string;
  serviceWorkerStatus: 'activated' | 'installing' | 'waiting' | 'none';
  offlineCapable: boolean;
  cacheSize?: number;
  lastUpdated?: Date;
}

export interface PWAEvent {
  event: 'install_prompt_shown' | 'install_accepted' | 'install_dismissed' | 
         'update_available' | 'update_installed' | 'offline_page_shown' |
         'cache_cleared' | 'push_permission_granted' | 'push_permission_denied';
  timestamp: Date;
  metadata?: Record<string, any>;
}

class PWAAnalytics {
  private events: PWAEvent[] = [];
  private metrics: PWAMetrics | null = null;

  constructor() {
    runInBrowser(() => {
      this.initializeMetrics();
      this.setupEventListeners();
    });
  }

  private async initializeMetrics() {
    const metrics: PWAMetrics = {
      displayMode: this.getDisplayMode(),
      isInstalled: this.checkIfInstalled(),
      platform: this.getPlatform(),
      serviceWorkerStatus: await this.getServiceWorkerStatus(),
      offlineCapable: await this.checkOfflineCapability(),
    };

    // Get install source from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'pwa') {
      metrics.installSource = 'pwa';
    }

    // Get cache size if available
    if (safeNavigator?.storage?.estimate) {
      try {
        const estimate = await safeNavigator.storage.estimate();
        if (estimate.usage) {
          metrics.cacheSize = estimate.usage;
        }
      } catch (error) {
        console.error('Error estimating storage:', error);
      }
    }

    this.metrics = metrics;
    this.saveMetrics();
  }

  private getDisplayMode(): PWAMetrics['displayMode'] {
    const displayModes: PWAMetrics['displayMode'][] = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    
    for (const mode of displayModes) {
      if (window.matchMedia(`(display-mode: ${mode})`).matches) {
        return mode;
      }
    }
    
    return 'browser';
  }

  private checkIfInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (safeNavigator as any)?.standalone ||
           document.referrer.includes('android-app://');
  }

  private getPlatform(): string {
    const userAgent = safeNavigator?.userAgent?.toLowerCase() || '';
    
    if (/iphone|ipad|ipod/.test(userAgent)) return 'iOS';
    if (/android/.test(userAgent)) return 'Android';
    if (/windows/.test(userAgent)) return 'Windows';
    if (/macintosh|mac os x/.test(userAgent)) return 'macOS';
    if (/linux/.test(userAgent)) return 'Linux';
    
    return 'Unknown';
  }

  private async getServiceWorkerStatus(): Promise<PWAMetrics['serviceWorkerStatus']> {
    if (!safeNavigator?.serviceWorker) return 'none';

    try {
      const registration = await safeNavigator.serviceWorker.getRegistration();
      if (!registration) return 'none';

      if (registration.active) return 'activated';
      if (registration.waiting) return 'waiting';
      if (registration.installing) return 'installing';
    } catch (error) {
      console.error('Error checking service worker:', error);
    }

    return 'none';
  }

  private async checkOfflineCapability(): Promise<boolean> {
    if (!safeNavigator?.serviceWorker) return false;

    try {
      const registration = await safeNavigator.serviceWorker.ready;
      return !!registration.active;
    } catch {
      return false;
    }
  }

  private setupEventListeners() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', () => {
      this.trackEvent('install_prompt_shown');
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      this.trackEvent('install_accepted');
      this.metrics = { ...this.metrics!, isInstalled: true };
      this.saveMetrics();
    });

    // Listen for service worker updates
    if (safeNavigator?.serviceWorker) {
      safeNavigator.serviceWorker.addEventListener('controllerchange', () => {
        this.trackEvent('update_installed');
      });
    }

    // Listen for visibility changes to track engagement
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.metrics?.isInstalled) {
        this.updateLastActiveTime();
      }
    });
  }

  public trackEvent(event: PWAEvent['event'], metadata?: Record<string, any>) {
    const pwaEvent: PWAEvent = {
      event,
      timestamp: new Date(),
      metadata
    };

    this.events.push(pwaEvent);
    this.saveEvents();

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  public getMetrics(): PWAMetrics | null {
    return this.metrics;
  }

  public getEvents(): PWAEvent[] {
    return this.events;
  }

  public async getCacheStats() {
    if (!safeNavigator?.serviceWorker) return null;

    try {
      const cacheNames = await caches.keys();
      const stats: Record<string, number> = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        stats[cacheName] = requests.length;
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  private saveMetrics() {
    try {
      localStorage.setItem('doshi_pwa_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving PWA metrics:', error);
    }
  }

  private saveEvents() {
    try {
      localStorage.setItem('doshi_pwa_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Error saving PWA events:', error);
    }
  }

  private loadSavedData() {
    try {
      const savedMetrics = localStorage.getItem('doshi_pwa_metrics');
      if (savedMetrics) {
        this.metrics = JSON.parse(savedMetrics);
      }

      const savedEvents = localStorage.getItem('doshi_pwa_events');
      if (savedEvents) {
        this.events = JSON.parse(savedEvents).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading saved PWA data:', error);
    }
  }

  private updateLastActiveTime() {
    this.metrics = { ...this.metrics!, lastUpdated: new Date() };
    this.saveMetrics();
  }

  public async generateReport() {
    const metrics = this.getMetrics();
    const events = this.getEvents();
    const cacheStats = await this.getCacheStats();

    return {
      metrics,
      events: events.slice(-20), // Last 20 events
      cacheStats,
      summary: {
        totalEvents: events.length,
        installEvents: events.filter(e => e.event.includes('install')).length,
        updateEvents: events.filter(e => e.event.includes('update')).length,
        isHealthy: metrics?.serviceWorkerStatus === 'activated' && metrics.offlineCapable
      }
    };
  }
}

// Export singleton instance
export const pwaAnalytics = new PWAAnalytics();