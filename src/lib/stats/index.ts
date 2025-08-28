/**
 * Main export file for the modular stats system
 * Provides clean public API while hiding implementation details
 */

// Main orchestrator and public API
export { StatsTracker, statsTracker } from './core/StatsTracker';

// Core types and interfaces (public API)
export type {
  ActivityType,
  ActivityEvent,
  ActivityDetails,
  UserStatsV2,
  DailyActivity,
  DailySummary,
  ActivityStats,
  StatsUpdateListener,
  SyncResult,
  SyncStatus,
  WeeklySummary,
  MonthlySummary,
  ValidationResult,
  UserContext
} from './core/interfaces';

// Factory for creating stats objects
export { StatsFactory } from './utils/StatsFactory';

// Utility functions
export { 
  DateUtils, 
  StatsUtils, 
  ValidationUtils, 
  DebugUtils,
  ErrorUtils,
  PerformanceUtils 
} from './utils/helpers';

// Error classes
export { 
  StatsError, 
  ValidationError, 
  StorageError, 
  SyncError 
} from './core/interfaces';

// Constants
export { DEFAULT_CONFIG } from './core/constants';

// Advanced interfaces for extension (optional)
export type {
  IStatsStorage,
  IActivityProcessor,
  IStreakCalculator,
  IStatsSyncManager,
  IStatsAggregator,
  IStatsEventBus,
  IStatsCache,
  IStatsValidator
} from './core/interfaces';

/**
 * Usage examples:
 * 
 * // Basic usage
 * import { statsTracker } from '@/lib/stats';
 * await statsTracker.initialize(user, subscription);
 * await statsTracker.trackActivity('drill', { score: 85, correct: 17, total: 20 });
 * const stats = statsTracker.getStats();
 * 
 * // Subscribe to updates
 * const unsubscribe = statsTracker.subscribe((stats) => {
 *   console.log('Stats updated:', stats);
 * });
 * 
 * // Create custom objects
 * import { StatsFactory } from '@/lib/stats';
 * const newStats = StatsFactory.createInitialStats('user123');
 * 
 * // Utilities
 * import { DateUtils, StatsUtils } from '@/lib/stats';
 * const today = DateUtils.getDateString(Date.now());
 * const accuracy = StatsUtils.calculateAccuracy(85, 100);
 * 
 * // Error handling
 * import { StatsError } from '@/lib/stats';
 * try {
 *   await statsTracker.forceSync();
 * } catch (error) {
 *   if (error instanceof StatsError) {
 *     console.log('Stats error:', error.code, error.recoverable);
 *   }
 * }
 */