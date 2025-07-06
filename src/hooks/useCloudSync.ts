import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useFeature } from '@/hooks/useFeature';
import CloudSync, { SyncStatus, SyncResult } from '@/utils/cloudSync';
import WordListManager from '@/utils/wordLists';

export interface CloudSyncHook {
  // Sync status
  syncStatus: SyncStatus;
  canSync: boolean;

  // Word list sync methods
  syncWordListsToCloud: () => Promise<SyncResult>;
  syncWordListsFromCloud: () => Promise<SyncResult>;
  performFullWordListSync: () => Promise<SyncResult>;

  // Convenience methods
  triggerSync: () => Promise<SyncResult>;
  refreshSyncStatus: () => void;
}

export function useCloudSync(): CloudSyncHook {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { access: syncAccess } = useFeature('cloud_sync');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSync.getSyncStatus());

  // Check if user can sync using new system
  const canSync = syncAccess?.allowed ?? false;

  // Debug logging for troubleshooting
  useEffect(() => {
    if (user && subscription) {
      console.log('CloudSync Debug:', {
        userEmail: user.email,
        subscriptionPlan: subscription?.plan,
        subscriptionStatus: subscription?.status,
        canSyncFromFeature: syncAccess?.allowed,
        canSyncValue: canSync
      });
    }
  }, [user, subscription, canSync, syncAccess]);

  // Initialize network monitoring and sync status listener
  useEffect(() => {
    // Initialize network monitoring
    CloudSync.initNetworkMonitoring();
    
    // Initialize sync queue
    const initializeQueue = async () => {
      try {
        const { syncQueue } = await import('@/utils/syncQueue');
        syncQueue.initializeQueue();
      } catch (error) {
        console.error('Failed to initialize sync queue:', error);
      }
    };
    
    initializeQueue();

    // Listen to sync status changes
    const handleSyncStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    CloudSync.addStatusListener(handleSyncStatusChange);

    // Cleanup
    return () => {
      CloudSync.removeStatusListener(handleSyncStatusChange);
    };
  }, []);

  // Sync word lists to cloud
  const syncWordListsToCloud = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    return await WordListManager.syncToCloud(user, subscription?.status, subscription?.plan);
  }, [user, subscription?.status, subscription?.plan]);

  // Sync word lists from cloud
  const syncWordListsFromCloud = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    return await WordListManager.syncFromCloud(user, subscription?.status, subscription?.plan);
  }, [user, subscription?.status, subscription?.plan]);

  // Perform full bidirectional sync
  const performFullWordListSync = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    return await WordListManager.performFullSync(user, subscription?.status, subscription?.plan);
  }, [user, subscription?.status, subscription?.plan]);

  // Trigger sync (convenience method for full sync)
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    return await performFullWordListSync();
  }, [performFullWordListSync]);

  // Refresh sync status
  const refreshSyncStatus = useCallback(() => {
    setSyncStatus(CloudSync.getSyncStatus());
  }, []);

  // Auto-sync on login for paid users
  useEffect(() => {
    if (user && canSync) {
      triggerSync().catch(error => {
        console.error('Auto-sync on login failed:', error);
      });
    }
  }, [user, canSync, triggerSync]);

  return {
    syncStatus,
    canSync,
    syncWordListsToCloud,
    syncWordListsFromCloud,
    performFullWordListSync,
    triggerSync,
    refreshSyncStatus
  };
}

export default useCloudSync;
