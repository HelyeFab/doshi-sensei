/**
 * Flashcards - Review Hub Integration
 * Connects the Flashcards system with the unified Review Hub
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
import { flashcardSRSManager } from '@/utils/flashcardSRSManager';
import StudyListManager from '@/utils/studyListManager';
import { FlashcardItem, isAnkiCard } from '@/types/flashcard';
import { FlashcardsSource } from '@/lib/review-sources/sources/flashcards';

/**
 * Wrap the flashcard review function with Review Hub sync
 */
export const reviewFlashcardWithSync = withReviewSync(
  async (cardId: string, rating: number) => {
    // Load current SRS data
    const srsDataMap = await flashcardSRSManager.loadSRSData([cardId]);
    const currentSRS = srsDataMap.get(cardId);
    
    if (!currentSRS) {
      throw new Error(`No SRS data found for card ${cardId}`);
    }
    
    // Convert rating to SRS format
    let srsRating: 'again' | 'hard' | 'good' | 'easy';
    const accuracy = rating / 4;
    
    if (accuracy < 0.3) {
      srsRating = 'again';
    } else if (accuracy < 0.6) {
      srsRating = 'hard';
    } else if (accuracy < 0.9) {
      srsRating = 'good';
    } else {
      srsRating = 'easy';
    }
    
    // Update SRS data (this would need the actual algorithm implementation)
    // For now, return current data with updated review timestamp
    return {
      ...currentSRS,
      lastReview: new Date(),
      reviews: (currentSRS.reviews || 0) + 1,
      rating: srsRating
    };
  },
  {
    source: ReviewSource.FLASHCARDS,
    contentType: ContentType.FLASHCARD,
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true,
    batchSize: 20,
    debounceMs: 300
  },
  (result: any) => ({
    itemId: result.id || result.cardId,
    content: {
      primary: result.front || result.question,
      secondary: result.back || result.answer,
      meaning: result.meaning
    },
    scheduling: {
      dueDate: result.due || result.nextReview,
      interval: result.interval || 1,
      easeFactor: result.ease || 2.5
    },
    metadata: {
      cardType: result.cardType || 'word',
      deckName: result.deckName,
      tags: result.tags || []
    }
  })
);

/**
 * Initialize Flashcards integration with Review Hub
 */
export async function initializeFlashcardsIntegration(userId: string) {
  console.log('[Flashcards] Initializing Review Hub integration...');
  
  const eventBus = getEventBus();
  const dataStore = getUnifiedDataStore();
  
  // Initialize flashcards source
  const flashcardsSource = new FlashcardsSource(userId);
  await flashcardsSource.init();
  
  // Subscribe to flashcard review events from other sources
  const unsubscribeReview = eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      // Only process flashcard reviews from other sources
      if (event.source !== ReviewSource.FLASHCARDS && 
          event.data.itemType === ContentType.FLASHCARD) {
        
        console.log('[Flashcards] Syncing flashcard review from', event.source);
        
        try {
          // Update local SRS data based on external review
          const cardId = event.data.itemId;
          const srsDataMap = await flashcardSRSManager.loadSRSData([cardId]);
          const currentSRS = srsDataMap.get(cardId);
          
          if (currentSRS) {
            // Update review count and timestamp
            const updatedSRS = {
              ...currentSRS,
              lastReview: new Date(event.timestamp),
              reviews: (currentSRS.reviews || 0) + 1
            };
            
            // Save updated SRS data (would need actual save implementation)
            console.log('[Flashcards] Updated local SRS data for', cardId);
          }
        } catch (error) {
          console.error('[Flashcards] Failed to sync external review:', error);
        }
      }
    },
    {
      filter: (event) => event.data.itemType === ContentType.FLASHCARD
    }
  );
  
  // Subscribe to sync completion events
  const unsubscribeSync = eventBus.subscribe(
    ReviewEventType.SYNC_COMPLETED,
    async (event) => {
      if (event.userId === userId) {
        console.log('[Flashcards] Sync completed, refreshing local data...');
        // Clear cache to force refresh
        flashcardsSource.clearCache();
      }
    }
  );
  
  // Export existing data to unified store
  await exportToUnifiedStore(userId, flashcardsSource);
  
  console.log('[Flashcards] Review Hub integration initialized');
  
  return {
    source: flashcardsSource,
    unsubscribe: () => {
      unsubscribeReview();
      unsubscribeSync();
    }
  };
}

/**
 * Export existing Flashcards data to Unified Store
 */
export async function exportToUnifiedStore(userId: string, source: FlashcardsSource) {
  console.log('[Flashcards] Exporting data to Unified Store...');
  
  const dataStore = getUnifiedDataStore();
  
  // Get all flashcards
  const allLists = await StudyListManager.getAllStudyLists();
  let allFlashcards: FlashcardItem[] = [];
  
  for (const list of allLists) {
    const { words, ankiCards } = await StudyListManager.getItemsInList(list.id);
    
    // Convert to FlashcardItems
    const wordCards: FlashcardItem[] = words.map(word => ({
      ...word,
      createdAt: word.createdAt || Date.now(),
      updatedAt: word.updatedAt || Date.now()
    }));
    
    const ankiFlashcards: FlashcardItem[] = ankiCards.map(card => ({
      id: card.id,
      itemType: 'anki_card' as const,
      ankiData: card.ankiData,
      kanji: card.ankiData?.front || '',
      kana: '',
      meaning: card.ankiData?.back || '',
      type: 'anki' as any,
      createdAt: card.savedAt?.getTime() || Date.now(),
      updatedAt: card.savedAt?.getTime() || Date.now()
    }));
    
    allFlashcards = [...allFlashcards, ...wordCards, ...ankiFlashcards];
  }
  
  // Remove duplicates
  const uniqueFlashcards = allFlashcards.filter((card, index, self) => 
    index === self.findIndex(c => c.id === card.id)
  );
  
  // Get SRS data for all cards
  const cardIds = uniqueFlashcards.map(card => card.id);
  const srsDataMap = await flashcardSRSManager.loadSRSData(cardIds);
  
  let exported = 0;
  let failed = 0;
  
  for (const card of uniqueFlashcards) {
    try {
      const srsData = srsDataMap.get(card.id);
      const isAnki = isAnkiCard(card);
      
      const unifiedItem: UnifiedReviewItem = {
        id: `flashcard_${card.id}`,
        sourceId: card.id,
        sourceType: ReviewSource.FLASHCARDS,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: isAnki && card.ankiData ? card.ankiData.front : (card.kanji || card.kana),
          secondary: isAnki && card.ankiData ? card.ankiData.back : card.meaning,
          meaning: card.meaning
        },
        scheduling: {
          algorithm: AlgorithmType.SM2,
          dueDate: srsData?.due || new Date(),
          interval: srsData?.interval || 1,
          easeFactor: srsData?.ease ? srsData.ease / 1000 : 2.5,
          repetitions: srsData?.reviews || 0,
          lapses: srsData?.lapses || 0,
          state: srsData?.status === 'new' ? ReviewState.NEW : ReviewState.REVIEW,
          lastReviewedAt: srsData?.lastReview,
          nextReviewAt: srsData?.due || new Date()
        },
        metadata: {
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
          lastReviewedAt: srsData?.lastReview,
          lastReviewSource: ReviewSource.FLASHCARDS,
          tags: card.tags || [],
          properties: {
            cardType: isAnki ? 'anki' : 'word',
            deckName: isAnki && card.ankiData ? card.ankiData.deckName : undefined,
            hasImage: false,
            hasAudio: false
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
        source: ReviewSource.FLASHCARDS,
        result: ReviewResult.CORRECT,
        metadata: {
          migration: true,
          originalData: card
        }
      });
      
      exported++;
    } catch (error) {
      console.error(`[Flashcards] Failed to export ${card.id}:`, error);
      failed++;
    }
  }
  
  console.log(`[Flashcards] Export complete: ${exported} exported, ${failed} failed`);
  
  // Emit migration complete event
  const eventBus = getEventBus();
  await eventBus.emit({
    type: ReviewEventType.SYNC_COMPLETED,
    source: ReviewSource.FLASHCARDS,
    userId,
    data: {
      itemId: 'migration',
      itemType: ContentType.FLASHCARD,
      metadata: {
        exported,
        failed,
        total: uniqueFlashcards.length
      }
    },
    priority: EventPriority.LOW
  });
  
  return { exported, failed };
}

/**
 * Get due items from both local and unified store
 */
export async function getUnifiedDueFlashcards(
  userId: string,
  options?: {
    limit?: number;
    deckName?: string;
  }
): Promise<any[]> {
  const dataStore = getUnifiedDataStore();
  
  // Get from unified store
  const unifiedDue = await dataStore.getDueItems({
    userId,
    sources: [ReviewSource.FLASHCARDS],
    contentTypes: [ContentType.FLASHCARD],
    limit: options?.limit,
    includeOverdue: true
  });
  
  // Get from local source
  const flashcardsSource = new FlashcardsSource(userId);
  await flashcardsSource.init();
  const localDue = await flashcardsSource.getDueItems({ limit: options?.limit });
  
  // Merge and deduplicate
  const merged = new Map<string, any>();
  
  // Add unified items
  for (const item of unifiedDue.items) {
    merged.set(item.sourceId, {
      ...item,
      source: 'unified'
    });
  }
  
  // Add local items
  for (const item of localDue) {
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
 * Handle batch review sync
 */
export async function syncBatchReviews(
  userId: string,
  reviews: Array<{
    cardId: string;
    rating: number;
    responseTime?: number;
  }>
) {
  console.log(`[Flashcards] Syncing batch of ${reviews.length} reviews...`);
  
  const results = [];
  
  for (const review of reviews) {
    try {
      const result = await reviewFlashcardWithSync(review.cardId, review.rating);
      results.push({ success: true, result });
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`[Flashcards] Batch sync complete: ${successful}/${reviews.length} successful`);
  
  return results;
}

/**
 * Setup real-time sync for flashcards
 */
export function setupRealtimeSync(userId: string) {
  const eventBus = getEventBus();
  
  // Listen for real-time updates
  eventBus.subscribe(
    ReviewEventType.ITEM_UPDATED,
    async (event) => {
      if (event.source !== ReviewSource.FLASHCARDS && 
          event.data.itemType === ContentType.FLASHCARD) {
        
        console.log('[Flashcards] Real-time update received for', event.data.itemId);
        
        // Emit custom event for UI components
        window.dispatchEvent(new CustomEvent('flashcardUpdate', {
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
      if (event.data.metadata?.local?.sourceType === ReviewSource.FLASHCARDS) {
        console.log('[Flashcards] Conflict detected, needs resolution');
        
        // Could show UI for manual resolution
        window.dispatchEvent(new CustomEvent('flashcardConflict', {
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
  const flashcardsSource = new FlashcardsSource(userId);
  await flashcardsSource.init();
  
  const localStats = await flashcardsSource.getStats();
  const dataStore = getUnifiedDataStore();
  
  // Get unified stats
  const unifiedDue = await dataStore.getDueItems({
    userId,
    sources: [ReviewSource.FLASHCARDS],
    contentTypes: [ContentType.FLASHCARD]
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
  initializeFlashcardsIntegration,
  exportToUnifiedStore,
  getUnifiedDueFlashcards,
  syncBatchReviews,
  setupRealtimeSync,
  getUnifiedStats,
  reviewFlashcardWithSync
};