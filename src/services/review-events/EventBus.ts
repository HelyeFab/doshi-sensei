/**
 * Global Event Bus System
 * Central event management for the unified review system
 */

import {
  ReviewEvent,
  ReviewEventType,
  EventHandler,
  SubscriptionOptions,
  Unsubscribe,
  QueueItem,
  EventBusConfig,
  ProcessingResult,
  EventStatistics,
  EventPriority,
  ReviewSource
} from './types';

// Priority Queue implementation
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    const queueItem = { item, priority };
    let added = false;
    
    for (let i = 0; i < this.items.length; i++) {
      if (queueItem.priority > this.items[i].priority) {
        this.items.splice(i, 0, queueItem);
        added = true;
        break;
      }
    }
    
    if (!added) {
      this.items.push(queueItem);
    }
  }

  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.item;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

// Async Lock for preventing race conditions
class AsyncLock {
  private promise: Promise<void> = Promise.resolve();

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    const currentPromise = this.promise;
    let releaseLock: () => void;
    
    this.promise = new Promise((resolve) => {
      releaseLock = resolve;
    });

    await currentPromise;
    
    try {
      return await fn();
    } finally {
      releaseLock!();
    }
  }
}

/**
 * ReviewEventBus - Singleton event bus for the review system
 */
export class ReviewEventBus {
  private static instance: ReviewEventBus;
  private subscribers: Map<ReviewEventType, Set<EventHandler>>;
  private eventQueue: PriorityQueue<QueueItem>;
  private processingLock: AsyncLock;
  private config: Required<EventBusConfig>;
  private isProcessing: boolean = false;
  private processedEvents: Set<string> = new Set();
  private statistics: EventStatistics;
  private processingInterval?: NodeJS.Timeout;

  private constructor(config?: EventBusConfig) {
    this.subscribers = new Map();
    this.eventQueue = new PriorityQueue();
    this.processingLock = new AsyncLock();
    
    // Initialize with default config
    this.config = {
      maxQueueSize: config?.maxQueueSize ?? 1000,
      processingInterval: config?.processingInterval ?? 100,
      retryDelay: config?.retryDelay ?? 1000,
      maxRetries: config?.maxRetries ?? 3,
      persistEvents: config?.persistEvents ?? true,
      enableLogging: config?.enableLogging ?? process.env.NODE_ENV === 'development'
    };
    
    // Initialize statistics
    this.statistics = {
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      queuedEvents: 0,
      averageProcessingTime: 0,
      eventsByType: {} as Record<ReviewEventType, number>,
      eventsBySource: {} as Record<ReviewSource, number>
    };
    
    // Start processing queue
    this.startProcessing();
    
    // Load persisted events if enabled
    if (this.config.persistEvents) {
      this.loadPersistedEvents();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: EventBusConfig): ReviewEventBus {
    if (!this.instance) {
      this.instance = new ReviewEventBus(config);
    }
    return this.instance;
  }

  /**
   * Emit an event to all subscribers
   */
  async emit(event: Omit<ReviewEvent, 'id' | 'timestamp' | 'metadata'>): Promise<void> {
    // Generate complete event
    const completeEvent: ReviewEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
        deviceInfo: this.getDeviceInfo()
      }
    };
    
    // Update statistics
    this.updateStatistics(completeEvent);
    
    // Check if event was already processed (deduplication)
    if (this.processedEvents.has(completeEvent.id)) {
      this.log('warn', `Event ${completeEvent.id} already processed, skipping`);
      return;
    }
    
    // Add to queue
    const queueItem: QueueItem = {
      event: completeEvent,
      priority: completeEvent.priority,
      addedAt: Date.now(),
      attempts: 0
    };
    
    // Check queue size limit
    if (this.eventQueue.size() >= this.config.maxQueueSize) {
      this.log('error', 'Event queue is full, dropping oldest events');
      // Remove lowest priority items
      while (this.eventQueue.size() >= this.config.maxQueueSize) {
        this.eventQueue.dequeue();
      }
    }
    
    this.eventQueue.enqueue(queueItem, completeEvent.priority);
    this.statistics.queuedEvents = this.eventQueue.size();
    
    // Trigger processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(
    eventType: ReviewEventType,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Unsubscribe {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    // Wrap handler with options
    const wrappedHandler: EventHandler = async (event) => {
      // Apply filter if provided
      if (options?.filter && !options.filter(event)) {
        return;
      }
      
      // Apply priority filter
      if (options?.priority !== undefined && event.priority < options.priority) {
        return;
      }
      
      // Execute handler
      try {
        if (options?.async === false) {
          await handler(event);
        } else {
          handler(event).catch(error => {
            this.handleSubscriberError(event, error, handler, options);
          });
        }
      } catch (error) {
        this.handleSubscriberError(event, error as Error, handler, options);
      }
    };
    
    this.subscribers.get(eventType)!.add(wrappedHandler);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(wrappedHandler);
    };
  }

  /**
   * Process events in the queue
   */
  private async processQueue(): Promise<void> {
    return this.processingLock.acquire(async () => {
      this.isProcessing = true;
      
      while (!this.eventQueue.isEmpty()) {
        const queueItem = this.eventQueue.dequeue();
        if (!queueItem) break;
        
        const startTime = Date.now();
        
        try {
          await this.processEvent(queueItem);
          
          // Mark as processed
          this.processedEvents.add(queueItem.event.id);
          this.statistics.processedEvents++;
          
          // Update average processing time
          const duration = Date.now() - startTime;
          this.statistics.averageProcessingTime = 
            (this.statistics.averageProcessingTime * (this.statistics.processedEvents - 1) + duration) / 
            this.statistics.processedEvents;
          
          // Persist if enabled
          if (this.config.persistEvents) {
            await this.persistEvent(queueItem.event);
          }
          
        } catch (error) {
          await this.handleEventError(queueItem, error as Error);
        }
      }
      
      this.isProcessing = false;
    });
  }

  /**
   * Process a single event
   */
  private async processEvent(queueItem: QueueItem): Promise<void> {
    const { event } = queueItem;
    const handlers = this.subscribers.get(event.type);
    
    if (!handlers || handlers.size === 0) {
      this.log('debug', `No handlers for event type ${event.type}`);
      return;
    }
    
    // Broadcast to all handlers
    const promises: Promise<void>[] = [];
    
    for (const handler of handlers) {
      promises.push(
        handler(event).catch(error => {
          this.log('error', `Handler error for event ${event.id}:`, error);
          // Don't throw, let other handlers continue
        })
      );
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * Handle event processing errors
   */
  private async handleEventError(queueItem: QueueItem, error: Error): Promise<void> {
    queueItem.attempts++;
    queueItem.lastAttempt = Date.now();
    queueItem.error = error;
    
    this.log('error', `Error processing event ${queueItem.event.id}:`, error);
    
    if (queueItem.attempts < this.config.maxRetries) {
      // Retry with delay
      setTimeout(() => {
        this.eventQueue.enqueue(queueItem, queueItem.priority);
      }, this.config.retryDelay * queueItem.attempts);
    } else {
      // Max retries reached
      this.statistics.failedEvents++;
      await this.handleFailedEvent(queueItem);
    }
  }

  /**
   * Handle subscriber errors
   */
  private handleSubscriberError(
    event: ReviewEvent,
    error: Error,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): void {
    this.log('error', `Subscriber error for event ${event.id}:`, error);
    
    if (options?.retryOnError && (!options.maxRetries || event.retryCount! < options.maxRetries)) {
      // Retry the handler
      setTimeout(() => {
        const retriedEvent = { ...event, retryCount: (event.retryCount || 0) + 1 };
        handler(retriedEvent).catch(err => {
          this.log('error', `Retry failed for event ${event.id}:`, err);
        });
      }, this.config.retryDelay);
    }
  }

  /**
   * Handle failed events (max retries exceeded)
   */
  private async handleFailedEvent(queueItem: QueueItem): Promise<void> {
    // Store in failed events collection for manual review
    if (this.config.persistEvents) {
      try {
        const failedEvents = JSON.parse(
          localStorage.getItem('review_events_failed') || '[]'
        );
        failedEvents.push({
          ...queueItem,
          failedAt: Date.now()
        });
        localStorage.setItem('review_events_failed', JSON.stringify(failedEvents));
      } catch (error) {
        this.log('error', 'Failed to persist failed event:', error);
      }
    }
    
    // Emit system error event
    await this.emit({
      type: ReviewEventType.ERROR_OCCURRED,
      source: ReviewSource.REVIEW_HUB,
      userId: queueItem.event.userId,
      data: {
        itemId: queueItem.event.id,
        itemType: 'kanji',
        metadata: {
          originalEvent: queueItem.event,
          error: queueItem.error?.message,
          attempts: queueItem.attempts
        }
      },
      priority: EventPriority.HIGH
    });
  }

  /**
   * Persist event to storage
   */
  private async persistEvent(event: ReviewEvent): Promise<void> {
    try {
      const persistedEvents = JSON.parse(
        localStorage.getItem('review_events_processed') || '[]'
      );
      
      // Keep only last 100 events
      if (persistedEvents.length >= 100) {
        persistedEvents.shift();
      }
      
      persistedEvents.push({
        ...event,
        processedAt: Date.now()
      });
      
      localStorage.setItem('review_events_processed', JSON.stringify(persistedEvents));
    } catch (error) {
      this.log('error', 'Failed to persist event:', error);
    }
  }

  /**
   * Load persisted events on startup
   */
  private async loadPersistedEvents(): Promise<void> {
    try {
      const persistedEvents = JSON.parse(
        localStorage.getItem('review_events_processed') || '[]'
      );
      
      persistedEvents.forEach((event: ReviewEvent) => {
        this.processedEvents.add(event.id);
      });
      
      this.log('info', `Loaded ${persistedEvents.length} persisted events`);
    } catch (error) {
      this.log('error', 'Failed to load persisted events:', error);
    }
  }

  /**
   * Start processing interval
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && !this.eventQueue.isEmpty()) {
        this.processQueue();
      }
    }, this.config.processingInterval);
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Clear all events and reset
   */
  clear(): void {
    this.eventQueue.clear();
    this.processedEvents.clear();
    this.statistics = {
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      queuedEvents: 0,
      averageProcessingTime: 0,
      eventsByType: {} as Record<ReviewEventType, number>,
      eventsBySource: {} as Record<ReviewSource, number>
    };
  }

  /**
   * Get current statistics
   */
  getStatistics(): EventStatistics {
    return { ...this.statistics, queuedEvents: this.eventQueue.size() };
  }

  /**
   * Update statistics
   */
  private updateStatistics(event: ReviewEvent): void {
    this.statistics.totalEvents++;
    
    // Update events by type
    if (!this.statistics.eventsByType[event.type]) {
      this.statistics.eventsByType[event.type] = 0;
    }
    this.statistics.eventsByType[event.type]++;
    
    // Update events by source
    if (!this.statistics.eventsBySource[event.source]) {
      this.statistics.eventsBySource[event.source] = 0;
    }
    this.statistics.eventsBySource[event.source]++;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): ReviewEvent['metadata']['deviceInfo'] {
    if (typeof window === 'undefined') {
      return undefined;
    }
    
    return {
      platform: navigator.platform || 'unknown',
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      }
    };
  }

  /**
   * Log messages
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
    if (!this.config.enableLogging) return;
    
    const prefix = `[ReviewEventBus] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }
}

// Export singleton instance getter
export const getEventBus = (config?: EventBusConfig) => ReviewEventBus.getInstance(config);