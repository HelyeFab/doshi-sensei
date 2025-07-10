import { UserType } from "@/types/subscription";
import { CachedResource } from "@/types/cache";

export type EvictionReason = 
  | 'count_limit_exceeded'
  | 'size_limit_exceeded'
  | 'storage_quota_low'
  | 'premium_downgrade'
  | 'manual_clear'
  | 'corruption_recovery';

export interface StorageLimit {
  count: number;
  sizeBytes: number;
}

export interface StorageLimits {
  [key: string]: StorageLimit;
}

export interface EvictionResult {
  success: boolean;
  evictedCount: number;
  freedBytes: number;
  evictedIds: string[];
  reason: EvictionReason;
  error?: string;
}

export interface EvictionCandidate extends CachedResource {
  isActive?: boolean;
  isPinned?: boolean;
}

export interface EvictionOptions {
  gracePeriodMs?: number; // Don't evict items accessed within this period
  preserveActive?: boolean; // Don't evict currently active items
  batchSize?: number; // Max items to evict in one operation
  dryRun?: boolean; // Calculate what would be evicted without doing it
}

export interface StorageStats {
  resourceType: string;
  currentCount: number;
  currentSizeBytes: number;
  limitCount: number;
  limitSizeBytes: number;
  utilizationPercent: number;
}

export interface EvictionAnalytics {
  timestamp: number;
  userType: UserType;
  resourceType: string;
  reason: EvictionReason;
  evictedCount: number;
  freedBytes: number;
  duration: number;
}