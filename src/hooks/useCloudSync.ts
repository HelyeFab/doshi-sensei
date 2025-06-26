import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
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
  const { userSubscription } = useSubscription();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(CloudSync.getSyncStatus());

  // Check if user can sync
  const canSync = CloudSync.canSync(user, userSubscription?.subscription.status);

  // Initialize network monitoring and sync status listener
  useEffect(() => {
    // Initialize network monitoring
    CloudSync.initNetworkMonitoring();

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

    return await WordListManager.syncToCloud(user, userSubscription?.subscription.status);
  }, [user, userSubscription?.subscription.status]);

  // Sync word lists from cloud
  const syncWordListsFromCloud = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    return await WordListManager.syncFromCloud(user, userSubscription?.subscription.status);
  }, [user, userSubscription?.subscription.status]);

  // Perform full bidirectional sync
  const performFullWordListSync = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    return await WordListManager.performFullSync(user, userSubscription?.subscription.status);
  }, [user, userSubscription?.subscription.status]);

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
