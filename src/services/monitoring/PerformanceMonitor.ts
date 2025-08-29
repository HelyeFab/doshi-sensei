/**
 * Performance Monitor
 * Tracks system performance metrics and provides optimization recommendations
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';
import { cacheManager } from '../cache/CacheManager';
import { databaseOptimizer } from '../database/DatabaseOptimizer';

export interface PerformanceMetrics {
  timestamp: number;
  cpu?: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    requests: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  database: {
    queryTime: number;
    connections: number;
    slowQueries: number;
  };
  events: {
    processed: number;
    queued: number;
    failed: number;
  };
}

export interface PerformanceThresholds {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  cacheHitRate: number;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'cache' | 'database' | 'network' | 'memory' | 'events';
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  recommendation: string;
  impact: string;
  autoFix?: () => Promise<void>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  
  private thresholds: PerformanceThresholds = {
    cpuUsage: 80,
    memoryUsage: 85,
    responseTime: 200,
    errorRate: 5,
    cacheHitRate: 80
  };
  
  private recommendations: OptimizationRecommendation[] = [];
  private eventBus = getEventBus();
  private performanceObserver?: PerformanceObserver;
  
  // Performance tracking
  private requestMetrics = new Map<string, number>();
  private errorCount = 0;
  private totalRequests = 0;

  private constructor() {
    this.initialize();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initialize(): void {
    // Setup Performance Observer API
    if (typeof PerformanceObserver !== 'undefined') {
      this.setupPerformanceObserver();
    }
    
    // Setup Resource Timing API
    if ('performance' in window) {
      this.setupResourceTiming();
    }
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('[PerformanceMonitor] Initialized');
  }

  /**
   * Setup Performance Observer for detailed metrics
   */
  private setupPerformanceObserver(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });
      
      // Observe different entry types
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'first-input', 'largest-contentful-paint'] 
      });
      
    } catch (error) {
      console.warn('[PerformanceMonitor] Performance Observer not supported:', error);
    }
  }

  /**
   * Setup Resource Timing monitoring
   */
  private setupResourceTiming(): void {
    // Monitor resource loading performance
    const checkResources = () => {
      const resources = performance.getEntriesByType('resource');
      
      resources.forEach(resource => {
        const timing = resource as PerformanceResourceTiming;
        
        // Track slow resources
        if (timing.duration > 1000) {
          console.warn('[PerformanceMonitor] Slow resource:', {
            name: timing.name,
            duration: `${timing.duration.toFixed(2)}ms`,
            type: timing.initiatorType
          });
        }
      });
    };
    
    // Check periodically
    setInterval(checkResources, 30000);
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'measure') {
      // Custom performance measurements
      this.requestMetrics.set(entry.name, entry.duration);
      
      if (entry.duration > this.thresholds.responseTime) {
        this.generateRecommendation({
          id: `slow-operation-${entry.name}`,
          category: 'network',
          severity: 'medium',
          issue: `Slow operation: ${entry.name} took ${entry.duration.toFixed(2)}ms`,
          recommendation: 'Consider optimizing this operation or adding caching',
          impact: 'User experience degradation'
        });
      }
    }
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Collect metrics every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);
    
    // Analyze metrics every 30 seconds
    setInterval(() => {
      this.analyzeMetrics();
    }, 30000);
    
    // Generate report every 5 minutes
    setInterval(() => {
      this.generatePerformanceReport();
    }, 300000);
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: this.getMemoryMetrics(),
      network: await this.getNetworkMetrics(),
      cache: this.getCacheMetrics(),
      database: this.getDatabaseMetrics(),
      events: this.getEventMetrics()
    };
    
    // Add CPU metrics if available
    if ('hardwareConcurrency' in navigator) {
      metrics.cpu = {
        usage: await this.estimateCPUUsage(),
        cores: navigator.hardwareConcurrency
      };
    }
    
    // Store metrics
    this.metrics.push(metrics);
    
    // Limit history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
    
    // Check thresholds
    this.checkThresholds(metrics);
  }

  /**
   * Get memory metrics
   */
  private getMemoryMetrics(): PerformanceMetrics['memory'] {
    // Use Performance Memory API if available
    const memory = (performance as any).memory;
    
    if (memory) {
      return {
        used: memory.usedJSHeapSize,
        total: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    
    // Fallback estimation
    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }

  /**
   * Get network metrics
   */
  private async getNetworkMetrics(): Promise<PerformanceMetrics['network']> {
    // Measure API latency
    const startTime = performance.now();
    
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      const latency = performance.now() - startTime;
      
      return {
        latency,
        bandwidth: this.estimateBandwidth(),
        requests: this.totalRequests
      };
    } catch {
      return {
        latency: -1,
        bandwidth: 0,
        requests: this.totalRequests
      };
    }
  }

  /**
   * Get cache metrics
   */
  private getCacheMetrics(): PerformanceMetrics['cache'] {
    const cacheInfo = cacheManager.getInfo();
    const stats = cacheInfo.stats.get('memory') || {
      hitRate: 0,
      evictions: 0
    };
    
    return {
      hitRate: (stats as any).hitRate * 100,
      size: cacheInfo.memory.size,
      evictions: (stats as any).evictions
    };
  }

  /**
   * Get database metrics
   */
  private getDatabaseMetrics(): PerformanceMetrics['database'] {
    const dbStats = databaseOptimizer.getStats();
    
    return {
      queryTime: dbStats.queries.averageExecutionTime,
      connections: dbStats.pool.active,
      slowQueries: dbStats.queries.slowQueries
    };
  }

  /**
   * Get event processing metrics
   */
  private getEventMetrics(): PerformanceMetrics['events'] {
    // Would get from EventBus
    return {
      processed: 0,
      queued: 0,
      failed: 0
    };
  }

  /**
   * Estimate CPU usage
   */
  private async estimateCPUUsage(): Promise<number> {
    // Simple estimation based on main thread blocking
    return new Promise((resolve) => {
      const startTime = performance.now();
      const iterations = 1000000;
      
      // Perform CPU-intensive task
      let result = 0;
      for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i);
      }
      
      const duration = performance.now() - startTime;
      
      // Estimate usage based on time taken
      const expectedTime = 10; // Expected time for the task
      const usage = Math.min(100, (duration / expectedTime) * 100);
      
      resolve(usage);
    });
  }

  /**
   * Estimate bandwidth
   */
  private estimateBandwidth(): number {
    // Use Network Information API if available
    const connection = (navigator as any).connection;
    
    if (connection && connection.downlink) {
      return connection.downlink * 1000; // Convert to kbps
    }
    
    // Default estimate
    return 10000; // 10 Mbps
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    // Check memory usage
    if (metrics.memory.percentage > this.thresholds.memoryUsage) {
      this.generateRecommendation({
        id: 'high-memory-usage',
        category: 'memory',
        severity: 'high',
        issue: `Memory usage at ${metrics.memory.percentage.toFixed(1)}%`,
        recommendation: 'Clear caches and reduce memory consumption',
        impact: 'Application may become unresponsive',
        autoFix: async () => {
          await cacheManager.clear();
          if (global.gc) global.gc(); // Force garbage collection if available
        }
      });
    }
    
    // Check cache hit rate
    if (metrics.cache.hitRate < this.thresholds.cacheHitRate) {
      this.generateRecommendation({
        id: 'low-cache-hit-rate',
        category: 'cache',
        severity: 'medium',
        issue: `Cache hit rate only ${metrics.cache.hitRate.toFixed(1)}%`,
        recommendation: 'Warm up cache with frequently accessed data',
        impact: 'Increased database load and response times'
      });
    }
    
    // Check database performance
    if (metrics.database.slowQueries > 5) {
      this.generateRecommendation({
        id: 'database-slow-queries',
        category: 'database',
        severity: 'high',
        issue: `${metrics.database.slowQueries} slow queries detected`,
        recommendation: 'Optimize queries and add appropriate indexes',
        impact: 'Poor application performance'
      });
    }
    
    // Check network latency
    if (metrics.network.latency > this.thresholds.responseTime) {
      this.generateRecommendation({
        id: 'high-network-latency',
        category: 'network',
        severity: 'medium',
        issue: `Network latency at ${metrics.network.latency.toFixed(0)}ms`,
        recommendation: 'Check network connection or use CDN',
        impact: 'Slow data synchronization'
      });
    }
  }

  /**
   * Analyze collected metrics
   */
  private analyzeMetrics(): void {
    if (this.metrics.length < 2) return;
    
    // Calculate trends
    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);
    
    if (older.length === 0) return;
    
    const recentAvgMemory = recent.reduce((sum, m) => sum + m.memory.percentage, 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + m.memory.percentage, 0) / older.length;
    
    // Detect memory leak
    if (recentAvgMemory > olderAvgMemory + 10) {
      this.generateRecommendation({
        id: 'potential-memory-leak',
        category: 'memory',
        severity: 'critical',
        issue: 'Potential memory leak detected',
        recommendation: 'Review recent changes and check for unreleased resources',
        impact: 'Application crash or freeze'
      });
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    const report = {
      timestamp: Date.now(),
      period: {
        start: this.metrics[0].timestamp,
        end: this.metrics[this.metrics.length - 1].timestamp
      },
      summary: this.calculateSummary(),
      recommendations: this.recommendations,
      trends: this.calculateTrends()
    };
    
    // Emit performance report event
    await this.eventBus.emit({
      type: ReviewEventType.PERFORMANCE_REPORT,
      source: ReviewSource.REVIEW_HUB,
      userId: 'system',
      data: {
        itemId: 'performance-report',
        itemType: 'monitoring',
        metadata: report
      },
      priority: EventPriority.LOW
    });
    
    // Clear processed recommendations
    this.recommendations = this.recommendations.filter(r => r.severity === 'critical');
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): any {
    const avgMemory = this.metrics.reduce((sum, m) => sum + m.memory.percentage, 0) / this.metrics.length;
    const avgLatency = this.metrics.reduce((sum, m) => sum + m.network.latency, 0) / this.metrics.length;
    const avgCacheHit = this.metrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / this.metrics.length;
    
    return {
      averageMemoryUsage: avgMemory,
      averageLatency: avgLatency,
      averageCacheHitRate: avgCacheHit,
      totalRequests: this.totalRequests,
      errorRate: (this.errorCount / this.totalRequests) * 100
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): any {
    if (this.metrics.length < 10) return null;
    
    const recent = this.metrics.slice(-5);
    const older = this.metrics.slice(-10, -5);
    
    return {
      memory: this.getTrend(
        older.map(m => m.memory.percentage),
        recent.map(m => m.memory.percentage)
      ),
      latency: this.getTrend(
        older.map(m => m.network.latency),
        recent.map(m => m.network.latency)
      ),
      cacheHitRate: this.getTrend(
        older.map(m => m.cache.hitRate),
        recent.map(m => m.cache.hitRate)
      )
    };
  }

  /**
   * Calculate trend direction
   */
  private getTrend(older: number[], recent: number[]): 'improving' | 'stable' | 'degrading' {
    const oldAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    const change = ((recentAvg - oldAvg) / oldAvg) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change < 0 ? 'improving' : 'degrading';
  }

  /**
   * Generate optimization recommendation
   */
  private generateRecommendation(recommendation: OptimizationRecommendation): void {
    // Avoid duplicates
    const existing = this.recommendations.find(r => r.id === recommendation.id);
    if (existing) return;
    
    this.recommendations.push(recommendation);
    
    // Auto-fix critical issues
    if (recommendation.severity === 'critical' && recommendation.autoFix) {
      recommendation.autoFix().catch(error => {
        console.error('[PerformanceMonitor] Auto-fix failed:', error);
      });
    }
    
    console.warn('[PerformanceMonitor] Recommendation:', recommendation);
  }

  /**
   * Public API
   */
  
  /**
   * Mark operation start
   */
  markStart(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * Mark operation end and measure
   */
  markEnd(name: string): void {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    // Track request
    this.totalRequests++;
  }

  /**
   * Record error
   */
  recordError(error: Error): void {
    this.errorCount++;
    console.error('[PerformanceMonitor] Error recorded:', error);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get recommendations
   */
  getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Apply auto-fixes
   */
  async applyAutoFixes(): Promise<void> {
    const fixable = this.recommendations.filter(r => r.autoFix);
    
    for (const recommendation of fixable) {
      try {
        await recommendation.autoFix!();
        console.log(`[PerformanceMonitor] Applied fix for: ${recommendation.id}`);
        
        // Remove from recommendations
        const index = this.recommendations.indexOf(recommendation);
        if (index > -1) {
          this.recommendations.splice(index, 1);
        }
      } catch (error) {
        console.error(`[PerformanceMonitor] Failed to apply fix for ${recommendation.id}:`, error);
      }
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.isMonitoring = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export for type usage
export type { PerformanceMonitor };