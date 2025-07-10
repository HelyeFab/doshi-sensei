import { CachedResource } from '@/lib/cache/types';

export type ResourceType = 'article' | 'story' | 'audio' | 'kanji' | 'verb' | 'adjective';

export interface SyncManifest {
  userId: string;
  lastSyncTimestamp: number;
  resources: {
    [resourceId: string]: {
      type: ResourceType;
      version: string;
      checksum: string;
      lastModified: number;
    }
  };
}

export interface SyncResult {
  success: boolean;
  resourcesSynced: number;
  resourcesDownloaded: number;
  resourcesUploaded: number;
  conflicts: number;
  error?: string;
  startTime: number;
  endTime: number;
  syncDuration: number;
}

export type SyncOperation = 'upload' | 'download' | 'conflict' | 'delete';

export interface SyncQueueItem {
  resourceId: string;
  operation: SyncOperation;
  timestamp: number;
  retryCount: number;
}

export interface SyncConflict {
  resourceId: string;
  localResource: CachedResource;
  remoteResource: CachedResource;
  resolution: 'local' | 'remote' | 'merge';
}

export interface SyncProgress {
  current: number;
  total: number;
  operation: string;
  resourceId?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'completed';

export interface SyncError {
  code: string;
  message: string;
  resourceId?: string;
  timestamp: number;
  retryable: boolean;
}