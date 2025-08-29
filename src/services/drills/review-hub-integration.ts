/**
 * Drill Practice - Review Hub Integration
 * Connects the Drill Practice system with the unified Review Hub
 */

import { withReviewSync } from '../review-integration/withReviewSync';
import { getEventBus } from '../review-events/EventBus';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';
import {
  ReviewEventType,
  ReviewSource,
  ReviewResult,
  EventPriority
} from '../review-events/types';
import { UnifiedReviewItem, ContentType, AlgorithmType, ReviewState } from '../review-store/types';
import { learningEventsService } from '@/services/analytics/LearningEventsService';
import { DrillsSource } from '@/lib/review-sources/sources/drills';

interface DrillReviewData {
  drillId: string;
  drillName: string;
  drillType: string;
  score: number;
  timeSpent: number;
  category: string;
  difficulty: number;
  completedAt: Date;
}

/**
 * Wrap the drill review function with Review Hub sync
 */
export const reviewDrillWithSync = withReviewSync(
  async (drillId: string, rating: number, drillData: DrillReviewData) => {
    // Record drill completion event
    await learningEventsService.recordEvent({
      type: 'complete',
      category: 'drill',
      content: {
        id: drillId,
        value: drillId,
        metadata: {
          drillId,
          drillName: drillData.drillName,
          drillType: drillData.drillType,
          score: drillData.score,
          rating,
          timeSpent: drillData.timeSpent,
          category: drillData.category,
          difficulty: drillData.difficulty,
          completed: true
        }
      },
      metrics: {
        score: drillData.score,
        timeSpent: drillData.timeSpent
      },
      timestamp: Date.now()
    });
    
    return {
      drillId,
      ...drillData,
      rating,
      nextReview: calculateNextDrillReview(drillData.score, drillData.difficulty)
    };
  },
  {
    source: ReviewSource.DRILLS,
    contentType: ContentType.CUSTOM,
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true,
    batchSize: 10,
    debounceMs: 500
  },
  (result: any) => ({
    itemId: result.drillId,
    content: {
      primary: result.drillName,
      secondary: `${result.drillType} drill`,
      meaning: result.category
    },
    scheduling: {
      dueDate: result.nextReview,
      interval: calculateDrillInterval(result.score),
      easeFactor: result.difficulty ? (11 - result.difficulty) / 4 : 2.5
    },
    metadata: {
      drillType: result.drillType,
      category: result.category,
      score: result.score,
      timeSpent: result.timeSpent
    }
  })
);

/**
 * Calculate next review date for a drill based on performance
 */
function calculateNextDrillReview(score: number, difficulty: number): Date {
  const baseInterval = 3; // Base 3 days
  let intervalDays = baseInterval;
  
  // Adjust based on score
  if (score >= 90) {
    intervalDays = baseInterval * 2; // 6 days for excellent performance
  } else if (score >= 70) {
    intervalDays = baseInterval; // 3 days for good performance
  } else if (score >= 50) {
    intervalDays = Math.floor(baseInterval / 2); // 1.5 days for moderate
  } else {
    intervalDays = 1; // 1 day for poor performance
  }
  
  // Adjust based on difficulty
  const difficultyMultiplier = 1 + (difficulty - 5) * 0.1; // ±10% per difficulty point
  intervalDays = Math.round(intervalDays * difficultyMultiplier);
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return nextReview;
}

/**
 * Calculate interval in days based on score
 */
function calculateDrillInterval(score: number): number {
  if (score >= 90) return 6;
  if (score >= 70) return 3;
  if (score >= 50) return 1.5;
  return 1;
}

/**
 * Initialize Drill Practice integration with Review Hub
 */
export async function initializeDrillsIntegration(userId: string) {
  console.log('[Drills] Initializing Review Hub integration...');
  
  const eventBus = getEventBus();
  const dataStore = getUnifiedDataStore();
  
  // Initialize drills source
  const drillsSource = new DrillsSource(userId);
  await drillsSource.init();
  
  // Subscribe to drill review events from other sources
  const unsubscribeReview = eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      // Only process drill reviews from other sources
      if (event.source !== ReviewSource.DRILLS && 
          event.data.itemType === ContentType.CUSTOM &&
          event.data.metadata?.drillType) {
        
        console.log('[Drills] Syncing drill review from', event.source);
        
        try {
          // Record the external drill completion
          await learningEventsService.recordEvent({
            type: 'sync',
            category: 'drill',
            content: {
              id: event.data.itemId,
              metadata: {
                source: event.source,
                drillId: event.data.itemId,
                syncedAt: new Date(event.timestamp)
              }
            },
            timestamp: Date.now()
          });
          
          console.log('[Drills] Synced external drill review for', event.data.itemId);
        } catch (error) {
          console.error('[Drills] Failed to sync external review:', error);
        }
      }
    },
    {
      filter: (event) => event.data.itemType === ContentType.CUSTOM
    }
  );
  
  // Subscribe to sync completion events
  const unsubscribeSync = eventBus.subscribe(
    ReviewEventType.SYNC_COMPLETED,
    async (event) => {
      if (event.userId === userId) {
        console.log('[Drills] Sync completed, refreshing local data...');
        // Reinitialize to reload drill stats
        await drillsSource.init();
      }
    }
  );
  
  // Export existing data to unified store
  await exportToUnifiedStore(userId, drillsSource);
  
  console.log('[Drills] Review Hub integration initialized');
  
  return {
    source: drillsSource,
    unsubscribe: () => {
      unsubscribeReview();
      unsubscribeSync();
    }
  };
}

/**
 * Export existing Drill Practice data to Unified Store
 */
export async function exportToUnifiedStore(userId: string, source: DrillsSource) {
  console.log('[Drills] Exporting data to Unified Store...');
  
  const dataStore = getUnifiedDataStore();
  
  // Get drill stats from the source
  const stats = await source.getStats();
  const dueItems = await source.getDueItems({ limit: 100 });
  
  let exported = 0;
  let failed = 0;
  
  for (const item of dueItems) {
    try {
      const unifiedItem: UnifiedReviewItem = {
        id: `drill_${item.id}`,
        sourceId: item.id,
        sourceType: ReviewSource.DRILLS,
        contentType: ContentType.CUSTOM,
        content: {
          primary: item.content.primary,
          secondary: item.content.secondary || '',
          meaning: item.content.context || ''
        },
        scheduling: {
          algorithm: AlgorithmType.CUSTOM,
          dueDate: item.dueDate,
          interval: calculateDrillInterval(item.metadata?.properties?.averageScore || 70),
          easeFactor: 2.5,
          repetitions: item.metadata?.properties?.completions || 0,
          lapses: 0,
          state: item.metadata?.properties?.completions ? ReviewState.REVIEW : ReviewState.NEW,
          lastReviewedAt: item.metadata?.properties?.lastCompleted ? 
            new Date(item.metadata.properties.lastCompleted) : undefined,
          nextReviewAt: item.dueDate
        },
        metadata: {
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          lastReviewedAt: item.metadata?.properties?.lastCompleted ? 
            new Date(item.metadata.properties.lastCompleted) : undefined,
          lastReviewSource: ReviewSource.DRILLS,
          tags: item.metadata?.tags || [],
          properties: {
            drillType: item.metadata?.properties?.drillType,
            category: item.metadata?.properties?.category,
            averageScore: item.metadata?.properties?.averageScore,
            bestScore: item.metadata?.properties?.bestScore,
            completions: item.metadata?.properties?.completions,
            difficulty: item.metadata?.difficulty
          }
        },
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false
        }
      };
      
      // Save to unified store
      await dataStore.recordReview({
        userId,
        itemId: unifiedItem.id,
        source: ReviewSource.DRILLS,
        result: ReviewResult.CORRECT,
        metadata: {
          migration: true,
          originalData: item
        }
      });
      
      exported++;
    } catch (error) {
      console.error(`[Drills] Failed to export ${item.id}:`, error);
      failed++;
    }
  }
  
  console.log(`[Drills] Export complete: ${exported} exported, ${failed} failed`);
  
  // Emit migration complete event
  const eventBus = getEventBus();
  await eventBus.emit({
    type: ReviewEventType.SYNC_COMPLETED,
    source: ReviewSource.DRILLS,
    userId,
    data: {
      itemId: 'migration',
      itemType: ContentType.CUSTOM,
      metadata: {
        exported,
        failed,
        total: dueItems.length
      }
    },
    priority: EventPriority.LOW
  });
  
  return { exported, failed };
}

/**
 * Get due drills from both local and unified store
 */
export async function getUnifiedDueDrills(
  userId: string,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<any[]> {
  const dataStore = getUnifiedDataStore();
  
  // Get from unified store
  const unifiedDue = await dataStore.getDueItems({
    userId,
    sources: [ReviewSource.DRILLS],
    contentTypes: [ContentType.CUSTOM],
    limit: options?.limit,
    includeOverdue: true
  });
  
  // Get from local source
  const drillsSource = new DrillsSource(userId);
  await drillsSource.init();
  const localDue = await drillsSource.getDueItems({ limit: options?.limit });
  
  // Filter by category if specified
  let filteredUnified = unifiedDue.items;
  let filteredLocal = localDue;
  
  if (options?.category) {
    filteredUnified = filteredUnified.filter(item => 
      item.metadata?.properties?.category === options.category
    );
    filteredLocal = filteredLocal.filter(item =>
      item.metadata?.properties?.category === options.category
    );
  }
  
  // Merge and deduplicate
  const merged = new Map<string, any>();
  
  // Add unified items
  for (const item of filteredUnified) {
    merged.set(item.sourceId, {
      ...item,
      source: 'unified'
    });
  }
  
  // Add local items
  for (const item of filteredLocal) {
    if (!merged.has(item.id)) {
      merged.set(item.id, {
        ...item,
        source: 'local'
      });
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Handle batch review sync for drills
 */
export async function syncBatchDrillReviews(
  userId: string,
  reviews: Array<{
    drillId: string;
    rating: number;
    drillData: DrillReviewData;
  }>
) {
  console.log(`[Drills] Syncing batch of ${reviews.length} drill reviews...`);
  
  const results = [];
  
  for (const review of reviews) {
    try {
      const result = await reviewDrillWithSync(
        review.drillId, 
        review.rating, 
        review.drillData
      );
      results.push({ success: true, result });
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`[Drills] Batch sync complete: ${successful}/${reviews.length} successful`);
  
  return results;
}

/**
 * Setup real-time sync for drills
 */
export function setupRealtimeSync(userId: string) {
  const eventBus = getEventBus();
  
  // Listen for real-time updates
  eventBus.subscribe(
    ReviewEventType.ITEM_UPDATED,
    async (event) => {
      if (event.source !== ReviewSource.DRILLS && 
          event.data.itemType === ContentType.CUSTOM &&
          event.data.metadata?.drillType) {
        
        console.log('[Drills] Real-time update received for', event.data.itemId);
        
        // Emit custom event for UI components
        window.dispatchEvent(new CustomEvent('drillUpdate', {
          detail: {
            itemId: event.data.itemId,
            changes: event.data.metadata
          }
        }));
      }
    }
  );
  
  // Listen for conflict resolution
  eventBus.subscribe(
    ReviewEventType.SYNC_CONFLICT,
    async (event) => {
      if (event.data.metadata?.local?.sourceType === ReviewSource.DRILLS) {
        console.log('[Drills] Conflict detected, needs resolution');
        
        // Could show UI for manual resolution
        window.dispatchEvent(new CustomEvent('drillConflict', {
          detail: {
            local: event.data.metadata.local,
            remote: event.data.metadata.remote
          }
        }));
      }
    }
  );
}

/**
 * Get combined statistics from local and unified stores
 */
export async function getUnifiedStats(userId: string): Promise<any> {
  const drillsSource = new DrillsSource(userId);
  await drillsSource.init();
  
  const localStats = await drillsSource.getStats();
  const dataStore = getUnifiedDataStore();
  
  // Get unified stats
  const unifiedDue = await dataStore.getDueItems({
    userId,
    sources: [ReviewSource.DRILLS],
    contentTypes: [ContentType.CUSTOM]
  });
  
  return {
    ...localStats,
    unified: {
      totalDue: unifiedDue.total,
      overdueCount: unifiedDue.overdue,
      dueTodayCount: unifiedDue.dueToday,
      dueTomorrowCount: unifiedDue.dueTomorrow
    }
  };
}

// Export for use in components
export default {
  initializeDrillsIntegration,
  exportToUnifiedStore,
  getUnifiedDueDrills,
  syncBatchDrillReviews,
  setupRealtimeSync,
  getUnifiedStats,
  reviewDrillWithSync
};