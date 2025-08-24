'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { backgroundSync, subscribeSyncStatus } from '@/services/sync/backgroundSync';

interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSync: Date | null;
  failures: number;
}

interface BackgroundSyncContextType {
  syncStatus: SyncStatus;
  queueForSync: typeof backgroundSync.addToQueue;
  manualSync: typeof backgroundSync.manualSync;
  clearQueue: typeof backgroundSync.clearQueue;
  getQueueStats: typeof backgroundSync.getQueueStats;
}

const BackgroundSyncContext = createContext<BackgroundSyncContextType | undefined>(undefined);

interface BackgroundSyncProviderProps {
  children: ReactNode;
}

export function BackgroundSyncProvider({ children }: BackgroundSyncProviderProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: false,
    lastSync: null,
    failures: 0,
  });

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = subscribeSyncStatus(setSyncStatus);
    return unsubscribe;
  }, []);

  const contextValue: BackgroundSyncContextType = {
    syncStatus,
    queueForSync: backgroundSync.addToQueue.bind(backgroundSync),
    manualSync: backgroundSync.manualSync.bind(backgroundSync),
    clearQueue: backgroundSync.clearQueue.bind(backgroundSync),
    getQueueStats: backgroundSync.getQueueStats.bind(backgroundSync),
  };

  return (
    <BackgroundSyncContext.Provider value={contextValue}>
      {children}
    </BackgroundSyncContext.Provider>
  );
}

export function useBackgroundSync() {
  const context = useContext(BackgroundSyncContext);
  if (context === undefined) {
    throw new Error('useBackgroundSync must be used within a BackgroundSyncProvider');
  }
  return context;
}