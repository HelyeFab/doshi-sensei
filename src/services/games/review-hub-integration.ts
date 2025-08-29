/**
 * Games - Review Hub Integration
 * Connects all game modes with the unified Review Hub
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

// Game types enumeration
export enum GameType {
  KANJI_QUEST = 'kanji-quest',
  KANA_DROP = 'kana-drop',
  LISTENING = 'listening',
  ASSEMBLY = 'assembly',
  MATCHING = 'matching',
  SENTENCE_SCRAMBLE = 'sentence-scramble',
  READING_ROUTES = 'reading-routes',
  STROKE_ORDER = 'stroke-order-practice',
  KANJI_SIMON = 'kanji-simon'
}

// Game result data structure
export interface GameReviewData {
  gameType: GameType;
  score: number;
  timeSpent: number;
  itemsReviewed: Array<{
    id: string;
    type: 'kanji' | 'vocabulary' | 'sentence' | 'kana';
    content: string;
    correct: boolean;
    responseTime?: number;
  }>;
  difficulty?: number;
  level?: number;
  streak?: number;
  completedAt: Date;
}

/**
 * Map game type to content type
 */
function getContentTypeForGame(gameType: GameType): ContentType {
  switch (gameType) {
    case GameType.KANJI_QUEST:
    case GameType.KANJI_SIMON:
    case GameType.STROKE_ORDER:
      return ContentType.KANJI;
    case GameType.KANA_DROP:
      return ContentType.RADICAL; // Using RADICAL for kana
    case GameType.LISTENING:
    case GameType.ASSEMBLY:
    case GameType.MATCHING:
      return ContentType.VOCABULARY;
    case GameType.SENTENCE_SCRAMBLE:
    case GameType.READING_ROUTES:
      return ContentType.SENTENCE;
    default:
      return ContentType.CUSTOM;
  }
}

/**
 * Calculate next review date based on game performance
 */
function calculateNextGameReview(score: number, gameType: GameType): Date {
  const baseInterval = gameType === GameType.KANJI_QUEST ? 7 : 3; // Longer for complex games
  let intervalDays = baseInterval;
  
  // Adjust based on score
  if (score >= 90) {
    intervalDays = baseInterval * 2;
  } else if (score >= 70) {
    intervalDays = baseInterval;
  } else if (score >= 50) {
    intervalDays = Math.floor(baseInterval / 2);
  } else {
    intervalDays = 1;
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return nextReview;
}

/**
 * Wrap game review function with Review Hub sync
 */
export const reviewGameWithSync = withReviewSync(
  async (gameId: string, rating: number, gameData: GameReviewData) => {
    // Process each reviewed item in the game
    const reviewResults = [];
    
    for (const item of gameData.itemsReviewed) {
      const itemRating = item.correct ? 4 : 2; // Convert to 1-5 scale
      reviewResults.push({
        itemId: item.id,
        content: item.content,
        type: item.type,
        rating: itemRating,
        responseTime: item.responseTime
      });
    }
    
    return {
      gameId,
      gameType: gameData.gameType,
      score: gameData.score,
      timeSpent: gameData.timeSpent,
      totalItems: gameData.itemsReviewed.length,
      correctItems: gameData.itemsReviewed.filter(i => i.correct).length,
      rating,
      reviewResults,
      nextReview: calculateNextGameReview(gameData.score, gameData.gameType),
      completedAt: gameData.completedAt
    };
  },
  {
    source: ReviewSource.GAMES,
    contentType: ContentType.CUSTOM, // Will be overridden per game type
    emitEvents: true,
    syncToUnified: true,
    trackUsage: true,
    batchSize: 50, // Games can have many items
    debounceMs: 1000 // Longer debounce for game completion
  },
  (result: any) => ({
    itemId: result.gameId,
    content: {
      primary: `${result.gameType} game`,
      secondary: `Score: ${result.score}%`,
      meaning: `${result.correctItems}/${result.totalItems} correct`
    },
    scheduling: {
      dueDate: result.nextReview,
      interval: Math.ceil((result.nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      easeFactor: 2.5 + (result.score / 100) // Higher score = easier
    },
    metadata: {
      gameType: result.gameType,
      score: result.score,
      timeSpent: result.timeSpent,
      itemsReviewed: result.reviewResults
    }
  })
);

/**
 * Review individual items from games
 */
export const reviewGameItemWithSync = withReviewSync(
  async (itemId: string, rating: number, gameType: GameType, itemData: any) => {
    return {
      itemId,
      gameType,
      rating,
      content: itemData.content,
      type: itemData.type,
      nextReview: calculateItemNextReview(rating),
      reviewedAt: new Date()
    };
  },
  {
    source: ReviewSource.GAMES,
    contentType: ContentType.CUSTOM,
    emitEvents: true,
    syncToUnified: true,
    trackUsage: false // Don't double-count usage
  },
  (result: any) => ({
    itemId: result.itemId,
    content: {
      primary: result.content,
      secondary: result.type,
      meaning: result.gameType
    },
    scheduling: {
      dueDate: result.nextReview,
      interval: 1,
      easeFactor: 2.5
    },
    metadata: {
      gameType: result.gameType,
      reviewedAt: result.reviewedAt
    }
  })
);

/**
 * Calculate next review for individual items
 */
function calculateItemNextReview(rating: number): Date {
  const intervals = [1, 1, 3, 7, 14]; // Days based on rating (1-5)
  const intervalDays = intervals[Math.min(rating - 1, 4)];
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return nextReview;
}

/**
 * Initialize Games integration with Review Hub
 */
export async function initializeGamesIntegration(userId: string) {
  console.log('[Games] Initializing Review Hub integration...');
  
  const eventBus = getEventBus();
  const dataStore = getUnifiedDataStore();
  
  // Subscribe to game review events from other sources
  const unsubscribeReview = eventBus.subscribe(
    ReviewEventType.ITEM_REVIEWED,
    async (event) => {
      // Process game reviews from other sources
      if (event.source !== ReviewSource.GAMES && 
          event.data.metadata?.gameType) {
        
        console.log('[Games] Syncing game review from', event.source);
        
        try {
          // Track the external game completion
          const gameType = event.data.metadata.gameType as GameType;
          const contentType = getContentTypeForGame(gameType);
          
          // Update local game statistics
          await updateGameStatistics(userId, gameType, event.data);
          
          console.log('[Games] Synced external game review for', gameType);
        } catch (error) {
          console.error('[Games] Failed to sync external review:', error);
        }
      }
    },
    {
      filter: (event) => !!event.data.metadata?.gameType
    }
  );
  
  // Subscribe to sync completion events
  const unsubscribeSync = eventBus.subscribe(
    ReviewEventType.SYNC_COMPLETED,
    async (event) => {
      if (event.userId === userId) {
        console.log('[Games] Sync completed, updating game statistics...');
        // Refresh game statistics from unified store
        await refreshGameStatistics(userId);
      }
    }
  );
  
  // Export existing game data to unified store
  await exportToUnifiedStore(userId);
  
  console.log('[Games] Review Hub integration initialized');
  
  return {
    unsubscribe: () => {
      unsubscribeReview();
      unsubscribeSync();
    }
  };
}

/**
 * Update local game statistics
 */
async function updateGameStatistics(userId: string, gameType: GameType, reviewData: any) {
  // This would integrate with local game statistics storage
  // For now, we'll store in localStorage as a simple implementation
  const statsKey = `gameStats_${userId}_${gameType}`;
  const existingStats = JSON.parse(localStorage.getItem(statsKey) || '{}');
  
  const updatedStats = {
    ...existingStats,
    totalGames: (existingStats.totalGames || 0) + 1,
    totalScore: (existingStats.totalScore || 0) + (reviewData.score || 0),
    lastPlayed: new Date().toISOString(),
    syncedFromExternal: true
  };
  
  localStorage.setItem(statsKey, JSON.stringify(updatedStats));
}

/**
 * Refresh game statistics from unified store
 */
async function refreshGameStatistics(userId: string) {
  const dataStore = getUnifiedDataStore();
  
  // Get all game-related items from unified store
  const gameItems = await dataStore.getDueItems({
    userId,
    sources: [ReviewSource.GAMES],
    contentTypes: [
      ContentType.KANJI,
      ContentType.VOCABULARY,
      ContentType.SENTENCE,
      ContentType.RADICAL,
      ContentType.CUSTOM
    ],
    limit: 1000
  });
  
  // Update local statistics based on unified data
  const statsByGame = new Map<GameType, any>();
  
  for (const item of gameItems.items) {
    const gameType = item.metadata?.properties?.gameType as GameType;
    if (gameType) {
      if (!statsByGame.has(gameType)) {
        statsByGame.set(gameType, {
          totalItems: 0,
          totalScore: 0,
          lastPlayed: null
        });
      }
      
      const stats = statsByGame.get(gameType);
      stats.totalItems++;
      stats.totalScore += item.metadata?.properties?.score || 0;
      if (!stats.lastPlayed || item.updatedAt > stats.lastPlayed) {
        stats.lastPlayed = item.updatedAt;
      }
    }
  }
  
  // Save refreshed statistics
  for (const [gameType, stats] of statsByGame) {
    const statsKey = `gameStats_${userId}_${gameType}`;
    localStorage.setItem(statsKey, JSON.stringify(stats));
  }
}

/**
 * Export existing game data to Unified Store
 */
export async function exportToUnifiedStore(userId: string) {
  console.log('[Games] Exporting data to Unified Store...');
  
  const dataStore = getUnifiedDataStore();
  let exported = 0;
  let failed = 0;
  
  // Export statistics for each game type
  for (const gameType of Object.values(GameType)) {
    try {
      const statsKey = `gameStats_${userId}_${gameType}`;
      const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
      
      if (stats.totalGames > 0) {
        const contentType = getContentTypeForGame(gameType);
        
        const unifiedItem: UnifiedReviewItem = {
          id: `game_${gameType}_stats`,
          sourceId: gameType,
          sourceType: ReviewSource.GAMES,
          contentType,
          content: {
            primary: `${gameType} Statistics`,
            secondary: `${stats.totalGames} games played`,
            meaning: `Average score: ${Math.round(stats.totalScore / stats.totalGames)}%`
          },
          scheduling: {
            algorithm: AlgorithmType.CUSTOM,
            dueDate: new Date(),
            interval: 7,
            easeFactor: 2.5,
            repetitions: stats.totalGames || 0,
            lapses: 0,
            state: ReviewState.REVIEW,
            lastReviewedAt: stats.lastPlayed ? new Date(stats.lastPlayed) : undefined,
            nextReviewAt: new Date()
          },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            lastReviewedAt: stats.lastPlayed ? new Date(stats.lastPlayed) : undefined,
            lastReviewSource: ReviewSource.GAMES,
            tags: [gameType, 'game-stats'],
            properties: {
              gameType,
              totalGames: stats.totalGames,
              averageScore: Math.round(stats.totalScore / stats.totalGames)
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
          source: ReviewSource.GAMES,
          result: ReviewResult.CORRECT,
          metadata: {
            migration: true,
            originalData: stats
          }
        });
        
        exported++;
      }
    } catch (error) {
      console.error(`[Games] Failed to export ${gameType}:`, error);
      failed++;
    }
  }
  
  console.log(`[Games] Export complete: ${exported} exported, ${failed} failed`);
  
  // Emit migration complete event
  const eventBus = getEventBus();
  await eventBus.emit({
    type: ReviewEventType.SYNC_COMPLETED,
    source: ReviewSource.GAMES,
    userId,
    data: {
      itemId: 'migration',
      itemType: ContentType.CUSTOM,
      metadata: {
        exported,
        failed,
        total: Object.values(GameType).length
      }
    },
    priority: EventPriority.LOW
  });
  
  return { exported, failed };
}

/**
 * Get game statistics from both local and unified store
 */
export async function getUnifiedGameStats(
  userId: string,
  gameType?: GameType
): Promise<any> {
  const dataStore = getUnifiedDataStore();
  
  // Get from unified store
  const unifiedItems = await dataStore.getDueItems({
    userId,
    sources: [ReviewSource.GAMES],
    contentTypes: gameType ? [getContentTypeForGame(gameType)] : undefined,
    limit: 1000
  });
  
  // Get local statistics
  const localStats: any = {};
  const gameTypes = gameType ? [gameType] : Object.values(GameType);
  
  for (const gt of gameTypes) {
    const statsKey = `gameStats_${userId}_${gt}`;
    const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
    localStats[gt] = stats;
  }
  
  // Merge statistics
  const mergedStats: any = {};
  
  for (const gt of gameTypes) {
    const unified = unifiedItems.items.filter(
      item => item.metadata?.properties?.gameType === gt
    );
    
    mergedStats[gt] = {
      local: localStats[gt],
      unified: {
        totalItems: unified.length,
        dueToday: unified.filter(item => item.dueDate <= new Date()).length
      }
    };
  }
  
  return gameType ? mergedStats[gameType] : mergedStats;
}

/**
 * Handle batch game review sync
 */
export async function syncBatchGameReviews(
  userId: string,
  reviews: Array<{
    gameId: string;
    rating: number;
    gameData: GameReviewData;
  }>
) {
  console.log(`[Games] Syncing batch of ${reviews.length} game reviews...`);
  
  const results = [];
  
  for (const review of reviews) {
    try {
      const result = await reviewGameWithSync(
        review.gameId,
        review.rating,
        review.gameData
      );
      results.push({ success: true, result });
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`[Games] Batch sync complete: ${successful}/${reviews.length} successful`);
  
  return results;
}

/**
 * Setup real-time sync for games
 */
export function setupRealtimeSync(userId: string) {
  const eventBus = getEventBus();
  
  // Listen for real-time updates
  eventBus.subscribe(
    ReviewEventType.ITEM_UPDATED,
    async (event) => {
      if (event.source !== ReviewSource.GAMES && 
          event.data.metadata?.gameType) {
        
        console.log('[Games] Real-time update received for', event.data.metadata.gameType);
        
        // Emit custom event for UI components
        window.dispatchEvent(new CustomEvent('gameUpdate', {
          detail: {
            gameType: event.data.metadata.gameType,
            itemId: event.data.itemId,
            changes: event.data.metadata
          }
        }));
      }
    }
  );
  
  // Listen for achievement unlocks
  eventBus.subscribe(
    ReviewEventType.SYNC_COMPLETED,
    async (event) => {
      if (event.data.metadata?.achievement) {
        console.log('[Games] Achievement unlocked:', event.data.metadata.achievement);
        
        // Emit achievement event
        window.dispatchEvent(new CustomEvent('achievementUnlocked', {
          detail: {
            achievement: event.data.metadata.achievement,
            gameType: event.data.metadata.gameType
          }
        }));
      }
    }
  );
}

// Export for use in components
export default {
  initializeGamesIntegration,
  exportToUnifiedStore,
  getUnifiedGameStats,
  syncBatchGameReviews,
  setupRealtimeSync,
  reviewGameWithSync,
  reviewGameItemWithSync,
  GameType
};