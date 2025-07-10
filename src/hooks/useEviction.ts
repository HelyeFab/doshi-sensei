import { useCallback, useEffect, useState } from "react";
import { useSubscription2 } from "./useSubscription2";
import { evictionEngine } from "@/lib/cache/eviction/lruEvictionEngine";
import { ResourceType } from "@/types/cache";
import { StorageStats, EvictionResult } from "@/lib/cache/eviction/types";
import { formatBytes } from "@/lib/cache/eviction/storageLimits";

interface UseEvictionReturn {
  // Storage stats for a resource type
  getStats: (resourceType: ResourceType) => Promise<StorageStats | null>;
  
  // Check if eviction needed
  checkEvictionNeeded: (resourceType: ResourceType, newSize: number) => Promise<boolean>;
  
  // Manually trigger eviction
  triggerEviction: (resourceType: ResourceType) => Promise<EvictionResult | null>;
  
  // Mark resource as active/inactive
  markActive: (resourceId: string) => void;
  markInactive: (resourceId: string) => void;
  
  // UI helpers
  formatStorageDisplay: (stats: StorageStats) => string;
  isLoading: boolean;
  error: string | null;
}

export function useEviction(): UseEvictionReturn {
  const { userType } = useSubscription2();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get storage statistics
  const getStats = useCallback(
    async (resourceType: ResourceType): Promise<StorageStats | null> => {
      if (!userType) return null;

      try {
        setError(null);
        const stats = await evictionEngine.getStorageStats(resourceType, userType);
        return stats;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get storage stats";
        setError(message);
        console.error("Failed to get storage stats:", err);
        return null;
      }
    },
    [userType]
  );

  // Check if eviction is needed
  const checkEvictionNeeded = useCallback(
    async (resourceType: ResourceType, newSize: number): Promise<boolean> => {
      if (!userType) return false;

      try {
        setError(null);
        return await evictionEngine.requiresEviction(resourceType, userType, newSize);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check eviction";
        setError(message);
        console.error("Failed to check eviction:", err);
        return false;
      }
    },
    [userType]
  );

  // Manually trigger eviction
  const triggerEviction = useCallback(
    async (resourceType: ResourceType): Promise<EvictionResult | null> => {
      if (!userType) return null;

      try {
        setIsLoading(true);
        setError(null);
        const result = await evictionEngine.enforceLimit(resourceType, userType);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to evict resources";
        setError(message);
        console.error("Failed to evict resources:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userType]
  );

  // Mark resource as active
  const markActive = useCallback((resourceId: string) => {
    evictionEngine.markActive(resourceId);
  }, []);

  // Mark resource as inactive
  const markInactive = useCallback((resourceId: string) => {
    evictionEngine.markInactive(resourceId);
  }, []);

  // Format storage display for UI
  const formatStorageDisplay = useCallback((stats: StorageStats): string => {
    const usedSize = formatBytes(stats.currentSizeBytes);
    const limitSize = formatBytes(stats.limitSizeBytes);
    const countText = stats.limitCount === Infinity 
      ? `${stats.currentCount} items`
      : `${stats.currentCount}/${stats.limitCount} items`;
    
    return `${countText} • ${usedSize}/${limitSize} • ${stats.utilizationPercent.toFixed(0)}% used`;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Any cleanup if needed
    };
  }, []);

  return {
    getStats,
    checkEvictionNeeded,
    triggerEviction,
    markActive,
    markInactive,
    formatStorageDisplay,
    isLoading,
    error,
  };
}