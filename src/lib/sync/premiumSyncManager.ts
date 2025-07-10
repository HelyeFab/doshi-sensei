import { FirebaseSyncAdapter } from './firebaseSyncAdapter';
import { 
  SyncManifest, 
  SyncResult, 
  SyncOperation, 
  SyncQueueItem,
  SyncConflict,
  SyncProgress,
  SyncStatus
} from './types';
import { syncLogger } from './utils/logger';
import { CachedResource, ResourceType } from '@/lib/cache/types';
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { SyncEvictionIntegration } from './syncEvictionIntegration';

export class PremiumSyncManager {
  private syncInProgress = false;
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private firebaseAdapter: FirebaseSyncAdapter;
  private storageManager: typeof EnhancedStorageManager2;
  private syncEvictionIntegration: SyncEvictionIntegration;
  private syncProgressCallback?: (progress: SyncProgress) => void;
  private currentSyncController?: AbortController;

  constructor() {
    this.firebaseAdapter = new FirebaseSyncAdapter();
    this.storageManager = EnhancedStorageManager2;
    this.syncEvictionIntegration = SyncEvictionIntegration.getInstance();
  }

  /**
   * Main sync method - performs full sync for a user
   */
  async performSync(userId: string, progressCallback?: (progress: SyncProgress) => void): Promise<SyncResult> {
    // Early return if no userId (this should never happen but let's be safe)
    if (!userId) {
      return {
        success: false,
        resourcesSynced: 0,
        resourcesDownloaded: 0,
        resourcesUploaded: 0,
        conflicts: 0,
        error: 'No user ID provided',
        startTime: Date.now(),
        endTime: Date.now(),
        syncDuration: 0
      };
    }
    
    if (this.syncInProgress) {
      return {
        success: false,
        resourcesSynced: 0,
        resourcesDownloaded: 0,
        resourcesUploaded: 0,
        conflicts: 0,
        error: 'Sync already in progress',
        startTime: Date.now(),
        endTime: Date.now(),
        syncDuration: 0
      };
    }

    this.syncInProgress = true;
    this.syncProgressCallback = progressCallback;
    this.currentSyncController = new AbortController();
    
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      resourcesSynced: 0,
      resourcesDownloaded: 0,
      resourcesUploaded: 0,
      conflicts: 0,
      startTime,
      endTime: 0,
      syncDuration: 0
    };

    try {
      // Check connectivity first
      const isOnline = await this.firebaseAdapter.checkConnectivity();
      if (!isOnline) {
        throw new Error('No network connectivity');
      }

      // Get local and remote manifests
      this.reportProgress(0, 4, 'Fetching sync manifests');
      const [localManifest, remoteManifest] = await Promise.all([
        this.getLocalManifest(userId),
        this.firebaseAdapter.getUserManifest(userId)
      ]);

      // If no remote manifest exists, this is first sync
      if (!remoteManifest) {
        this.reportProgress(1, 4, 'Performing initial sync');
        await this.performInitialSync(userId, localManifest);
        result.resourcesUploaded = Object.keys(localManifest.resources).length;
        result.resourcesSynced = result.resourcesUploaded;
      } else {
        // Compare manifests and determine operations
        this.reportProgress(1, 4, 'Comparing manifests');
        const operations = this.compareManifests(localManifest, remoteManifest);
        
        // Check storage feasibility
        const feasibility = await this.checkSyncFeasibility(userId, operations);
        if (feasibility.warnings.length > 0) {
          syncLogger.warn('Sync storage warnings:', feasibility.warnings);
        }
        
        // Process sync operations
        this.reportProgress(2, 4, 'Syncing resources');
        const syncResults = await this.processSyncOperations(
          userId, 
          operations, 
          localManifest, 
          remoteManifest
        );
        
        result.resourcesDownloaded = syncResults.downloaded;
        result.resourcesUploaded = syncResults.uploaded;
        result.conflicts = syncResults.conflicts;
        result.resourcesSynced = syncResults.downloaded + syncResults.uploaded;
      }

      // Update remote manifest with current state
      this.reportProgress(3, 4, 'Updating sync manifest');
      const finalManifest = await this.getLocalManifest(userId);
      await this.firebaseAdapter.saveUserManifest(userId, finalManifest);

      // Process any queued operations
      await this.processQueue(userId);

      this.reportProgress(4, 4, 'Sync completed');
    } catch (error) {
      syncLogger.error('Sync error:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown sync error';
    } finally {
      this.syncInProgress = false;
      this.syncProgressCallback = undefined;
      this.currentSyncController = undefined;
      
      result.endTime = Date.now();
      result.syncDuration = result.endTime - result.startTime;
    }

    return result;
  }

  /**
   * Cancel ongoing sync
   */
  cancelSync(): void {
    if (this.currentSyncController) {
      this.currentSyncController.abort();
    }
  }

  /**
   * Perform initial sync (upload all local resources)
   */
  private async performInitialSync(userId: string, localManifest: SyncManifest): Promise<void> {
    const resources = await this.getAllLocalResources();
    const resourcesToUpload = resources.filter(r => r.id in localManifest.resources);
    
    // Check storage info for logging
    const storageInfo = await this.syncEvictionIntegration.getSyncStorageInfo(userId);
    syncLogger.debug('Initial sync storage info:', {
      userType: storageInfo.userType,
      resourceCount: resourcesToUpload.length,
      limits: storageInfo.limits
    });
    
    // Upload in batches for efficiency
    await this.firebaseAdapter.uploadResourcesBatch(userId, resourcesToUpload);
    
    // Save manifest
    await this.firebaseAdapter.saveUserManifest(userId, localManifest);
  }

  /**
   * Compare local and remote manifests to determine sync operations
   */
  private compareManifests(
    local: SyncManifest, 
    remote: SyncManifest
  ): Map<string, SyncOperation> {
    const operations = new Map<string, SyncOperation>();
    
    // Check for resources to download (in remote but not local)
    for (const [resourceId, remoteInfo] of Object.entries(remote.resources)) {
      if (!local.resources[resourceId]) {
        operations.set(resourceId, 'download');
      } else {
        // Check for conflicts (both modified)
        const localInfo = local.resources[resourceId];
        if (localInfo.checksum !== remoteInfo.checksum) {
          // Simple conflict resolution: last-write-wins
          if (remoteInfo.lastModified > localInfo.lastModified) {
            operations.set(resourceId, 'download');
          } else if (localInfo.lastModified > remoteInfo.lastModified) {
            operations.set(resourceId, 'upload');
          } else {
            operations.set(resourceId, 'conflict');
          }
        }
      }
    }
    
    // Check for resources to upload (in local but not remote)
    for (const resourceId of Object.keys(local.resources)) {
      if (!remote.resources[resourceId]) {
        operations.set(resourceId, 'upload');
      }
    }
    
    return operations;
  }

  /**
   * Process sync operations
   */
  private async processSyncOperations(
    userId: string,
    operations: Map<string, SyncOperation>,
    localManifest: SyncManifest,
    remoteManifest: SyncManifest
  ): Promise<{ downloaded: number; uploaded: number; conflicts: number }> {
    let downloaded = 0;
    let uploaded = 0;
    let conflicts = 0;
    
    const totalOperations = operations.size;
    let currentOperation = 0;

    for (const [resourceId, operation] of operations) {
      if (this.currentSyncController?.signal.aborted) {
        throw new Error('Sync cancelled');
      }

      currentOperation++;
      this.reportProgress(
        currentOperation, 
        totalOperations, 
        `Processing ${operation}: ${resourceId}`
      );

      try {
        switch (operation) {
          case 'download':
            const downloadedResource = await this.firebaseAdapter.downloadResource(userId, resourceId);
            if (downloadedResource) {
              // Use eviction-aware caching
              await this.syncEvictionIntegration.cacheResourceWithEviction(
                downloadedResource,
                userId
              );
              downloaded++;
            }
            break;
            
          case 'upload':
            const localResource = await this.storageManager.getCachedResource(resourceId);
            if (localResource) {
              await this.firebaseAdapter.uploadResource(userId, localResource);
              uploaded++;
            }
            break;
            
          case 'conflict':
            // For now, use simple last-write-wins
            const localRes = await this.storageManager.getCachedResource(resourceId);
            const remoteRes = await this.firebaseAdapter.downloadResource(userId, resourceId);
            
            if (localRes && remoteRes) {
              const resolved = await this.resolveConflict(localRes, remoteRes);
              if (resolved === localRes) {
                await this.firebaseAdapter.uploadResource(userId, localRes);
                uploaded++;
              } else {
                // Use eviction-aware caching
                await this.syncEvictionIntegration.cacheResourceWithEviction(
                  remoteRes,
                  userId
                );
                downloaded++;
              }
              conflicts++;
            }
            break;
        }
      } catch (error) {
        syncLogger.error(`Error processing ${operation} for ${resourceId}:`, error);
        // Queue for retry
        this.queueForSync(resourceId, operation);
      }
    }
    
    return { downloaded, uploaded, conflicts };
  }

  /**
   * Resolve sync conflicts (simple last-write-wins for now)
   */
  private async resolveConflict(
    local: CachedResource, 
    remote: CachedResource
  ): Promise<CachedResource> {
    // Simple strategy: last-write-wins
    if (local.metadata.lastAccessed > remote.metadata.lastAccessed) {
      return local;
    }
    return remote;
  }

  /**
   * Queue changes for next sync
   */
  queueForSync(resourceId: string, operation: SyncOperation): void {
    this.syncQueue.set(resourceId, {
      resourceId,
      operation,
      timestamp: Date.now(),
      retryCount: this.syncQueue.get(resourceId)?.retryCount || 0
    });
  }

  /**
   * Process queued sync operations
   */
  private async processQueue(userId: string): Promise<void> {
    const queueItems = Array.from(this.syncQueue.values());
    
    for (const item of queueItems) {
      if (item.retryCount >= 3) {
        // Max retries reached, remove from queue
        this.syncQueue.delete(item.resourceId);
        continue;
      }

      try {
        switch (item.operation) {
          case 'upload':
            const resource = await this.storageManager.getCachedResource(item.resourceId);
            if (resource) {
              await this.firebaseAdapter.uploadResource(userId, resource);
            }
            break;
            
          case 'download':
            const downloaded = await this.firebaseAdapter.downloadResource(userId, item.resourceId);
            if (downloaded) {
              // Use eviction-aware caching
              await this.syncEvictionIntegration.cacheResourceWithEviction(
                downloaded,
                userId
              );
            }
            break;
        }
        
        // Success, remove from queue
        this.syncQueue.delete(item.resourceId);
      } catch (error) {
        // Increment retry count
        item.retryCount++;
        this.syncQueue.set(item.resourceId, item);
      }
    }
  }

  /**
   * Get local manifest from cached resources
   */
  private async getLocalManifest(userId: string): Promise<SyncManifest> {
    const resources = await this.getAllLocalResources();
    const manifest: SyncManifest = {
      userId,
      lastSyncTimestamp: Date.now(),
      resources: {}
    };
    
    for (const resource of resources) {
      manifest.resources[resource.id] = {
        type: resource.type,
        version: resource.metadata.version,
        checksum: resource.metadata.checksum,
        lastModified: resource.metadata.lastAccessed
      };
    }
    
    return manifest;
  }

  /**
   * Get all local cached resources
   */
  private async getAllLocalResources(): Promise<CachedResource[]> {
    const types = ['article', 'story', 'audio', 'kanji', 'verb', 'adjective'] as const;
    const allResources: CachedResource[] = [];
    
    for (const type of types) {
      const resources = await this.storageManager.getResourcesByType(type);
      allResources.push(...resources);
    }
    
    return allResources;
  }

  /**
   * Report sync progress
   */
  private reportProgress(current: number, total: number, operation: string): void {
    if (this.syncProgressCallback) {
      this.syncProgressCallback({
        current,
        total,
        operation
      });
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    if (this.syncInProgress) return 'syncing';
    if (this.syncQueue.size > 0) return 'idle'; // Has pending items
    return 'completed';
  }

  /**
   * Get queued items count
   */
  getQueuedItemsCount(): number {
    return this.syncQueue.size;
  }

  /**
   * Check if sync can proceed without hitting storage limits
   */
  private async checkSyncFeasibility(
    userId: string,
    operations: Map<string, SyncOperation>
  ): Promise<{ canProceed: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    const downloadOps = Array.from(operations.entries())
      .filter(([_, op]) => op === 'download' || op === 'conflict');
    
    if (downloadOps.length === 0) {
      return { canProceed: true, warnings };
    }

    const storageInfo = await this.syncEvictionIntegration.getSyncStorageInfo(userId);
    
    // Group by resource type
    const downloadsByType: Record<string, number> = {};
    for (const [resourceId] of downloadOps) {
      const type = resourceId.split('-')[0]; // Assumes format like 'article-123'
      downloadsByType[type] = (downloadsByType[type] || 0) + 1;
    }

    // Check each type
    for (const [type, count] of Object.entries(downloadsByType)) {
      const available = storageInfo.available[type as ResourceType];
      if (available && count > available.count) {
        warnings.push(
          `Downloading ${count} ${type}s will exceed your limit. ` +
          `${count - available.count} existing items will be removed.`
        );
      }
    }

    return { canProceed: true, warnings };
  }
}