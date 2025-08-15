'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessWithModals } from './useAccessWithModals';
import { useFeature } from './useFeature';
import { useSubscription2 } from './useSubscription2';
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
  canSync: boolean;
  syncFeature: ReturnType<typeof useFeature>['feature'];
}

export function usePremiumSync3(): UsePremiumSyncReturn {
  const { checkAndTrack, AccessModals } = useAccessWithModals();
  const { feature: cloudSyncFeature } = useFeature('cloud_sync');
  const { feature: manualSyncFeature } = useFeature('manual_sync');
  const { isPremium, userType, subscription } = useSubscription2();
  const { user } = useAuth();
  
  // Debug subscription status

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [queuedItems, setQueuedItems] = useState(0);
  
  const syncManagerRef = useRef<PremiumSyncManager | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user can sync (has access to cloud_sync feature)
  const canSync = isPremium && cloudSyncFeature?.status === 'active';

  // Initialize sync manager ONLY for users with access
  useEffect(() => {
    if (canSync && !syncManagerRef.current) {

      syncManagerRef.current = new PremiumSyncManager();
      
      // Update queued items count
      const updateQueuedItems = () => {
        if (syncManagerRef.current) {
          setQueuedItems(syncManagerRef.current.getQueuedItemsCount());
        }
      };
      
      // Update initial status
      updateQueuedItems();
      
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
    } else if (!canSync && syncManagerRef.current) {
      // Clean up if user loses premium access
      syncManagerRef.current = null;
      
      // Update service worker premium status
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_PREMIUM_STATUS',
          isPremium: false
        });
      }
    }
  }, [canSync]);

  // Initialize sync on mount if user has access
  useEffect(() => {
    const initializeSync = async () => {
      if (!canSync || !syncManagerRef.current || !user) {
        return;
      }
      
      try {
        // Register periodic sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register('premium-sync');
          } catch (error) {
            // Sync registration can fail for various reasons (no network, browser restrictions)
            // This is not a critical error, so we just silently continue
            if (process.env.NODE_ENV === 'development') {

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
    
    if (canSync) {
      initializeSync();
    }
  }, [canSync, user?.uid]);

  const triggerSync = useCallback(async () => {
    if (!user || !syncManagerRef.current) {

      return;
    }

    // Check manual sync access using three-pillar system
    const hasAccess = await checkAndTrack('manual_sync');
    if (!hasAccess) {

      return;
    }

    if (syncStatus === 'syncing') {

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
        setSyncError(null);

      } else {
        setSyncStatus('error');
        setSyncError(result.error || 'Sync failed');
        console.error('[PremiumSync3] Sync failed:', result.error);
      }

      // Update queued items count
      setQueuedItems(syncManagerRef.current.getQueuedItemsCount());
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown sync error');
      console.error('[PremiumSync3] Sync error:', error);
    } finally {
      setSyncProgress(null);
    }
  }, [user, syncStatus, checkAndTrack]);

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
    clearSyncError,
    canSync,
    syncFeature: cloudSyncFeature
  };
}