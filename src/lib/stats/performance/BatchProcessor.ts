/**
 * Enterprise-grade batch processor for stats operations
 * Implements intelligent batching with priority queues and auto-flush
 */

import { 
  ActivityEvent, 
  DailyActivity, 
  UserStatsV2, 
  IStatsStorage,
  StatsError
} from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';

// Priority levels for operations
export enum BatchPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Batch operation types
export type BatchOperationType = 'write' | 'read' | 'delete' | 'update';

// Individual batch operation
export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  priority: BatchPriority;
  timestamp: number;
  retryCount: number;
  data: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

// Batch configuration
export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  maxRetries: number;
  priorityThreshold: number;
  memoryThreshold: number;
  concurrencyLimit: number;
  flushOnUnload: boolean;
  debounceTime: number;
}

// Performance metrics
export interface BatchMetrics {
  totalOperations: number;
  batchesSent: number;
  averageBatchSize: number;
  averageWaitTime: number;
  successRate: number;
  retryRate: number;
  memoryUsage: number;
  throughput: number; // operations per second
}

export class BatchProcessor {
  private operationQueue: Map<BatchPriority, BatchOperation[]> = new Map();
  private processingQueue: Set<string> = new Set();
  private storage: IStatsStorage;
  private config: BatchConfig;
  private logger: (message: string) => void;
  
  // Timers and intervals
  private flushTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private metrics: BatchMetrics = {
    totalOperations: 0,
    batchesSent: 0,
    averageBatchSize: 0,
    averageWaitTime: 0,
    successRate: 0,
    retryRate: 0,
    memoryUsage: 0,
    throughput: 0
  };
  
  private startTime: number = Date.now();
  private lastFlushTime: number = Date.now();
  
  // Memory monitoring
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private isMemoryPressure: boolean = false;
  
  // Deduplication
  private operationHashes: Map<string, string> = new Map();
  
  constructor(
    storage: IStatsStorage,
    config: Partial<BatchConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.storage = storage;
    this.logger = logger;
    
    // Initialize configuration with defaults
    this.config = {
      maxBatchSize: 500, // Firestore limit
      maxWaitTime: 5000, // 5 seconds
      maxRetries: 3,
      priorityThreshold: BatchPriority.HIGH,
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      concurrencyLimit: 5,
      flushOnUnload: true,
      debounceTime: 100,
      ...config
    };
    
    // Initialize priority queues
    Object.values(BatchPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.operationQueue.set(priority, []);
      }
    });
    
    this.initializeTimers();
    this.setupUnloadHandler();
    this.startMemoryMonitoring();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} BatchProcessor initialized with config: ${JSON.stringify(this.config)}`);
  }
  
  /**
   * Add operation to batch queue
   */
  async addOperation<T>(
    type: BatchOperationType,
    data: any,
    priority: BatchPriority = BatchPriority.NORMAL,
    timeout: number = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const operationId = this.generateOperationId(type, data);
      
      // Check for duplicate operations
      const hash = this.hashOperation(type, data);
      const existingId = this.operationHashes.get(hash);
      
      if (existingId && this.isOperationPending(existingId)) {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Deduplicating operation: ${operationId}`);
        // Return existing promise result
        return this.getExistingOperationResult(existingId);
      }
      
      const operation: BatchOperation = {
        id: operationId,
        type,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        data,
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.rejectOperation(operationId, new StatsError('Operation timeout', 'TIMEOUT'));
        }, timeout)
      };
      
      // Add to appropriate priority queue
      const queue = this.operationQueue.get(priority);
      if (queue) {
        queue.push(operation);
        this.operationHashes.set(hash, operationId);
        this.metrics.totalOperations++;
        
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Added operation ${operationId} to ${BatchPriority[priority]} priority queue`);
        
        // Schedule processing
        this.scheduleProcessing();
      } else {
        reject(new StatsError(`Invalid priority: ${priority}`, 'INVALID_PRIORITY'));
      }
    });
  }
  
  /**
   * Batch write operations to Firestore
   */
  async batchWrite(operations: any[]): Promise<void> {
    return this.addOperation('write', { operations }, BatchPriority.NORMAL);
  }
  
  /**
   * Batch read operations from IndexedDB
   */
  async batchRead(keys: string[]): Promise<Map<string, any>> {
    return this.addOperation('read', { keys }, BatchPriority.HIGH);
  }
  
  /**
   * Batch update user stats
   */
  async batchUpdateStats(updates: Partial<UserStatsV2>[]): Promise<void> {
    return this.addOperation('update', { updates }, BatchPriority.HIGH);
  }
  
  /**
   * Force immediate flush of all pending operations
   */
  async forceFlush(): Promise<void> {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Force flushing all pending operations`);
    await this.processAllQueues(true);
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): BatchMetrics {
    const now = Date.now();
    const uptime = (now - this.startTime) / 1000; // seconds
    
    return {
      ...this.metrics,
      throughput: this.metrics.totalOperations / Math.max(uptime, 1),
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Get queue status
   */
  getQueueStatus(): {
    priority: string;
    pending: number;
    processing: number;
    memoryPressure: boolean;
  }[] {
    return Array.from(this.operationQueue.entries()).map(([priority, queue]) => ({
      priority: BatchPriority[priority],
      pending: queue.length,
      processing: Array.from(this.processingQueue).filter(id => 
        queue.some(op => op.id === id)
      ).length,
      memoryPressure: this.isMemoryPressure
    }));
  }
  
  /**
   * Clear all pending operations
   */
  clearQueue(): void {
    let totalCleared = 0;
    
    for (const queue of this.operationQueue.values()) {
      // Reject all pending operations
      queue.forEach(op => {
        if (op.timeout) clearTimeout(op.timeout);
        op.reject(new StatsError('Queue cleared', 'QUEUE_CLEARED'));
      });
      totalCleared += queue.length;
      queue.length = 0;
    }
    
    this.operationHashes.clear();
    this.processingQueue.clear();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleared ${totalCleared} pending operations`);
  }
  
  /**
   * Shutdown batch processor
   */
  async shutdown(): Promise<void> {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Shutting down batch processor`);
    
    // Clear timers
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.memoryCheckInterval) clearInterval(this.memoryCheckInterval);
    
    // Process remaining operations
    await this.forceFlush();
    
    // Clear queue
    this.clearQueue();
  }
  
  // Private methods
  
  private generateOperationId(type: BatchOperationType, data: any): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }
  
  private hashOperation(type: BatchOperationType, data: any): string {
    // Simple hash for deduplication
    return `${type}_${JSON.stringify(data)}`;
  }
  
  private isOperationPending(operationId: string): boolean {
    for (const queue of this.operationQueue.values()) {
      if (queue.some(op => op.id === operationId)) {
        return true;
      }
    }
    return false;
  }
  
  private getExistingOperationResult(operationId: string): Promise<any> {
    // Return existing promise for deduplication
    // This is a simplified implementation
    return Promise.resolve(null);
  }
  
  private scheduleProcessing(): void {
    // Use debouncing to avoid excessive processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processQueues();
    }, this.config.debounceTime);
  }
  
  private async processQueues(): Promise<void> {
    if (this.processingQueue.size >= this.config.concurrencyLimit) {
      return; // Already at concurrency limit
    }
    
    // Process in priority order
    const priorities = [BatchPriority.CRITICAL, BatchPriority.HIGH, BatchPriority.NORMAL, BatchPriority.LOW];
    
    for (const priority of priorities) {
      await this.processQueue(priority);
      
      if (this.processingQueue.size >= this.config.concurrencyLimit) {
        break; // Reached concurrency limit
      }
    }
  }
  
  private async processQueue(priority: BatchPriority): Promise<void> {
    const queue = this.operationQueue.get(priority);
    if (!queue || queue.length === 0) return;
    
    // Determine batch size based on memory pressure and config
    let batchSize = this.config.maxBatchSize;
    if (this.isMemoryPressure) {
      batchSize = Math.max(1, Math.floor(batchSize / 2));
    }
    
    const batch = queue.splice(0, Math.min(batchSize, queue.length));
    if (batch.length === 0) return;
    
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Processing batch ${batchId} with ${batch.length} operations (priority: ${BatchPriority[priority]})`);
    
    // Mark operations as processing
    batch.forEach(op => this.processingQueue.add(op.id));
    
    try {
      await this.executeBatch(batch);
      
      // Resolve all operations in batch
      batch.forEach(op => {
        if (op.timeout) clearTimeout(op.timeout);
        op.resolve(null);
        this.processingQueue.delete(op.id);
        
        // Remove from hash map
        const hash = this.hashOperation(op.type, op.data);
        this.operationHashes.delete(hash);
      });
      
      // Update metrics
      this.metrics.batchesSent++;
      this.metrics.averageBatchSize = (this.metrics.averageBatchSize * (this.metrics.batchesSent - 1) + batch.length) / this.metrics.batchesSent;
      
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Batch ${batchId} completed successfully`);
      
    } catch (error) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Batch ${batchId} failed: ${error}`);
      
      // Handle batch failure
      await this.handleBatchFailure(batch, error as Error);
    }
  }
  
  private async processAllQueues(force: boolean = false): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const priority of Object.values(BatchPriority)) {
      if (typeof priority === 'number') {
        promises.push(this.drainQueue(priority, force));
      }
    }
    
    await Promise.all(promises);
  }
  
  private async drainQueue(priority: BatchPriority, force: boolean = false): Promise<void> {
    const queue = this.operationQueue.get(priority);
    if (!queue) return;
    
    while (queue.length > 0) {
      await this.processQueue(priority);
      
      // Add small delay unless forcing
      if (!force) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }
  
  private async executeBatch(operations: BatchOperation[]): Promise<void> {
    // Group operations by type for efficient execution
    const groupedOps = this.groupOperationsByType(operations);
    
    for (const [type, ops] of groupedOps.entries()) {
      switch (type) {
        case 'write':
          await this.executeWriteOperations(ops);
          break;
        case 'read':
          await this.executeReadOperations(ops);
          break;
        case 'update':
          await this.executeUpdateOperations(ops);
          break;
        case 'delete':
          await this.executeDeleteOperations(ops);
          break;
      }
    }
  }
  
  private groupOperationsByType(operations: BatchOperation[]): Map<BatchOperationType, BatchOperation[]> {
    const groups = new Map<BatchOperationType, BatchOperation[]>();
    
    operations.forEach(op => {
      if (!groups.has(op.type)) {
        groups.set(op.type, []);
      }
      groups.get(op.type)!.push(op);
    });
    
    return groups;
  }
  
  private async executeWriteOperations(operations: BatchOperation[]): Promise<void> {
    // Execute write operations using storage layer
    const writePromises = operations.map(async op => {
      if (op.data.operations) {
        // Firestore batch write
        return this.executeBatchWrite(op.data.operations);
      }
      return Promise.resolve();
    });
    
    await Promise.all(writePromises);
  }
  
  private async executeReadOperations(operations: BatchOperation[]): Promise<void> {
    // Execute read operations in parallel
    const readPromises = operations.map(async op => {
      if (op.data.keys) {
        return this.executeBatchRead(op.data.keys);
      }
      return Promise.resolve(new Map());
    });
    
    await Promise.all(readPromises);
  }
  
  private async executeUpdateOperations(operations: BatchOperation[]): Promise<void> {
    // Execute update operations
    const updatePromises = operations.map(async op => {
      if (op.data.updates) {
        return this.executeBatchUpdate(op.data.updates);
      }
      return Promise.resolve();
    });
    
    await Promise.all(updatePromises);
  }
  
  private async executeDeleteOperations(operations: BatchOperation[]): Promise<void> {
    // Execute delete operations
    const deletePromises = operations.map(async op => {
      return this.executeBatchDelete(op.data);
    });
    
    await Promise.all(deletePromises);
  }
  
  private async executeBatchWrite(operations: any[]): Promise<void> {
    // Implement actual Firestore batch write
    // This would use Firebase's batch() method
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Executing batch write with ${operations.length} operations`);
    
    // Simulate write operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  private async executeBatchRead(keys: string[]): Promise<Map<string, any>> {
    // Implement actual IndexedDB batch read
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Executing batch read for ${keys.length} keys`);
    
    const results = new Map<string, any>();
    
    // Simulate read operations
    for (const key of keys) {
      // This would be actual storage read
      results.set(key, null);
    }
    
    return results;
  }
  
  private async executeBatchUpdate(updates: any[]): Promise<void> {
    // Implement batch update
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Executing batch update with ${updates.length} updates`);
    
    // Simulate update operation
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  private async executeBatchDelete(data: any): Promise<void> {
    // Implement batch delete
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Executing batch delete`);
    
    // Simulate delete operation
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  private async handleBatchFailure(operations: BatchOperation[], error: Error): Promise<void> {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Handling batch failure: ${error.message}`);
    
    // Retry logic
    const retriableOps = operations.filter(op => 
      op.retryCount < this.config.maxRetries && 
      this.isRetriableError(error)
    );
    
    const nonRetriableOps = operations.filter(op => !retriableOps.includes(op));
    
    // Reject non-retriable operations
    nonRetriableOps.forEach(op => {
      if (op.timeout) clearTimeout(op.timeout);
      op.reject(error);
      this.processingQueue.delete(op.id);
    });
    
    // Retry operations with exponential backoff
    for (const op of retriableOps) {
      op.retryCount++;
      this.processingQueue.delete(op.id);
      
      const delay = Math.pow(2, op.retryCount) * 1000; // Exponential backoff
      setTimeout(() => {
        const queue = this.operationQueue.get(op.priority);
        if (queue) {
          queue.unshift(op); // Add to front of queue for retry
          this.scheduleProcessing();
        }
      }, delay);
    }
    
    this.metrics.retryRate = (this.metrics.retryRate + retriableOps.length) / 2;
  }
  
  private isRetriableError(error: Error): boolean {
    // Define retriable error conditions
    const retriableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'TEMPORARY_FAILURE'];
    
    if (error instanceof StatsError) {
      return retriableCodes.includes(error.code) && error.recoverable;
    }
    
    return false; // Conservative approach
  }
  
  private rejectOperation(operationId: string, error: Error): void {
    for (const queue of this.operationQueue.values()) {
      const opIndex = queue.findIndex(op => op.id === operationId);
      if (opIndex !== -1) {
        const op = queue[opIndex];
        op.reject(error);
        queue.splice(opIndex, 1);
        this.processingQueue.delete(operationId);
        break;
      }
    }
  }
  
  private initializeTimers(): void {
    // Set up flush timer
    this.flushTimer = setInterval(() => {
      const now = Date.now();
      if (now - this.lastFlushTime >= this.config.maxWaitTime) {
        this.processQueues();
        this.lastFlushTime = now;
      }
    }, Math.min(this.config.maxWaitTime, 1000));
    
    // Set up metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update metrics every 10 seconds
  }
  
  private setupUnloadHandler(): void {
    if (this.config.flushOnUnload && typeof window !== 'undefined') {
      const handleUnload = () => {
        this.forceFlush().catch(console.error);
      };
      
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }
  }
  
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const memoryUsage = this.estimateMemoryUsage();
      this.isMemoryPressure = memoryUsage > this.config.memoryThreshold;
      
      if (this.isMemoryPressure) {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Memory pressure detected: ${this.formatBytes(memoryUsage)}`);
        
        // Force processing of high priority operations
        this.processQueue(BatchPriority.HIGH);
        this.processQueue(BatchPriority.CRITICAL);
      }
    }, 5000); // Check every 5 seconds
  }
  
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    // Estimate queue memory usage
    for (const queue of this.operationQueue.values()) {
      queue.forEach(op => {
        totalSize += JSON.stringify(op.data).length * 2; // Rough estimate
        totalSize += 200; // Object overhead
      });
    }
    
    // Add hash map memory
    totalSize += this.operationHashes.size * 100; // Rough estimate
    
    return totalSize;
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  private updateMetrics(): void {
    // Update running averages and rates
    const totalQueued = Array.from(this.operationQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    
    this.metrics.memoryUsage = this.estimateMemoryUsage();
    
    // Update success rate (simplified)
    if (this.metrics.totalOperations > 0) {
      this.metrics.successRate = (this.metrics.totalOperations - this.metrics.retryRate) / this.metrics.totalOperations * 100;
    }
    
    // Log periodic stats
    if (totalQueued > 0) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Queue status: ${totalQueued} pending, ${this.processingQueue.size} processing`);
    }
  }
}