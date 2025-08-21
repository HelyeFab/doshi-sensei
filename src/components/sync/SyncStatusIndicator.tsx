'use client';

import React from 'react';
import { usePremiumSync } from '@/hooks/usePremiumSync';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { formatDistanceToNow } from 'date-fns';
import { useStrings } from '@/contexts/LanguageContext';

export function SyncStatusIndicator() {
  const strings = useStrings();
  const { isPremium } = useSubscription2();
  const {
    syncStatus,
    lastSyncTime,
    syncProgress,
    isSyncing,
    syncError,
    queuedItems,
    triggerSync,
    cancelSync,
    clearSyncError
  } = usePremiumSync();

  // Only show for premium users
  if (!isPremium) {
    return null;
  }

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  const getSyncStatusText = () => {
    if (isSyncing && syncProgress) {
      return `Syncing... ${syncProgress.current}/${syncProgress.total}`;
    }
    
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'completed':
        return lastSyncTime ? `Last synced ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}` : 'Synced';
      case 'error':
        return 'Sync failed';
      case 'offline':
        return 'Offline';
      default:
        return queuedItems > 0 ? `${queuedItems} items pending` : 'Ready to sync';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Sync Status */}
      <div className="flex items-center gap-2">
        {getSyncStatusIcon()}
        <span className="text-muted-foreground">
          {getSyncStatusText()}
        </span>
      </div>

      {/* Sync Button */}
      {!isSyncing && syncStatus !== 'completed' && (
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sync Now
        </button>
      )}

      {/* Cancel Button */}
      {isSyncing && (
        <button
          onClick={cancelSync}
          className="px-3 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition-colors"
        >
          Cancel
        </button>
      )}

      {/* Error Message */}
      {syncError && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500">{syncError}</span>
          <button
            onClick={clearSyncError}
            className="text-xs text-red-500 hover:text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isSyncing && syncProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Compact version for use in headers
export function SyncStatusBadge() {
  const { isPremium } = useSubscription2();
  const { syncStatus, isSyncing, queuedItems } = usePremiumSync();

  if (!isPremium) {
    return null;
  }

  // Only show badge if syncing or has queued items
  if (!isSyncing && queuedItems === 0 && syncStatus !== 'error') {
    return null;
  }

  const getBadgeColor = () => {
    if (syncStatus === 'error') return 'bg-red-500';
    if (isSyncing) return 'bg-primary animate-pulse';
    if (queuedItems > 0) return 'bg-yellow-500';
    return 'bg-muted-foreground';
  };

  return (
    <div className={`w-2 h-2 rounded-full ${getBadgeColor()}`} title={
      isSyncing ? 'Syncing...' : 
      syncStatus === 'error' ? 'Sync error' :
      queuedItems > 0 ? `${queuedItems} items pending` : ''
    } />
  );
}