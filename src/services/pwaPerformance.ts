// PWA Performance Monitoring Service
// Tracks key metrics for PWA performance optimization

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  lastUpdated: number;
}

class PWAPerformanceService {
  private metrics: PerformanceMetric[] = [];
  private cacheMetrics: Map<string, number> = new Map();
  private readonly MAX_METRICS = 1000;
  private readonly STORAGE_KEY = 'pwa_performance_metrics';
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePerformanceObserver();
      this.loadStoredMetrics();
      this.trackCachePerformance();
    }
  }

  private initializePerformanceObserver(): void {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP (Largest Contentful Paint)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime, {
            element: lastEntry.element?.tagName,
            url: lastEntry.url,
            size: lastEntry.size
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.error('LCP Observer failed:', e);
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime, {
              eventType: entry.name,
              target: entry.target?.tagName
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.error('FID Observer failed:', e);
      }

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              this.recordMetric('CLS', clsValue);
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.error('CLS Observer failed:', e);
      }
    }

    // Track navigation timing
    if ('performance' in window && 'timing' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = performance.timing;
          const navigationStart = timing.navigationStart;

          // Time to First Byte
          const ttfb = timing.responseStart - navigationStart;
          this.recordMetric('TTFB', ttfb);

          // DOM Content Loaded
          const dcl = timing.domContentLoadedEventEnd - navigationStart;
          this.recordMetric('DCL', dcl);

          // Page Load Time
          const loadTime = timing.loadEventEnd - navigationStart;
          this.recordMetric('PageLoad', loadTime);

          // DNS Lookup Time
          const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
          this.recordMetric('DNS', dnsTime);

          // TCP Connection Time
          const tcpTime = timing.connectEnd - timing.connectStart;
          this.recordMetric('TCP', tcpTime);

          // Service Worker startup time
          if ('serviceWorker' in navigator) {
            this.measureServiceWorkerPerformance();
          }
        }, 0);
      });
    }
  }

  private async measureServiceWorkerPerformance(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const swReadyTime = performance.now() - startTime;
      this.recordMetric('SW_Ready', swReadyTime);

      // Check if service worker is controlling the page
      if (navigator.serviceWorker.controller) {
        // Measure message round-trip time
        const messageStart = performance.now();
        
        navigator.serviceWorker.controller.postMessage({ 
          type: 'PING',
          timestamp: messageStart 
        });

        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'PONG') {
            const roundTripTime = performance.now() - messageStart;
            this.recordMetric('SW_MessageRoundTrip', roundTripTime);
          }
        }, { once: true });
      }
    } catch (error) {
      console.error('Service Worker performance measurement failed:', error);
    }
  }

  private trackCachePerformance(): void {
    // Override fetch to track cache hits/misses
    const originalFetch = window.fetch;
    let cacheHits = 0;
    let cacheMisses = 0;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const [resource, init] = args;
      
      try {
        const response = await originalFetch(...args);
        const fetchTime = performance.now() - startTime;
        
        // Check if response was from cache
        const fromCache = fetchTime < 50; // Heuristic: cache responses are typically < 50ms
        
        if (fromCache) {
          cacheHits++;
        } else {
          cacheMisses++;
        }

        // Update cache metrics
        this.cacheMetrics.set('hits', cacheHits);
        this.cacheMetrics.set('misses', cacheMisses);
        this.cacheMetrics.set('hitRate', cacheHits / (cacheHits + cacheMisses));

        // Track slow requests
        if (fetchTime > 1000) {
          this.recordMetric('SlowRequest', fetchTime, {
            url: typeof resource === 'string' ? resource : resource.url,
            method: init?.method || 'GET'
          });
        }

        return response;
      } catch (error) {
        cacheMisses++;
        this.cacheMetrics.set('misses', cacheMisses);
        throw error;
      }
    };
  }

  private recordMetric(
    name: string, 
    value: number, 
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Limit stored metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Store in localStorage for persistence
    this.saveMetrics();

    // Log significant metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PWA Performance] ${name}: ${metric.value}ms`, metadata);
    }
  }

  private saveMetrics(): void {
    try {
      const metricsToStore = this.metrics.slice(-100); // Store only last 100 metrics
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metricsToStore));
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }

  private loadStoredMetrics(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  }

  // Public API

  public getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  public getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  public getCacheMetrics(): CacheMetrics {
    return {
      hitRate: this.cacheMetrics.get('hitRate') || 0,
      missRate: 1 - (this.cacheMetrics.get('hitRate') || 0),
      totalRequests: (this.cacheMetrics.get('hits') || 0) + (this.cacheMetrics.get('misses') || 0),
      cacheSize: 0, // Will be calculated from actual cache
      lastUpdated: Date.now()
    };
  }

  public async getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        // Estimate size (this is a rough estimate)
        totalSize += requests.length * 50000; // Assume 50KB average per cached item
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  public getPerformanceReport(): {
    webVitals: Record<string, number>;
    cachePerformance: CacheMetrics;
    recommendations: string[];
  } {
    const report = {
      webVitals: {
        LCP: this.getAverageMetric('LCP'),
        FID: this.getAverageMetric('FID'),
        CLS: this.getAverageMetric('CLS'),
        TTFB: this.getAverageMetric('TTFB'),
        PageLoad: this.getAverageMetric('PageLoad')
      },
      cachePerformance: this.getCacheMetrics(),
      recommendations: [] as string[]
    };

    // Generate recommendations based on metrics
    if (report.webVitals.LCP > 2500) {
      report.recommendations.push('LCP is above 2.5s - Consider optimizing largest content element');
    }
    if (report.webVitals.FID > 100) {
      report.recommendations.push('FID is above 100ms - Reduce JavaScript execution time');
    }
    if (report.webVitals.CLS > 0.1) {
      report.recommendations.push('CLS is above 0.1 - Fix layout shifts');
    }
    if (report.cachePerformance.hitRate < 0.7) {
      report.recommendations.push('Cache hit rate is low - Review caching strategy');
    }

    return report;
  }

  public clearMetrics(): void {
    this.metrics = [];
    this.cacheMetrics.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Export singleton instance
export const pwaPerformance = new PWAPerformanceService();

// Export React hook for components
import { useState, useEffect } from 'react';

export function usePWAPerformance() {
  const [metrics, setMetrics] = useState(pwaPerformance.getPerformanceReport());
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(pwaPerformance.getPerformanceReport());
      pwaPerformance.getCacheSize().then(setCacheSize);
    }, 5000);

    // Get initial cache size
    pwaPerformance.getCacheSize().then(setCacheSize);

    return () => clearInterval(interval);
  }, []);

  return {
    ...metrics,
    cacheSize,
    clearMetrics: () => pwaPerformance.clearMetrics()
  };
}