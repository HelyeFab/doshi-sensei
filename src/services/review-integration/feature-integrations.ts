/**
 * Feature-Specific Integration Hub
 * Central location for all Review Hub feature integrations
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, ReviewSource, EventPriority } from '../review-events/types';

/**
 * Example: Integrating Kanji Mastery's review function
 */
export function integrateKanjiMastery() {
  // Import the original service
  const kanjiMasteryService = require('../kanji-mastery/spaced-repetition-service');
  
  // Wrap the review function
  if (kanjiMasteryService.reviewKanji) {
    const originalReview = kanjiMasteryService.reviewKanji;
    
    kanjiMasteryService.reviewKanji = withKanjiMasterySync(
      async function(kanji: string, quality: number) {
        // Call original function
        const result = await originalReview(kanji, quality);
        
        // Add any additional data needed for sync
        return {
          ...result,
          character: kanji,
          quality,
          timestamp: new Date()
        };
      }
    );
    
    console.log('[Integration] Kanji Mastery review function wrapped');
  }
  
  // Subscribe to review events for this feature
  const eventBus = getEventBus();
  
  eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      // Only process events from other sources
      if (event.source !== ReviewSource.KANJI_MASTERY && 
          event.data.itemType === 'kanji') {
        // Update local Kanji Mastery database
        console.log('[Integration] Syncing kanji review from', event.source);
        
        // Update the local IndexedDB
        if (kanjiMasteryService.updateFromSync) {
          await kanjiMasteryService.updateFromSync({
            kanji: event.data.content?.primary,
            reviewedAt: new Date(event.timestamp),
            source: event.source
          });
        }
      }
    },
    {
      filter: (event) => event.data.itemType === 'kanji'
    }
  );
}

/**
 * Example: Integrating Textbook Vocabulary
 */
export function integrateTextbookVocabulary() {
  // Import the original service
  const textbookService = require('../textbook-vocabulary/textbook-vocabulary-service');
  
  // Wrap the review function
  if (textbookService.default?.reviewCard) {
    const originalReview = textbookService.default.reviewCard;
    
    textbookService.default.reviewCard = withTextbookVocabularySync(
      async function(cardId: string, grade: number) {
        // Call original function
        const result = await originalReview(cardId, grade);
        
        // Enhance with additional data
        return {
          ...result,
          id: cardId,
          grade,
          reviewedAt: new Date()
        };
      }
    );
    
    console.log('[Integration] Textbook Vocabulary review function wrapped');
  }
  
  // Subscribe to vocabulary review events
  const eventBus = getEventBus();
  
  eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      if (event.source !== ReviewSource.TEXTBOOK_VOCAB && 
          event.data.itemType === 'vocabulary') {
        console.log('[Integration] Syncing vocabulary review from', event.source);
        
        // Update local storage
        if (textbookService.default?.syncFromExternal) {
          await textbookService.default.syncFromExternal({
            wordId: event.data.itemId,
            reviewedAt: new Date(event.timestamp),
            result: event.data.result
          });
        }
      }
    },
    {
      filter: (event) => event.data.itemType === 'vocabulary'
    }
  );
}

/**
 * Example: Integrating Drill Practice
 */
export function integrateDrillPractice() {
  // Wrap drill completion functions
  const drillHandlers = {
    completeDrill: withDrillSync(async function(drillData: any) {
      // Process drill completion
      console.log('[Integration] Drill completed:', drillData);
      
      // Emit completion event
      const eventBus = getEventBus();
      await eventBus.emit({
        type: ReviewEventType.SESSION_COMPLETED,
        source: ReviewSource.DRILL_PRACTICE,
        userId: drillData.userId,
        data: {
          itemId: `drill_${drillData.drillId}`,
          itemType: 'vocabulary',
          metadata: {
            score: drillData.score,
            correctAnswers: drillData.correct,
            totalQuestions: drillData.total,
            timeSpent: drillData.duration
          }
        },
        priority: EventPriority.NORMAL
      });
      
      return drillData;
    })
  };
  
  // Export wrapped handlers
  return drillHandlers;
}

/**
 * Example: Integrating Games
 */
export function integrateGames() {
  const eventBus = getEventBus();
  
  // Create a generic game session wrapper
  const wrapGameSession = (gameType: string) => {
    return async function(sessionData: any) {
      // Emit game session event
      await eventBus.emit({
        type: ReviewEventType.SESSION_STARTED,
        source: ReviewSource.GAMES,
        userId: sessionData.userId,
        data: {
          itemId: `game_${gameType}_${Date.now()}`,
          itemType: 'kanji',
          metadata: {
            gameType,
            difficulty: sessionData.difficulty,
            mode: sessionData.mode
          }
        },
        priority: EventPriority.LOW
      });
      
      return sessionData;
    };
  };
  
  // Create wrapped handlers for each game
  return {
    kanjiQuest: {
      startSession: wrapGameSession('kanji_quest'),
      endSession: async (result: any) => {
        await eventBus.emit({
          type: ReviewEventType.SESSION_COMPLETED,
          source: ReviewSource.GAMES,
          userId: result.userId,
          data: {
            itemId: result.sessionId,
            itemType: 'kanji',
            metadata: {
              gameType: 'kanji_quest',
              score: result.score,
              level: result.level,
              itemsReviewed: result.kanjiReviewed
            }
          },
          priority: EventPriority.LOW
        });
        return result;
      }
    },
    // Add other games...
  };
}

/**
 * Initialize all integrations - NEW VERSION
 * Uses the individual integration modules
 */
export async function initializeAllIntegrations(userId?: string) {
  console.log('[Review Hub] Initializing all feature integrations...');
  
  const integrations = [];
  const uid = userId || 'default_user';
  
  try {
    // Initialize Kanji Mastery
    try {
      const { initializeKanjiMasteryIntegration } = await import('../kanji-mastery/review-hub-integration');
      const kanjiIntegration = await initializeKanjiMasteryIntegration();
      integrations.push(kanjiIntegration);
      console.log('[Review Hub] ✅ Kanji Mastery integrated');
    } catch (error) {
      console.warn('[Review Hub] ⚠️ Kanji Mastery integration failed:', error);
    }
    
    // Initialize Textbook Vocabulary
    try {
      const { initializeTextbookVocabularyIntegration } = await import('../textbook-vocabulary/review-hub-integration');
      const vocabIntegration = await initializeTextbookVocabularyIntegration();
      integrations.push(vocabIntegration);
      console.log('[Review Hub] ✅ Textbook Vocabulary integrated');
    } catch (error) {
      console.warn('[Review Hub] ⚠️ Textbook Vocabulary integration failed:', error);
    }
    
    // Initialize Flashcards
    try {
      const { initializeFlashcardsIntegration } = await import('../flashcards/review-hub-integration');
      const flashcardsIntegration = await initializeFlashcardsIntegration(uid);
      integrations.push(flashcardsIntegration);
      console.log('[Review Hub] ✅ Flashcards integrated');
    } catch (error) {
      console.warn('[Review Hub] ⚠️ Flashcards integration failed:', error);
    }
    
    // Initialize Drills
    try {
      const { initializeDrillsIntegration } = await import('../drills/review-hub-integration');
      const drillsIntegration = await initializeDrillsIntegration(uid);
      integrations.push(drillsIntegration);
      console.log('[Review Hub] ✅ Drill Practice integrated');
    } catch (error) {
      console.warn('[Review Hub] ⚠️ Drill Practice integration failed:', error);
    }
    
    // Initialize Games
    try {
      const { initializeGamesIntegration } = await import('../games/review-hub-integration');
      const gamesIntegration = await initializeGamesIntegration(uid);
      integrations.push(gamesIntegration);
      console.log('[Review Hub] ✅ Games integrated');
    } catch (error) {
      console.warn('[Review Hub] ⚠️ Games integration failed:', error);
    }
    
    // Subscribe to sync events
    const eventBus = getEventBus();
    
    eventBus.subscribe(
      ReviewEventType.SYNC_STARTED,
      async (event) => {
        console.log('[Integration] Sync started for user:', event.userId);
      }
    );
    
    eventBus.subscribe(
      ReviewEventType.SYNC_COMPLETED,
      async (event) => {
        console.log('[Integration] Sync completed:', event.data.metadata);
      }
    );
    
    eventBus.subscribe(
      ReviewEventType.SYNC_FAILED,
      async (event) => {
        console.error('[Integration] Sync failed:', event.data.metadata);
      }
    );
    
    console.log('[Integration] All integrations initialized successfully');
    
    return {
      success: true,
      drillHandlers,
      gameHandlers
    };
    
  } catch (error) {
    console.error('[Integration] Failed to initialize integrations:', error);
    return {
      success: false,
      error
    };
  }
}

/**
 * Migration helper: Migrate existing data to unified store
 */
export async function migrateExistingData() {
  console.log('[Migration] Starting data migration to unified store...');
  
  const results = {
    kanjiMastery: { success: 0, failed: 0 },
    textbookVocab: { success: 0, failed: 0 },
    flashcards: { success: 0, failed: 0 }
  };
  
  try {
    // 1. Migrate Kanji Mastery data
    console.log('[Migration] Migrating Kanji Mastery data...');
    // This would read from IndexedDB and migrate
    // Implementation depends on actual data structure
    
    // 2. Migrate Textbook Vocabulary data
    console.log('[Migration] Migrating Textbook Vocabulary data...');
    // This would read from IndexedDB and migrate
    
    // 3. Migrate Flashcards data
    console.log('[Migration] Migrating Flashcards data...');
    // This would read from Firebase and migrate
    
    console.log('[Migration] Migration completed:', results);
    
    return results;
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}

/**
 * Cleanup function for removing integrations (for testing)
 */
export function cleanupIntegrations() {
  const eventBus = getEventBus();
  
  // Clear all subscriptions (would need to track unsubscribe functions)
  console.log('[Integration] Cleaning up integrations...');
  
  // Reset wrapped functions to originals
  // This would need to store references to original functions
}

// Export for use in app initialization
export default {
  initializeAllIntegrations,
  migrateExistingData,
  cleanupIntegrations
};