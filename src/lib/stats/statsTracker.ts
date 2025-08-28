/**
 * Compatibility wrapper for the new modular stats system
 * This maintains backward compatibility while using the new architecture
 */

// Re-export everything from the new modular system
export * from './index';

// For backward compatibility, export the main instances
export { statsTracker as StatsTracker } from './core/StatsTracker';
export { statsTracker } from './core/StatsTracker';

// Export types that were previously in this file
export type {
  ActivityType,
  ActivityEvent,
  DailyActivity,
  UserStatsV2,
  StatsUpdateListener
} from './core/interfaces';

/**
 * MIGRATION NOTICE:
 * 
 * The StatsTracker has been completely refactored into a modular architecture.
 * 
 * OLD USAGE (still works):
 * import { statsTracker } from '@/lib/stats/statsTracker';
 * 
 * NEW RECOMMENDED USAGE:
 * import { statsTracker } from '@/lib/stats';
 * 
 * The API remains the same, but the internal implementation now uses:
 * - Repository pattern for storage
 * - Strategy pattern for different storage backends
 * - Observer pattern for real-time updates
 * - Circuit breaker for cloud operations
 * - Event-driven architecture
 * - Comprehensive error handling
 * - Performance optimizations
 * 
 * Key improvements:
 * ✅ Each module under 300 lines
 * ✅ Single Responsibility Principle
 * ✅ Dependency injection
 * ✅ Comprehensive error handling
 * ✅ Performance monitoring
 * ✅ Circuit breaker for resilience
 * ✅ Intelligent caching
 * ✅ Batch processing
 * ✅ Event-driven updates
 * ✅ 100% type safety
 * ✅ Enterprise-grade patterns
 */