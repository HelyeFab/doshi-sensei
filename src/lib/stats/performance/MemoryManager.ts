/**
 * Enterprise-grade memory manager for stats system
 * Provides memory pressure detection, automatic cleanup, and performance optimization
 */

import { LOG_PREFIXES } from '../core/constants';

// Memory thresholds and limits
export interface MemoryConfig {
  maxMemoryUsage: number; // bytes
  warningThreshold: number; // percentage of max
  criticalThreshold: number; // percentage of max
  cleanupInterval: number; // milliseconds
  pressureCheckInterval: number; // milliseconds
  gcThreshold: number; // percentage to trigger GC suggestion
  maxObjectAge: number; // milliseconds
  maxWeakRefSize: number; // number of weak references
}

// Memory statistics
export interface MemoryStats {
  totalUsed: number;
  totalAvailable: number;
  usagePercentage: number;
  pressureLevel: MemoryPressureLevel;
  objectCounts: {
    total: number;
    cached: number;
    temporary: number;
    persistent: number;
  };
  gcSuggested: boolean;
  lastCleanup: number;
  cleanupCount: number;
}

// Memory pressure levels
export enum MemoryPressureLevel {
  NORMAL = 0,
  MODERATE = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Tracked object metadata
interface TrackedObject {
  id: string;
  size: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  type: ObjectType;
  priority: number;
  isTemp: boolean;
  cleanupCallback?: () => void;
}

// Object types for memory management
export enum ObjectType {
  CACHE_ENTRY = 'cache_entry',
  USER_STATS = 'user_stats',
  DAILY_ACTIVITY = 'daily_activity',
  BATCH_DATA = 'batch_data',
  TEMPORARY = 'temporary',
  PERSISTENT = 'persistent'
}

// Memory management strategies
interface CleanupStrategy {
  name: string;
  priority: number;
  condition: (stats: MemoryStats) => boolean;
  execute: (manager: MemoryManager) => Promise<number>; // Returns bytes freed
}

// Memory event types
export type MemoryEventType = 
  | 'pressure_detected'
  | 'cleanup_started'
  | 'cleanup_completed'
  | 'gc_suggested'
  | 'threshold_exceeded'
  | 'memory_freed';

// Memory event callback
export type MemoryEventCallback = (event: {
  type: MemoryEventType;
  data: any;
  timestamp: number;
}) => void;

export class MemoryManager {
  private config: MemoryConfig;
  private logger: (message: string) => void;
  
  // Object tracking
  private trackedObjects: Map<string, TrackedObject> = new Map();
  private weakReferences: Map<string, WeakRef<any>> = new Map();
  private finalizationRegistry: FinalizationRegistry<string> | null = null;
  
  // Memory monitoring
  private currentMemoryUsage: number = 0;
  private peakMemoryUsage: number = 0;
  private currentPressureLevel: MemoryPressureLevel = MemoryPressureLevel.NORMAL;
  
  // Event handling
  private eventCallbacks: Map<MemoryEventType, MemoryEventCallback[]> = new Map();
  
  // Timers
  private cleanupTimer: NodeJS.Timeout | null = null;
  private pressureTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  
  // Statistics
  private stats: MemoryStats = {
    totalUsed: 0,
    totalAvailable: 0,
    usagePercentage: 0,
    pressureLevel: MemoryPressureLevel.NORMAL,
    objectCounts: {
      total: 0,
      cached: 0,
      temporary: 0,
      persistent: 0
    },
    gcSuggested: false,
    lastCleanup: 0,
    cleanupCount: 0
  };
  
  // Cleanup strategies
  private cleanupStrategies: CleanupStrategy[] = [
    {
      name: 'temporary_objects',
      priority: 1,
      condition: (stats) => stats.usagePercentage > 60,
      execute: this.cleanupTemporaryObjects.bind(this)
    },
    {
      name: 'old_cache_entries',
      priority: 2,
      condition: (stats) => stats.usagePercentage > 70,
      execute: this.cleanupOldCacheEntries.bind(this)
    },
    {
      name: 'unused_objects',
      priority: 3,
      condition: (stats) => stats.usagePercentage > 80,
      execute: this.cleanupUnusedObjects.bind(this)
    },
    {
      name: 'aggressive_cleanup',
      priority: 4,
      condition: (stats) => stats.usagePercentage > 90,
      execute: this.aggressiveCleanup.bind(this)
    }
  ];

  constructor(
    config: Partial<MemoryConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.logger = logger;
    
    this.config = {
      maxMemoryUsage: config.maxMemoryUsage || 100 * 1024 * 1024, // 100MB
      warningThreshold: config.warningThreshold || 70, // 70%
      criticalThreshold: config.criticalThreshold || 90, // 90%
      cleanupInterval: config.cleanupInterval || 30000, // 30 seconds
      pressureCheckInterval: config.pressureCheckInterval || 5000, // 5 seconds
      gcThreshold: config.gcThreshold || 85, // 85%
      maxObjectAge: config.maxObjectAge || 600000, // 10 minutes
      maxWeakRefSize: config.maxWeakRefSize || 1000,
      ...config
    };
    
    this.initializeFinalizationRegistry();
    this.startMonitoring();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} MemoryManager initialized with ${this.formatBytes(this.config.maxMemoryUsage)} limit`);
  }

  /**
   * Register an object for memory tracking
   */
  register(
    id: string,
    object: any,
    type: ObjectType,
    options: {
      size?: number;
      priority?: number;
      isTemp?: boolean;
      cleanupCallback?: () => void;
    } = {}
  ): void {
    const size = options.size || this.estimateSize(object);
    
    const tracked: TrackedObject = {
      id,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      type,
      priority: options.priority || 1,
      isTemp: options.isTemp || false,
      cleanupCallback: options.cleanupCallback
    };
    
    this.trackedObjects.set(id, tracked);
    this.currentMemoryUsage += size;
    this.peakMemoryUsage = Math.max(this.peakMemoryUsage, this.currentMemoryUsage);
    
    // Create weak reference if object supports it
    if (object && typeof object === 'object') {
      if (this.weakReferences.size < this.config.maxWeakRefSize) {
        this.weakReferences.set(id, new WeakRef(object));
      }
      
      // Register for finalization
      if (this.finalizationRegistry) {
        this.finalizationRegistry.register(object, id);
      }
    }
    
    this.updateStats();
    this.checkMemoryPressure();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Registered object ${id} (${this.formatBytes(size)}, type: ${type})`);
  }

  /**
   * Update object access information
   */
  access(id: string): void {
    const tracked = this.trackedObjects.get(id);
    if (tracked) {
      tracked.lastAccessed = Date.now();
      tracked.accessCount++;
    }
  }

  /**
   * Unregister an object from memory tracking
   */
  unregister(id: string): boolean {
    const tracked = this.trackedObjects.get(id);
    if (!tracked) return false;
    
    this.currentMemoryUsage -= tracked.size;
    this.trackedObjects.delete(id);
    this.weakReferences.delete(id);
    
    // Execute cleanup callback if provided
    if (tracked.cleanupCallback) {
      try {
        tracked.cleanupCallback();
      } catch (error) {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleanup callback failed for ${id}: ${error}`);
      }
    }
    
    this.updateStats();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Unregistered object ${id} (freed ${this.formatBytes(tracked.size)})`);
    
    this.emit('memory_freed', { objectId: id, size: tracked.size });
    
    return true;
  }

  /**
   * Force immediate memory cleanup
   */
  async cleanup(aggressive: boolean = false): Promise<number> {
    const startTime = Date.now();
    let totalFreed = 0;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Starting ${aggressive ? 'aggressive' : 'normal'} memory cleanup`);
    
    this.emit('cleanup_started', { aggressive });
    
    // Execute cleanup strategies based on current pressure
    const applicableStrategies = this.cleanupStrategies.filter(strategy => 
      aggressive || strategy.condition(this.stats)
    );
    
    for (const strategy of applicableStrategies.sort((a, b) => a.priority - b.priority)) {
      try {
        const freed = await strategy.execute(this);
        totalFreed += freed;
        
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Strategy '${strategy.name}' freed ${this.formatBytes(freed)}`);
        
        // Break if we've reduced pressure enough (unless aggressive)
        if (!aggressive && this.stats.usagePercentage < this.config.warningThreshold) {
          break;
        }
      } catch (error) {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleanup strategy '${strategy.name}' failed: ${error}`);
      }
    }
    
    // Cleanup weak references for collected objects
    this.cleanupWeakReferences();
    
    // Update statistics
    this.updateStats();
    this.stats.lastCleanup = Date.now();
    this.stats.cleanupCount++;
    
    const duration = Date.now() - startTime;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleanup completed in ${duration}ms, freed ${this.formatBytes(totalFreed)}`);
    
    this.emit('cleanup_completed', { 
      duration, 
      totalFreed, 
      finalUsage: this.stats.usagePercentage 
    });
    
    return totalFreed;
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed object breakdown
   */
  getObjectBreakdown(): {
    type: string;
    count: number;
    totalSize: number;
    averageSize: number;
    oldestObject: number;
  }[] {
    const breakdown = new Map<ObjectType, {
      count: number;
      totalSize: number;
      oldest: number;
    }>();
    
    for (const obj of this.trackedObjects.values()) {
      const existing = breakdown.get(obj.type) || { count: 0, totalSize: 0, oldest: Date.now() };
      existing.count++;
      existing.totalSize += obj.size;
      existing.oldest = Math.min(existing.oldest, obj.createdAt);
      breakdown.set(obj.type, existing);
    }
    
    return Array.from(breakdown.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      totalSize: data.totalSize,
      averageSize: data.count > 0 ? data.totalSize / data.count : 0,
      oldestObject: Date.now() - data.oldest
    }));
  }

  /**
   * Force garbage collection suggestion
   */
  suggestGC(): void {
    if (typeof global !== 'undefined' && global.gc) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Executing manual garbage collection`);
      global.gc();
      this.emit('gc_suggested', { manual: true });
    } else {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} GC suggestion - manual GC not available`);
      this.emit('gc_suggested', { manual: false });
    }
    
    this.stats.gcSuggested = true;
  }

  /**
   * Subscribe to memory events
   */
  on(event: MemoryEventType, callback: MemoryEventCallback): () => void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    
    this.eventCallbacks.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get memory pressure recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getStats();
    
    if (stats.usagePercentage > this.config.warningThreshold) {
      recommendations.push('Consider reducing cache size or clearing unused objects');
    }
    
    if (stats.objectCounts.temporary > 100) {
      recommendations.push('High number of temporary objects detected - review object lifecycle');
    }
    
    if (stats.usagePercentage > this.config.gcThreshold) {
      recommendations.push('Consider manual garbage collection');
    }
    
    const oldObjects = Array.from(this.trackedObjects.values())
      .filter(obj => Date.now() - obj.createdAt > this.config.maxObjectAge);
    
    if (oldObjects.length > 10) {
      recommendations.push(`${oldObjects.length} objects older than ${this.config.maxObjectAge / 1000}s should be cleaned up`);
    }
    
    return recommendations;
  }

  /**
   * Cleanup and destroy memory manager
   */
  async destroy(): Promise<void> {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Shutting down memory manager`);
    
    // Clear timers
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.pressureTimer) clearInterval(this.pressureTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    
    // Final aggressive cleanup
    await this.cleanup(true);
    
    // Clear all tracking
    this.trackedObjects.clear();
    this.weakReferences.clear();
    this.eventCallbacks.clear();
    
    // Clear finalization registry
    if (this.finalizationRegistry) {
      // Note: Can't clear FinalizationRegistry, but it will be GC'd
      this.finalizationRegistry = null;
    }
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Memory manager destroyed`);
  }

  // Private methods

  private initializeFinalizationRegistry(): void {
    if (typeof FinalizationRegistry !== 'undefined') {
      this.finalizationRegistry = new FinalizationRegistry((id: string) => {
        // Object was garbage collected
        this.unregister(id);
      });
    }
  }

  private startMonitoring(): void {
    // Periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
    
    // Memory pressure checking
    this.pressureTimer = setInterval(() => {
      this.checkMemoryPressure();
    }, this.config.pressureCheckInterval);
    
    // Metrics update
    this.metricsTimer = setInterval(() => {
      this.updateMetricsSnapshot();
    }, 10000); // Every 10 seconds
  }

  private updateStats(): void {
    const objectCounts = {
      total: this.trackedObjects.size,
      cached: 0,
      temporary: 0,
      persistent: 0
    };
    
    for (const obj of this.trackedObjects.values()) {
      switch (obj.type) {
        case ObjectType.CACHE_ENTRY:
          objectCounts.cached++;
          break;
        case ObjectType.TEMPORARY:
          objectCounts.temporary++;
          break;
        case ObjectType.PERSISTENT:
        case ObjectType.USER_STATS:
        case ObjectType.DAILY_ACTIVITY:
          objectCounts.persistent++;
          break;
      }
    }
    
    this.stats = {
      totalUsed: this.currentMemoryUsage,
      totalAvailable: this.config.maxMemoryUsage,
      usagePercentage: (this.currentMemoryUsage / this.config.maxMemoryUsage) * 100,
      pressureLevel: this.currentPressureLevel,
      objectCounts,
      gcSuggested: this.stats.gcSuggested,
      lastCleanup: this.stats.lastCleanup,
      cleanupCount: this.stats.cleanupCount
    };
  }

  private checkMemoryPressure(): void {
    const previousLevel = this.currentPressureLevel;
    const usagePercentage = this.stats.usagePercentage;
    
    if (usagePercentage >= this.config.criticalThreshold) {
      this.currentPressureLevel = MemoryPressureLevel.CRITICAL;
    } else if (usagePercentage >= this.config.warningThreshold) {
      this.currentPressureLevel = MemoryPressureLevel.HIGH;
    } else if (usagePercentage >= 50) {
      this.currentPressureLevel = MemoryPressureLevel.MODERATE;
    } else {
      this.currentPressureLevel = MemoryPressureLevel.NORMAL;
    }
    
    // Trigger events on pressure level changes
    if (this.currentPressureLevel > previousLevel) {
      this.emit('pressure_detected', {
        level: this.currentPressureLevel,
        usage: usagePercentage,
        threshold: this.config.warningThreshold
      });
      
      // Suggest GC if usage is very high
      if (usagePercentage >= this.config.gcThreshold && !this.stats.gcSuggested) {
        this.suggestGC();
      }
      
      // Auto cleanup on critical pressure
      if (this.currentPressureLevel === MemoryPressureLevel.CRITICAL) {
        this.cleanup(true);
      }
    }
    
    // Emit threshold exceeded events
    if (usagePercentage > this.config.criticalThreshold) {
      this.emit('threshold_exceeded', { 
        type: 'critical', 
        usage: usagePercentage,
        threshold: this.config.criticalThreshold
      });
    } else if (usagePercentage > this.config.warningThreshold) {
      this.emit('threshold_exceeded', { 
        type: 'warning', 
        usage: usagePercentage,
        threshold: this.config.warningThreshold
      });
    }
  }

  private async cleanupTemporaryObjects(): Promise<number> {
    let freedBytes = 0;
    const tempObjects = Array.from(this.trackedObjects.entries())
      .filter(([, obj]) => obj.isTemp || obj.type === ObjectType.TEMPORARY);
    
    for (const [id, obj] of tempObjects) {
      if (this.unregister(id)) {
        freedBytes += obj.size;
      }
    }
    
    return freedBytes;
  }

  private async cleanupOldCacheEntries(): Promise<number> {
    let freedBytes = 0;
    const now = Date.now();
    const maxAge = this.config.maxObjectAge;
    
    const oldObjects = Array.from(this.trackedObjects.entries())
      .filter(([, obj]) => 
        obj.type === ObjectType.CACHE_ENTRY && 
        (now - obj.lastAccessed) > maxAge
      );
    
    for (const [id, obj] of oldObjects) {
      if (this.unregister(id)) {
        freedBytes += obj.size;
      }
    }
    
    return freedBytes;
  }

  private async cleanupUnusedObjects(): Promise<number> {
    let freedBytes = 0;
    const now = Date.now();
    
    // Find objects that haven't been accessed recently and have low access count
    const unusedObjects = Array.from(this.trackedObjects.entries())
      .filter(([, obj]) => 
        obj.accessCount < 3 && 
        (now - obj.lastAccessed) > 300000 && // 5 minutes
        obj.priority <= 2
      );
    
    for (const [id, obj] of unusedObjects) {
      if (this.unregister(id)) {
        freedBytes += obj.size;
      }
    }
    
    return freedBytes;
  }

  private async aggressiveCleanup(): Promise<number> {
    let freedBytes = 0;
    
    // Sort objects by priority and age for aggressive cleanup
    const candidates = Array.from(this.trackedObjects.entries())
      .filter(([, obj]) => obj.priority <= 3 && !obj.isTemp) // Keep temp objects for other cleanup
      .sort((a, b) => {
        // Sort by priority (lower first) and age (older first)
        const priorityDiff = a[1].priority - b[1].priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a[1].createdAt - b[1].createdAt;
      });
    
    // Remove up to 50% of candidates
    const toRemove = candidates.slice(0, Math.ceil(candidates.length * 0.5));
    
    for (const [id, obj] of toRemove) {
      if (this.unregister(id)) {
        freedBytes += obj.size;
      }
    }
    
    return freedBytes;
  }

  private cleanupWeakReferences(): void {
    let cleaned = 0;
    
    for (const [id, weakRef] of this.weakReferences) {
      if (weakRef.deref() === undefined) {
        // Object was garbage collected
        this.weakReferences.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleaned ${cleaned} dead weak references`);
    }
  }

  private emit(event: MemoryEventType, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const eventData = {
        type: event,
        data,
        timestamp: Date.now()
      };
      
      callbacks.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          this.logger(`${LOG_PREFIXES.PERFORMANCE} Memory event callback failed: ${error}`);
        }
      });
    }
  }

  private estimateSize(object: any): number {
    if (object === null || object === undefined) return 0;
    
    try {
      if (typeof object === 'string') {
        return object.length * 2; // UTF-16
      }
      
      if (typeof object === 'number' || typeof object === 'boolean') {
        return 8; // Rough estimate
      }
      
      if (Array.isArray(object)) {
        return object.length * 8 + object.reduce((sum, item) => sum + this.estimateSize(item), 0);
      }
      
      if (typeof object === 'object') {
        // Rough estimate for object overhead + JSON size
        return 100 + JSON.stringify(object).length * 2;
      }
      
      return 100; // Default estimate
    } catch (error) {
      return 1000; // Conservative fallback
    }
  }

  private updateMetricsSnapshot(): void {
    const stats = this.getStats();
    const breakdown = this.getObjectBreakdown();
    
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Memory: ${this.formatBytes(stats.totalUsed)}/${this.formatBytes(stats.totalAvailable)} ` +
      `(${stats.usagePercentage.toFixed(1)}%), Objects: ${stats.objectCounts.total}, ` +
      `Pressure: ${MemoryPressureLevel[stats.pressureLevel]}`
    );
    
    // Log breakdown if significant memory usage
    if (stats.usagePercentage > 50) {
      const topTypes = breakdown
        .sort((a, b) => b.totalSize - a.totalSize)
        .slice(0, 3);
      
      if (topTypes.length > 0) {
        const breakdownStr = topTypes
          .map(t => `${t.type}: ${this.formatBytes(t.totalSize)} (${t.count} objects)`)
          .join(', ');
        
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Memory breakdown: ${breakdownStr}`);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}