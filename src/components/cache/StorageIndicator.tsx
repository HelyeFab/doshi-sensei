'use client';

import { useEffect, useState } from 'react';
import { useEviction } from '@/hooks/useEviction';
import { ResourceType } from '@/types/cache';
import { formatBytes } from '@/lib/cache/eviction/storageLimits';

interface StorageIndicatorProps {
  resourceType: ResourceType;
  className?: string;
  showDetails?: boolean;
}

export function StorageIndicator({ 
  resourceType, 
  className = '', 
  showDetails = false 
}: StorageIndicatorProps) {
  const { getStats, formatStorageDisplay } = useEviction();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [resourceType]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const storageStats = await getStats(resourceType);
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  const utilizationColor = 
    stats.utilizationPercent >= 90 ? 'text-red-500' :
    stats.utilizationPercent >= 70 ? 'text-yellow-500' :
    'text-green-500';

  const progressBarColor = 
    stats.utilizationPercent >= 90 ? 'bg-red-500' :
    stats.utilizationPercent >= 70 ? 'bg-yellow-500' :
    'bg-green-500';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Compact View */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Storage
        </span>
        <span className={`font-medium ${utilizationColor}`}>
          {stats.currentCount}/{stats.limitCount === Infinity ? '∞' : stats.limitCount}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${progressBarColor}`}
          style={{ width: `${Math.min(stats.utilizationPercent, 100)}%` }}
        />
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{formatBytes(stats.currentSizeBytes)} / {formatBytes(stats.limitSizeBytes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Usage:</span>
            <span className={utilizationColor}>{stats.utilizationPercent.toFixed(0)}%</span>
          </div>
          {stats.utilizationPercent >= 70 && (
            <p className="text-yellow-500 mt-2">
              ⚠️ Storage is {stats.utilizationPercent >= 90 ? 'nearly full' : 'filling up'}. 
              Older items will be removed automatically when needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}