/**
 * WebSocket Service for Real-time Synchronization
 * Handles bidirectional communication for the Review Hub
 */

import { io, Socket } from 'socket.io-client';
import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, ReviewEvent } from '../review-events/types';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';

export interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
  auth?: {
    token?: string;
    userId?: string;
  };
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface SyncMessage {
  id: string;
  type: 'sync' | 'update' | 'delete' | 'conflict';
  source: string;
  timestamp: number;
  data: any;
  version?: number;
}

class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: SyncMessage[] = [];
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private lastSyncTimestamp: number = 0;
  private syncInProgress: boolean = false;

  private constructor() {
    this.config = {
      url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    };
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize(config?: Partial<WebSocketConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.url!, {
          reconnection: this.config.reconnection,
          reconnectionAttempts: this.config.reconnectionAttempts,
          reconnectionDelay: this.config.reconnectionDelay,
          timeout: this.config.timeout,
          auth: this.config.auth,
          transports: ['websocket', 'polling'] // Fallback to polling if WebSocket fails
        });

        this.setupEventHandlers();
        this.setupHeartbeat();

        // Set a timeout for initial connection
        const connectionTimeout = setTimeout(() => {
          if (this.status !== ConnectionStatus.CONNECTED) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.config.timeout!);

        this.socket.once('connect', () => {
          clearTimeout(connectionTimeout);
          resolve();
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup event handlers for WebSocket
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.status = ConnectionStatus.CONNECTED;
      this.flushMessageQueue();
      this.requestInitialSync();
      this.emitStatusChange();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.status = ConnectionStatus.DISCONNECTED;
      this.stopHeartbeat();
      this.emitStatusChange();
    });

    this.socket.on('reconnecting', (attemptNumber) => {
      console.log('[WebSocket] Reconnecting... Attempt:', attemptNumber);
      this.status = ConnectionStatus.RECONNECTING;
      this.emitStatusChange();
    });

    this.socket.on('reconnect', () => {
      console.log('[WebSocket] Reconnected');
      this.status = ConnectionStatus.CONNECTED;
      this.requestIncrementalSync();
      this.emitStatusChange();
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      this.status = ConnectionStatus.ERROR;
      this.emitStatusChange();
    });

    // Sync events
    this.socket.on('sync:update', (message: SyncMessage) => {
      this.handleSyncUpdate(message);
    });

    this.socket.on('sync:delete', (message: SyncMessage) => {
      this.handleSyncDelete(message);
    });

    this.socket.on('sync:conflict', (message: SyncMessage) => {
      this.handleSyncConflict(message);
    });

    this.socket.on('sync:batch', (messages: SyncMessage[]) => {
      this.handleBatchSync(messages);
    });

    // Room events for user-specific updates
    this.socket.on('room:joined', (roomId: string) => {
      console.log('[WebSocket] Joined room:', roomId);
    });

    this.socket.on('room:left', (roomId: string) => {
      console.log('[WebSocket] Left room:', roomId);
    });

    // Heartbeat
    this.socket.on('pong', () => {
      // Server acknowledged our ping
    });
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  private setupHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Request initial full sync on connection
   */
  private async requestInitialSync(): Promise<void> {
    if (!this.socket?.connected || this.syncInProgress) return;

    this.syncInProgress = true;
    const eventBus = getEventBus();

    try {
      await eventBus.emit({
        type: ReviewEventType.SYNC_STARTED,
        source: 'websocket',
        userId: this.config.auth?.userId || '',
        data: {
          itemId: 'initial-sync',
          itemType: 'sync',
          metadata: {
            type: 'full',
            timestamp: Date.now()
          }
        },
        priority: 1
      });

      this.socket.emit('sync:request', {
        type: 'full',
        userId: this.config.auth?.userId,
        timestamp: 0 // Get all data
      });

    } catch (error) {
      console.error('[WebSocket] Initial sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Request incremental sync after reconnection
   */
  private async requestIncrementalSync(): Promise<void> {
    if (!this.socket?.connected || this.syncInProgress) return;

    this.syncInProgress = true;
    const eventBus = getEventBus();

    try {
      await eventBus.emit({
        type: ReviewEventType.SYNC_STARTED,
        source: 'websocket',
        userId: this.config.auth?.userId || '',
        data: {
          itemId: 'incremental-sync',
          itemType: 'sync',
          metadata: {
            type: 'incremental',
            lastSync: this.lastSyncTimestamp
          }
        },
        priority: 1
      });

      this.socket.emit('sync:request', {
        type: 'incremental',
        userId: this.config.auth?.userId,
        timestamp: this.lastSyncTimestamp
      });

    } catch (error) {
      console.error('[WebSocket] Incremental sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Handle sync update from server
   */
  private async handleSyncUpdate(message: SyncMessage): Promise<void> {
    const eventBus = getEventBus();
    const dataStore = getUnifiedDataStore();

    try {
      // Update local store
      await dataStore.applyRemoteUpdate(message.data);

      // Update last sync timestamp
      this.lastSyncTimestamp = Math.max(this.lastSyncTimestamp, message.timestamp);

      // Emit update event for UI
      await eventBus.emit({
        type: ReviewEventType.ITEM_UPDATED,
        source: 'websocket',
        userId: this.config.auth?.userId || '',
        data: {
          itemId: message.data.id,
          itemType: message.data.type,
          content: message.data.content,
          metadata: {
            source: message.source,
            version: message.version
          }
        },
        priority: 2
      });

      // Notify subscribers
      this.notifySubscribers('update', message);

    } catch (error) {
      console.error('[WebSocket] Failed to handle sync update:', error);
    }
  }

  /**
   * Handle sync delete from server
   */
  private async handleSyncDelete(message: SyncMessage): Promise<void> {
    const eventBus = getEventBus();
    const dataStore = getUnifiedDataStore();

    try {
      // Delete from local store
      await dataStore.applyRemoteDelete(message.data.id);

      // Emit delete event
      await eventBus.emit({
        type: ReviewEventType.ITEM_REMOVED,
        source: 'websocket',
        userId: this.config.auth?.userId || '',
        data: {
          itemId: message.data.id,
          itemType: message.data.type,
          metadata: {
            source: message.source
          }
        },
        priority: 2
      });

      // Notify subscribers
      this.notifySubscribers('delete', message);

    } catch (error) {
      console.error('[WebSocket] Failed to handle sync delete:', error);
    }
  }

  /**
   * Handle sync conflict from server
   */
  private async handleSyncConflict(message: SyncMessage): Promise<void> {
    const eventBus = getEventBus();
    const dataStore = getUnifiedDataStore();

    try {
      // Let the data store resolve the conflict
      const resolved = await dataStore.resolveConflict(
        message.data.local,
        message.data.remote
      );

      // Send resolution back to server
      this.socket?.emit('sync:conflict-resolved', {
        id: message.id,
        resolution: resolved,
        timestamp: Date.now()
      });

      // Emit conflict event for logging
      await eventBus.emit({
        type: ReviewEventType.SYNC_CONFLICT,
        source: 'websocket',
        userId: this.config.auth?.userId || '',
        data: {
          itemId: message.data.id,
          itemType: 'conflict',
          metadata: {
            local: message.data.local,
            remote: message.data.remote,
            resolved
          }
        },
        priority: 3
      });

    } catch (error) {
      console.error('[WebSocket] Failed to handle sync conflict:', error);
    }
  }

  /**
   * Handle batch sync updates
   */
  private async handleBatchSync(messages: SyncMessage[]): Promise<void> {
    console.log(`[WebSocket] Processing batch of ${messages.length} sync messages`);

    for (const message of messages) {
      switch (message.type) {
        case 'update':
          await this.handleSyncUpdate(message);
          break;
        case 'delete':
          await this.handleSyncDelete(message);
          break;
        case 'conflict':
          await this.handleSyncConflict(message);
          break;
      }
    }

    // Emit sync completed event
    const eventBus = getEventBus();
    await eventBus.emit({
      type: ReviewEventType.SYNC_COMPLETED,
      source: 'websocket',
      userId: this.config.auth?.userId || '',
      data: {
        itemId: 'batch-sync',
        itemType: 'sync',
        metadata: {
          count: messages.length,
          timestamp: this.lastSyncTimestamp
        }
      },
      priority: 1
    });
  }

  /**
   * Send data to server
   */
  async send(event: string, data: any): Promise<void> {
    if (!this.socket?.connected) {
      // Queue message if not connected
      this.messageQueue.push({
        id: `msg_${Date.now()}_${Math.random()}`,
        type: 'update',
        source: 'client',
        timestamp: Date.now(),
        data: { event, ...data }
      });
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Flush queued messages when reconnected
   */
  private async flushMessageQueue(): Promise<void> {
    if (!this.socket?.connected || this.messageQueue.length === 0) return;

    console.log(`[WebSocket] Flushing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        await this.send(message.data.event, message.data);
      } catch (error) {
        console.error('[WebSocket] Failed to send queued message:', error);
        // Re-queue failed message
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }

    this.subscriptions.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(event)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of an event
   */
  private notifySubscribers(event: string, data: any): void {
    const callbacks = this.subscriptions.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WebSocket] Subscriber error:', error);
        }
      });
    }
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(): void {
    this.notifySubscribers('status', this.status);
    
    // Also emit to event bus for global handling
    const eventBus = getEventBus();
    eventBus.emit({
      type: ReviewEventType.SYNC_STATUS_CHANGED,
      source: 'websocket',
      userId: this.config.auth?.userId || '',
      data: {
        itemId: 'connection-status',
        itemType: 'status',
        metadata: {
          status: this.status,
          timestamp: Date.now()
        }
      },
      priority: 1
    });
  }

  /**
   * Join a room for user-specific updates
   */
  async joinRoom(roomId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('room:join', roomId, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.socket?.connected) return;

    return new Promise((resolve) => {
      this.socket!.emit('room:leave', roomId, () => {
        resolve();
      });
    });
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.status = ConnectionStatus.DISCONNECTED;
    this.messageQueue = [];
    this.subscriptions.clear();
  }

  /**
   * Reconnect WebSocket
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.initialize(this.config);
  }
}

// Export singleton instance
export const webSocketService = WebSocketService.getInstance();

// Export for type usage
export type { WebSocketService };