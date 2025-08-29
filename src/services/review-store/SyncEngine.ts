/**
 * Sync Engine
 * Handles bidirectional synchronization between local and remote storage
 */

import {
  StorageAdapter,
  UnifiedReviewItem,
  SyncStatus,
  SyncResult,
  LocalChanges,
  RemoteChanges,
  ConflictStrategy,
  ConflictData,
  SyncError
} from './types';
import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';

interface SyncQueueItem {
  id: string;
  item: UnifiedReviewItem;
  operation: 'create' | 'update' | 'delete';
  timestamp: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: Error;
}

export class SyncEngine {
  private syncQueue: SyncQueueItem[] = [];
  private syncStatus: Map<string, SyncStatus> = new Map();
  private isSyncing = false;
  private syncInterval?: NodeJS.Timeout;
  private conflictQueue: ConflictData[] = [];
  private eventBus = getEventBus();
  private lastSyncTimestamp: Map<string, Date> = new Map();

  constructor(
    private localDB: StorageAdapter,
    private remoteDB: StorageAdapter,
    private conflictStrategy: ConflictStrategy
  ) {}

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    // Load sync metadata from local storage
    await this.loadSyncMetadata();
    
    // Start processing queue
    this.startQueueProcessor();
    
    console.log('[SyncEngine] Initialized');
  }

  /**
   * Perform full bidirectional sync for a user
   */
  async performSync(userId: string): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new SyncError('Sync already in progress', 'sync_in_progress');
    }

    const syncId = this.generateSyncId();
    const startTime = Date.now();
    
    this.isSyncing = true;
    this.updateSyncStatus(userId, 'syncing');

    try {
      console.log(`[SyncEngine] Starting sync ${syncId} for user ${userId}`);
      
      // 1. Get local changes since last sync
      const localChanges = await this.getLocalChanges(userId);
      console.log(`[SyncEngine] Found ${localChanges.created.length} new, ${localChanges.updated.length} updated, ${localChanges.deleted.length} deleted local items`);
      
      // 2. Get remote changes since last sync
      const remoteChanges = await this.getRemoteChanges(userId);
      console.log(`[SyncEngine] Found ${remoteChanges.items.length} remote changes`);
      
      // 3. Detect and resolve conflicts
      const conflicts = this.detectConflicts(localChanges, remoteChanges);
      console.log(`[SyncEngine] Detected ${conflicts.length} conflicts`);
      
      const resolved = await this.resolveConflicts(conflicts);
      console.log(`[SyncEngine] Resolved ${resolved.length} conflicts`);
      
      // 4. Apply remote changes locally
      await this.applyRemoteChanges(remoteChanges, resolved);
      
      // 5. Push local changes to remote
      await this.pushLocalChanges(localChanges, resolved);
      
      // 6. Update sync metadata
      await this.updateSyncMetadata(userId, syncId);
      
      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: true,
        syncId,
        itemsSynced: localChanges.created.length + localChanges.updated.length + remoteChanges.items.length,
        conflictsResolved: resolved.length,
        duration
      };
      
      this.updateSyncStatus(userId, 'idle', result);
      console.log(`[SyncEngine] Sync ${syncId} completed in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const syncError = new SyncError(
        `Sync failed: ${(error as Error).message}`,
        syncId,
        error as Error
      );
      
      this.updateSyncStatus(userId, 'error', undefined, syncError);
      throw syncError;
      
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Queue an item for sync
   */
  async queueSync(item: UnifiedReviewItem): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: item.id,
      item,
      operation: item.sync.version === 1 ? 'create' : 'update',
      timestamp: new Date(),
      attempts: 0
    };
    
    this.syncQueue.push(queueItem);
    console.log(`[SyncEngine] Queued item ${item.id} for sync`);
    
    // Process immediately if not syncing
    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Get local changes since last sync
   */
  private async getLocalChanges(userId: string): Promise<LocalChanges> {
    const lastSync = this.lastSyncTimestamp.get(userId) || new Date(0);
    
    // Query local database for changes
    // This is a simplified implementation - actual would use IndexedDB queries
    const allItems = await this.localDB.get(`user:${userId}:items`) || [];
    
    const created: UnifiedReviewItem[] = [];
    const updated: UnifiedReviewItem[] = [];
    const deleted: string[] = [];
    
    for (const item of allItems) {
      if (item.sync.localChanges) {
        if (item.metadata.createdAt > lastSync) {
          created.push(item);
        } else if (item.metadata.updatedAt > lastSync) {
          updated.push(item);
        }
      }
    }
    
    // Get deleted items from deletion log
    const deletionLog = await this.localDB.get(`user:${userId}:deletions`) || [];
    deleted.push(...deletionLog.filter((d: any) => d.timestamp > lastSync).map((d: any) => d.id));
    
    return {
      created,
      updated,
      deleted,
      timestamp: new Date()
    };
  }

  /**
   * Get remote changes since last sync
   */
  private async getRemoteChanges(userId: string): Promise<RemoteChanges> {
    const lastSync = this.lastSyncTimestamp.get(userId) || new Date(0);
    
    // Query remote database for changes
    // Using Firebase adapter's getModifiedSince method
    const items = await (this.remoteDB as any).getModifiedSince?.(lastSync, userId) || [];
    
    // Get deletions
    const deletions = await this.remoteDB.get(`user:${userId}:deletions`) || [];
    
    return {
      items,
      deletions: deletions.filter((d: any) => d.timestamp > lastSync).map((d: any) => d.id),
      timestamp: new Date()
    };
  }

  /**
   * Detect conflicts between local and remote changes
   */
  private detectConflicts(local: LocalChanges, remote: RemoteChanges): ConflictData[] {
    const conflicts: ConflictData[] = [];
    const remoteMap = new Map(remote.items.map(item => [item.id, item]));
    
    // Check updated items for conflicts
    for (const localItem of local.updated) {
      const remoteItem = remoteMap.get(localItem.id);
      
      if (remoteItem && this.hasConflict(localItem, remoteItem)) {
        conflicts.push({
          itemId: localItem.id,
          local: localItem,
          remote: remoteItem,
          strategy: this.conflictStrategy
        });
      }
    }
    
    // Check if deleted locally but updated remotely
    for (const deletedId of local.deleted) {
      const remoteItem = remoteMap.get(deletedId);
      
      if (remoteItem) {
        // Item was deleted locally but updated remotely - conflict!
        conflicts.push({
          itemId: deletedId,
          local: { id: deletedId } as UnifiedReviewItem, // Placeholder for deleted item
          remote: remoteItem,
          strategy: this.conflictStrategy
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Check if two items have a conflict
   */
  private hasConflict(local: UnifiedReviewItem, remote: UnifiedReviewItem): boolean {
    // Simple version comparison - could be more sophisticated
    return local.sync.version === remote.sync.version &&
           local.metadata.updatedAt.getTime() !== remote.metadata.updatedAt.getTime();
  }

  /**
   * Resolve conflicts based on strategy
   */
  private async resolveConflicts(conflicts: ConflictData[]): Promise<ConflictData[]> {
    const resolved: ConflictData[] = [];
    
    for (const conflict of conflicts) {
      let winner: UnifiedReviewItem;
      
      switch (conflict.strategy) {
        case ConflictStrategy.LAST_WRITE_WINS:
          winner = conflict.local.metadata.updatedAt > conflict.remote.metadata.updatedAt
            ? conflict.local
            : conflict.remote;
          break;
          
        case ConflictStrategy.REMOTE_WINS:
          winner = conflict.remote;
          break;
          
        case ConflictStrategy.LOCAL_WINS:
          winner = conflict.local;
          break;
          
        case ConflictStrategy.MERGE:
          winner = await this.mergeItems(conflict.local, conflict.remote);
          break;
          
        case ConflictStrategy.USER_DECIDES:
          // Queue for user resolution
          this.conflictQueue.push(conflict);
          await this.emitConflictEvent(conflict);
          continue; // Skip to next conflict
          
        default:
          winner = conflict.remote; // Default to remote
      }
      
      // Update the winning item
      winner.sync.conflictStatus = 'resolved';
      winner.sync.version++;
      
      conflict.resolvedAt = new Date();
      conflict.resolvedBy = 'system';
      resolved.push(conflict);
      
      // Apply the resolution
      await this.applyResolution(winner);
    }
    
    return resolved;
  }

  /**
   * Merge two conflicting items
   */
  private async mergeItems(local: UnifiedReviewItem, remote: UnifiedReviewItem): Promise<UnifiedReviewItem> {
    // Intelligent merge - take the best of both
    return {
      ...local,
      scheduling: {
        ...local.scheduling,
        // Use higher values for progress
        repetitions: Math.max(local.scheduling.repetitions, remote.scheduling.repetitions),
        easeFactor: Math.max(local.scheduling.easeFactor, remote.scheduling.easeFactor),
        // Use most recent review
        lastReviewedAt: local.scheduling.lastReviewedAt! > remote.scheduling.lastReviewedAt!
          ? local.scheduling.lastReviewedAt
          : remote.scheduling.lastReviewedAt
      },
      metadata: {
        ...local.metadata,
        // Merge tags
        tags: [...new Set([...local.metadata.tags, ...remote.metadata.tags])],
        // Use most recent update
        updatedAt: new Date()
      },
      sync: {
        version: Math.max(local.sync.version, remote.sync.version) + 1,
        lastSyncedAt: new Date(),
        localChanges: false,
        remoteChanges: false,
        conflictStatus: 'resolved'
      }
    };
  }

  /**
   * Apply remote changes to local storage
   */
  private async applyRemoteChanges(changes: RemoteChanges, resolved: ConflictData[]): Promise<void> {
    const resolvedIds = new Set(resolved.map(c => c.itemId));
    
    // Apply items that weren't in conflict
    for (const item of changes.items) {
      if (!resolvedIds.has(item.id)) {
        item.sync.localChanges = false;
        await this.localDB.set(`item:${item.id}`, item);
      }
    }
    
    // Apply deletions
    for (const id of changes.deletions) {
      if (!resolvedIds.has(id)) {
        await this.localDB.delete(`item:${id}`);
      }
    }
    
    console.log(`[SyncEngine] Applied ${changes.items.length} remote changes`);
  }

  /**
   * Push local changes to remote storage
   */
  private async pushLocalChanges(changes: LocalChanges, resolved: ConflictData[]): Promise<void> {
    const resolvedIds = new Set(resolved.map(c => c.itemId));
    
    // Push created items
    for (const item of changes.created) {
      if (!resolvedIds.has(item.id)) {
        item.sync.remoteChanges = false;
        await this.remoteDB.set(`item:${item.id}`, item);
      }
    }
    
    // Push updated items
    for (const item of changes.updated) {
      if (!resolvedIds.has(item.id)) {
        item.sync.remoteChanges = false;
        await this.remoteDB.set(`item:${item.id}`, item);
      }
    }
    
    // Push deletions
    for (const id of changes.deleted) {
      if (!resolvedIds.has(id)) {
        await this.remoteDB.delete(`item:${id}`);
      }
    }
    
    console.log(`[SyncEngine] Pushed ${changes.created.length + changes.updated.length} local changes`);
  }

  /**
   * Apply conflict resolution
   */
  private async applyResolution(item: UnifiedReviewItem): Promise<void> {
    // Update both local and remote
    await this.localDB.set(`item:${item.id}`, item);
    await this.remoteDB.set(`item:${item.id}`, item);
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(userId: string, syncId: string): Promise<void> {
    const now = new Date();
    this.lastSyncTimestamp.set(userId, now);
    
    // Persist to local storage
    await this.localDB.set(`sync:${userId}:last`, {
      syncId,
      timestamp: now,
      userId
    });
  }

  /**
   * Load sync metadata from storage
   */
  private async loadSyncMetadata(): Promise<void> {
    // This would load all user sync timestamps
    // For now, just initialize
    console.log('[SyncEngine] Sync metadata loaded');
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || this.isSyncing) return;
    
    const batch: SyncQueueItem[] = [];
    const maxBatchSize = 50;
    
    // Get items to process
    while (batch.length < maxBatchSize && this.syncQueue.length > 0) {
      const item = this.syncQueue.shift();
      if (item) batch.push(item);
    }
    
    if (batch.length === 0) return;
    
    console.log(`[SyncEngine] Processing ${batch.length} queued items`);
    
    // Process batch
    for (const item of batch) {
      try {
        await this.remoteDB.set(`item:${item.item.id}`, item.item);
        console.log(`[SyncEngine] Synced item ${item.item.id}`);
      } catch (error) {
        item.attempts++;
        item.lastAttempt = new Date();
        item.error = error as Error;
        
        if (item.attempts < 3) {
          // Re-queue for retry
          this.syncQueue.push(item);
        } else {
          console.error(`[SyncEngine] Failed to sync item ${item.item.id} after ${item.attempts} attempts:`, error);
        }
      }
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(
    userId: string,
    status: SyncStatus['status'],
    result?: SyncResult,
    error?: Error
  ): void {
    const currentStatus = this.syncStatus.get(userId) || {
      userId,
      itemsSynced: 0,
      itemsPending: 0,
      conflicts: 0,
      errors: 0,
      status: 'idle'
    };
    
    currentStatus.status = status;
    
    if (result) {
      currentStatus.lastSyncTime = new Date();
      currentStatus.itemsSynced += result.itemsSynced;
      currentStatus.conflicts += result.conflictsResolved;
    }
    
    if (error) {
      currentStatus.errors++;
    }
    
    currentStatus.itemsPending = this.syncQueue.length;
    
    this.syncStatus.set(userId, currentStatus);
  }

  /**
   * Emit conflict event for user resolution
   */
  private async emitConflictEvent(conflict: ConflictData): Promise<void> {
    await this.eventBus.emit({
      type: ReviewEventType.SYNC_CONFLICT,
      source: ReviewSource.REVIEW_HUB,
      userId: 'system',
      data: {
        itemId: conflict.itemId,
        itemType: conflict.local.contentType || 'kanji',
        metadata: {
          local: conflict.local,
          remote: conflict.remote,
          strategy: conflict.strategy
        }
      },
      priority: EventPriority.HIGH
    });
  }

  /**
   * Generate sync ID
   */
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get sync status for a user
   */
  getSyncStatus(userId: string): SyncStatus | undefined {
    return this.syncStatus.get(userId);
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ConflictData[] {
    return [...this.conflictQueue];
  }

  /**
   * Resolve user conflict
   */
  async resolveUserConflict(conflictId: string, choice: 'local' | 'remote'): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.itemId === conflictId);
    
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    const winner = choice === 'local' ? conflict.local : conflict.remote;
    winner.sync.conflictStatus = 'resolved';
    winner.sync.version++;
    
    await this.applyResolution(winner);
    
    // Remove from queue
    this.conflictQueue = this.conflictQueue.filter(c => c.itemId !== conflictId);
    
    console.log(`[SyncEngine] User resolved conflict ${conflictId} with ${choice}`);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    
    // Process remaining queue items
    this.processQueue();
  }
}