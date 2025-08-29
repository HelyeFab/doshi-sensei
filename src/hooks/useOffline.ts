/**
 * React Hook for Offline Support
 * Provides offline status and sync management
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineManager, OfflineState } from '@/services/offline/OfflineManager';

export interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  autoSync?: boolean;
}

export interface UseOfflineReturn {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  hasPendingSync: boolean;
  pendingOperations: number;
  lastSyncTime?: Date;
  triggerSync: () => Promise<void>;
  clearCache: () => Promise<void>;
  forceSync: () => Promise<void>;
}

export function useOffline(options: UseOfflineOptions = {}): UseOfflineReturn {
  const [state, setState] = useState<OfflineState>(offlineManager.getState());

  useEffect(() => {
    // Subscribe to offline manager state changes
    const unsubscribe = offlineManager.subscribe((newState) => {
      setState(newState);

      // Call callbacks based on state changes
      if (newState.isOnline && !state.isOnline) {
        options.onOnline?.();
        
        // Auto-sync if enabled
        if (options.autoSync) {
          offlineManager.triggerSync();
        }
      } else if (!newState.isOnline && state.isOnline) {
        options.onOffline?.();
      }
    });

    return unsubscribe;
  }, [options.onOnline, options.onOffline, options.autoSync]);

  const triggerSync = useCallback(async () => {
    await offlineManager.triggerSync();
  }, []);

  const clearCache = useCallback(async () => {
    await offlineManager.clearCache();
  }, []);

  const forceSync = useCallback(async () => {
    await offlineManager.forceSync();
  }, []);

  return {
    isOnline: state.isOnline,
    isServiceWorkerReady: state.isServiceWorkerReady,
    hasPendingSync: state.hasPendingSync,
    pendingOperations: state.pendingOperations,
    lastSyncTime: state.lastSyncTime,
    triggerSync,
    clearCache,
    forceSync
  };
}

/**
 * Hook for displaying offline indicators
 */
export function useOfflineIndicator() {
  const { isOnline, hasPendingSync, pendingOperations } = useOffline();
  const [showIndicator, setShowIndicator] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
      setMessage('You are offline. Changes will sync when reconnected.');
    } else if (hasPendingSync && pendingOperations > 0) {
      setShowIndicator(true);
      setMessage(`Syncing ${pendingOperations} changes...`);
    } else {
      setShowIndicator(false);
      setMessage('');
    }
  }, [isOnline, hasPendingSync, pendingOperations]);

  return {
    showIndicator,
    message,
    isOnline,
    pendingOperations
  };
}