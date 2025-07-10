import { LRUEvictionEngine } from '@/lib/cache/eviction/lruEvictionEngine';
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { CachedResource, ResourceType } from '@/lib/cache/types';
import { UserType } from '@/types/user';
import { useSubscription2 } from '@/hooks/useSubscription2';

/**
 * Integration layer between sync and eviction systems
 * Ensures sync operations respect storage limits and trigger eviction when needed
 */
export class SyncEvictionIntegration {
  private static instance: SyncEvictionIntegration;
  private evictionEngine: LRUEvictionEngine;
  private storageManager: typeof EnhancedStorageManager2;

  private constructor() {
    this.evictionEngine = LRUEvictionEngine.getInstance();
    this.storageManager = EnhancedStorageManager2;
  }

  static getInstance(): SyncEvictionIntegration {
    if (!this.instance) {
      this.instance = new SyncEvictionIntegration();
    }
    return this.instance;
  }

  /**
   * Cache resource with eviction check
   * This should be used by sync manager instead of direct storageManager.cacheResource
   */
  async cacheResourceWithEviction(
    resource: CachedResource,
    userId: string,
    userType?: UserType
  ): Promise<void> {
    // Determine user type if not provided
    const effectiveUserType = userType || (await this.getUserType(userId));
    
    // Check if eviction is required before caching
    const needsEviction = await this.evictionEngine.requiresEviction(
      resource.type as ResourceType,
      effectiveUserType,
      resource.metadata.size
    );

    if (needsEviction) {
      console.log(`[SyncEviction] Eviction required for ${resource.type} (user: ${effectiveUserType})`);
      
      // Protect this resource temporarily during sync
      this.evictionEngine.protectResource(resource.id);
      
      try {
        // Perform eviction
        const evictionResult = await this.evictionEngine.enforceLimit(
          resource.type as ResourceType,
          effectiveUserType
        );
        
        if (!evictionResult.success) {
          console.error('[SyncEviction] Eviction failed:', evictionResult.errors);
          throw new Error(`Failed to make space for synced resource: ${evictionResult.errors.join(', ')}`);
        }
        
        console.log(`[SyncEviction] Evicted ${evictionResult.itemsEvicted} items, freed ${evictionResult.bytesFreed} bytes`);
      } finally {
        // Unprotect the resource
        this.evictionEngine.unprotectResource(resource.id);
      }
    }

    // Now cache the resource
    await this.storageManager.cacheResource(resource, effectiveUserType);
  }

  /**
   * Batch cache resources with eviction check
   * Handles multiple resources efficiently
   */
  async batchCacheWithEviction(
    resources: CachedResource[],
    userId: string,
    userType?: UserType
  ): Promise<{ cached: number; failed: number; errors: string[] }> {
    const effectiveUserType = userType || (await this.getUserType(userId));
    const result = { cached: 0, failed: 0, errors: [] as string[] };

    // Group resources by type for efficient eviction
    const resourcesByType = resources.reduce((acc, resource) => {
      const type = resource.type as ResourceType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(resource);
      return acc;
    }, {} as Record<ResourceType, CachedResource[]>);

    // Process each type
    for (const [type, typeResources] of Object.entries(resourcesByType)) {
      const resourceType = type as ResourceType;
      
      // Calculate total size needed
      const totalSize = typeResources.reduce((sum, r) => sum + r.metadata.size, 0);
      
      // Check if eviction is needed for this batch
      const needsEviction = await this.evictionEngine.requiresEviction(
        resourceType,
        effectiveUserType,
        totalSize
      );

      if (needsEviction) {
        // Protect all resources in this batch
        typeResources.forEach(r => this.evictionEngine.protectResource(r.id));
        
        try {
          const evictionResult = await this.evictionEngine.enforceLimit(
            resourceType,
            effectiveUserType
          );
          
          if (!evictionResult.success) {
            result.errors.push(`Failed to evict for ${type}: ${evictionResult.errors.join(', ')}`);
            result.failed += typeResources.length;
            continue;
          }
        } finally {
          // Unprotect resources
          typeResources.forEach(r => this.evictionEngine.unprotectResource(r.id));
        }
      }

      // Cache resources one by one
      for (const resource of typeResources) {
        try {
          await this.storageManager.cacheResource(resource, effectiveUserType);
          result.cached++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to cache ${resource.id}: ${error}`);
        }
      }
    }

    return result;
  }

  /**
   * Get user type from userId
   * This is a simplified version - in production, this would query the user's subscription
   */
  private async getUserType(userId: string): Promise<UserType> {
    // In a real implementation, this would check the user's subscription status
    // For now, we'll default to 'free' for safety
    return 'free';
  }

  /**
   * Pre-check if sync will require eviction
   * Useful for warning users before sync
   */
  async willSyncRequireEviction(
    resourceCount: number,
    resourceType: ResourceType,
    userId: string,
    estimatedSizePerResource: number = 50 * 1024 // 50KB default
  ): Promise<boolean> {
    const userType = await this.getUserType(userId);
    const estimatedTotalSize = resourceCount * estimatedSizePerResource;
    
    return this.evictionEngine.requiresEviction(
      resourceType,
      userType,
      estimatedTotalSize
    );
  }

  /**
   * Get sync storage info
   * Returns current usage and limits for sync planning
   */
  async getSyncStorageInfo(userId: string): Promise<{
    userType: UserType;
    limits: Record<ResourceType, { count: number; sizeBytes: number }>;
    usage: Record<ResourceType, { count: number; sizeBytes: number }>;
    available: Record<ResourceType, { count: number; sizeBytes: number }>;
  }> {
    const userType = await this.getUserType(userId);
    const stats = await this.evictionEngine.getStorageStats(userType);
    
    const info = {
      userType,
      limits: {} as Record<ResourceType, { count: number; sizeBytes: number }>,
      usage: {} as Record<ResourceType, { count: number; sizeBytes: number }>,
      available: {} as Record<ResourceType, { count: number; sizeBytes: number }>
    };

    for (const [type, usage] of Object.entries(stats.usage)) {
      const resourceType = type as ResourceType;
      const limit = stats.limits[type];
      
      info.limits[resourceType] = limit;
      info.usage[resourceType] = usage;
      info.available[resourceType] = {
        count: limit.count - usage.count,
        sizeBytes: limit.sizeBytes - usage.sizeBytes
      };
    }

    return info;
  }
}