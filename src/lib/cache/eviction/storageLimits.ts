import { UserType } from "@/types/subscription";
import { StorageLimits } from "./types";

// Storage limits by user type and resource type
export const STORAGE_LIMITS: Record<UserType, StorageLimits> = {
  guest: {
    article: { count: 3, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    story: { count: 3, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    kanji: { count: 100, sizeBytes: 5 * 1024 * 1024 }, // 5MB
    verb: { count: 50, sizeBytes: 2 * 1024 * 1024 }, // 2MB
    adjective: { count: 50, sizeBytes: 2 * 1024 * 1024 }, // 2MB
    audio: { count: 100, sizeBytes: 50 * 1024 * 1024 }, // 50MB
  },
  free: {
    article: { count: 3, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    story: { count: 3, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    kanji: { count: 500, sizeBytes: 25 * 1024 * 1024 }, // 25MB
    verb: { count: 200, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    adjective: { count: 200, sizeBytes: 10 * 1024 * 1024 }, // 10MB
    audio: { count: 500, sizeBytes: 250 * 1024 * 1024 }, // 250MB
  },
  monthly: {
    article: { count: 50, sizeBytes: 500 * 1024 * 1024 }, // 500MB
    story: { count: 50, sizeBytes: 500 * 1024 * 1024 }, // 500MB
    kanji: { count: Infinity, sizeBytes: Infinity },
    verb: { count: Infinity, sizeBytes: Infinity },
    adjective: { count: Infinity, sizeBytes: Infinity },
    audio: { count: Infinity, sizeBytes: Infinity },
  },
  yearly: {
    article: { count: 50, sizeBytes: 500 * 1024 * 1024 }, // 500MB
    story: { count: 50, sizeBytes: 500 * 1024 * 1024 }, // 500MB
    kanji: { count: Infinity, sizeBytes: Infinity },
    verb: { count: Infinity, sizeBytes: Infinity },
    adjective: { count: Infinity, sizeBytes: Infinity },
    audio: { count: Infinity, sizeBytes: Infinity },
  },
  // Handle premium as alias for both monthly and yearly
  premium: {
    article: { count: 50, sizeBytes: 500 * 1024 * 1024 }, // 500MB
    story: { count: 50, sizeBytes: 500 * 1024 * 1024 }, // 500MB
    kanji: { count: Infinity, sizeBytes: Infinity },
    verb: { count: Infinity, sizeBytes: Infinity },
    adjective: { count: Infinity, sizeBytes: Infinity },
    audio: { count: Infinity, sizeBytes: Infinity },
  },
};

// Grace period before evicting recently accessed items (5 minutes)
export const EVICTION_GRACE_PERIOD_MS = 5 * 60 * 1000;

// Default batch size for eviction operations
export const DEFAULT_EVICTION_BATCH_SIZE = 10;

// Storage quota warning threshold (80% of available storage)
export const STORAGE_QUOTA_WARNING_THRESHOLD = 0.8;

// Helper function to check if user type has unlimited storage for a resource
export function hasUnlimitedStorage(userType: UserType, resourceType: string): boolean {
  const limits = STORAGE_LIMITS[userType]?.[resourceType];
  return limits?.count === Infinity && limits?.sizeBytes === Infinity;
}

// Helper function to get storage limits for a user type and resource
export function getStorageLimit(userType: UserType, resourceType: string) {
  return STORAGE_LIMITS[userType]?.[resourceType] || { count: 0, sizeBytes: 0 };
}

// Helper function to format bytes for display
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  if (bytes === Infinity) return "Unlimited";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}