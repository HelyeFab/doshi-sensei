/**
 * Integration Wrapper for Legacy Features
 * Gradual migration path to unified review system
 */

import { getEventBus } from '../review-events/EventBus';
import { getUnifiedDataStore } from '../review-store/UnifiedDataStore';
import {
  ReviewEventType,
  EventPriority,
  ReviewSource,
  ReviewResult,
  ReviewAction
} from '../review-events/types';
import { UnifiedReviewItem, ContentType } from '../review-store/types';

// Sync options for wrapper
export interface SyncOptions {
  source: ReviewSource;
  contentType: ContentType;
  emitEvents?: boolean;
  syncToUnified?: boolean;
  trackUsage?: boolean;
  batchSize?: number;
  debounceMs?: number;
}

// Review data extractor function
export type ReviewDataExtractor<T> = (result: T) => {
  itemId: string;
  content: {
    primary: string;
    secondary?: string;
    meaning?: string;
    reading?: string;
  };
  scheduling?: {
    dueDate?: Date;
    interval?: number;
    easeFactor?: number;
  };
  metadata?: Record<string, any>;
};

/**
 * Wrapper for gradual migration to unified review system
 * Wraps existing functions to emit events without breaking functionality
 */
export function withReviewSync<T extends (...args: any[]) => any>(
  originalFunction: T,
  options: SyncOptions,
  dataExtractor?: ReviewDataExtractor<Awaited<ReturnType<T>>>
): T {
  const eventBus = getEventBus();
  const dataStore = getUnifiedDataStore();
  const pendingBatch: any[] = [];
  let batchTimeout: NodeJS.Timeout | null = null;

  // Create wrapped function
  const wrappedFunction = async function(this: any, ...args: any[]) {
    try {
      // 1. Execute original function
      const result = await originalFunction.apply(this, args);
      
      // 2. Extract review data if possible
      if (options.emitEvents !== false && dataExtractor) {
        const reviewData = dataExtractor(result);
        
        // 3. Emit event (non-blocking)
        setImmediate(async () => {
          try {
            await emitReviewEvent(reviewData, options);
          } catch (error) {
            console.error('[withReviewSync] Failed to emit event:', error);
          }
        });
        
        // 4. Sync to unified store if enabled
        if (options.syncToUnified) {
          if (options.batchSize && options.batchSize > 1) {
            queueForBatchSync(reviewData, options);
          } else {
            setImmediate(async () => {
              try {
                await syncToUnifiedStore(reviewData, options);
              } catch (error) {
                console.error('[withReviewSync] Failed to sync:', error);
              }
            });
          }
        }
      }
      
      return result;
      
    } catch (error) {
      // Log but don't fail the original operation
      console.error('[withReviewSync] Error in wrapped function:', error);
      throw error; // Re-throw original error
    }
  } as T;

  // Helper: Emit review event
  async function emitReviewEvent(data: any, options: SyncOptions) {
    await eventBus.emit({
      type: ReviewEventType.ITEM_REVIEWED,
      source: options.source,
      userId: getCurrentUserId(),
      data: {
        itemId: data.itemId,
        itemType: options.contentType,
        content: data.content,
        action: ReviewAction.COMPLETE,
        result: data.result || ReviewResult.CORRECT,
        metadata: data.metadata
      },
      priority: EventPriority.NORMAL
    });
  }

  // Helper: Sync to unified store
  async function syncToUnifiedStore(data: any, options: SyncOptions) {
    const item: Partial<UnifiedReviewItem> = {
      id: data.itemId,
      sourceId: data.itemId,
      sourceType: options.source,
      contentType: options.contentType,
      content: data.content,
      metadata: {
        ...data.metadata,
        updatedAt: new Date()
      }
    };
    
    if (data.scheduling) {
      item.scheduling = {
        ...data.scheduling,
        algorithm: getAlgorithmType(options.source),
        state: 'review' as any
      };
    }
    
    // Queue for sync
    await dataStore.recordReview({
      userId: getCurrentUserId(),
      itemId: data.itemId,
      source: options.source,
      result: data.result || ReviewResult.CORRECT,
      metadata: data.metadata
    });
  }

  // Helper: Queue for batch sync
  function queueForBatchSync(data: any, options: SyncOptions) {
    pendingBatch.push(data);
    
    // Clear existing timeout
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    
    // Process batch when size reached or after debounce
    if (pendingBatch.length >= (options.batchSize || 10)) {
      processBatch();
    } else {
      batchTimeout = setTimeout(() => {
        processBatch();
      }, options.debounceMs || 1000);
    }
  }

  // Helper: Process batch
  async function processBatch() {
    if (pendingBatch.length === 0) return;
    
    const batch = [...pendingBatch];
    pendingBatch.length = 0;
    
    console.log(`[withReviewSync] Processing batch of ${batch.length} items`);
    
    for (const data of batch) {
      try {
        await syncToUnifiedStore(data, options);
      } catch (error) {
        console.error('[withReviewSync] Batch sync error:', error);
      }
    }
  }

  return wrappedFunction;
}

/**
 * Wrapper specifically for Kanji Mastery integration
 */
export function withKanjiMasterySync<T extends (...args: any[]) => any>(
  originalFunction: T
): T {
  return withReviewSync(originalFunction, {
    source: ReviewSource.KANJI_MASTERY,
    contentType: 'kanji',
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true
  }, (result: any) => ({
    itemId: result.character || result.kanji,
    content: {
      primary: result.character || result.kanji,
      meaning: result.meaning || result.english,
      reading: result.reading || result.kunyomi
    },
    scheduling: {
      dueDate: result.due_date ? new Date(result.due_date) : undefined,
      interval: result.interval,
      easeFactor: result.ease_factor
    },
    metadata: {
      grade: result.grade,
      jlpt: result.jlpt,
      frequency: result.frequency
    }
  }));
}

/**
 * Wrapper specifically for Textbook Vocabulary integration
 */
export function withTextbookVocabularySync<T extends (...args: any[]) => any>(
  originalFunction: T
): T {
  return withReviewSync(originalFunction, {
    source: ReviewSource.TEXTBOOK_VOCAB,
    contentType: 'vocabulary',
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true,
    batchSize: 10,
    debounceMs: 500
  }, (result: any) => ({
    itemId: result.id || `${result.kanji}_${result.kana}`,
    content: {
      primary: result.kanji || result.word,
      secondary: result.kana || result.reading,
      meaning: result.meaning || result.english
    },
    scheduling: {
      dueDate: result.nextReview ? new Date(result.nextReview) : undefined,
      interval: result.interval,
      easeFactor: result.difficulty
    },
    metadata: {
      textbook: result.textbook,
      lesson: result.lesson,
      section: result.section
    }
  }));
}

/**
 * Wrapper specifically for Flashcards integration
 */
export function withFlashcardsSync<T extends (...args: any[]) => any>(
  originalFunction: T
): T {
  return withReviewSync(originalFunction, {
    source: ReviewSource.FLASHCARDS,
    contentType: 'flashcard',
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true
  }, (result: any) => ({
    itemId: result.id || result.cardId,
    content: {
      primary: result.front,
      secondary: result.back,
      meaning: result.meaning
    },
    scheduling: {
      dueDate: result.dueDate,
      interval: result.interval
    },
    metadata: {
      deckId: result.deckId,
      tags: result.tags
    }
  }));
}

/**
 * Wrapper for drill practice integration
 */
export function withDrillSync<T extends (...args: any[]) => any>(
  originalFunction: T
): T {
  return withReviewSync(originalFunction, {
    source: ReviewSource.DRILL_PRACTICE,
    contentType: 'vocabulary',
    emitEvents: true,
    syncToUnified: false, // Drills don't need full sync
    trackUsage: true
  }, (result: any) => ({
    itemId: result.wordId || result.id,
    content: {
      primary: result.word || result.kanji,
      secondary: result.reading || result.kana,
      meaning: result.meaning
    },
    metadata: {
      drillType: result.drillType,
      score: result.score,
      timeSpent: result.timeSpent
    }
  }));
}

// Helper functions

function getCurrentUserId(): string {
  // This would get the actual user ID from auth context
  // For now, return a placeholder
  if (typeof window !== 'undefined') {
    // Client-side: get from auth context or session
    return (window as any).__userId || 'user_123';
  } else {
    // Server-side: would get from request context
    return 'server_user';
  }
}

function getAlgorithmType(source: ReviewSource): any {
  switch (source) {
    case ReviewSource.KANJI_MASTERY:
      return 'FSRS';
    case ReviewSource.TEXTBOOK_VOCAB:
      return 'FSRS';
    case ReviewSource.FLASHCARDS:
      return 'SM2';
    default:
      return 'SIMPLE';
  }
}

/**
 * Batch sync helper for migrating existing data
 */
export async function batchMigrateToUnified(
  items: any[],
  source: ReviewSource,
  contentType: ContentType,
  extractor: ReviewDataExtractor<any>
): Promise<{
  success: number;
  failed: number;
  errors: Error[];
}> {
  const dataStore = getUnifiedDataStore();
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Error[]
  };
  
  console.log(`[Migration] Starting batch migration of ${items.length} items from ${source}`);
  
  for (const item of items) {
    try {
      const data = extractor(item);
      
      await dataStore.recordReview({
        userId: getCurrentUserId(),
        itemId: data.itemId,
        source,
        result: ReviewResult.CORRECT,
        metadata: {
          ...data.metadata,
          migration: true,
          migratedAt: new Date()
        }
      });
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(error as Error);
      console.error(`[Migration] Failed to migrate item:`, error);
    }
  }
  
  console.log(`[Migration] Completed: ${results.success} success, ${results.failed} failed`);
  
  return results;
}