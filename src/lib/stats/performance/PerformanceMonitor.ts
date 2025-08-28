/**
 * Comprehensive Performance Monitoring System for Stats
 * Tracks all performance metrics across the entire stats system
 */

import { LOG_PREFIXES } from '../core/constants';

// Performance metric types
export interface PerformanceMetrics {
  system: SystemMetrics;
  stats: StatsMetrics;
  cache: CacheMetrics;
  memory: MemoryMetrics;
  workers: WorkerMetrics;
  database: DatabaseMetrics;
  network: NetworkMetrics;
  ui: UIMetrics;
}

export interface SystemMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  frameRate: number;
  batteryLevel: number;
  isOnline: boolean;
}

export interface StatsMetrics {
  totalActivities: number;
  averageTrackingTime: number;
  trackingSuccessRate: number;
  batchProcessingTime: number;
  validationTime: number;
  aggregationTime: number;
  syncTime: number;
  errorRate: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: number;
  responseTime: number;
  compressionRatio: number;
  staleHitRate: number;
  tierDistribution: Record<string, number>;
}

export interface MemoryMetrics {
  totalUsed: number;
  totalAvailable: number;
  usagePercentage: number;
  gcCount: number;
  gcTime: number;
  leakDetected: boolean;
  objectCounts: Record<string, number>;
  allocationRate: number;
}

export interface WorkerMetrics {
  activeWorkers: number;
  queueLength: number;
  throughput: number;
  utilization: number;
  averageTaskTime: number;
  errorRate: number;
  fallbackRate: number;
  concurrencyLevel: number;
}

export interface DatabaseMetrics {
  queryTime: number;
  writeTime: number;
  readTime: number;
  connectionCount: number;
  cacheHitRate: number;
  indexUsage: number;
  queryComplexity: number;
  transactionTime: number;
}

export interface NetworkMetrics {
  requestCount: number;
  responseTime: number;
  errorRate: number;
  bandwidth: number;
  latency: number;
  timeouts: number;
  retries: number;
  compressionRatio: number;
}

export interface UIMetrics {
  renderTime: number;
  interactionDelay: number;
  scrollPerformance: number;
  animationFrameRate: number;
  inputLatency: number;
  layoutShifts: number;
  resourceLoadTime: number;
  bundleSize: number;
}

// Performance alert types
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  level: AlertLevel;
  category: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  suggestions: string[];
}

// Performance thresholds
export interface PerformanceThresholds {
  [key: string]: {
    warning: number;
    critical: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];
  private logger: (message: string) => void;
  
  // Monitoring state
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCallbacks: Map<AlertLevel, ((alert: PerformanceAlert) => void)[]> = new Map();
  
  // Performance history
  private history: Map<string, number[]> = new Map();
  private maxHistoryLength: number = 100;
  
  // Timing measurements
  private timers: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();
  
  // Resource observers
  private observers: {
    performance?: PerformanceObserver;
    memory?: any;
    network?: any;
  } = {};

  constructor(
    thresholds?: Partial<PerformanceThresholds>,
    logger: (message: string) => void = console.log
  ) {
    this.logger = logger;
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
    
    // Set up thresholds
    this.thresholds = {
      trackingTime: { warning: 50, critical: 100 },
      cacheHitRate: { warning: 70, critical: 50 },
      memoryUsage: { warning: 70, critical: 90 },
      errorRate: { warning: 5, critical: 10 },
      responseTime: { warning: 1000, critical: 3000 },
      frameRate: { warning: 30, critical: 15 },
      workerUtilization: { warning: 80, critical: 95 },
      ...thresholds
    };
    
    // Initialize alert callbacks
    this.alertCallbacks.set('info', []);
    this.alertCallbacks.set('warning', []);
    this.alertCallbacks.set('error', []);
    this.alertCallbacks.set('critical', []);
    
    this.setupObservers();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Performance monitor initialized`);
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.logMetrics();
    }, interval);
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Performance monitoring started (${interval}ms interval)`);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.cleanupObservers();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Performance monitoring stopped`);
  }

  /**
   * Record a performance measurement
   */
  measure(name: string, value: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    
    const values = this.measurements.get(name)!;
    values.push(value);
    
    // Keep only recent measurements
    if (values.length > this.maxHistoryLength) {
      values.shift();
    }
    
    // Check for performance issues
    this.checkThreshold(name, value);
  }

  /**
   * Start a timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a timer and record the measurement
   */
  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Timer '${name}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.measure(name, duration);
    
    return duration;
  }

  /**
   * Record stats tracking performance
   */
  recordStatsTracking(duration: number, success: boolean): void {
    this.measure('trackingTime', duration);
    
    if (!this.metrics.stats.trackingSuccessRate) {
      this.metrics.stats.trackingSuccessRate = success ? 100 : 0;
    } else {
      const alpha = 0.1;
      this.metrics.stats.trackingSuccessRate = 
        this.metrics.stats.trackingSuccessRate * (1 - alpha) + (success ? 100 : 0) * alpha;
    }
    
    this.metrics.stats.averageTrackingTime = this.getAverage('trackingTime');
  }

  /**
   * Record cache performance
   */
  recordCacheOperation(hit: boolean, responseTime: number): void {
    this.measure('cacheResponseTime', responseTime);
    
    const hitRate = this.metrics.cache.hitRate || 0;
    const alpha = 0.1;
    this.metrics.cache.hitRate = hitRate * (1 - alpha) + (hit ? 100 : 0) * alpha;
    this.metrics.cache.responseTime = this.getAverage('cacheResponseTime');
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(used: number, available: number): void {
    this.metrics.memory.totalUsed = used;
    this.metrics.memory.totalAvailable = available;
    this.metrics.memory.usagePercentage = (used / available) * 100;
    
    this.measure('memoryUsage', this.metrics.memory.usagePercentage);
    
    // Detect potential memory leaks
    const usageHistory = this.measurements.get('memoryUsage') || [];
    if (usageHistory.length >= 10) {
      const trend = this.calculateTrend(usageHistory.slice(-10));
      this.metrics.memory.leakDetected = trend > 5; // Growing by more than 5% consistently
    }
  }

  /**
   * Record worker performance
   */
  recordWorkerMetrics(active: number, queued: number, throughput: number, utilization: number): void {
    this.metrics.workers.activeWorkers = active;
    this.metrics.workers.queueLength = queued;
    this.metrics.workers.throughput = throughput;
    this.metrics.workers.utilization = utilization;
    
    this.measure('workerUtilization', utilization);
  }

  /**
   * Record database operation
   */
  recordDatabaseOperation(type: 'read' | 'write' | 'query', duration: number, success: boolean): void {
    this.measure(`db_${type}_time`, duration);
    
    switch (type) {
      case 'read':
        this.metrics.database.readTime = this.getAverage('db_read_time');
        break;
      case 'write':
        this.metrics.database.writeTime = this.getAverage('db_write_time');
        break;
      case 'query':
        this.metrics.database.queryTime = this.getAverage('db_query_time');
        break;
    }
  }

  /**
   * Record network operation
   */
  recordNetworkOperation(duration: number, success: boolean, bytes?: number): void {
    this.measure('networkResponseTime', duration);
    this.metrics.network.responseTime = this.getAverage('networkResponseTime');
    this.metrics.network.requestCount++;
    
    if (!success) {
      this.metrics.network.errorRate++;
    }
    
    if (bytes) {
      this.measure('networkBandwidth', bytes);
    }
  }

  /**
   * Record UI performance
   */
  recordUIMetrics(renderTime: number, interactionDelay: number, frameRate: number): void {
    this.metrics.ui.renderTime = renderTime;
    this.metrics.ui.interactionDelay = interactionDelay;
    this.metrics.ui.animationFrameRate = frameRate;
    
    this.measure('uiRenderTime', renderTime);
    this.measure('frameRate', frameRate);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Evaluate tracking performance
    if (this.metrics.stats.averageTrackingTime > this.thresholds.trackingTime.critical) {
      score -= 20;
      issues.push('Slow activity tracking performance');
      recommendations.push('Consider optimizing activity processing pipeline');
    }
    
    // Evaluate cache performance
    if (this.metrics.cache.hitRate < this.thresholds.cacheHitRate.critical) {
      score -= 15;
      issues.push('Low cache hit rate');
      recommendations.push('Review cache configuration and warming strategy');
    }
    
    // Evaluate memory usage
    if (this.metrics.memory.usagePercentage > this.thresholds.memoryUsage.critical) {
      score -= 25;
      issues.push('High memory usage');
      recommendations.push('Implement aggressive memory cleanup');
    }
    
    // Evaluate memory leaks
    if (this.metrics.memory.leakDetected) {
      score -= 30;
      issues.push('Potential memory leak detected');
      recommendations.push('Investigate object lifecycle and cleanup routines');
    }
    
    // Evaluate worker performance
    if (this.metrics.workers.utilization > this.thresholds.workerUtilization.critical) {
      score -= 10;
      issues.push('High worker utilization');
      recommendations.push('Consider increasing worker pool size');
    }
    
    // Evaluate UI performance
    if (this.metrics.ui.animationFrameRate < this.thresholds.frameRate.critical) {
      score -= 15;
      issues.push('Low frame rate');
      recommendations.push('Optimize rendering and reduce layout thrashing');
    }
    
    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) overall = 'excellent';
    else if (score >= 75) overall = 'good';
    else if (score >= 50) overall = 'fair';
    else overall = 'poor';
    
    return { overall, score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Get performance alerts
   */
  getAlerts(level?: AlertLevel): PerformanceAlert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return [...this.alerts];
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(level: AlertLevel, callback: (alert: PerformanceAlert) => void): () => void {
    const callbacks = this.alertCallbacks.get(level) || [];
    callbacks.push(callback);
    this.alertCallbacks.set(level, callbacks);
    
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear old alerts
   */
  clearAlerts(olderThan?: number): void {
    const cutoff = olderThan || Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Export performance data
   */
  exportData(): {
    metrics: PerformanceMetrics;
    measurements: Record<string, number[]>;
    alerts: PerformanceAlert[];
    summary: any;
  } {
    return {
      metrics: this.getMetrics(),
      measurements: Object.fromEntries(this.measurements),
      alerts: this.getAlerts(),
      summary: this.getPerformanceSummary()
    };
  }

  // Private methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      system: {
        uptime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        frameRate: 60,
        batteryLevel: 100,
        isOnline: navigator.onLine
      },
      stats: {
        totalActivities: 0,
        averageTrackingTime: 0,
        trackingSuccessRate: 100,
        batchProcessingTime: 0,
        validationTime: 0,
        aggregationTime: 0,
        syncTime: 0,
        errorRate: 0
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        memoryUsage: 0,
        responseTime: 0,
        compressionRatio: 0,
        staleHitRate: 0,
        tierDistribution: {}
      },
      memory: {
        totalUsed: 0,
        totalAvailable: 0,
        usagePercentage: 0,
        gcCount: 0,
        gcTime: 0,
        leakDetected: false,
        objectCounts: {},
        allocationRate: 0
      },
      workers: {
        activeWorkers: 0,
        queueLength: 0,
        throughput: 0,
        utilization: 0,
        averageTaskTime: 0,
        errorRate: 0,
        fallbackRate: 0,
        concurrencyLevel: 0
      },
      database: {
        queryTime: 0,
        writeTime: 0,
        readTime: 0,
        connectionCount: 0,
        cacheHitRate: 0,
        indexUsage: 0,
        queryComplexity: 0,
        transactionTime: 0
      },
      network: {
        requestCount: 0,
        responseTime: 0,
        errorRate: 0,
        bandwidth: 0,
        latency: 0,
        timeouts: 0,
        retries: 0,
        compressionRatio: 0
      },
      ui: {
        renderTime: 0,
        interactionDelay: 0,
        scrollPerformance: 0,
        animationFrameRate: 60,
        inputLatency: 0,
        layoutShifts: 0,
        resourceLoadTime: 0,
        bundleSize: 0
      }
    };
  }

  private setupObservers(): void {
    try {
      // Performance observer for navigation and resource timing
      if (typeof PerformanceObserver !== 'undefined') {
        this.observers.performance = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordNavigationTiming(entry as PerformanceNavigationTiming);
            } else if (entry.entryType === 'resource') {
              this.recordResourceTiming(entry as PerformanceResourceTiming);
            } else if (entry.entryType === 'paint') {
              this.recordPaintTiming(entry as PerformancePaintTiming);
            }
          }
        });
        
        this.observers.performance.observe({ 
          entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] 
        });
      }
      
      // Memory observer (if available)
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          this.recordMemoryUsage(memory.usedJSHeapSize, memory.totalJSHeapSize);
        }, 5000);
      }
      
    } catch (error) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Failed to setup observers: ${error}`);
    }
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming): void {
    this.measure('navigationTime', entry.loadEventEnd - entry.navigationStart);
    this.measure('dnsTime', entry.domainLookupEnd - entry.domainLookupStart);
    this.measure('tcpTime', entry.connectEnd - entry.connectStart);
  }

  private recordResourceTiming(entry: PerformanceResourceTiming): void {
    this.measure('resourceLoadTime', entry.responseEnd - entry.startTime);
    this.metrics.ui.resourceLoadTime = this.getAverage('resourceLoadTime');
  }

  private recordPaintTiming(entry: PerformancePaintTiming): void {
    if (entry.name === 'first-paint') {
      this.measure('firstPaint', entry.startTime);
    } else if (entry.name === 'first-contentful-paint') {
      this.measure('firstContentfulPaint', entry.startTime);
    }
  }

  private collectMetrics(): void {
    // Update system metrics
    this.metrics.system.uptime = performance.now();
    this.metrics.system.isOnline = navigator.onLine;
    
    // Update frame rate
    this.measureFrameRate();
  }

  private measureFrameRate(): void {
    let frameCount = 0;
    const startTime = performance.now();
    
    const countFrames = () => {
      frameCount++;
      if (performance.now() - startTime < 1000) {
        requestAnimationFrame(countFrames);
      } else {
        this.metrics.ui.animationFrameRate = frameCount;
        this.measure('frameRate', frameCount);
      }
    };
    
    requestAnimationFrame(countFrames);
  }

  private analyzePerformance(): void {
    // Check all thresholds
    for (const [metric, values] of this.measurements) {
      const average = this.getAverage(metric);
      this.checkThreshold(metric, average);
    }
    
    // Detect anomalies
    this.detectAnomalies();
  }

  private checkThreshold(metric: string, value: number): void {
    const threshold = this.thresholds[metric];
    if (!threshold) return;
    
    let level: AlertLevel | null = null;
    
    if (value >= threshold.critical) {
      level = 'critical';
    } else if (value >= threshold.warning) {
      level = 'warning';
    }
    
    if (level) {
      this.createAlert(level, 'performance', metric, value, threshold[level]);
    }
  }

  private detectAnomalies(): void {
    // Detect sudden spikes or drops
    for (const [metric, values] of this.measurements) {
      if (values.length < 5) continue;
      
      const recent = values.slice(-5);
      const average = recent.reduce((sum, v) => sum + v, 0) / recent.length;
      const variance = recent.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / recent.length;
      const stdDev = Math.sqrt(variance);
      
      const latest = values[values.length - 1];
      
      if (Math.abs(latest - average) > stdDev * 3) {
        this.createAlert('warning', 'anomaly', metric, latest, average, 
          `Anomalous value detected: ${latest.toFixed(2)} (expected ~${average.toFixed(2)})`);
      }
    }
  }

  private createAlert(
    level: AlertLevel, 
    category: string, 
    metric: string, 
    value: number, 
    threshold: number,
    customMessage?: string
  ): void {
    const alert: PerformanceAlert = {
      id: `${metric}_${Date.now()}`,
      timestamp: Date.now(),
      level,
      category,
      metric,
      value,
      threshold,
      message: customMessage || `${metric} is ${level}: ${value.toFixed(2)} (threshold: ${threshold})`,
      suggestions: this.getSuggestions(metric, value, threshold)
    };
    
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    // Notify callbacks
    const callbacks = this.alertCallbacks.get(level) || [];
    callbacks.forEach(callback => callback(alert));
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Performance alert [${level.toUpperCase()}]: ${alert.message}`);
  }

  private getSuggestions(metric: string, value: number, threshold: number): string[] {
    const suggestions: string[] = [];
    
    switch (metric) {
      case 'trackingTime':
        suggestions.push('Consider using batch processing for activities');
        suggestions.push('Optimize validation and processing logic');
        break;
      case 'cacheHitRate':
        suggestions.push('Review cache configuration and TTL settings');
        suggestions.push('Implement cache warming for frequently accessed data');
        break;
      case 'memoryUsage':
        suggestions.push('Implement more aggressive cleanup routines');
        suggestions.push('Review object lifecycle management');
        break;
      case 'workerUtilization':
        suggestions.push('Increase worker pool size');
        suggestions.push('Optimize task distribution');
        break;
      case 'frameRate':
        suggestions.push('Reduce layout thrashing and reflows');
        suggestions.push('Optimize animation and rendering code');
        break;
    }
    
    return suggestions;
  }

  private getAverage(metric: string): number {
    const values = this.measurements.get(metric) || [];
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }

  private logMetrics(): void {
    const summary = this.getPerformanceSummary();
    
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Performance Summary - ` +
      `Score: ${summary.score}/100 (${summary.overall}), ` +
      `Issues: ${summary.issues.length}, ` +
      `Tracking: ${this.metrics.stats.averageTrackingTime.toFixed(1)}ms, ` +
      `Cache: ${this.metrics.cache.hitRate.toFixed(1)}%, ` +
      `Memory: ${this.metrics.memory.usagePercentage.toFixed(1)}%`
    );
  }

  private cleanupObservers(): void {
    if (this.observers.performance) {
      this.observers.performance.disconnect();
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();