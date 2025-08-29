/**
 * Unified Review Data Store Type Definitions
 */

import { ReviewEvent, ReviewSource, ReviewResult } from '../review-events/types';

// Content Types
export type ContentType = 'kanji' | 'vocabulary' | 'kana' | 'flashcard' | 'sentence';

// Review State
export enum ReviewState {
  NEW = 'new',
  LEARNING = 'learning',
  REVIEW = 'review',
  RELEARNING = 'relearning',
  SUSPENDED = 'suspended'
}

// Algorithm Types
export enum AlgorithmType {
  FSRS = 'fsrs',
  SM2 = 'sm2',
  SIMPLE = 'simple',
  ANKI = 'anki'
}

// Audio/Visual Data
export interface AudioData {
  url?: string;
  blob?: Blob;
  duration?: number;
  format?: string;
}

export interface VisualData {
  url?: string;
  blob?: Blob;
  type?: 'image' | 'video';
  thumbnail?: string;
}

// Unified Review Item
export interface UnifiedReviewItem {
  // Identity
  id: string;
  sourceId: string;
  sourceType: ReviewSource;
  
  // Content
  contentType: ContentType;
  content: {
    primary: string;
    secondary?: string;
    audio?: AudioData;
    visual?: VisualData;
    meaning?: string;
    reading?: string;
    context?: string;
    notes?: string;
  };
  
  // Scheduling
  scheduling: {
    algorithm: AlgorithmType;
    dueDate: Date;
    interval: number;
    easeFactor: number;
    repetitions: number;
    lapses: number;
    state: ReviewState;
    lastReviewedAt?: Date;
    nextReviewAt?: Date;
  };
  
  // Metadata
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastReviewedAt?: Date;
    lastReviewSource?: ReviewSource;
    tags: string[];
    properties: Record<string, any>;
    difficulty?: number;
    importance?: number;
  };
  
  // Sync
  sync: {
    version: number;
    lastSyncedAt?: Date;
    localChanges: boolean;
    remoteChanges: boolean;
    conflictStatus?: 'none' | 'pending' | 'resolved';
  };
}

// Due Items Query Parameters
export interface GetDueItemsParams {
  userId: string;
  sources?: ReviewSource[];
  contentTypes?: ContentType[];
  limit?: number;
  offset?: number;
  forceRefresh?: boolean;
  includeOverdue?: boolean;
  maxDueDate?: Date;
  cacheKey?: string;
  ttl?: number;
}

// Unified Due Items Response
export interface UnifiedDueItems {
  items: UnifiedReviewItem[];
  total: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  sources: Record<ReviewSource, number>;
  nextReviewTime?: Date;
}

// Record Review Parameters
export interface RecordReviewParams {
  userId: string;
  itemId: string;
  source: ReviewSource;
  result: ReviewResult;
  duration?: number;
  subscriptionTier?: 'free' | 'monthly' | 'yearly';
  metadata?: Record<string, any>;
}

// Review Result
export interface ReviewResultData {
  itemId: string;
  success: boolean;
  nextReviewDate: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  syncId?: string;
}

// Conflict Resolution
export enum ConflictStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE = 'merge',
  USER_DECIDES = 'user_decides',
  REMOTE_WINS = 'remote_wins',
  LOCAL_WINS = 'local_wins'
}

export interface ConflictData {
  itemId: string;
  local: UnifiedReviewItem;
  remote: UnifiedReviewItem;
  strategy: ConflictStrategy;
  resolvedAt?: Date;
  resolvedBy?: 'system' | 'user';
}

// Transaction Support
export interface Transaction {
  id: string;
  startTime: Date;
  operations: Operation[];
  status: 'pending' | 'committed' | 'rolled_back';
  
  commit(): Promise<void>;
  rollback(): Promise<void>;
  addOperation(op: Operation): void;
}

export interface Operation {
  type: 'create' | 'update' | 'delete';
  entity: 'review' | 'sync' | 'cache';
  data: any;
  rollbackData?: any;
}

// Storage Adapters
export interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Data Store Configuration
export interface DataStoreConfig {
  localDB?: StorageAdapter;
  remoteDB?: StorageAdapter;
  cache?: StorageAdapter;
  enableSync?: boolean;
  syncInterval?: number;
  conflictStrategy?: ConflictStrategy;
  maxCacheSize?: number;
  enableTransactions?: boolean;
}

// Sync Engine Types
export interface SyncStatus {
  userId: string;
  lastSyncTime?: Date;
  itemsSynced: number;
  itemsPending: number;
  conflicts: number;
  errors: number;
  status: 'idle' | 'syncing' | 'error' | 'offline';
}

export interface SyncResult {
  success: boolean;
  syncId: string;
  itemsSynced: number;
  conflictsResolved: number;
  errors?: Error[];
  duration: number;
}

export interface LocalChanges {
  created: UnifiedReviewItem[];
  updated: UnifiedReviewItem[];
  deleted: string[];
  timestamp: Date;
}

export interface RemoteChanges {
  items: UnifiedReviewItem[];
  deletions: string[];
  timestamp: Date;
  cursor?: string;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

// Error Types
export class ReviewStoreError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ReviewStoreError';
  }
}

export class SyncError extends Error {
  constructor(
    message: string,
    public readonly syncId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public readonly conflicts: ConflictData[]
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}