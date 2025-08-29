/**
 * Textbook Vocabulary - Review Hub Integration
 * Connects the Textbook Vocabulary service with the unified Review Hub
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
import { TextbookVocabularyService } from './textbook-vocabulary-service';
import { vocabStorage, VocabularyProgress } from './storage';
import type { VocabularyItem } from '@/app/tools/textbook-vocabulary/types';

// Create service instance
const vocabService = new TextbookVocabularyService('current_user');

/**
 * Wrap the vocabulary review function with Review Hub sync
 */
export const reviewCardWithSync = withReviewSync(
  async (cardId: string, rating: number) => {
    await vocabService.init();
    const result = await vocabService.reviewCard(cardId, rating);
    return {
      ...result,
      id: cardId,
      rating
    };
  },
  {
    source: ReviewSource.TEXTBOOK_VOCAB,
    contentType: 'vocabulary' as ContentType,
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true,
    batchSize: 10,
    debounceMs: 500
  },
  (result: any) => ({
    itemId: result.id,
    content: {
      primary: result.word || result.kanji,
      secondary: result.reading || result.kana,
      meaning: result.meaning || result.english
    },
    scheduling: {
      dueDate: result.dueDate,
      interval: result.interval,
      easeFactor: result.difficulty
    },
    metadata: {
      textbook: result.textbook,
      lesson: result.lesson,
      jlpt: result.jlpt,
      tags: result.tags
    }
  })
);

/**
 * Initialize Textbook Vocabulary integration with Review Hub
 */
export async function initializeTextbookVocabularyIntegration() {
  console.log('[Textbook Vocab] Initializing Review Hub integration...');
  
  const eventBus = getEventBus();
  const dataStore = getUnifiedDataStore();
  
  // Initialize service
  await vocabService.init();
  
  // Subscribe to vocabulary review events from other sources
  const unsubscribeReview = eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      // Only process vocabulary reviews from other sources
      if (event.source !== ReviewSource.TEXTBOOK_VOCAB && 
          event.data.itemType === 'vocabulary') {
        
        console.log('[Textbook Vocab] Syncing vocabulary review from', event.source);
        
        try {
          // Extract vocabulary word
          const word = event.data.content?.primary;
          const reading = event.data.content?.secondary;
          
          if (!word) return;
          
          // Find matching progress
          const allProgress = await vocabStorage.getAllProgress();
          const matching = allProgress.find(p => 
            p.word === word || 
            (p.word === word && p.reading === reading)
          );
          
          if (matching) {
            // Update local progress
            const updatedProgress: VocabularyProgress = {
              ...matching,
              lastReviewedAt: new Date(event.timestamp),
              totalReviews: matching.totalReviews + 1,
              correctReviews: event.data.result === ReviewResult.CORRECT 
                ? matching.correctReviews + 1 
                : matching.correctReviews,
              updatedAt: new Date()
            };
            
            await vocabStorage.saveProgress(updatedProgress);
            console.log('[Textbook Vocab] Updated local progress for', word);
          }
        } catch (error) {
          console.error('[Textbook Vocab] Failed to sync external review:', error);
        }
      }
    },
    {
      filter: (event) => event.data.itemType === 'vocabulary'
    }
  );
  
  // Subscribe to sync completion events
  const unsubscribeSync = eventBus.subscribe(
    ReviewEventType.SYNC_COMPLETED,
    async (event) => {
      if (event.userId) {
        console.log('[Textbook Vocab] Sync completed, refreshing local data...');
        // Refresh cached data
        await vocabService.cleanup();
        await vocabService.init();
      }
    }
  );
  
  // Export existing data to unified store
  await exportToUnifiedStore();
  
  console.log('[Textbook Vocab] Review Hub integration initialized');
  
  return {
    unsubscribe: () => {
      unsubscribeReview();
      unsubscribeSync();
    }
  };
}

/**
 * Export existing Textbook Vocabulary data to Unified Store
 */
export async function exportToUnifiedStore() {
  console.log('[Textbook Vocab] Exporting data to Unified Store...');
  
  const dataStore = getUnifiedDataStore();
  const allProgress = await vocabStorage.getAllProgress();
  
  let exported = 0;
  let failed = 0;
  
  for (const progress of allProgress) {
    try {
      const unifiedItem: UnifiedReviewItem = {
        id: `textbook_vocab_${progress.id}`,
        sourceId: progress.id,
        sourceType: ReviewSource.TEXTBOOK_VOCAB,
        contentType: 'vocabulary',
        content: {
          primary: progress.word,
          secondary: progress.reading,
          meaning: progress.meaning
        },
        scheduling: {
          algorithm: AlgorithmType.FSRS,
          dueDate: progress.nextReviewAt,
          interval: progress.fsrsCard?.scheduled_days || 1,
          easeFactor: progress.fsrsCard?.stability || 2.5,
          repetitions: progress.totalReviews,
          lapses: progress.fsrsCard?.lapses || 0,
          state: progress.totalReviews === 0 ? ReviewState.NEW : ReviewState.REVIEW,
          lastReviewedAt: progress.lastReviewedAt,
          nextReviewAt: progress.nextReviewAt
        },
        metadata: {
          createdAt: progress.createdAt,
          updatedAt: progress.updatedAt,
          lastReviewedAt: progress.lastReviewedAt,
          lastReviewSource: ReviewSource.TEXTBOOK_VOCAB,
          tags: progress.tags || [],
          properties: {
            textbook: progress.textbook,
            lesson: progress.lesson,
            jlpt: progress.jlpt,
            accuracy: progress.totalReviews > 0 
              ? (progress.correctReviews / progress.totalReviews) * 100 
              : 0
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
        userId: 'current_user',
        itemId: unifiedItem.id,
        source: ReviewSource.TEXTBOOK_VOCAB,
        result: ReviewResult.CORRECT,
        metadata: {
          migration: true,
          originalData: progress
        }
      });
      
      exported++;
    } catch (error) {
      console.error(`[Textbook Vocab] Failed to export ${progress.id}:`, error);
      failed++;
    }
  }
  
  console.log(`[Textbook Vocab] Export complete: ${exported} exported, ${failed} failed`);
  
  // Emit migration complete event
  const eventBus = getEventBus();
  await eventBus.emit({
    type: ReviewEventType.SYNC_COMPLETED,
    source: ReviewSource.TEXTBOOK_VOCAB,
    userId: 'current_user',
    data: {
      itemId: 'migration',
      itemType: 'vocabulary',
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
export async function getUnifiedDueVocabulary(options?: {
  limit?: number;
  textbooks?: string[];
}): Promise<any[]> {
  const dataStore = getUnifiedDataStore();
  
  // Get from unified store
  const unifiedDue = await dataStore.getDueItems({
    userId: 'current_user',
    sources: [ReviewSource.TEXTBOOK_VOCAB],
    contentTypes: ['vocabulary'],
    limit: options?.limit,
    includeOverdue: true
  });
  
  // Get from local store
  const localDue = await vocabService.getDueItems(options);
  
  // Merge and deduplicate
  const merged = new Map<string, any>();
  
  // Add unified items
  for (const item of unifiedDue.items) {
    const key = `${item.content.primary}_${item.content.secondary}`;
    merged.set(key, {
      ...item,
      source: 'unified'
    });
  }
  
  // Add local items
  for (const card of localDue) {
    const key = `${card.word}_${card.reading}`;
    if (!merged.has(key)) {
      merged.set(key, {
        ...card,
        source: 'local'
      });
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Handle batch review sync
 */
export async function syncBatchReviews(reviews: Array<{
  cardId: string;
  rating: number;
  responseTime?: number;
}>) {
  console.log(`[Textbook Vocab] Syncing batch of ${reviews.length} reviews...`);
  
  const results = [];
  
  for (const review of reviews) {
    try {
      const result = await reviewCardWithSync(review.cardId, review.rating);
      results.push({ success: true, result });
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`[Textbook Vocab] Batch sync complete: ${successful}/${reviews.length} successful`);
  
  return results;
}

/**
 * Setup real-time sync for vocabulary
 */
export function setupRealtimeSync() {
  const eventBus = getEventBus();
  
  // Listen for real-time updates
  eventBus.subscribe(
    ReviewEventType.ITEM_UPDATED,
    async (event) => {
      if (event.source !== ReviewSource.TEXTBOOK_VOCAB && 
          event.data.itemType === 'vocabulary') {
        
        console.log('[Textbook Vocab] Real-time update received for', event.data.itemId);
        
        // Emit custom event for UI components
        window.dispatchEvent(new CustomEvent('textbookVocabUpdate', {
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
      if (event.data.metadata?.local?.sourceType === ReviewSource.TEXTBOOK_VOCAB) {
        console.log('[Textbook Vocab] Conflict detected, needs resolution');
        
        // Could show UI for manual resolution
        window.dispatchEvent(new CustomEvent('vocabConflict', {
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
export async function getUnifiedStats(): Promise<any> {
  const localStats = await vocabService.getStats();
  const dataStore = getUnifiedDataStore();
  
  // Get unified stats
  const unifiedDue = await dataStore.getDueItems({
    userId: 'current_user',
    sources: [ReviewSource.TEXTBOOK_VOCAB],
    contentTypes: ['vocabulary']
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
  initializeTextbookVocabularyIntegration,
  exportToUnifiedStore,
  getUnifiedDueVocabulary,
  syncBatchReviews,
  setupRealtimeSync,
  getUnifiedStats,
  reviewCardWithSync
};