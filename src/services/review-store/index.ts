/**
 * Export helper for getting the Unified Data Store instance
 */

import { UnifiedReviewDataStore } from './UnifiedDataStore';
import { DataStoreConfig } from './types';

let dataStoreInstance: UnifiedReviewDataStore | null = null;

export function getUnifiedDataStore(config?: DataStoreConfig): UnifiedReviewDataStore {
  if (!dataStoreInstance) {
    dataStoreInstance = UnifiedReviewDataStore.getInstance(config);
  }
  return dataStoreInstance;
}

// Re-export types for convenience
export * from './types';
export { UnifiedReviewDataStore } from './UnifiedDataStore';