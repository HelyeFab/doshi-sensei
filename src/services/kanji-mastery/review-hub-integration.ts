/**
 * Kanji Mastery - Review Hub Integration
 * Connects the existing Kanji Mastery service with the unified Review Hub
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
import { kanjiSpacedRepetitionService } from './spaced-repetition-service';
import { kanjiMasteryStorage, KanjiProgress } from './indexdb-storage';
import type { EnrichedKanji } from './kanji-enrichment';

/**
 * Wrap the Kanji Mastery review function with Review Hub sync
 */
export const processReviewWithSync = withReviewSync(
  kanjiSpacedRepetitionService.processReview.bind(kanjiSpacedRepetitionService),
  {
    source: ReviewSource.KANJI_MASTERY,
    contentType: 'kanji' as ContentType,
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true
  },
  (result: any) => ({
    itemId: `kanji_${result.kanjiId || result.character}`,
    content: {
      primary: result.character || result.kanjiId,
      secondary: result.reading,
      meaning: result.meaning || result.english
    },
    scheduling: {
      dueDate: result.nextReview,
      interval: result.interval,
      easeFactor: result.easeFactor
    },
    metadata: {
      jlpt: result.jlptLevel,
      grade: result.grade,
      masteryLevel: result.masteryLevel,
      retentionRate: result.retentionRate
    }
  })
);

/**
 * Initialize Kanji Mastery integration with Review Hub
 */
export async function initializeKanjiMasteryIntegration() {
  console.log('[Kanji Mastery] Initializing Review Hub integration...');
  
  const eventBus = getEventBus();
  const dataStore = getUnifiedDataStore();
  
  // Subscribe to review events from other sources
  const unsubscribeReview = eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      // Only process kanji reviews from other sources
      if (event.source !== ReviewSource.KANJI_MASTERY && 
          event.data.itemType === 'kanji') {
        
        console.log('[Kanji Mastery] Syncing kanji review from', event.source);
        
        try {
          // Extract kanji character
          const kanji = event.data.content?.primary;
          if (!kanji) return;
          
          // Check if we have this kanji in our system
          const progress = await kanjiMasteryStorage.getProgress(kanji);
          
          if (progress) {
            // Update our local progress based on external review
            const updatedProgress: KanjiProgress = {
              ...progress,
              lastReviewed: new Date(event.timestamp),
              reviewCount: progress.reviewCount + 1,
              quality: event.data.result === ReviewResult.CORRECT ? 4 : 2,
              updatedAt: new Date()
            };
            
            await kanjiMasteryStorage.saveProgress(updatedProgress);
            console.log('[Kanji Mastery] Updated local progress for', kanji);
          }
        } catch (error) {
          console.error('[Kanji Mastery] Failed to sync external review:', error);
        }
      }
    },
    {
      filter: (event) => event.data.itemType === 'kanji'
    }
  );
  
  // Subscribe to sync events
  const unsubscribeSync = eventBus.subscribe(
    ReviewEventType.SYNC_COMPLETED,
    async (event) => {
      if (event.userId) {
        console.log('[Kanji Mastery] Sync completed, refreshing local data...');
        // Trigger any necessary local updates
      }
    }
  );
  
  // Export kanji progress to unified store on startup
  await exportToUnifiedStore();
  
  console.log('[Kanji Mastery] Review Hub integration initialized');
  
  return {
    unsubscribe: () => {
      unsubscribeReview();
      unsubscribeSync();
    }
  };
}

/**
 * Export existing Kanji Mastery data to Unified Store
 */
export async function exportToUnifiedStore() {
  console.log('[Kanji Mastery] Exporting data to Unified Store...');
  
  const dataStore = getUnifiedDataStore();
  const allProgress = await kanjiMasteryStorage.getAllProgress();
  
  let exported = 0;
  let failed = 0;
  
  for (const progress of allProgress) {
    try {
      const unifiedItem: UnifiedReviewItem = {
        id: `kanji_mastery_${progress.id}`,
        sourceId: progress.id,
        sourceType: ReviewSource.KANJI_MASTERY,
        contentType: 'kanji',
        content: {
          primary: progress.id, // The kanji character
          meaning: '', // Would need to fetch from kanji data
          reading: ''  // Would need to fetch from kanji data
        },
        scheduling: {
          algorithm: AlgorithmType.FSRS,
          dueDate: new Date(progress.nextReview),
          interval: progress.interval,
          easeFactor: progress.easeFactor,
          repetitions: progress.reviewCount,
          lapses: progress.lapses,
          state: progress.reviewCount === 0 ? ReviewState.NEW : ReviewState.REVIEW,
          lastReviewedAt: progress.lastReviewed,
          nextReviewAt: new Date(progress.nextReview)
        },
        metadata: {
          createdAt: progress.createdAt,
          updatedAt: progress.updatedAt,
          lastReviewedAt: progress.lastReviewed,
          lastReviewSource: ReviewSource.KANJI_MASTERY,
          tags: [`jlpt-${progress.jlptLevel}`, `grade-${progress.grade}`],
          properties: {
            masteryLevel: progress.masteryLevel,
            retentionRate: progress.retentionRate,
            difficulty: progress.difficulty
          }
        },
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false
        }
      };
      
      // Save to unified store (without triggering review event)
      await dataStore.recordReview({
        userId: 'current_user', // Would get from auth
        itemId: unifiedItem.id,
        source: ReviewSource.KANJI_MASTERY,
        result: ReviewResult.CORRECT,
        metadata: {
          migration: true,
          originalData: progress
        }
      });
      
      exported++;
    } catch (error) {
      console.error(`[Kanji Mastery] Failed to export ${progress.id}:`, error);
      failed++;
    }
  }
  
  console.log(`[Kanji Mastery] Export complete: ${exported} exported, ${failed} failed`);
  
  // Emit migration complete event
  const eventBus = getEventBus();
  await eventBus.emit({
    type: ReviewEventType.SYNC_COMPLETED,
    source: ReviewSource.KANJI_MASTERY,
    userId: 'current_user',
    data: {
      itemId: 'migration',
      itemType: 'kanji',
      metadata: {
        exported,
        failed,
        total: allProgress.length
      }
    },
    priority: EventPriority.LOW
  });
  
  return { exported, failed };
}

/**
 * Get due items from both local and unified store
 */
export async function getUnifiedDueKanji(jlptLevel?: string): Promise<any[]> {
  const dataStore = getUnifiedDataStore();
  
  // Get from unified store
  const unifiedDue = await dataStore.getDueItems({
    userId: 'current_user',
    sources: [ReviewSource.KANJI_MASTERY],
    contentTypes: ['kanji'],
    includeOverdue: true
  });
  
  // Get from local store (for comparison/fallback)
  const localDue = await kanjiSpacedRepetitionService.getDueKanji(jlptLevel);
  
  // Merge and deduplicate
  const merged = new Map<string, any>();
  
  // Add unified items
  for (const item of unifiedDue.items) {
    merged.set(item.content.primary, {
      ...item,
      source: 'unified'
    });
  }
  
  // Add local items (if not already in unified)
  for (const progress of localDue) {
    if (!merged.has(progress.id)) {
      merged.set(progress.id, {
        ...progress,
        source: 'local'
      });
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Handle real-time sync updates
 */
export function setupRealtimeSync() {
  const eventBus = getEventBus();
  
  // Listen for real-time updates
  eventBus.subscribe(
    ReviewEventType.ITEM_UPDATED,
    async (event) => {
      if (event.source !== ReviewSource.KANJI_MASTERY && 
          event.data.itemType === 'kanji') {
        
        // Update local UI or trigger re-fetch
        console.log('[Kanji Mastery] Real-time update received for', event.data.itemId);
        
        // Emit custom event for UI components
        window.dispatchEvent(new CustomEvent('kanjiMasteryUpdate', {
          detail: {
            itemId: event.data.itemId,
            changes: event.data.metadata
          }
        }));
      }
    }
  );
}

/**
 * Enhanced review function that syncs with Review Hub
 */
export async function reviewKanjiWithSync(
  kanjiId: string,
  rating: number,
  kanjiData: EnrichedKanji,
  studyMode: 'recognition' | 'production' | 'writing' = 'recognition'
) {
  // Process review with original service (now wrapped with sync)
  const result = await processReviewWithSync(kanjiId, rating, kanjiData, studyMode);
  
  // Emit additional events if needed
  const eventBus = getEventBus();
  
  // Emit study mode specific event
  await eventBus.emit({
    type: ReviewEventType.ITEM_REVIEWED,
    source: ReviewSource.KANJI_MASTERY,
    userId: 'current_user',
    data: {
      itemId: kanjiId,
      itemType: 'kanji',
      content: {
        primary: kanjiId,
        meaning: kanjiData.meanings?.join(', '),
        reading: kanjiData.readings?.kun?.[0] || kanjiData.readings?.on?.[0]
      },
      result: rating >= 3 ? ReviewResult.CORRECT : ReviewResult.INCORRECT,
      duration: 0, // Would track actual time
      metadata: {
        studyMode,
        rating,
        jlpt: kanjiData.jlpt,
        grade: kanjiData.grade
      }
    },
    priority: EventPriority.NORMAL
  });
  
  return result;
}

// Export for use in components
export default {
  initializeKanjiMasteryIntegration,
  exportToUnifiedStore,
  getUnifiedDueKanji,
  setupRealtimeSync,
  reviewKanjiWithSync
};