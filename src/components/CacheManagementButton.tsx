'use client';

import { useState } from 'react';
import { forceClearCache, smartCacheClear, getCacheSize } from '@/utils/serviceWorkerUtils';
import { useToast } from '@/hooks/useToast';

export function CacheManagementButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [cacheSize, setCacheSize] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGetCacheSize = async () => {
    const size = await getCacheSize();
    setCacheSize(size);
  };

  const handleSmartClear = async () => {
    setIsClearing(true);
    try {
      await smartCacheClear();
      toast.success('Old caches cleared', 'Your app cache has been refreshed');
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      toast.error('Failed to clear cache', 'Please try again');
    } finally {
      setIsClearing(false);
    }
  };

  const handleForceClear = async () => {
    if (confirm('This will clear ALL app data and reload the page. Continue?')) {
      toast.info('Clearing all data...', 'The page will reload shortly');
      await forceClearCache();
    }
  };

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="font-semibold mb-3">Cache Management</h3>
      
      <div className="space-y-3">
        {cacheSize && (
          <p className="text-sm text-muted">
            Current cache size: <span className="font-medium">{cacheSize}</span>
          </p>
        )}
        
        <div className="flex flex-col gap-2">
          <button
            onClick={handleGetCacheSize}
            className="px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            Check Cache Size
          </button>
          
          <button
            onClick={handleSmartClear}
            disabled={isClearing}
            className="px-4 py-2 bg-warning/10 text-warning rounded hover:bg-warning/20 transition-colors disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear Old Caches'}
          </button>
          
          <button
            onClick={handleForceClear}
            className="px-4 py-2 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
          >
            Force Clear Everything
          </button>
        </div>
        
        <p className="text-xs text-muted">
          If you're experiencing issues with outdated content, try clearing old caches first.
          Only use "Force Clear" as a last resort.
        </p>
      </div>
    </div>
  );
}