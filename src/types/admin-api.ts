/**
 * Type definitions for Admin API responses
 */

import { Feature } from '@/lib/features/types';
import { UserType } from '@/lib/entitlements/types';

// Feature Matrix API types
export interface FeatureAccess {
  allowed: boolean;
  limit: number;
}

export interface FeatureMatrixRow {
  feature: Feature;
  access: Record<UserType, FeatureAccess>;
}

export interface FeatureMatrixStats {
  totalFeatures: number;
  activeFeatures: number;
  plannedFeatures: number;
  guestAccessible: number;
  freeAccessible: number;
  premiumExclusive: number;
}

export interface FeatureMatrixResponse {
  matrix: FeatureMatrixRow[];
  stats: FeatureMatrixStats;
  userTypes: UserType[];
  lastUpdated: string;
}

// Update Limit API types
export interface UpdateLimitRequest {
  userType: UserType;
  featureId: string;
  limitType: 'daily' | 'total';
  newValue: number;
}

export interface UpdateLimitResponse {
  success: boolean;
  message: string;
  updatedRule?: {
    id: string;
    userTypes: UserType[];
    permissions: string[];
    limits: {
      daily?: Record<string, number>;
      total?: Record<string, number>;
    };
  };
}

// Entitlements Management API types
export interface EntitlementDebugInfo {
  currentRules: {
    source: 'firestore' | 'default';
    lastUpdated: string;
    version: number;
    rulesCount: number;
  };
  youtubeLimits: {
    userType: string;
    limit: number;
  }[];
  structureStatus: {
    isValid: boolean;
    issues: string[];
  };
  cacheInfo: {
    serverCacheAge: number | null;
    clientCacheStatus: string;
  };
}

export interface EntitlementFixRequest {
  action: 'fix-structure';
}

export interface EntitlementFixResult {
  success: boolean;
  message: string;
  fixed: string[];
  errors: string[];
}

// Error response type
export interface AdminAPIError {
  error: string;
  details?: string;
}