/**
 * Universal Sync Hook
 * Provides sync functionality to components for premium users
 * Follows Three-Pillar Architecture subscription model
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from './useSubscription2';
import { getUniversalSync, UniversalSyncService, SyncStatus, SyncResult, SYNC_REGISTRY } from '@/services/sync/UniversalSyncService';

interface UseUniversalSyncReturn {
  // Sync operations
  save: (itemId: string, data: any) => Promise<void>;
  load: (itemId?: string) => Promise<any>;
  batchSave: (items: Array<{id: string, data: any}>) => Promise<void>;
  sync: () => Promise<SyncResult>;
  
  // Status
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  isPremium: boolean;
  syncEnabled: boolean;
  
  // Control
  initializeSync: () => Promise<void>;
  stopSync: () => void;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook to use Universal Sync in components
 * 
 * @param featureId - The feature ID from FEATURE_REGISTRY
 * @param autoInit - Whether to auto-initialize sync on mount (default: true)
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { save, load, syncStatus, isPremium } = useUniversalSync('textbook_vocabulary');
 *   
 *   // Save with automatic sync for premium users
 *   await save('item-1', { data: 'value' });
 *   
 *   // Load with cloud data for premium users
 *   const data = await load('item-1');
 * }
 * ```
 */
export function useUniversalSync(
  featureId: string,
  autoInit: boolean = true
): UseUniversalSyncReturn {
  const { user } = useAuth();
  const { isPremium } = useSubscription2();
  const [syncService, setSyncService] = useState<UniversalSyncService | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Check if feature has sync config
  const syncEnabled = Boolean(SYNC_REGISTRY[featureId]) && isPremium;
  
  // Initialize sync service
  useEffect(() => {
    if (!user) {
      setSyncService(null);
      return;
    }
    
    const service = getUniversalSync(user.uid);
    setSyncService(service);
    
    if (autoInit && syncEnabled) {
      service.initializeSync(featureId).catch(error => {
        console.error(`Failed to initialize sync for ${featureId}:`, error);
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (!autoInit) {
        service.stopSync(featureId);
      }
    };
  }, [user, featureId, autoInit, syncEnabled]);
  
  // Update sync status periodically
  useEffect(() => {
    if (!syncService || !syncEnabled) return;
    
    const updateStatus = async () => {
      const status = await syncService.getSyncStatus(featureId);
      setSyncStatus(status);
    };
    
    // Initial status
    updateStatus();
    
    // Update every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    
    return () => clearInterval(interval);
  }, [syncService, featureId, syncEnabled]);
  
  // Save operation
  const save = useCallback(async (itemId: string, data: any) => {
    if (!syncService) {
      console.warn('Sync service not initialized');
      return;
    }
    
    await syncService.save(featureId, itemId, data);
    
    // Update status after save
    if (syncEnabled) {
      const status = await syncService.getSyncStatus(featureId);
      setSyncStatus(status);
    }
  }, [syncService, featureId, syncEnabled]);
  
  // Load operation
  const load = useCallback(async (itemId?: string) => {
    if (!syncService) {
      console.warn('Sync service not initialized');
      return null;
    }
    
    return await syncService.load(featureId, itemId);
  }, [syncService, featureId]);
  
  // Batch save operation
  const batchSave = useCallback(async (items: Array<{id: string, data: any}>) => {
    if (!syncService) {
      console.warn('Sync service not initialized');
      return;
    }
    
    await syncService.batchSave(featureId, items);
    
    // Update status after batch save
    if (syncEnabled) {
      const status = await syncService.getSyncStatus(featureId);
      setSyncStatus(status);
    }
  }, [syncService, featureId, syncEnabled]);
  
  // Manual sync trigger
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!syncService) {
      return { success: false, itemsSynced: 0, conflicts: 0, error: 'Service not initialized' };
    }
    
    if (!syncEnabled) {
      return { success: false, itemsSynced: 0, conflicts: 0, error: 'Sync not available' };
    }
    
    setIsSyncing(true);
    try {
      const result = await syncService.syncFeature(featureId);
      
      // Update status after sync
      const status = await syncService.getSyncStatus(featureId);
      setSyncStatus(status);
      
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [syncService, featureId, syncEnabled]);
  
  // Initialize sync manually
  const initializeSync = useCallback(async () => {
    if (!syncService || !syncEnabled) return;
    
    await syncService.initializeSync(featureId);
    
    const status = await syncService.getSyncStatus(featureId);
    setSyncStatus(status);
  }, [syncService, featureId, syncEnabled]);
  
  // Stop sync
  const stopSync = useCallback(() => {
    if (!syncService) return;
    
    syncService.stopSync(featureId);
    setSyncStatus(null);
  }, [syncService, featureId]);
  
  // Refresh status
  const refreshStatus = useCallback(async () => {
    if (!syncService || !syncEnabled) return;
    
    const status = await syncService.getSyncStatus(featureId);
    setSyncStatus(status);
  }, [syncService, featureId, syncEnabled]);
  
  return {
    // Operations
    save,
    load,
    batchSave,
    sync,
    
    // Status
    syncStatus,
    isSyncing,
    isPremium,
    syncEnabled,
    
    // Control
    initializeSync,
    stopSync,
    refreshStatus
  };
}

/**
 * Hook to display sync status in UI
 */
export function useSyncStatusDisplay(featureId: string) {
  const { syncStatus, isPremium, syncEnabled } = useUniversalSync(featureId, false);
  
  const statusText = (() => {
    if (!isPremium) return 'Local only (upgrade for sync)';
    if (!syncEnabled) return 'Sync not available';
    if (!syncStatus) return 'Checking sync status...';
    
    const { localCount, cloudCount, lastSync, status } = syncStatus;
    
    if (status === 'error') return '⚠️ Sync error';
    if (status === 'syncing') return '🔄 Syncing...';
    
    const syncAge = lastSync ? 
      `${Math.round((Date.now() - lastSync.getTime()) / 60000)} min ago` : 
      'Never';
    
    return `☁️ ${cloudCount} synced (${syncAge})`;
  })();
  
  const statusColor = (() => {
    if (!isPremium) return 'gray';
    if (!syncStatus) return 'gray';
    
    switch (syncStatus.status) {
      case 'success': return 'green';
      case 'syncing': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  })();
  
  return {
    statusText,
    statusColor,
    isPremium,
    syncEnabled,
    localCount: syncStatus?.localCount || 0,
    cloudCount: syncStatus?.cloudCount || 0,
    lastSync: syncStatus?.lastSync || null
  };
}