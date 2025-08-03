import { useState, useEffect, useCallback, useRef } from 'react';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumSyncManager } from '@/lib/sync/premiumSyncManager';
import { SyncStatus, SyncResult, SyncProgress } from '@/lib/sync/types';

interface UsePremiumSyncReturn {
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  syncProgress: SyncProgress | null;
  isSyncing: boolean;
  syncError: string | null;
  queuedItems: number;
  triggerSync: () => Promise<void>;
  cancelSync: () => void;
  clearSyncError: () => void;
}

export function usePremiumSync(): UsePremiumSyncReturn {
  const { isPremium, userType } = useSubscription2();
  const { user } = useAuth();
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [queuedItems, setQueuedItems] = useState(0);
  
  const syncManagerRef = useRef<PremiumSyncManager | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sync manager ONLY for premium users
  useEffect(() => {
    if (isPremium && !syncManagerRef.current) {
      syncManagerRef.current = new PremiumSyncManager();
    } else if (!isPremium && syncManagerRef.current) {
      // Clean up sync manager if user is no longer premium
      syncManagerRef.current = null;
    }
  }, [isPremium]);

  // Initialize sync for premium users
  useEffect(() => {
    // Only initialize sync if user is authenticated AND premium
    if (user && isPremium) {
      initializeSync(user.uid);
      
      // Update service worker premium status
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_PREMIUM_STATUS',
          isPremium: true
        });
      }

      // Set up automatic sync every 30 minutes
      syncIntervalRef.current = setInterval(() => {
        triggerSync();
      }, 30 * 60 * 1000);

      // Listen for sync requests from service worker
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'PREMIUM_SYNC_REQUESTED') {
          triggerSync();
        }
      };
      
      navigator.serviceWorker?.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker?.removeEventListener('message', handleMessage);
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    } else {
      // Update service worker premium status
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_PREMIUM_STATUS',
          isPremium: false
        });
      }
    }
  }, [isPremium, user]);

  // Load last sync time from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`lastSyncTime_${user.uid}`);
      if (stored) {
        setLastSyncTime(parseInt(stored, 10));
      }
    }
  }, [user]);

  // Update queued items count periodically
  useEffect(() => {
    const updateQueuedItems = () => {
      if (syncManagerRef.current) {
        setQueuedItems(syncManagerRef.current.getQueuedItemsCount());
      }
    };

    updateQueuedItems();
    const interval = setInterval(updateQueuedItems, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const initializeSync = async (userId: string) => {
    // Double-check premium status before initializing
    if (!isPremium) {
      return;
    }
    
    try {
      // Only register sync with service worker if we have network connectivity
      if ('serviceWorker' in navigator && 'SyncManager' in window && navigator.onLine) {
        const registration = await navigator.serviceWorker.ready;
        
        try {
          await (registration as any).sync.register('premium-content-sync');
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Premium sync registered with service worker');
          }
        } catch (error) {
          // Sync registration can fail for various reasons (no network, browser restrictions)
          // This is not a critical error, so we just silently continue
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to register sync:', error);
          }
        }
      }
      
      // Only trigger initial sync if we have network connectivity
      if (navigator.onLine) {
        await triggerSync();
      }
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize sync:', error);
      }
      setSyncError('Failed to initialize sync');
    }
  };

  const triggerSync = useCallback(async () => {
    if (!user || !isPremium || !syncManagerRef.current) {
      return;
    }

    if (syncStatus === 'syncing') {
      console.log('Sync already in progress');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);
    setSyncProgress(null);

    try {
      const result = await syncManagerRef.current.performSync(
        user.uid,
        (progress) => setSyncProgress(progress)
      );

      if (result.success) {
        setSyncStatus('completed');
        setLastSyncTime(Date.now());
        
        // Save last sync time
        localStorage.setItem(`lastSyncTime_${user.uid}`, Date.now().toString());
        
        // Log sync results
        console.log('Sync completed:', {
          resourcesSynced: result.resourcesSynced,
          downloaded: result.resourcesDownloaded,
          uploaded: result.resourcesUploaded,
          conflicts: result.conflicts,
          duration: `${result.syncDuration}ms`
        });
      } else {
        setSyncStatus('error');
        setSyncError(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      setSyncProgress(null);
      
      // Update queued items
      if (syncManagerRef.current) {
        setQueuedItems(syncManagerRef.current.getQueuedItemsCount());
      }
    }
  }, [user, isPremium, syncStatus]);

  const cancelSync = useCallback(() => {
    if (syncManagerRef.current && syncStatus === 'syncing') {
      syncManagerRef.current.cancelSync();
      setSyncStatus('idle');
      setSyncProgress(null);
    }
  }, [syncStatus]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
    if (syncStatus === 'error') {
      setSyncStatus('idle');
    }
  }, [syncStatus]);

  return {
    syncStatus,
    lastSyncTime,
    syncProgress,
    isSyncing: syncStatus === 'syncing',
    syncError,
    queuedItems,
    triggerSync,
    cancelSync,
    clearSyncError
  };
}