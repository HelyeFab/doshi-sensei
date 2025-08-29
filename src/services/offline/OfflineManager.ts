/**
 * Offline Manager
 * Handles offline detection, caching, and background sync
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';
import { getEnhancedSyncEngine } from '../review-store/EnhancedSyncEngine';
import { webSocketService } from '../websocket/WebSocketService';

export interface OfflineState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  hasPendingSync: boolean;
  pendingOperations: number;
  lastOnlineTime?: Date;
  lastSyncTime?: Date;
  cacheSize?: number;
}

export interface CacheStrategy {
  maxAge: number; // Max age in milliseconds
  maxSize: number; // Max size in bytes
  priority: 'performance' | 'freshness' | 'offline-first';
}

class OfflineManager {
  private static instance: OfflineManager;
  private state: OfflineState = {
    isOnline: navigator.onLine,
    isServiceWorkerReady: false,
    hasPendingSync: false,
    pendingOperations: 0
  };
  private eventBus = getEventBus();
  private listeners: Set<(state: OfflineState) => void> = new Set();
  private syncRegistration: ServiceWorkerRegistration | null = null;
  private cacheStrategy: CacheStrategy = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 50 * 1024 * 1024, // 50MB
    priority: 'offline-first'
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Initialize offline manager
   */
  private async initialize(): Promise<void> {
    // Setup online/offline listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Setup service worker if available
    if ('serviceWorker' in navigator) {
      await this.setupServiceWorker();
    }

    // Setup background sync if available
    if ('sync' in ServiceWorkerRegistration.prototype) {
      await this.setupBackgroundSync();
    }

    // Check initial state
    this.checkConnectivity();

    console.log('[OfflineManager] Initialized');
  }

  /**
   * Setup service worker for offline caching
   */
  private async setupServiceWorker(): Promise<void> {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.syncRegistration = registration;

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      this.state.isServiceWorkerReady = true;
      console.log('[OfflineManager] Service Worker ready');

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      // Send initial configuration to service worker
      this.sendToServiceWorker({
        type: 'configure',
        cacheStrategy: this.cacheStrategy
      });

    } catch (error) {
      console.error('[OfflineManager] Service Worker registration failed:', error);
    }
  }

  /**
   * Setup background sync for deferred operations
   */
  private async setupBackgroundSync(): Promise<void> {
    if (!this.syncRegistration) return;

    try {
      // Register for background sync
      await (this.syncRegistration as any).sync.register('review-hub-sync');
      console.log('[OfflineManager] Background sync registered');

      // Listen for sync events (handled in service worker)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'sync-complete') {
          this.handleSyncComplete(event.data);
        }
      });

    } catch (error) {
      console.error('[OfflineManager] Background sync registration failed:', error);
    }
  }

  /**
   * Handle coming online
   */
  private async handleOnline(): Promise<void> {
    console.log('[OfflineManager] Connection restored');
    
    this.state.isOnline = true;
    this.state.lastOnlineTime = new Date();
    
    // Notify listeners
    this.notifyStateChange();

    // Emit online event
    await this.eventBus.emit({
      type: ReviewEventType.CONNECTION_RESTORED,
      source: ReviewSource.REVIEW_HUB,
      userId: 'system',
      data: {
        itemId: 'connection',
        itemType: 'status',
        metadata: {
          timestamp: Date.now(),
          pendingOperations: this.state.pendingOperations
        }
      },
      priority: EventPriority.HIGH
    });

    // Trigger sync
    await this.triggerSync();

    // Reconnect WebSocket
    if (!webSocketService.isConnected()) {
      await webSocketService.reconnect();
    }
  }

  /**
   * Handle going offline
   */
  private async handleOffline(): Promise<void> {
    console.log('[OfflineManager] Connection lost - entering offline mode');
    
    this.state.isOnline = false;
    
    // Notify listeners
    this.notifyStateChange();

    // Emit offline event
    await this.eventBus.emit({
      type: ReviewEventType.CONNECTION_LOST,
      source: ReviewSource.REVIEW_HUB,
      userId: 'system',
      data: {
        itemId: 'connection',
        itemType: 'status',
        metadata: {
          timestamp: Date.now(),
          lastOnlineTime: this.state.lastOnlineTime
        }
      },
      priority: EventPriority.HIGH
    });

    // Show offline notification
    this.showOfflineNotification();
  }

  /**
   * Check connectivity status
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      // Try to fetch a small resource
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const isOnline = response.ok;
      
      if (isOnline !== this.state.isOnline) {
        if (isOnline) {
          await this.handleOnline();
        } else {
          await this.handleOffline();
        }
      }
      
      return isOnline;
    } catch (error) {
      if (this.state.isOnline) {
        await this.handleOffline();
      }
      return false;
    }
  }

  /**
   * Trigger sync operation
   */
  async triggerSync(): Promise<void> {
    if (!this.state.isOnline) {
      console.log('[OfflineManager] Cannot sync while offline');
      return;
    }

    this.state.hasPendingSync = true;
    this.notifyStateChange();

    try {
      // Trigger sync via enhanced sync engine
      const syncEngine = getEnhancedSyncEngine(
        null as any, // Would pass actual adapters
        null as any,
        null as any
      );

      // Process offline queue
      await syncEngine.retryFailedItems();

      // Get queue stats
      const stats = syncEngine.getQueueStats();
      this.state.pendingOperations = stats.persistent + stats.offline;

      // If service worker sync is available, use it
      if (this.syncRegistration && 'sync' in this.syncRegistration) {
        await (this.syncRegistration as any).sync.register('review-hub-sync');
      }

      this.state.lastSyncTime = new Date();
      this.state.hasPendingSync = false;
      
      console.log('[OfflineManager] Sync triggered successfully');

    } catch (error) {
      console.error('[OfflineManager] Sync failed:', error);
      this.state.hasPendingSync = true;
    } finally {
      this.notifyStateChange();
    }
  }

  /**
   * Handle service worker message
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'cache-updated':
        this.state.cacheSize = data.size;
        this.notifyStateChange();
        break;
        
      case 'sync-pending':
        this.state.hasPendingSync = true;
        this.state.pendingOperations = data.count;
        this.notifyStateChange();
        break;
        
      case 'sync-complete':
        this.handleSyncComplete(data);
        break;
        
      default:
        console.log('[OfflineManager] Unknown service worker message:', data);
    }
  }

  /**
   * Handle sync completion
   */
  private handleSyncComplete(data: any): void {
    this.state.hasPendingSync = false;
    this.state.pendingOperations = 0;
    this.state.lastSyncTime = new Date();
    
    this.notifyStateChange();
    
    // Emit sync complete event
    this.eventBus.emit({
      type: ReviewEventType.SYNC_COMPLETED,
      source: ReviewSource.REVIEW_HUB,
      userId: 'system',
      data: {
        itemId: 'background-sync',
        itemType: 'sync',
        metadata: {
          itemsSynced: data.itemsSynced || 0,
          duration: data.duration || 0
        }
      },
      priority: EventPriority.LOW
    });
  }

  /**
   * Send message to service worker
   */
  private async sendToServiceWorker(message: any): Promise<void> {
    if (!this.state.isServiceWorkerReady) return;

    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message);
    }
  }

  /**
   * Show offline notification
   */
  private showOfflineNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('You are offline', {
        body: 'Your changes will be synced when connection is restored',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'offline-notification',
        requireInteraction: false
      });
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: OfflineState) => void): () => void {
    this.listeners.add(callback);
    
    // Send initial state
    callback(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[OfflineManager] Listener error:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): OfflineState {
    return { ...this.state };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.state.pendingOperations;
  }

  /**
   * Update cache strategy
   */
  setCacheStrategy(strategy: Partial<CacheStrategy>): void {
    this.cacheStrategy = { ...this.cacheStrategy, ...strategy };
    
    // Update service worker
    this.sendToServiceWorker({
      type: 'configure',
      cacheStrategy: this.cacheStrategy
    });
  }

  /**
   * Clear offline cache
   */
  async clearCache(): Promise<void> {
    if (!this.state.isServiceWorkerReady) return;

    await this.sendToServiceWorker({
      type: 'clear-cache'
    });

    // Clear IndexedDB
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }

    this.state.cacheSize = 0;
    this.notifyStateChange();
    
    console.log('[OfflineManager] Cache cleared');
  }

  /**
   * Force sync even if offline
   */
  async forceSync(): Promise<void> {
    // Temporarily mark as online to attempt sync
    const wasOffline = !this.state.isOnline;
    
    if (wasOffline) {
      this.state.isOnline = true;
    }
    
    try {
      await this.triggerSync();
    } finally {
      if (wasOffline) {
        this.state.isOnline = false;
      }
    }
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();

// Export types
export type { OfflineManager };