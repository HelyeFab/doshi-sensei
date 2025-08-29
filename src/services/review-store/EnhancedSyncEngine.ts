/**
 * Enhanced Sync Engine with Persistent Queue and Advanced Features
 * Builds upon the base SyncEngine with persistent queue, WebSocket integration, and offline support
 */

import { SyncEngine } from './SyncEngine';
import { StorageAdapter } from './adapters/types';
import { UnifiedReviewItem, ConflictStrategy } from './types';
import { webSocketService } from '../websocket/WebSocketService';
import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';

interface PersistentQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  userId: string;
  version?: number;
  checksum?: string;
  priority: number;
}

interface OfflineQueue {
  items: PersistentQueueItem[];
  lastProcessed: number;
  failedItems: PersistentQueueItem[];
}

export class EnhancedSyncEngine extends SyncEngine {
  private persistentQueue: PersistentQueueItem[] = [];
  private offlineQueue: OfflineQueue = {
    items: [],
    lastProcessed: 0,
    failedItems: []
  };
  private isOnline: boolean = navigator.onLine;
  private queueStorageKey = 'review_hub_sync_queue';
  private processingInterval?: NodeJS.Timeout;
  private batchSyncInProgress = false;
  private webSocketConnected = false;

  constructor(
    localDB: StorageAdapter,
    remoteDB: StorageAdapter,
    conflictStrategy: ConflictStrategy
  ) {
    super(localDB, remoteDB, conflictStrategy);
    this.initializePersistentQueue();
    this.setupOfflineHandling();
    this.setupWebSocketSync();
  }

  /**
   * Initialize persistent queue from localStorage
   */
  private async initializePersistentQueue(): Promise<void> {
    try {
      const storedQueue = localStorage.getItem(this.queueStorageKey);
      if (storedQueue) {
        const parsed = JSON.parse(storedQueue);
        this.persistentQueue = parsed.queue || [];
        this.offlineQueue = parsed.offline || this.offlineQueue;
        console.log(`[EnhancedSyncEngine] Loaded ${this.persistentQueue.length} items from persistent queue`);
      }
    } catch (error) {
      console.error('[EnhancedSyncEngine] Failed to load persistent queue:', error);
    }

    // Start queue processor
    this.startPersistentQueueProcessor();
  }

  /**
   * Save queue to localStorage for persistence
   */
  private saveQueueToStorage(): void {
    try {
      const queueData = {
        queue: this.persistentQueue.slice(0, 100), // Limit to 100 most recent items
        offline: this.offlineQueue,
        timestamp: Date.now()
      };
      localStorage.setItem(this.queueStorageKey, JSON.stringify(queueData));
    } catch (error) {
      console.error('[EnhancedSyncEngine] Failed to save queue:', error);
      // If localStorage is full, clear old items
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearOldQueueItems();
      }
    }
  }

  /**
   * Clear old queue items to free up space
   */
  private clearOldQueueItems(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.persistentQueue = this.persistentQueue.filter(item => item.timestamp > oneWeekAgo);
    this.offlineQueue.items = this.offlineQueue.items.filter(item => item.timestamp > oneWeekAgo);
    this.saveQueueToStorage();
  }

  /**
   * Setup offline/online detection and handling
   */
  private setupOfflineHandling(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[EnhancedSyncEngine] Connection restored');
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[EnhancedSyncEngine] Connection lost - entering offline mode');
      this.isOnline = false;
    });

    // Check connection periodically
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Every 30 seconds
  }

  /**
   * Check connectivity status
   */
  private async checkConnectivity(): Promise<void> {
    try {
      // Try to ping the server
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (!this.isOnline && response.ok) {
        console.log('[EnhancedSyncEngine] Connectivity restored');
        this.isOnline = true;
        this.processOfflineQueue();
      }
    } catch (error) {
      if (this.isOnline) {
        console.log('[EnhancedSyncEngine] Connectivity lost');
        this.isOnline = false;
      }
    }
  }

  /**
   * Setup WebSocket synchronization
   */
  private setupWebSocketSync(): void {
    // Subscribe to WebSocket status changes
    webSocketService.subscribe('status', (status) => {
      this.webSocketConnected = status === 'connected';
      
      if (this.webSocketConnected) {
        console.log('[EnhancedSyncEngine] WebSocket connected - enabling real-time sync');
        this.enableRealtimeSync();
      }
    });

    // Subscribe to sync messages
    webSocketService.subscribe('sync', (message) => {
      this.handleRealtimeSyncMessage(message);
    });
  }

  /**
   * Enable real-time synchronization
   */
  private async enableRealtimeSync(): Promise<void> {
    if (!this.webSocketConnected) return;

    // Send any pending items immediately
    if (this.persistentQueue.length > 0) {
      await this.processPersistentQueue();
    }

    // Subscribe to local changes for real-time push
    const eventBus = getEventBus();
    eventBus.subscribe(
      ReviewEventType.ITEM_REVIEWED,
      async (event) => {
        if (this.webSocketConnected) {
          await this.pushRealtimeUpdate(event.data);
        }
      }
    );
  }

  /**
   * Push update via WebSocket in real-time
   */
  private async pushRealtimeUpdate(data: any): Promise<void> {
    if (!this.webSocketConnected) {
      // Fall back to queue
      await this.queueForSync({
        id: data.itemId,
        operation: 'update',
        data,
        timestamp: Date.now(),
        retryCount: 0,
        userId: data.userId || 'unknown',
        priority: 5
      });
      return;
    }

    try {
      await webSocketService.send('sync:update', {
        id: data.itemId,
        data,
        timestamp: Date.now(),
        version: data.version || 1
      });
      
      console.log('[EnhancedSyncEngine] Real-time update sent for', data.itemId);
    } catch (error) {
      console.error('[EnhancedSyncEngine] Real-time update failed:', error);
      // Queue for later
      await this.queueForSync({
        id: data.itemId,
        operation: 'update',
        data,
        timestamp: Date.now(),
        retryCount: 0,
        userId: data.userId || 'unknown',
        priority: 5
      });
    }
  }

  /**
   * Handle incoming real-time sync message
   */
  private async handleRealtimeSyncMessage(message: any): Promise<void> {
    console.log('[EnhancedSyncEngine] Received real-time sync:', message.type);

    switch (message.type) {
      case 'update':
        await this.applyRealtimeUpdate(message.data);
        break;
      case 'delete':
        await this.applyRealtimeDelete(message.data);
        break;
      case 'conflict':
        await this.handleRealtimeConflict(message.data);
        break;
    }
  }

  /**
   * Apply real-time update to local store
   */
  private async applyRealtimeUpdate(data: any): Promise<void> {
    // Update local store immediately
    await this.localDB.set(`item:${data.id}`, data);
    
    // Emit event for UI update
    const eventBus = getEventBus();
    await eventBus.emit({
      type: ReviewEventType.ITEM_UPDATED,
      source: ReviewSource.REVIEW_HUB,
      userId: data.userId || 'system',
      data: {
        itemId: data.id,
        itemType: data.contentType,
        metadata: {
          realtime: true,
          timestamp: Date.now()
        }
      },
      priority: EventPriority.HIGH
    });
  }

  /**
   * Apply real-time delete to local store
   */
  private async applyRealtimeDelete(data: any): Promise<void> {
    await this.localDB.delete(`item:${data.id}`);
    
    const eventBus = getEventBus();
    await eventBus.emit({
      type: ReviewEventType.ITEM_REMOVED,
      source: ReviewSource.REVIEW_HUB,
      userId: data.userId || 'system',
      data: {
        itemId: data.id,
        itemType: data.contentType,
        metadata: {
          realtime: true
        }
      },
      priority: EventPriority.HIGH
    });
  }

  /**
   * Handle real-time conflict
   */
  private async handleRealtimeConflict(data: any): Promise<void> {
    // Use parent class conflict resolution
    const resolved = await this.resolveConflicts([data]);
    
    // Send resolution back via WebSocket
    if (this.webSocketConnected && resolved.length > 0) {
      await webSocketService.send('sync:conflict-resolved', {
        id: data.itemId,
        resolution: resolved[0],
        timestamp: Date.now()
      });
    }
  }

  /**
   * Queue item for synchronization
   */
  async queueForSync(item: PersistentQueueItem): Promise<void> {
    // Add to appropriate queue based on connection status
    if (!this.isOnline) {
      this.offlineQueue.items.push(item);
      console.log(`[EnhancedSyncEngine] Queued item ${item.id} for offline sync`);
    } else {
      this.persistentQueue.push(item);
      console.log(`[EnhancedSyncEngine] Queued item ${item.id} for sync`);
    }

    // Sort by priority
    this.persistentQueue.sort((a, b) => b.priority - a.priority);
    
    // Save to storage
    this.saveQueueToStorage();

    // Try to process immediately if online
    if (this.isOnline && !this.batchSyncInProgress) {
      await this.processPersistentQueue();
    }
  }

  /**
   * Process persistent queue
   */
  private async processPersistentQueue(): Promise<void> {
    if (this.batchSyncInProgress || !this.isOnline || this.persistentQueue.length === 0) {
      return;
    }

    this.batchSyncInProgress = true;
    const batch: PersistentQueueItem[] = [];
    const maxBatchSize = 50;

    // Get high priority items first
    while (batch.length < maxBatchSize && this.persistentQueue.length > 0) {
      const item = this.persistentQueue.shift();
      if (item) batch.push(item);
    }

    console.log(`[EnhancedSyncEngine] Processing batch of ${batch.length} items`);

    const successful: string[] = [];
    const failed: PersistentQueueItem[] = [];

    for (const item of batch) {
      try {
        await this.syncItem(item);
        successful.push(item.id);
      } catch (error) {
        console.error(`[EnhancedSyncEngine] Failed to sync item ${item.id}:`, error);
        item.retryCount++;
        
        if (item.retryCount < 3) {
          // Re-queue with lower priority
          item.priority = Math.max(1, item.priority - 1);
          failed.push(item);
        } else {
          // Move to failed items after max retries
          this.offlineQueue.failedItems.push(item);
        }
      }
    }

    // Re-add failed items to queue
    this.persistentQueue.unshift(...failed);

    // Save updated queue
    this.saveQueueToStorage();

    // Emit sync progress event
    if (successful.length > 0) {
      const eventBus = getEventBus();
      await eventBus.emit({
        type: ReviewEventType.SYNC_PROGRESS,
        source: ReviewSource.REVIEW_HUB,
        userId: 'system',
        data: {
          itemId: 'batch-sync',
          itemType: 'sync',
          metadata: {
            successful: successful.length,
            failed: failed.length,
            remaining: this.persistentQueue.length
          }
        },
        priority: EventPriority.LOW
      });
    }

    this.batchSyncInProgress = false;

    // Process more if queue still has items
    if (this.persistentQueue.length > 0) {
      setTimeout(() => this.processPersistentQueue(), 1000);
    }
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: PersistentQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
      case 'update':
        await this.remoteDB.set(`item:${item.id}`, item.data);
        break;
      case 'delete':
        await this.remoteDB.delete(`item:${item.id}`);
        break;
    }
  }

  /**
   * Process offline queue when coming back online
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.items.length === 0) return;

    console.log(`[EnhancedSyncEngine] Processing ${this.offlineQueue.items.length} offline items`);

    // Move offline items to persistent queue
    this.persistentQueue.push(...this.offlineQueue.items);
    this.offlineQueue.items = [];
    this.offlineQueue.lastProcessed = Date.now();

    // Save and process
    this.saveQueueToStorage();
    await this.processPersistentQueue();
  }

  /**
   * Start persistent queue processor
   */
  private startPersistentQueueProcessor(): void {
    // Process queue every 10 seconds
    this.processingInterval = setInterval(() => {
      if (this.isOnline && this.persistentQueue.length > 0) {
        this.processPersistentQueue();
      }
    }, 10000);

    // Process immediately if items are waiting
    if (this.persistentQueue.length > 0) {
      this.processPersistentQueue();
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    persistent: number;
    offline: number;
    failed: number;
    isOnline: boolean;
    webSocketConnected: boolean;
  } {
    return {
      persistent: this.persistentQueue.length,
      offline: this.offlineQueue.items.length,
      failed: this.offlineQueue.failedItems.length,
      isOnline: this.isOnline,
      webSocketConnected: this.webSocketConnected
    };
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(): Promise<void> {
    if (this.offlineQueue.failedItems.length === 0) return;

    console.log(`[EnhancedSyncEngine] Retrying ${this.offlineQueue.failedItems.length} failed items`);

    // Reset retry count and re-queue
    const items = this.offlineQueue.failedItems.map(item => ({
      ...item,
      retryCount: 0,
      priority: 5
    }));

    this.persistentQueue.push(...items);
    this.offlineQueue.failedItems = [];

    this.saveQueueToStorage();
    await this.processPersistentQueue();
  }

  /**
   * Clear all queues
   */
  clearQueues(): void {
    this.persistentQueue = [];
    this.offlineQueue = {
      items: [],
      lastProcessed: Date.now(),
      failedItems: []
    };
    this.saveQueueToStorage();
    console.log('[EnhancedSyncEngine] All queues cleared');
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    super.destroy();
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Save final state
    this.saveQueueToStorage();
  }
}

// Export singleton instance
let enhancedSyncEngineInstance: EnhancedSyncEngine | null = null;

export function getEnhancedSyncEngine(
  localDB: StorageAdapter,
  remoteDB: StorageAdapter,
  conflictStrategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS
): EnhancedSyncEngine {
  if (!enhancedSyncEngineInstance) {
    enhancedSyncEngineInstance = new EnhancedSyncEngine(localDB, remoteDB, conflictStrategy);
  }
  return enhancedSyncEngineInstance;
}