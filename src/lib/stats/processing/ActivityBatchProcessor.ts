/**
 * Enhanced Activity Batch Processor with Error Recovery
 * Implements robust error handling to prevent data loss during processing pipeline failures
 * 
 * Key Features:
 * - Exponential backoff retry mechanism
 * - Dead letter queue for repeatedly failed activities
 * - Circuit breaker pattern for system protection
 * - Comprehensive error metrics and logging
 * - Preserves pending activities during errors
 */

import { ActivityEvent, StatsError } from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';

export interface BatchProcessorConfig {
  batchSize: number;
  initialDelay: number;
  maxRetries: number;
  maxBackoffDelay: number;
  deadLetterThreshold: number;
  circuitBreakerThreshold: number;
  circuitBreakerRecoveryTime: number;
  maxQueueSize: number;
}

export interface RetryableActivity {
  event: ActivityEvent;
  retryCount: number;
  firstAttempt: number;
  lastAttempt: number;
  errors: string[];
}

export interface DeadLetterActivity {
  event: ActivityEvent;
  totalRetries: number;
  failureReason: string;
  timestamp: number;
  errors: string[];
}

export interface ProcessingMetrics {
  totalProcessed: number;
  totalFailed: number;
  currentBatchSize: number;
  pendingActivities: number;
  deadLetterCount: number;
  retryQueueSize: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successRate: number;
  averageProcessingTime: number;
  lastProcessingError?: string;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit breaker is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if system has recovered
}

export class ActivityBatchProcessor {
  private config: BatchProcessorConfig;
  private logger: (message: string) => void;
  private processor: (activities: ActivityEvent[]) => Promise<void>;
  
  // Activity queues
  private pendingActivities: ActivityEvent[] = [];
  private retryQueue: Map<string, RetryableActivity> = new Map();
  private deadLetterQueue: DeadLetterActivity[] = [];
  
  // Processing control
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private processingPromise: Promise<void> | null = null;
  
  // Circuit breaker
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private circuitBreakerTimer: NodeJS.Timeout | null = null;
  
  // Metrics
  private metrics: ProcessingMetrics = {
    totalProcessed: 0,
    totalFailed: 0,
    currentBatchSize: 0,
    pendingActivities: 0,
    deadLetterCount: 0,
    retryQueueSize: 0,
    circuitBreakerState: CircuitBreakerState.CLOSED,
    successRate: 100,
    averageProcessingTime: 0,
  };
  
  private processingTimes: number[] = [];
  private readonly maxProcessingTimes = 50;

  constructor(
    processor: (activities: ActivityEvent[]) => Promise<void>,
    config: Partial<BatchProcessorConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.processor = processor;
    this.logger = logger;
    
    this.config = {
      batchSize: 50,
      initialDelay: 1000, // 1 second
      maxRetries: 5,
      maxBackoffDelay: 30000, // 30 seconds
      deadLetterThreshold: 3,
      circuitBreakerThreshold: 10, // 10 consecutive failures opens circuit
      circuitBreakerRecoveryTime: 60000, // 1 minute
      maxQueueSize: 10000, // Prevent memory issues
      ...config
    };
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} ActivityBatchProcessor initialized with config: ${JSON.stringify(this.config)}`);
    this.setupCleanupInterval();
  }

  /**
   * Add activity to processing queue
   */
  async add(activity: ActivityEvent): Promise<void> {
    // Check if circuit breaker is open
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      throw new StatsError(
        'Circuit breaker is open - processing temporarily disabled due to repeated failures',
        'CIRCUIT_BREAKER_OPEN'
      );
    }
    
    // Check queue size limit to prevent memory issues
    if (this.pendingActivities.length >= this.config.maxQueueSize) {
      throw new StatsError(
        `Activity queue is full (${this.config.maxQueueSize} activities). Processing may be blocked.`,
        'QUEUE_FULL'
      );
    }
    
    this.pendingActivities.push(activity);
    this.updateMetrics();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Activity added to queue. Queue size: ${this.pendingActivities.length}`);
    
    this.scheduleProcessing();
  }

  /**
   * Force flush all pending activities
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.processingPromise) {
      // Wait for current processing to complete
      await this.processingPromise;
    }
    
    // Process any remaining activities
    await this.processBatch();
    
    // Process retry queue
    await this.processRetryQueue();
  }

  /**
   * Get current processing metrics
   */
  getMetrics(): ProcessingMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get dead letter queue contents for debugging
   */
  getDeadLetterQueue(): DeadLetterActivity[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleared ${count} activities from dead letter queue`);
    this.updateMetrics();
  }

  /**
   * Manually retry activities from dead letter queue
   */
  async retryDeadLetterActivities(): Promise<{ requeued: number; errors: string[] }> {
    const activities = [...this.deadLetterQueue];
    const errors: string[] = [];
    let requeued = 0;
    
    this.deadLetterQueue = [];
    
    for (const deadActivity of activities) {
      try {
        // Reset retry count and requeue
        this.pendingActivities.push(deadActivity.event);
        requeued++;
      } catch (error) {
        errors.push(`Failed to requeue activity ${deadActivity.event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Put it back in dead letter queue
        this.deadLetterQueue.push(deadActivity);
      }
    }
    
    if (requeued > 0) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Requeued ${requeued} activities from dead letter queue`);
      this.scheduleProcessing();
    }
    
    this.updateMetrics();
    
    return { requeued, errors };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Circuit breaker manually reset`);
    this.updateMetrics();
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(): void {
    if (this.isProcessing || this.circuitBreakerState === CircuitBreakerState.OPEN) {
      return;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    const delay = this.pendingActivities.length >= this.config.batchSize ? 0 : this.config.initialDelay;
    
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch().catch(error => {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    }, delay);
  }

  /**
   * Process batch of activities with comprehensive error handling
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.pendingActivities.length === 0) {
      return;
    }
    
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Skipping batch processing - circuit breaker is open`);
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      this.processingPromise = this.executeProcessingBatch();
      await this.processingPromise;
      
      // Record successful processing time
      const processingTime = Date.now() - startTime;
      this.recordProcessingTime(processingTime);
      
      // Reset failure count on successful processing
      this.onProcessingSuccess();
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.recordProcessingTime(processingTime);
      this.onProcessingFailure(error as Error);
      
    } finally {
      this.isProcessing = false;
      this.processingPromise = null;
      this.updateMetrics();
      
      // Schedule next batch if needed
      if (this.pendingActivities.length > 0 && this.circuitBreakerState !== CircuitBreakerState.OPEN) {
        this.scheduleProcessing();
      }
      
      // Process retry queue
      this.scheduleRetryProcessing();
    }
  }

  /**
   * Execute actual batch processing with proper error isolation
   */
  private async executeProcessingBatch(): Promise<void> {
    // CRITICAL: Do not clear pendingActivities until processing succeeds
    const batchSize = Math.min(this.config.batchSize, this.pendingActivities.length);
    const batch = this.pendingActivities.slice(0, batchSize);
    
    if (batch.length === 0) return;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Processing batch of ${batch.length} activities`);
    
    try {
      // Process the batch - this is where the original processActivity calls happen
      await this.processor(batch);
      
      // SUCCESS: Only now remove processed activities from pending queue
      this.pendingActivities.splice(0, batch.length);
      this.metrics.totalProcessed += batch.length;
      
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Successfully processed ${batch.length} activities`);
      
    } catch (error) {
      // FAILURE: Preserve pending activities and handle retry logic
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Move failed activities to retry queue with exponential backoff
      await this.handleBatchFailure(batch, error as Error);
      
      // Remove from pending queue since they're now in retry queue
      this.pendingActivities.splice(0, batch.length);
      
      throw error; // Re-throw to trigger circuit breaker logic
    }
  }

  /**
   * Handle batch failure with retry logic and dead letter queue
   */
  private async handleBatchFailure(failedBatch: ActivityEvent[], error: Error): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    for (const activity of failedBatch) {
      const existingRetry = this.retryQueue.get(activity.id);
      
      if (existingRetry) {
        // Increment retry count
        existingRetry.retryCount++;
        existingRetry.lastAttempt = Date.now();
        existingRetry.errors.push(errorMessage);
        
        if (existingRetry.retryCount >= this.config.maxRetries) {
          // Move to dead letter queue
          this.moveToDeadLetterQueue(existingRetry, 'Max retries exceeded');
        }
      } else {
        // First failure - add to retry queue
        const retryableActivity: RetryableActivity = {
          event: activity,
          retryCount: 1,
          firstAttempt: Date.now(),
          lastAttempt: Date.now(),
          errors: [errorMessage]
        };
        
        this.retryQueue.set(activity.id, retryableActivity);
      }
    }
    
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Added ${failedBatch.length} activities to retry queue. ` +
      `Retry queue size: ${this.retryQueue.size}, Dead letter queue size: ${this.deadLetterQueue.length}`
    );
  }

  /**
   * Move activity to dead letter queue
   */
  private moveToDeadLetterQueue(retryableActivity: RetryableActivity, reason: string): void {
    const deadActivity: DeadLetterActivity = {
      event: retryableActivity.event,
      totalRetries: retryableActivity.retryCount,
      failureReason: reason,
      timestamp: Date.now(),
      errors: retryableActivity.errors
    };
    
    this.deadLetterQueue.push(deadActivity);
    this.retryQueue.delete(retryableActivity.event.id);
    
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Moved activity ${retryableActivity.event.id} to dead letter queue ` +
      `after ${retryableActivity.retryCount} retries. Reason: ${reason}`
    );
    
    // Log extensive details for debugging
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Dead letter activity details: ` +
      `Type: ${retryableActivity.event.type}, ` +
      `First attempt: ${new Date(retryableActivity.firstAttempt).toISOString()}, ` +
      `Errors: [${retryableActivity.errors.join(', ')}]`
    );
  }

  /**
   * Process retry queue with exponential backoff
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.size === 0 || this.circuitBreakerState === CircuitBreakerState.OPEN) {
      return;
    }
    
    const now = Date.now();
    const activitiesToRetry: RetryableActivity[] = [];
    
    for (const [activityId, retryActivity] of this.retryQueue.entries()) {
      const backoffDelay = this.calculateBackoffDelay(retryActivity.retryCount);
      const timeSinceLastAttempt = now - retryActivity.lastAttempt;
      
      if (timeSinceLastAttempt >= backoffDelay) {
        activitiesToRetry.push(retryActivity);
      }
    }
    
    if (activitiesToRetry.length === 0) {
      return;
    }
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Retrying ${activitiesToRetry.length} activities from retry queue`);
    
    // Process retries individually to isolate failures
    for (const retryActivity of activitiesToRetry) {
      try {
        await this.processor([retryActivity.event]);
        
        // Success - remove from retry queue
        this.retryQueue.delete(retryActivity.event.id);
        this.metrics.totalProcessed++;
        
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Successfully retried activity ${retryActivity.event.id} on attempt ${retryActivity.retryCount + 1}`);
        
      } catch (error) {
        // Failure - update retry count
        retryActivity.retryCount++;
        retryActivity.lastAttempt = Date.now();
        retryActivity.errors.push(error instanceof Error ? error.message : 'Unknown error');
        
        if (retryActivity.retryCount >= this.config.maxRetries) {
          this.moveToDeadLetterQueue(retryActivity, 'Max retries exceeded during retry processing');
        } else {
          this.logger(
            `${LOG_PREFIXES.PERFORMANCE} Retry failed for activity ${retryActivity.event.id}. ` +
            `Attempt ${retryActivity.retryCount}/${this.config.maxRetries}. ` +
            `Next retry in ${this.calculateBackoffDelay(retryActivity.retryCount)}ms`
          );
        }
      }
    }
  }

  /**
   * Schedule retry queue processing
   */
  private scheduleRetryProcessing(): void {
    if (this.retryQueue.size === 0) return;
    
    // Find the next retry that should be processed
    const now = Date.now();
    let nextRetryTime = Infinity;
    
    for (const retryActivity of this.retryQueue.values()) {
      const backoffDelay = this.calculateBackoffDelay(retryActivity.retryCount);
      const nextAttemptTime = retryActivity.lastAttempt + backoffDelay;
      
      if (nextAttemptTime < nextRetryTime) {
        nextRetryTime = nextAttemptTime;
      }
    }
    
    if (nextRetryTime !== Infinity) {
      const delay = Math.max(0, nextRetryTime - now);
      setTimeout(() => {
        this.processRetryQueue().catch(error => {
          this.logger(`${LOG_PREFIXES.PERFORMANCE} Retry processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
      }, delay);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = this.config.initialDelay;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, retryCount - 1),
      this.config.maxBackoffDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Handle processing success
   */
  private onProcessingSuccess(): void {
    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      // Recovery successful - close circuit breaker
      this.circuitBreakerState = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Circuit breaker closed - system recovered`);
    } else if (this.circuitBreakerState === CircuitBreakerState.CLOSED) {
      // Reset failure count on successful processing
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle processing failure with circuit breaker logic
   */
  private onProcessingFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.metrics.totalFailed++;
    this.metrics.lastProcessingError = error.message;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Processing failure ${this.failureCount}/${this.config.circuitBreakerThreshold}: ${error.message}`);
    
    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.OPEN;
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Circuit breaker opened after ${this.failureCount} consecutive failures`);
    
    // Schedule automatic recovery attempt
    this.circuitBreakerTimer = setTimeout(() => {
      this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Circuit breaker half-open - testing recovery`);
      
      // Try processing a small batch to test recovery
      if (this.pendingActivities.length > 0 || this.retryQueue.size > 0) {
        this.scheduleProcessing();
      }
    }, this.config.circuitBreakerRecoveryTime);
  }

  /**
   * Record processing time for metrics
   */
  private recordProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > this.maxProcessingTimes) {
      this.processingTimes.shift();
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.pendingActivities = this.pendingActivities.length;
    this.metrics.retryQueueSize = this.retryQueue.size;
    this.metrics.deadLetterCount = this.deadLetterQueue.length;
    this.metrics.circuitBreakerState = this.circuitBreakerState;
    
    const totalProcessed = this.metrics.totalProcessed + this.metrics.totalFailed;
    this.metrics.successRate = totalProcessed > 0 
      ? Math.round((this.metrics.totalProcessed / totalProcessed) * 100)
      : 100;
    
    if (this.processingTimes.length > 0) {
      this.metrics.averageProcessingTime = Math.round(
        this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      );
    }
  }

  /**
   * Setup cleanup interval for old dead letter activities
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldDeadLetterActivities();
    }, 300000); // 5 minutes
  }

  /**
   * Clean up old dead letter activities
   */
  private cleanupOldDeadLetterActivities(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const originalSize = this.deadLetterQueue.length;
    
    this.deadLetterQueue = this.deadLetterQueue.filter(activity => 
      activity.timestamp > oneWeekAgo
    );
    
    const cleaned = originalSize - this.deadLetterQueue.length;
    if (cleaned > 0) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleaned up ${cleaned} old dead letter activities`);
    }
  }

  /**
   * Destroy processor and clean up resources
   */
  destroy(): void {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Destroying ActivityBatchProcessor`);
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }
    
    // Log final state
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Final state - ` +
      `Pending: ${this.pendingActivities.length}, ` +
      `Retry: ${this.retryQueue.size}, ` +
      `Dead letter: ${this.deadLetterQueue.length}, ` +
      `Success rate: ${this.metrics.successRate}%`
    );
  }
}