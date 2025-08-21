/**
 * Adapter to bridge the gap between storage and sync systems
 * This fixes the structural mismatch that's causing sync to fail
 */

import { CachedResource } from '@/lib/cache/types';
import { performDBOperation, isIndexedDBAvailable } from '@/utils/indexedDB';

export class SyncDataAdapter {
  /**
   * Get resources that are actually syncable from IndexedDB
   * This bypasses the broken transformToCachedResource logic
   */
  static async getSyncableResources(): Promise<CachedResource[]> {
    const resources: CachedResource[] = [];
    
    try {
      // Check if IndexedDB is available
      if (!isIndexedDBAvailable()) {

        return [];
      }
      
      // IMPORTANT: articles and stories stores don't exist!
      // Everything is in apiCache with endpoint-based keys
      const items = await performDBOperation('apiCache', 'readonly', (store) => 
        store.getAll()
      );
      
      // Make sure items is an array
      if (!items || !Array.isArray(items)) {

        return [];
      }

      // Transform each item to CachedResource format
      for (const item of items) {
        if (!item) continue; // Skip null/undefined items
        
        const resource = this.itemToCachedResource(item, 'apiCache');
        if (resource && this.isSyncableResource(resource)) {
          resources.push(resource);
        }
      }

      return resources;
      
    } catch (error) {
      console.error('[SyncAdapter] Fatal error getting resources:', error);
      return [];
    }
  }
  
  /**
   * Check if a resource should be synced
   */
  private static isSyncableResource(resource: CachedResource): boolean {
    // Only sync article and story types
    const syncableTypes = ['article', 'story'];
    
    // Check if the resource type indicates it's an article or story
    if (resource.type && typeof resource.type === 'string') {
      const type = resource.type.toLowerCase();
      return syncableTypes.some(t => type.includes(t));
    }
    
    return false;
  }
  
  /**
   * Convert various storage formats to CachedResource
   */
  private static itemToCachedResource(item: any, storeName: string): CachedResource | null {
    if (!item) return null;
    
    try {
      // Handle apiCache items - this is where everything is stored
      if (storeName === 'apiCache' && item.id && item.endpoint) {
        // Determine the resource type from the endpoint or data structure
        let resourceType: string = 'unknown';
        
        // Check if it's an article (common patterns)
        if (item.endpoint?.includes('article') || 
            item.endpoint?.includes('news') ||
            item.data?.slug || 
            item.data?.title && item.data?.content) {
          resourceType = 'article';
        }
        // Check if it's a story
        else if (item.endpoint?.includes('story') || 
                 item.data?.sections || 
                 item.data?.theme) {
          resourceType = 'story';
        }
        // Check other types
        else if (item.endpoint?.includes('kanji')) {
          resourceType = 'kanji';
        }
        else if (item.endpoint?.includes('verb')) {
          resourceType = 'verb';
        }
        else if (item.endpoint?.includes('adjective')) {
          resourceType = 'adjective';
        }
        else if (item.endpoint?.includes('audio')) {
          resourceType = 'audio';
        }
        
        // Extract the actual data
        const actualData = item.response || item.data || item;
        
        return {
          id: item.id || `${resourceType}-${Date.now()}`,
          type: resourceType as any,
          data: actualData,
          metadata: {
            size: item.size || JSON.stringify(actualData).length,
            cachedAt: item.timestamp || item.cacheDate || Date.now(),
            lastAccessed: item.timestamp || Date.now(),
            expiresAt: item.expiryDate || Date.now() + (24 * 60 * 60 * 1000),
            version: 1,
            checksum: item.checksum || this.generateChecksum(actualData)
          }
        };
      }
      
      return null;
    } catch (error) {

      return null;
    }
  }
  
  /**
   * Save a synced resource back to IndexedDB in the correct format
   */
  static async saveResourceToStorage(resource: CachedResource): Promise<void> {
    try {
      // Convert CachedResource back to apiCache format
      const apiCacheItem = {
        id: resource.id,
        endpoint: resource.type, // Use type as endpoint
        data: resource.data,
        response: resource.data, // Some code expects 'response' field
        timestamp: resource.metadata.cachedAt,
        cacheDate: resource.metadata.cachedAt,
        expiryDate: resource.metadata.expiresAt || Date.now() + (30 * 24 * 60 * 60 * 1000),
        size: resource.metadata.size,
        checksum: resource.metadata.checksum
      };
      
      // Save to apiCache store
      await performDBOperation('apiCache', 'readwrite', (store) => 
        store.put(apiCacheItem)
      );

    } catch (error) {
      console.error('[SyncAdapter] Error saving resource to storage:', error);
      throw error;
    }
  }
  
  /**
   * Generate a simple checksum for data integrity
   */
  private static generateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}