/**
 * Stats event bus implementation
 * Provides event-driven communication between modules using observer pattern
 */

import { 
  IStatsEventBus, 
  StatsEvent, 
  EventCallback 
} from '../core/interfaces';
import { LOG_PREFIXES, EVENTS } from '../core/constants';

export class StatsEventBus implements IStatsEventBus {
  private listeners: Map<StatsEvent, Set<EventCallback<any>>> = new Map();
  private logger: (message: string) => void;
  private eventHistory: Array<{ event: StatsEvent; timestamp: number; data: any }> = [];
  private maxHistorySize: number = 1000;

  constructor(logger: (message: string) => void = console.log) {
    this.logger = logger;
    this.initializeEventTypes();
  }

  /**
   * Initialize event type containers
   */
  private initializeEventTypes(): void {
    const eventTypes: StatsEvent[] = [
      'stats_updated',
      'activity_processed',
      'streak_changed',
      'sync_started',
      'sync_completed',
      'sync_failed',
      'cache_updated',
      'validation_failed'
    ];

    for (const eventType of eventTypes) {
      this.listeners.set(eventType, new Set());
    }
  }

  /**
   * Subscribe to an event
   */
  subscribe<T>(event: StatsEvent, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(callback);

    this.logger(`${LOG_PREFIXES.EVENT_BUS} Subscribed to ${event} (${eventListeners.size} listeners)`);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback);
      this.logger(`${LOG_PREFIXES.EVENT_BUS} Unsubscribed from ${event} (${eventListeners.size} listeners)`);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: StatsEvent, data: T): void {
    const listeners = this.listeners.get(event);
    
    if (!listeners || listeners.size === 0) {
      this.logger(`${LOG_PREFIXES.EVENT_BUS} No listeners for event: ${event}`);
      return;
    }

    this.logger(`${LOG_PREFIXES.EVENT_BUS} Emitting ${event} to ${listeners.size} listeners`);

    // Add to history
    this.addToHistory(event, data);

    // Notify all listeners
    const failedCallbacks: EventCallback<any>[] = [];
    
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.logger(`${LOG_PREFIXES.EVENT_BUS} Listener error for ${event}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedCallbacks.push(callback);
      }
    });

    // Remove failed callbacks to prevent repeated failures
    failedCallbacks.forEach(callback => {
      listeners.delete(callback);
      this.logger(`${LOG_PREFIXES.EVENT_BUS} Removed failed listener for ${event}`);
    });
  }

  /**
   * Clear all event listeners
   */
  clear(): void {
    const totalListeners = Array.from(this.listeners.values())
      .reduce((sum, set) => sum + set.size, 0);
    
    this.listeners.forEach(set => set.clear());
    this.eventHistory = [];
    
    this.logger(`${LOG_PREFIXES.EVENT_BUS} Cleared all listeners (${totalListeners} total) and event history`);
  }

  /**
   * Get event listener statistics
   */
  getListenerStats(): {
    [event: string]: number;
  } {
    const stats: { [event: string]: number } = {};
    
    this.listeners.forEach((listeners, event) => {
      stats[event] = listeners.size;
    });

    return stats;
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit: number = 50): Array<{ 
    event: StatsEvent; 
    timestamp: number; 
    data: any;
    timeAgo: string;
  }> {
    const now = Date.now();
    
    return this.eventHistory
      .slice(-limit)
      .map(entry => ({
        ...entry,
        timeAgo: this.formatTimeAgo(now - entry.timestamp)
      }));
  }

  /**
   * Subscribe to multiple events with single callback
   */
  subscribeMultiple<T>(
    events: StatsEvent[], 
    callback: (event: StatsEvent, data: T) => void
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    for (const event of events) {
      const unsubscribe = this.subscribe(event, (data: T) => {
        callback(event, data);
      });
      unsubscribeFunctions.push(unsubscribe);
    }

    this.logger(`${LOG_PREFIXES.EVENT_BUS} Subscribed to ${events.length} events with single callback`);

    // Return function to unsubscribe from all events
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      this.logger(`${LOG_PREFIXES.EVENT_BUS} Unsubscribed from ${events.length} events`);
    };
  }

  /**
   * Emit event conditionally based on predicate
   */
  emitIf<T>(event: StatsEvent, data: T, predicate: (data: T) => boolean): boolean {
    if (predicate(data)) {
      this.emit(event, data);
      return true;
    }
    
    this.logger(`${LOG_PREFIXES.EVENT_BUS} Event ${event} not emitted (predicate failed)`);
    return false;
  }

  /**
   * Wait for a specific event (Promise-based)
   */
  waitFor<T>(event: StatsEvent, timeout: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      let unsubscribe: (() => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (unsubscribe) unsubscribe();
        if (timeoutId) clearTimeout(timeoutId);
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      // Subscribe to event
      unsubscribe = this.subscribe(event, (data: T) => {
        cleanup();
        resolve(data);
      });
    });
  }

  /**
   * Emit event with delay
   */
  emitDelayed<T>(event: StatsEvent, data: T, delay: number): NodeJS.Timeout {
    this.logger(`${LOG_PREFIXES.EVENT_BUS} Scheduling ${event} emission in ${delay}ms`);
    
    return setTimeout(() => {
      this.emit(event, data);
    }, delay);
  }

  /**
   * Get total listener count across all events
   */
  getTotalListenerCount(): number {
    return Array.from(this.listeners.values())
      .reduce((sum, set) => sum + set.size, 0);
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event: StatsEvent): boolean {
    const listeners = this.listeners.get(event);
    return listeners !== undefined && listeners.size > 0;
  }

  /**
   * Add event to history with size management
   */
  private addToHistory<T>(event: StatsEvent, data: T): void {
    this.eventHistory.push({
      event,
      timestamp: Date.now(),
      data
    });

    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Format time difference in human readable form
   */
  private formatTimeAgo(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  /**
   * Create a scoped event bus for a specific context
   */
  createScopedBus(scope: string): ScopedEventBus {
    return new ScopedEventBus(this, scope, this.logger);
  }

  /**
   * Get event bus diagnostics
   */
  getDiagnostics(): {
    totalListeners: number;
    eventTypes: string[];
    historySize: number;
    recentEvents: number;
  } {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentEvents = this.eventHistory.filter(
      entry => entry.timestamp > fiveMinutesAgo
    ).length;

    return {
      totalListeners: this.getTotalListenerCount(),
      eventTypes: Array.from(this.listeners.keys()),
      historySize: this.eventHistory.length,
      recentEvents
    };
  }
}

/**
 * Scoped event bus for module-specific events
 */
class ScopedEventBus {
  private parentBus: StatsEventBus;
  private scope: string;
  private logger: (message: string) => void;

  constructor(
    parentBus: StatsEventBus, 
    scope: string, 
    logger: (message: string) => void
  ) {
    this.parentBus = parentBus;
    this.scope = scope;
    this.logger = logger;
  }

  /**
   * Subscribe with scope prefix
   */
  subscribe<T>(event: StatsEvent, callback: EventCallback<T>): () => void {
    this.logger(`${LOG_PREFIXES.EVENT_BUS} [${this.scope}] Subscribing to ${event}`);
    return this.parentBus.subscribe(event, callback);
  }

  /**
   * Emit with scope logging
   */
  emit<T>(event: StatsEvent, data: T): void {
    this.logger(`${LOG_PREFIXES.EVENT_BUS} [${this.scope}] Emitting ${event}`);
    this.parentBus.emit(event, data);
  }

  /**
   * Get scope name
   */
  getScope(): string {
    return this.scope;
  }
}