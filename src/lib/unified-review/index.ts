/**
 * Unified Review Engine - Public API
 * Main export file for the URE system
 */

// Export all types
export * from './types';

// Export the main engine
export { UnifiedReviewEngine } from './engine';

// Export algorithms
export { FSRSAlgorithm } from './algorithms/fsrs';
export { SM2Algorithm } from './algorithms/sm2';
export { SimpleAlgorithm } from './algorithms/simple';

// Export storage utilities
export { ReviewStorage } from './storage/review-storage';
export { IndexedDBManager } from './storage/indexdb-manager';

// Export scheduling utilities
export { ReviewScheduler } from './scheduling/scheduler';
export { GoldenTimeCalculator } from './scheduling/golden-time';
export { NotificationScheduler } from './scheduling/notification-scheduler';

// Export migration utilities
export { MigrationManager } from './migration/migration-manager';
export { KanjiMigrator } from './migration/kanji-migrator';
export { VocabularyMigrator as VocabMigrator } from './migration/vocab-migrator';

// Export convenience function to create engine
export function createUnifiedReviewEngine(userId?: string) {
  const { UnifiedReviewEngine } = require('./engine');
  return new UnifiedReviewEngine(userId);
}