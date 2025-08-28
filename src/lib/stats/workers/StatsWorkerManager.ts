/**
 * Stats Worker Manager for handling Web Worker communication
 * Provides a clean interface for offloading heavy calculations
 */

import { 
  WorkerRequest, 
  WorkerResponse, 
  WorkerMessageType,
  StatsWorkerLogic,
  createWorkerHandler
} from './StatsWorker';
import { LOG_PREFIXES } from '../core/constants';

// Worker pool configuration
interface WorkerPoolConfig {
  maxWorkers: number;
  workerTimeout: number;
  retryAttempts: number;
  queueLimit: number;
  fallbackToMainThread: boolean;
}

// Task priority levels
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Queued task
interface QueuedTask {
  request: WorkerRequest;
  priority: TaskPriority;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
  retryCount: number;
  queuedAt: number;
}

// Worker instance
interface WorkerInstance {
  id: string;
  worker: Worker | null;
  isAvailable: boolean;
  currentTask: string | null;
  tasksCompleted: number;
  lastUsed: number;
  fallbackMode: boolean;
}

// Performance metrics
interface WorkerMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  queuedTasks: number;
  activeWorkers: number;
  fallbackTasks: number;
  workerUtilization: number;
}

export class StatsWorkerManager {
  private config: WorkerPoolConfig;
  private logger: (message: string) => void;
  
  // Worker pool
  private workers: Map<string, WorkerInstance> = new Map();
  private availableWorkers: Set<string> = new Set();
  
  // Task management
  private taskQueue: QueuedTask[] = [];
  private activeTasks: Map<string, QueuedTask> = new Map();
  private taskIdCounter: number = 0;
  
  // Metrics and monitoring
  private metrics: WorkerMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageProcessingTime: 0,
    queuedTasks: 0,
    activeWorkers: 0,
    fallbackTasks: 0,
    workerUtilization: 0
  };
  
  // Timers
  private cleanupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  
  // Fallback handler (for when Workers are not available)
  private fallbackHandler = createWorkerHandler();

  constructor(
    config: Partial<WorkerPoolConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.config = {
      maxWorkers: config.maxWorkers || navigator.hardwareConcurrency || 4,
      workerTimeout: config.workerTimeout || 30000, // 30 seconds
      retryAttempts: config.retryAttempts || 2,
      queueLimit: config.queueLimit || 100,
      fallbackToMainThread: config.fallbackToMainThread !== false,
      ...config
    };
    
    this.logger = logger;
    
    this.initializeWorkers();
    this.startPeriodicTasks();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} StatsWorkerManager initialized with ${this.config.maxWorkers} workers`);
  }

  /**
   * Execute a task using the worker pool
   */
  async execute<T = any>(
    type: WorkerMessageType,
    data: any,
    priority: TaskPriority = TaskPriority.NORMAL,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `task_${++this.taskIdCounter}_${Date.now()}`;
      
      const request: WorkerRequest = {
        id: requestId,
        type,
        data,
        timestamp: Date.now(),
        priority
      };
      
      const task: QueuedTask = {
        request,
        priority,
        resolve,
        reject,
        retryCount: 0,
        queuedAt: Date.now()
      };
      
      // Set timeout
      const taskTimeout = timeout || this.config.workerTimeout;
      task.timeout = setTimeout(() => {
        this.handleTaskTimeout(requestId);
      }, taskTimeout);
      
      // Check queue limit
      if (this.taskQueue.length >= this.config.queueLimit) {
        clearTimeout(task.timeout);
        reject(new Error('Worker queue is full'));
        return;
      }
      
      // Add to queue and process
      this.taskQueue.push(task);
      this.metrics.totalTasks++;
      this.metrics.queuedTasks++;
      
      this.processQueue();
    });
  }

  /**
   * Calculate streaks using worker
   */
  async calculateStreaks(activityDates: string[], timezone?: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakDates: string[];
  }> {
    return this.execute('calculate_streaks', { activityDates, timezone }, TaskPriority.HIGH);
  }

  /**
   * Aggregate daily activities using worker
   */
  async aggregateDaily(activities: any[]): Promise<any> {
    return this.execute('aggregate_daily', { activities }, TaskPriority.NORMAL);
  }

  /**
   * Calculate accuracy metrics using worker
   */
  async calculateAccuracy(activities: any[]): Promise<any> {
    return this.execute('calculate_accuracy', { activities }, TaskPriority.HIGH);
  }

  /**
   * Process batch of activities using worker
   */
  async processBatch(activities: any[], batchSize: number): Promise<any> {
    return this.execute('process_batch', { activities, batchSize }, TaskPriority.LOW);
  }

  /**
   * Validate data using worker
   */
  async validateData(stats: any, activities: any[]): Promise<any> {
    return this.execute('validate_data', { stats, activities }, TaskPriority.NORMAL);
  }

  /**
   * Compute analytics using worker
   */
  async computeAnalytics(userStats: any, activities: any[], timeRange: number): Promise<any> {
    return this.execute('compute_analytics', { userStats, activities, timeRange }, TaskPriority.NORMAL);
  }

  /**
   * Get current metrics
   */
  getMetrics(): WorkerMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queued: number;
    active: number;
    completed: number;
    failed: number;
    averageWaitTime: number;
  } {
    const now = Date.now();
    const queuedTasks = this.taskQueue;
    const averageWaitTime = queuedTasks.length > 0
      ? queuedTasks.reduce((sum, task) => sum + (now - task.queuedAt), 0) / queuedTasks.length
      : 0;
    
    return {
      queued: this.metrics.queuedTasks,
      active: this.activeTasks.size,
      completed: this.metrics.completedTasks,
      failed: this.metrics.failedTasks,
      averageWaitTime
    };
  }

  /**
   * Clear task queue and reset
   */
  clearQueue(): void {
    // Reject all queued tasks
    this.taskQueue.forEach(task => {
      if (task.timeout) clearTimeout(task.timeout);
      task.reject(new Error('Queue cleared'));
    });
    
    this.taskQueue = [];
    this.metrics.queuedTasks = 0;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Worker queue cleared`);
  }

  /**
   * Shutdown worker manager
   */
  async shutdown(): Promise<void> {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Shutting down worker manager`);
    
    // Clear timers
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    
    // Clear queue
    this.clearQueue();
    
    // Terminate all workers
    for (const [id, workerInstance] of this.workers) {
      if (workerInstance.worker) {
        workerInstance.worker.terminate();
      }
    }
    
    this.workers.clear();
    this.availableWorkers.clear();
    this.activeTasks.clear();
  }

  // Private methods

  private initializeWorkers(): void {
    const isWorkerSupported = typeof Worker !== 'undefined';
    
    if (!isWorkerSupported && this.config.fallbackToMainThread) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Web Workers not supported, using main thread fallback`);
      return;
    }
    
    for (let i = 0; i < this.config.maxWorkers; i++) {
      try {
        const workerId = `worker_${i}`;
        const workerInstance: WorkerInstance = {
          id: workerId,
          worker: null, // Would create actual worker here
          isAvailable: true,
          currentTask: null,
          tasksCompleted: 0,
          lastUsed: 0,
          fallbackMode: !isWorkerSupported
        };
        
        // In a real implementation, you would create the worker like this:
        // workerInstance.worker = new Worker(new URL('./StatsWorker.worker.ts', import.meta.url));
        // this.setupWorkerEventHandlers(workerInstance);
        
        this.workers.set(workerId, workerInstance);
        this.availableWorkers.add(workerId);
        
      } catch (error) {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Failed to create worker ${i}: ${error}`);
      }
    }
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Initialized ${this.workers.size} workers`);
  }

  private setupWorkerEventHandlers(workerInstance: WorkerInstance): void {
    if (!workerInstance.worker) return;
    
    workerInstance.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(workerInstance.id, event.data);
    };
    
    workerInstance.worker.onerror = (error) => {
      this.handleWorkerError(workerInstance.id, error);
    };
    
    workerInstance.worker.onmessageerror = (error) => {
      this.handleWorkerError(workerInstance.id, error);
    };
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    
    // Sort queue by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    // Process tasks while workers are available
    while (this.taskQueue.length > 0 && this.availableWorkers.size > 0) {
      const task = this.taskQueue.shift()!;
      const workerId = this.availableWorkers.values().next().value;
      
      this.assignTaskToWorker(task, workerId);
    }
    
    // If no workers available but fallback enabled, use main thread
    if (this.taskQueue.length > 0 && 
        this.availableWorkers.size === 0 && 
        this.config.fallbackToMainThread) {
      
      const task = this.taskQueue.shift()!;
      this.executeOnMainThread(task);
    }
  }

  private assignTaskToWorker(task: QueuedTask, workerId: string): void {
    const workerInstance = this.workers.get(workerId);
    if (!workerInstance) return;
    
    // Mark worker as busy
    workerInstance.isAvailable = false;
    workerInstance.currentTask = task.request.id;
    workerInstance.lastUsed = Date.now();
    this.availableWorkers.delete(workerId);
    
    // Track active task
    this.activeTasks.set(task.request.id, task);
    this.metrics.queuedTasks--;
    
    if (workerInstance.worker) {
      // Send message to worker
      workerInstance.worker.postMessage(task.request);
    } else {
      // Fallback to main thread
      this.executeOnMainThread(task);
    }
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Assigned task ${task.request.id} to ${workerId}`);
  }

  private async executeOnMainThread(task: QueuedTask): Promise<void> {
    try {
      this.metrics.fallbackTasks++;
      
      // Simulate async execution to avoid blocking
      const response = await new Promise<WorkerResponse>((resolve) => {
        setTimeout(() => {
          resolve(this.fallbackHandler({
            data: task.request
          } as MessageEvent<WorkerRequest>));
        }, 0);
      });
      
      this.handleTaskCompletion(task, response);
      
    } catch (error) {
      this.handleTaskError(task, error as Error);
    }
  }

  private handleWorkerMessage(workerId: string, response: WorkerResponse): void {
    const task = this.activeTasks.get(response.id);
    if (!task) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Received response for unknown task: ${response.id}`);
      return;
    }
    
    // Free up worker
    this.freeWorker(workerId);
    
    if (response.error) {
      this.handleTaskError(task, new Error(response.error));
    } else {
      this.handleTaskCompletion(task, response);
    }
  }

  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Worker ${workerId} error: ${error.message}`);
    
    const workerInstance = this.workers.get(workerId);
    if (workerInstance && workerInstance.currentTask) {
      const task = this.activeTasks.get(workerInstance.currentTask);
      if (task) {
        this.handleTaskError(task, new Error(`Worker error: ${error.message}`));
      }
    }
    
    // Free up worker
    this.freeWorker(workerId);
  }

  private handleTaskCompletion(task: QueuedTask, response: WorkerResponse): void {
    // Clear timeout
    if (task.timeout) clearTimeout(task.timeout);
    
    // Remove from active tasks
    this.activeTasks.delete(task.request.id);
    
    // Update metrics
    this.metrics.completedTasks++;
    const processingTime = response.processingTime || 0;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime + processingTime) / 2;
    
    // Resolve task
    task.resolve(response.data);
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Task ${task.request.id} completed in ${processingTime.toFixed(2)}ms`);
    
    // Process next queued task
    this.processQueue();
  }

  private handleTaskError(task: QueuedTask, error: Error): void {
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Task ${task.request.id} failed: ${error.message}`);
    
    // Clear timeout
    if (task.timeout) clearTimeout(task.timeout);
    
    // Remove from active tasks
    this.activeTasks.delete(task.request.id);
    
    // Retry if attempts remaining
    if (task.retryCount < this.config.retryAttempts) {
      task.retryCount++;
      this.taskQueue.unshift(task); // Add to front of queue for retry
      this.metrics.queuedTasks++;
      
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Retrying task ${task.request.id} (attempt ${task.retryCount + 1})`);
      
      this.processQueue();
      return;
    }
    
    // Update metrics
    this.metrics.failedTasks++;
    
    // Reject task
    task.reject(error);
    
    // Process next queued task
    this.processQueue();
  }

  private handleTaskTimeout(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Task ${taskId} timed out`);
    
    // Find and free the worker
    for (const [workerId, workerInstance] of this.workers) {
      if (workerInstance.currentTask === taskId) {
        this.freeWorker(workerId);
        break;
      }
    }
    
    this.handleTaskError(task, new Error('Task timeout'));
  }

  private freeWorker(workerId: string): void {
    const workerInstance = this.workers.get(workerId);
    if (workerInstance) {
      workerInstance.isAvailable = true;
      workerInstance.currentTask = null;
      workerInstance.tasksCompleted++;
      this.availableWorkers.add(workerId);
      
      // Process next task if queue has items
      this.processQueue();
    }
  }

  private startPeriodicTasks(): void {
    // Cleanup old completed tasks
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleReferences();
    }, 30000); // Every 30 seconds
    
    // Update metrics
    this.metricsTimer = setInterval(() => {
      this.updateMetricsSnapshot();
    }, 10000); // Every 10 seconds
  }

  private cleanupStaleReferences(): void {
    // Remove completed tasks that are too old
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    let cleaned = 0;
    for (const [taskId, task] of this.activeTasks) {
      if (now - task.queuedAt > maxAge) {
        this.activeTasks.delete(taskId);
        if (task.timeout) clearTimeout(task.timeout);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleaned ${cleaned} stale task references`);
    }
  }

  private updateMetrics(): void {
    this.metrics.queuedTasks = this.taskQueue.length;
    this.metrics.activeWorkers = this.workers.size - this.availableWorkers.size;
    
    const totalTasks = this.metrics.completedTasks + this.metrics.failedTasks;
    if (totalTasks > 0) {
      this.metrics.workerUtilization = (this.metrics.activeWorkers / this.workers.size) * 100;
    }
  }

  private updateMetricsSnapshot(): void {
    const metrics = this.getMetrics();
    const queueStatus = this.getQueueStatus();
    
    if (metrics.totalTasks > 0) {
      this.logger(
        `${LOG_PREFIXES.PERFORMANCE} Worker metrics - ` +
        `Total: ${metrics.totalTasks}, Completed: ${metrics.completedTasks}, ` +
        `Failed: ${metrics.failedTasks}, Queued: ${queueStatus.queued}, ` +
        `Utilization: ${metrics.workerUtilization.toFixed(1)}%`
      );
    }
  }
}