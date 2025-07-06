/**
 * Features System Types
 * Central registry of all features in the app
 */

export type FeatureCategory = 'learning' | 'games' | 'storage' | 'system';
export type FeatureStatus = 'active' | 'beta' | 'planned' | 'deprecated';

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  icon?: string;
  limitType: 'daily' | 'total' | 'none';
  requiresAuth: boolean;
  requiresSubscription: boolean;
  status: FeatureStatus;
  // For shared limits (e.g., all games share a counter)
  sharedLimitGroup?: string;
}

export interface FeatureRegistry {
  [featureId: string]: Feature;
}