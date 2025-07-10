import { useCallback, useEffect, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { ArticleCache } from '@/lib/cache/articleCache';
import EnhancedStorageManager2, { UserType } from '@/utils/enhancedStorageManager2';
import { ResourceType } from '@/types/cache';
import { useEviction } from '@/hooks/useEviction';
import { formatBytes } from '@/lib/cache/eviction/storageLimits';

interface OfflineContentHook {
  cacheResource: (resource: any) => Promise<boolean>;
  getCachedCount: () => Promise<number>;
  getCachedResources: () => Promise<any[]>;
  clearCache: () => Promise<void>;
  canCache: boolean;
  maxAllowed: number;
  currentCount: number;
  userType: UserType;
  isLoading: boolean;
  error: string | null;
  // Storage stats
  storageStats: {
    count: string;
    size: string;
    utilization: number;
  } | null;
  // Eviction management
  markResourceActive: (resourceId: string) => void;
  markResourceInactive: (resourceId: string) => void;
}

export function useOfflineContent(resourceType: ResourceType): OfflineContentHook {
  const { checkAndTrack } = useAccess();
  const { feature, access } = useFeature(`offline_${resourceType}s`);
  const { userType: subUserType, isPremium } = useSubscription2();
  const { getStats, markActive, markInactive, formatStorageDisplay } = useEviction();
  
  const [currentCount, setCurrentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  
  // Map subscription user type to our UserType
  // Keep original types (monthly/yearly) or map to standard types
  let userType: UserType;
  if (subUserType === 'guest') {
    userType = 'guest';
  } else if (subUserType === 'free') {
    userType = 'free';
  } else if (subUserType === 'monthly' || subUserType === 'yearly') {
    userType = subUserType; // Keep the specific premium type
  } else {
    userType = 'free'; // Default fallback
  }
  
  // Load current cached count and stats on mount
  useEffect(() => {
    loadCachedCount();
    loadStorageStats();
  }, [resourceType, userType]);
  
  const loadCachedCount = async () => {
    try {
      setIsLoading(true);
      const resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
      setCurrentCount(resources.length);
    } catch (err) {
      console.error('Failed to load cached count:', err);
      setError('Failed to load cached resources');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadStorageStats = async () => {
    try {
      const stats = await getStats(resourceType);
      if (stats) {
        setStorageStats({
          count: `${stats.currentCount}/${stats.limitCount === Infinity ? '∞' : stats.limitCount}`,
          size: `${formatBytes(stats.currentSizeBytes)}/${formatBytes(stats.limitSizeBytes)}`,
          utilization: stats.utilizationPercent
        });
      }
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }
  };
  
  const cacheResource = useCallback(async (resource: any): Promise<boolean> => {
    try {
      // Check if user can cache this resource using three-pillar system
      const canCache = await checkAndTrack(`offline_${resourceType}s`);
      
      if (!canCache) {
        // Access denied modal shown automatically by checkAndTrack
        return false;
      }
      
      // Cache the resource based on type
      if (resourceType === 'article') {
        await ArticleCache.cacheArticle(resource, userType);
      } else if (resourceType === 'story') {
        // StoryCache would be implemented similarly
        console.log('Story caching not yet implemented');
      } else {
        // Generic caching for other resource types
        await EnhancedStorageManager2.cacheResource({
          id: resource.id,
          type: resourceType,
          data: resource,
          metadata: {
            size: JSON.stringify(resource).length,
            cachedAt: Date.now(),
            lastAccessed: Date.now(),
            version: '1.0',
            checksum: await EnhancedStorageManager2.generateChecksum(resource)
          }
        }, userType);
      }
      
      // Update count and stats
      await loadCachedCount();
      await loadStorageStats();
      
      return true;
    } catch (err) {
      console.error('Failed to cache resource:', err);
      setError('Failed to cache resource');
      return false;
    }
  }, [resourceType, checkAndTrack, userType]);
  
  const getCachedCount = useCallback(async (): Promise<number> => {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
      return resources.length;
    } catch (err) {
      console.error('Failed to get cached count:', err);
      return 0;
    }
  }, [resourceType]);
  
  const getCachedResources = useCallback(async (): Promise<any[]> => {
    try {
      const resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
      return resources.map(r => r.data);
    } catch (err) {
      console.error('Failed to get cached resources:', err);
      return [];
    }
  }, [resourceType]);
  
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      if (resourceType === 'article') {
        await ArticleCache.clearCache();
      } else {
        // Clear specific resource type from cache
        const resources = await EnhancedStorageManager2.getResourcesByType(resourceType);
        // Individual removal would be implemented in EnhancedStorageManager2
        console.log(`Clearing ${resources.length} ${resourceType} resources`);
      }
      
      await loadCachedCount();
      await loadStorageStats();
    } catch (err) {
      console.error('Failed to clear cache:', err);
      setError('Failed to clear cache');
    }
  }, [resourceType]);
  
  // Determine if user can cache more resources
  const canCache = currentCount < (access?.remaining || 0);
  
  return {
    cacheResource,
    getCachedCount,
    getCachedResources,
    clearCache,
    canCache,
    maxAllowed: access?.remaining || 0,
    currentCount,
    userType,
    isLoading,
    error,
    storageStats,
    markResourceActive: markActive,
    markResourceInactive: markInactive
  };
}