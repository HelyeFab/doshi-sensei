/**
 * Kanji Mastery Review Source Implementation
 * 
 * This source integrates with the existing kanji mastery system
 * to provide review items using the FSRS spaced repetition algorithm.
 */

import {
  ReviewSource,
  ReviewItem,
  SourceStats,
  SourceConfig,
  ReviewSourceType,
  SourceStatus,
  SourcePriority,
  ReviewResult
} from '../review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';
import { REVIEW_SOURCE_CONFIGS } from '../constants';
import { DataSyncService, getDataSyncService } from '@/services/kanji-mastery/dataSyncService';
import { ReviewQueueService, QueueOptions } from '@/services/kanji-mastery/reviewQueueService';
import { Rating } from '@/services/kanji-mastery/fsrsAlgorithm';
import { State } from '@/services/kanji-mastery/types';

export class KanjiMasterySource implements ReviewSource {
  readonly id = 'kanji-mastery';
  readonly name = 'Kanji Mastery';
  readonly type = ReviewSourceType.KANJI_MASTERY;
  readonly icon = '🈳';
  readonly description = 'Spaced repetition system for kanji learning with FSRS algorithm';
  readonly supportedContentTypes = [ContentType.KANJI, ContentType.RADICAL];
  readonly paths = {
    main: '/tools/kanji-mastery',
    settings: '/tools/kanji-mastery/settings',
    stats: '/tools/kanji-mastery/stats'
  };

  private initialized = false;
  private dataSyncService: DataSyncService;
  private reviewQueueService: ReviewQueueService;

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.KANJI_MASTERY].defaultConfig
  ) {
    // Initialize services only on client side
    if (typeof window !== 'undefined') {
      this.dataSyncService = getDataSyncService();
      this.reviewQueueService = new ReviewQueueService(this.dataSyncService);
    } else {
      // Server-side fallback
      this.dataSyncService = {} as DataSyncService;
      this.reviewQueueService = {} as ReviewQueueService;
    }
  }

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      // Only initialize on client side
      if (typeof window === 'undefined') {
        console.warn('[KanjiMasterySource] Server-side environment detected, marking as initialized');
        this.initialized = true;
        return;
      }

      // Initialize data sync service (it's already initialized in constructor)
      // The DataSyncService handles its own initialization
      this.initialized = true;
      
      console.log('[KanjiMasterySource] Successfully initialized kanji mastery source');
    } catch (error) {
      console.error('[KanjiMasterySource] Failed to initialize:', error);
      throw new Error(`Failed to initialize kanji mastery source: ${error}`);
    }
  }

  async getDueItems(options?: {
    limit?: number;
    priority?: SourcePriority;
    contentTypes?: ContentType[];
    studyModes?: StudyMode[];
  }): Promise<ReviewItem[]> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    if (!this.userId) {
      console.warn('[KanjiMasterySource] No user ID provided, returning empty due items');
      return [];
    }

    try {
      const limit = Math.min(options?.limit || 50, this.config.maxItems || 50);
      
      // Get due items from review queue service
      const queueOptions: QueueOptions = {
        maxCards: limit,
        prioritizeOverdue: true
      };
      
      const dueQueueItems = await this.reviewQueueService.generateQueue(this.userId, queueOptions);
      
      // Convert queue items to ReviewItems
      return dueQueueItems.map((queueItem): ReviewItem => {
        // Calculate priority based on overdue status and JLPT level
        const priority = this.calculateQueueItemPriority(queueItem);
        
        return {
          id: `${this.id}-${queueItem.kanjiChar}`,
          sourceId: this.id,
          contentType: ContentType.KANJI,
          content: {
            primary: queueItem.kanjiChar,
            secondary: `Difficulty: ${queueItem.difficulty.toFixed(1)}`,
            context: `JLPT N${queueItem.metadata.jlptLevel}`,
            formatted: {
              primary: queueItem.kanjiChar,
              secondary: `${queueItem.reps} reviews, ${queueItem.lapses} lapses`,
              context: `${queueItem.metadata.strokeCount} strokes`
            }
          },
          dueDate: new Date(queueItem.dueDate),
          priority,
          availableStudyModes: [
            StudyMode.RECOGNITION,
            StudyMode.PRODUCTION,
            StudyMode.READING
          ],
          metadata: {
            source: { type: 'kanji-mastery' },
            tags: [
              `jlpt-n${queueItem.metadata.jlptLevel}`,
              `strokes-${queueItem.metadata.strokeCount}`,
              `state-${queueItem.state}`,
              queueItem.lapses > 0 ? 'has-lapses' : 'no-lapses'
            ],
            difficulty: queueItem.difficulty,
            properties: {
              character: queueItem.kanjiChar,
              state: queueItem.state,
              reps: queueItem.reps,
              lapses: queueItem.lapses,
              stability: queueItem.stability,
              jlptLevel: queueItem.metadata.jlptLevel,
              strokeCount: queueItem.metadata.strokeCount,
              frequency: queueItem.metadata.frequency
            }
          },
          createdAt: new Date(), // Approximate creation date
          updatedAt: queueItem.lastReview ? new Date(queueItem.lastReview) : new Date()
        };
      });
    } catch (error) {
      console.error('[KanjiMasterySource] Failed to get due items:', error);
      return [];
    }
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    if (!this.userId) {
      console.warn('[KanjiMasterySource] No user ID provided, returning empty stats');
      return this.getEmptyStats();
    }

    try {
      // Get real stats from data sync service
      const [userStats, dueCount, allProgress] = await Promise.all([
        this.dataSyncService.getUserStats(this.userId),
        this.reviewQueueService.getDueCount(this.userId),
        this.dataSyncService.getAllProgressLocal(this.userId)
      ]);

      const totalItems = allProgress.length;
      const dueToday = dueCount.new + dueCount.learning + dueCount.review;
      
      // Calculate overdue items (due before today)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const overdue = allProgress.filter(item => {
        const dueDate = new Date(item.fsrs?.dueDate || item.dueDate);
        return dueDate < startOfToday;
      }).length;
      
      // Calculate scheduled items (future due dates)
      const scheduled = allProgress.filter(item => {
        const dueDate = new Date(item.fsrs?.dueDate || item.dueDate);
        return dueDate > now;
      }).length;
      
      // Count items by state
      const newItems = allProgress.filter(item => 
        (item.fsrs?.state === undefined && !item.fsrs?.repetition) ||
        item.state === State.New
      ).length;
      
      // Calculate retention rate from user stats
      const retentionRate = userStats.totalReviews > 0 ? userStats.accuracy : 0;
      
      // Count items by priority (based on difficulty and overdue status)
      const itemsByPriority = {
        [SourcePriority.LOW]: 0,
        [SourcePriority.MEDIUM]: 0,
        [SourcePriority.HIGH]: 0,
        [SourcePriority.URGENT]: 0
      };
      
      allProgress.forEach(item => {
        const difficulty = item.fsrs?.difficulty || item.difficulty || 5;
        const dueDate = new Date(item.fsrs?.dueDate || item.dueDate || now);
        const isOverdue = dueDate < now;
        const hoursOverdue = isOverdue ? (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60) : 0;
        
        if (hoursOverdue > 24 || difficulty > 8) {
          itemsByPriority[SourcePriority.URGENT]++;
        } else if (isOverdue || difficulty > 6) {
          itemsByPriority[SourcePriority.HIGH]++;
        } else if (difficulty > 4) {
          itemsByPriority[SourcePriority.MEDIUM]++;
        } else {
          itemsByPriority[SourcePriority.LOW]++;
        }
      });
      
      // Calculate study streak (simplified - would need session history for accurate count)
      const studyStreak = userStats.totalReviews > 0 ? Math.min(userStats.totalReviews, 30) : 0;
      
      // Estimate last review session from most recent update
      const lastReviewSession = allProgress.length > 0 
        ? new Date(Math.max(...allProgress.map(item => 
            item.localModified || item.serverModified || Date.now() - 86400000
          )))
        : new Date(Date.now() - 86400000);
      
      return {
        totalItems,
        dueToday,
        overdue,
        scheduled,
        newItems,
        itemsByType: {
          [ContentType.KANJI]: totalItems,
          [ContentType.RADICAL]: 0, // Could be enhanced to track radicals separately
          [ContentType.VOCABULARY]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority,
        averageMastery: Math.round(retentionRate * 100),
        retentionRate,
        lastReviewSession,
        studyStreak,
        trends: {
          accuracy: retentionRate > 0.8 ? 'improving' : retentionRate > 0.6 ? 'stable' : 'declining',
          speed: userStats.averageResponseTime < 3000 ? 'improving' : 'declining',
          retention: retentionRate > 0.75 ? 'improving' : 'stable'
        }
      };
    } catch (error) {
      console.error('[KanjiMasterySource] Failed to get stats:', error);
      return this.getEmptyStats();
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    if (!this.userId) {
      throw new Error('User ID required for processing reviews');
    }

    try {
      // Extract kanji character from itemId (format: "kanji-mastery-漢")
      const kanjiChar = itemId.replace(`${this.id}-`, '');
      
      if (!kanjiChar) {
        throw new Error(`Invalid item ID format: ${itemId}`);
      }
      
      // Convert ReviewResult to FSRS Rating
      const rating = this.convertResultToRating(result);
      
      // Process the review using the review queue service
      const updatedItem = await this.reviewQueueService.processReview(
        this.userId,
        kanjiChar,
        rating,
        result.responseTime || 3000 // Default 3 seconds if not provided
      );
      
      console.log(`[KanjiMasterySource] Successfully processed review for ${kanjiChar}:`, {
        rating,
        newDueDate: updatedItem.dueDate,
        newState: updatedItem.state,
        difficulty: updatedItem.difficulty
      });
    } catch (error) {
      console.error('[KanjiMasterySource] Failed to process review:', error);
      throw error;
    }
  }

  async searchItems(query: string, options?: {
    contentTypes?: ContentType[];
    limit?: number;
  }): Promise<ReviewItem[]> {
    if (!this.initialized) {
      return [];
    }

    if (!this.userId) {
      console.warn('[KanjiMasterySource] No user ID provided, returning empty search results');
      return [];
    }

    try {
      // Get all progress items for the user
      const allProgress = await this.dataSyncService.getAllProgressLocal(this.userId);
      
      // Filter items based on query
      const results = allProgress
        .filter(item => {
          const kanjiChar = item.kanjiChar || item.char || '';
          return kanjiChar.includes(query) || 
                 kanjiChar === query; // Exact match for kanji
        })
        .slice(0, options?.limit || 20);

      // Convert to ReviewItem format
      return results.map((item): ReviewItem => {
        const kanjiChar = item.kanjiChar || item.char || '';
        const queueItem = {
          kanjiChar,
          state: item.state || State.New,
          dueDate: item.fsrs?.dueDate || item.dueDate || new Date().toISOString(),
          scheduledDays: item.fsrs?.scheduledDays || 0,
          elapsedDays: item.fsrs?.elapsedDays || 0,
          reps: item.fsrs?.repetition || 0,
          lapses: item.fsrs?.lapses || 0,
          difficulty: item.fsrs?.difficulty || 5,
          stability: item.fsrs?.stability || 0,
          lastReview: item.fsrs?.lastReview || null,
          metadata: item.metadata || {
            jlptLevel: 5,
            strokeCount: 4,
            frequency: 5
          }
        };
        
        return {
          id: `${this.id}-${kanjiChar}`,
          sourceId: this.id,
          contentType: ContentType.KANJI,
          content: {
            primary: kanjiChar,
            secondary: `Difficulty: ${queueItem.difficulty.toFixed(1)}`,
            context: `JLPT N${queueItem.metadata.jlptLevel}`
          },
          dueDate: new Date(queueItem.dueDate),
          priority: this.calculateQueueItemPriority(queueItem),
          availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
          metadata: {
            source: { type: 'kanji-mastery' },
            tags: [
              `jlpt-n${queueItem.metadata.jlptLevel}`,
              `strokes-${queueItem.metadata.strokeCount}`,
              `state-${queueItem.state}`
            ],
            difficulty: queueItem.difficulty,
            properties: {
              character: kanjiChar,
              state: queueItem.state,
              reps: queueItem.reps,
              lapses: queueItem.lapses
            }
          },
          createdAt: new Date(),
          updatedAt: queueItem.lastReview ? new Date(queueItem.lastReview) : new Date()
        };
      });
    } catch (error) {
      console.error('[KanjiMasterySource] Failed to search items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    if (!this.userId) {
      console.warn('[KanjiMasterySource] No user ID provided for getItem');
      return null;
    }

    try {
      // Extract kanji character from itemId (format: "kanji-mastery-漢")
      const kanjiChar = itemId.replace(`${this.id}-`, '');
      
      if (!kanjiChar) {
        console.error(`[KanjiMasterySource] Invalid item ID format: ${itemId}`);
        return null;
      }
      
      // Get card data from data sync service
      const cardData = await this.dataSyncService.getCard(this.userId, kanjiChar);
      
      if (!cardData) {
        console.warn(`[KanjiMasterySource] Card not found: ${kanjiChar}`);
        return null;
      }

      // Convert to queue item format for consistency
      const queueItem = {
        kanjiChar: cardData.kanjiChar || kanjiChar,
        state: cardData.state || State.New,
        dueDate: cardData.fsrs?.dueDate || cardData.dueDate || new Date().toISOString(),
        scheduledDays: cardData.fsrs?.scheduledDays || 0,
        elapsedDays: cardData.fsrs?.elapsedDays || 0,
        reps: cardData.fsrs?.repetition || 0,
        lapses: cardData.fsrs?.lapses || 0,
        difficulty: cardData.fsrs?.difficulty || 5,
        stability: cardData.fsrs?.stability || 0,
        lastReview: cardData.fsrs?.lastReview || null,
        metadata: cardData.metadata || {
          jlptLevel: 5,
          strokeCount: 4,
          frequency: 5
        }
      };

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: {
          primary: kanjiChar,
          secondary: `Difficulty: ${queueItem.difficulty.toFixed(1)}`,
          context: `JLPT N${queueItem.metadata.jlptLevel}`,
          formatted: {
            primary: kanjiChar,
            secondary: `${queueItem.reps} reviews, ${queueItem.lapses} lapses`,
            context: `${queueItem.metadata.strokeCount} strokes`
          }
        },
        dueDate: new Date(queueItem.dueDate),
        priority: this.calculateQueueItemPriority(queueItem),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: { type: 'kanji-mastery' },
          tags: [
            `jlpt-n${queueItem.metadata.jlptLevel}`,
            `strokes-${queueItem.metadata.strokeCount}`,
            `state-${queueItem.state}`,
            queueItem.lapses > 0 ? 'has-lapses' : 'no-lapses'
          ],
          difficulty: queueItem.difficulty,
          properties: {
            character: kanjiChar,
            state: queueItem.state,
            reps: queueItem.reps,
            lapses: queueItem.lapses,
            stability: queueItem.stability,
            jlptLevel: queueItem.metadata.jlptLevel,
            strokeCount: queueItem.metadata.strokeCount,
            frequency: queueItem.metadata.frequency
          }
        },
        createdAt: new Date(), // Approximate creation date
        updatedAt: queueItem.lastReview ? new Date(queueItem.lastReview) : new Date()
      };
    } catch (error) {
      console.error('[KanjiMasterySource] Failed to get item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Convert ReviewResult to FSRS Rating
   */
  private convertResultToRating(result: ReviewResult): Rating {
    // Map rating (1-4) to FSRS ratings
    // ReviewResult.rating: 1=Again, 2=Hard, 3=Good, 4=Easy
    switch (result.rating) {
      case 4:
        return Rating.EASY;
      case 3:
        return Rating.GOOD;
      case 2:
        return Rating.HARD;
      case 1:
      default:
        return Rating.AGAIN;
    }
  }

  /**
   * Calculate priority for queue items
   */
  private calculateQueueItemPriority(queueItem: any): number {
    let priority = 5; // Base priority

    // Increase priority for overdue items
    const now = new Date();
    const dueDate = new Date(queueItem.dueDate);
    if (dueDate < now) {
      const hoursOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
      priority += Math.min(3, Math.floor(hoursOverdue / 24));
    }

    // Adjust based on difficulty
    if (queueItem.difficulty) {
      priority += Math.floor(queueItem.difficulty / 3);
    }

    // Adjust based on JLPT level (lower levels get higher priority)
    const jlptPriority = { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 };
    if (queueItem.metadata?.jlptLevel) {
      priority += jlptPriority[queueItem.metadata.jlptLevel as keyof typeof jlptPriority] || 0;
    }

    // Increase priority for items with lapses (struggling kanji)
    if (queueItem.lapses > 0) {
      priority += Math.min(2, queueItem.lapses);
    }

    return Math.min(10, Math.max(1, priority));
  }


  private getEmptyStats(): SourceStats {
    return {
      totalItems: 0,
      dueToday: 0,
      overdue: 0,
      scheduled: 0,
      newItems: 0,
      itemsByType: {
        [ContentType.KANJI]: 0,
        [ContentType.RADICAL]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.FLASHCARD]: 0,
        [ContentType.GRAMMAR]: 0,
        [ContentType.SENTENCE]: 0,
        [ContentType.CUSTOM]: 0
      },
      itemsByPriority: {
        [SourcePriority.LOW]: 0,
        [SourcePriority.MEDIUM]: 0,
        [SourcePriority.HIGH]: 0,
        [SourcePriority.URGENT]: 0
      },
      averageMastery: 0,
      retentionRate: 0,
      studyStreak: 0,
      trends: {
        accuracy: 'stable',
        speed: 'stable',
        retention: 'stable'
      }
    };
  }
}

/**
 * Factory function to create a kanji mastery source
 */
export async function createKanjiMasterySource(userId: string | null): Promise<KanjiMasterySource> {
  const source = new KanjiMasterySource(userId);
  return source;
}