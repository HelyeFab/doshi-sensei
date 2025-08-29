/**
 * Review Sources - Unified Review Hub
 * 
 * Central export point for all review source interfaces, classes, and utilities.
 * This provides a clean API for the Unified Review Hub system.
 */

// ============================================================================
// Core Interfaces and Types
// ============================================================================

export type {
  // Main interfaces
  ReviewSource,
  ReviewItem,
  ReviewItemContent,
  SourceStats,
  SourceConfig,
  GroupedReviewItems,
  AggregatedStats,
  ReviewResult,
  DetailedSourceAnalytics,
  
  // Configuration types
  SourceUserPreferences,
  RegistryConfig,
  
  // Event system
  SourceEventData,
  SourceEventListener
} from './review-source.interface';

export {
  // Enums
  ReviewSourceType,
  SourcePriority,
  SourceStatus,
  ReviewSourceEvent
} from './review-source.interface';

// ============================================================================
// Registry System
// ============================================================================

export { ReviewSourceRegistry } from './registry';

// ============================================================================
// Constants and Configurations
// ============================================================================

export {
  REVIEW_SOURCE_CONFIGS,
  PRIORITY_CONFIGS,
  CONTENT_TYPE_CONFIGS,
  STUDY_MODE_CONFIGS,
  STATUS_CONFIGS,
  SYSTEM_LIMITS,
  TIME_CONSTANTS,
  ERROR_MESSAGES,
  EVENT_CONFIGS,
  FEATURE_FLAGS,
  
  // Helper functions
  getSourceTypeConfig,
  getPriorityConfig,
  getContentTypeConfig,
  getStudyModeConfig,
  getStatusConfig
} from './constants';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default source configuration for a given type
 */
export function createDefaultSourceConfig(type: ReviewSourceType): SourceConfig {
  const config = REVIEW_SOURCE_CONFIGS[type];
  return {
    ...config.defaultConfig
  };
}

/**
 * Validate a review source implementation
 */
export function validateReviewSource(source: Partial<ReviewSource>): boolean {
  const requiredProperties = ['id', 'name', 'type', 'icon', 'description', 'paths', 'supportedContentTypes'];
  const requiredMethods = ['init', 'getDueItems', 'getStats', 'updateConfig', 'processReview', 'searchItems', 'getItem', 'healthCheck'];
  
  // Check required properties
  for (const prop of requiredProperties) {
    if (!(prop in source) || source[prop as keyof ReviewSource] === undefined) {
      console.error(`ReviewSource validation failed: Missing required property '${prop}'`);
      return false;
    }
  }
  
  // Check required methods
  for (const method of requiredMethods) {
    if (typeof source[method as keyof ReviewSource] !== 'function') {
      console.error(`ReviewSource validation failed: Missing or invalid method '${method}'`);
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate priority weight based on user preferences and source type
 */
export function calculateSourceWeight(
  sourceType: ReviewSourceType, 
  userPriority: SourcePriority = SourcePriority.MEDIUM
): number {
  const typeConfig = REVIEW_SOURCE_CONFIGS[sourceType];
  const priorityConfig = PRIORITY_CONFIGS[userPriority];
  
  return typeConfig.defaultConfig.priorityMultiplier * priorityConfig.weight;
}

/**
 * Format statistics for display
 */
export function formatSourceStats(stats: SourceStats): Record<string, string> {
  return {
    totalItems: stats.totalItems.toLocaleString(),
    dueToday: stats.dueToday.toLocaleString(),
    overdue: stats.overdue.toLocaleString(),
    averageMastery: `${Math.round(stats.averageMastery)}%`,
    retentionRate: `${Math.round(stats.retentionRate)}%`,
    studyStreak: `${stats.studyStreak} ${stats.studyStreak === 1 ? 'day' : 'days'}`
  };
}

/**
 * Get color for mastery level
 */
export function getMasteryColor(masteryLevel: number): string {
  if (masteryLevel >= 80) return '#059669'; // emerald-600 - excellent
  if (masteryLevel >= 60) return '#3b82f6'; // blue-600 - good
  if (masteryLevel >= 40) return '#f59e0b'; // amber-600 - okay
  if (masteryLevel >= 20) return '#f97316'; // orange-600 - needs work
  return '#dc2626'; // red-600 - struggling
}

/**
 * Get color for retention rate
 */
export function getRetentionColor(retentionRate: number): string {
  if (retentionRate >= 90) return '#059669'; // emerald-600 - excellent
  if (retentionRate >= 80) return '#3b82f6'; // blue-600 - good
  if (retentionRate >= 70) return '#f59e0b'; // amber-600 - okay
  if (retentionRate >= 60) return '#f97316'; // orange-600 - needs work
  return '#dc2626'; // red-600 - struggling
}

/**
 * Sort items by due date and priority
 */
export function sortReviewItems(
  items: ReviewItem[], 
  userPreferences?: Record<string, SourcePriority>
): ReviewItem[] {
  return [...items].sort((a, b) => {
    // First, sort by due date (earlier first)
    const dueDateDiff = a.dueDate.getTime() - b.dueDate.getTime();
    if (Math.abs(dueDateDiff) > 60 * 60 * 1000) { // More than 1 hour difference
      return dueDateDiff;
    }
    
    // If due dates are close, sort by priority
    const priorityA = userPreferences?.[a.sourceId] || SourcePriority.MEDIUM;
    const priorityB = userPreferences?.[b.sourceId] || SourcePriority.MEDIUM;
    const priorityDiff = priorityB - priorityA; // Higher priority first
    
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Finally, sort by item priority
    return b.priority - a.priority;
  });
}

/**
 * Filter items by content type
 */
export function filterByContentType(items: ReviewItem[], contentTypes: ContentType[]): ReviewItem[] {
  if (contentTypes.length === 0) return items;
  return items.filter(item => contentTypes.includes(item.contentType));
}

/**
 * Export source initialization functions
 */
export { initializeAllReviewSources } from './sources';

/**
 * Create a simple review source for testing
 */
export function createMockReviewSource(
  id: string,
  type: ReviewSourceType,
  itemCount: number = 10
): ReviewSource {
  const config = REVIEW_SOURCE_CONFIGS[type];
  
  return {
    id,
    name: config.name,
    type,
    icon: config.icon,
    description: config.description,
    paths: config.paths,
    supportedContentTypes: config.supportedContentTypes,
    status: SourceStatus.ACTIVE,
    config: config.defaultConfig,
    
    async init() {
      // Mock initialization
    },
    
    async getDueItems(options) {
      // Create mock items
      const items: ReviewItem[] = [];
      const limit = Math.min(options?.limit || 10, itemCount);
      
      for (let i = 0; i < limit; i++) {
        items.push({
          id: `${id}-item-${i}`,
          sourceId: id,
          contentType: config.supportedContentTypes[0],
          content: {
            primary: `Mock Item ${i + 1}`,
            secondary: `Mock Answer ${i + 1}`
          },
          dueDate: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000),
          priority: Math.floor(Math.random() * 10) + 1,
          availableStudyModes: config.defaultStudyModes,
          metadata: {
            tags: ['mock', 'test']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return items;
    },
    
    async getStats(): Promise<SourceStats> {
      return {
        totalItems: itemCount,
        dueToday: Math.floor(itemCount * 0.3),
        overdue: Math.floor(itemCount * 0.1),
        scheduled: Math.floor(itemCount * 0.6),
        newItems: Math.floor(itemCount * 0.2),
        itemsByType: { [config.supportedContentTypes[0]]: itemCount } as any,
        itemsByPriority: { [SourcePriority.MEDIUM]: itemCount } as any,
        averageMastery: Math.random() * 100,
        retentionRate: 70 + Math.random() * 30,
        studyStreak: Math.floor(Math.random() * 30),
        trends: {
          accuracy: 'improving',
          speed: 'stable',
          retention: 'improving'
        }
      };
    },
    
    async updateConfig(newConfig) {
      Object.assign(this.config, newConfig);
    },
    
    async processReview(itemId, result) {
      // Mock processing
    },
    
    async searchItems(query, options) {
      return [];
    },
    
    async getItem(itemId) {
      return null;
    },
    
    async healthCheck() {
      return true;
    }
  };
}

// ============================================================================
// Source Initialization
// ============================================================================

export {
  initializeAllReviewSources,
  initializeSpecificReviewSources,
  registerSingleSource,
  createSource,
  getSourceConfig,
  getAllAvailableSourceIds,
  isSourceAvailable,
  
  // Source factory functions
  createTextbookVocabularySource,
  createKanjiMasterySource,
  createFlashcardsSource,
  createHiraganaKatakanaSource,
  createArticlesSource,
  createStoriesSource,
  createMoodboardSource,
  createDictionarySource,
  createConjugationsSource,
  createDrillsSource
} from './sources';

// ============================================================================
// Default Export
// ============================================================================

// Export the registry singleton getter as default
export default ReviewSourceRegistry.getInstance;