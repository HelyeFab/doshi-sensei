/**
 * Textbook Vocabulary Review Source Implementation
 * 
 * This source integrates with the existing textbook vocabulary system
 * to provide review items from Genki and Minna no Nihongo textbooks.
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
import { TextbookVocabularyService } from '@/services/textbook-vocabulary/textbook-vocabulary-service';

export class TextbookVocabularySource implements ReviewSource {
  readonly id = 'textbook-vocabulary';
  readonly name = 'Textbook Vocabulary';
  readonly type = ReviewSourceType.TEXTBOOK_VOCABULARY;
  readonly icon = '📚';
  readonly description = 'Interactive vocabulary learning from Genki and Minna no Nihongo';
  readonly supportedContentTypes = [ContentType.VOCABULARY];
  readonly paths = {
    main: '/tools/textbook-vocabulary',
    settings: '/tools/textbook-vocabulary/settings'
  };

  private service: TextbookVocabularyService;
  private initialized = false;

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.TEXTBOOK_VOCABULARY].defaultConfig
  ) {
    this.service = new TextbookVocabularyService(userId);
  }

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.service.init();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize textbook vocabulary source: ${error}`);
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

    try {
      const limit = Math.min(options?.limit || 30, this.config.maxItems || 30);
      
      // Get due items from the textbook vocabulary service
      const dueItems = await this.service.getDueItems({
        limit,
        includePrioritized: true
      });

      // Convert to ReviewItem format
      return dueItems.map((item): ReviewItem => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.VOCABULARY,
        content: {
          primary: item.japanese, // Japanese word
          secondary: item.meaning, // English meaning
          context: item.examples?.[0]?.japanese, // Example sentence
          formatted: {
            primary: item.japanese,
            secondary: item.reading, // Furigana/reading
            context: item.examples?.[0]?.english // Example translation
          },
          audio: item.audioUrl ? { url: item.audioUrl, autoPlay: false } : undefined
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: 'textbook-vocabulary',
          tags: [item.textbook, `lesson-${item.lesson}`, ...(item.partOfSpeech || [])],
          difficulty: item.difficulty || 5,
          properties: {
            textbook: item.textbook,
            lesson: item.lesson,
            jlptLevel: item.jlptLevel,
            frequency: item.frequency,
            partOfSpeech: item.partOfSpeech
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get due items from textbook vocabulary:', error);
      return [];
    }
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    try {
      const stats = await this.service.getStats();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      return {
        totalItems: stats.totalCards,
        dueToday: stats.dueToday,
        overdue: stats.overdue,
        scheduled: stats.totalCards - stats.dueToday - stats.overdue - stats.newCards,
        newItems: stats.newCards,
        itemsByType: {
          [ContentType.VOCABULARY]: stats.totalCards,
          [ContentType.KANJI]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: {
          [SourcePriority.LOW]: Math.floor(stats.totalCards * 0.3),
          [SourcePriority.MEDIUM]: Math.floor(stats.totalCards * 0.5),
          [SourcePriority.HIGH]: Math.floor(stats.totalCards * 0.15),
          [SourcePriority.URGENT]: Math.floor(stats.totalCards * 0.05)
        },
        averageMastery: stats.averageRetention,
        retentionRate: stats.averageRetention / 100,
        lastReviewSession: stats.lastSession ? new Date(stats.lastSession) : undefined,
        studyStreak: stats.streak,
        trends: {
          accuracy: stats.accuracyTrend || 'stable',
          speed: 'stable',
          retention: stats.retentionTrend || 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get textbook vocabulary stats:', error);
      return this.getEmptyStats();
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Update service configuration if needed
    if (config.settings) {
      await this.service.updateSettings({
        showFurigana: config.settings.showFurigana,
        playAudio: config.settings.playAudio,
        includeExamples: config.settings.includeExamples,
        selectedTextbooks: config.settings.textbooks
      });
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      // Convert ReviewResult to textbook vocabulary format
      await this.service.recordReview(itemId, {
        rating: result.response.rating,
        responseTime: result.response.responseTime,
        studyMode: result.response.studyMode,
        hintsUsed: result.response.hintsUsed,
        timestamp: result.timestamp
      });
    } catch (error) {
      console.error('Failed to process textbook vocabulary review:', error);
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

    try {
      const results = await this.service.searchCards(query, {
        limit: options?.limit || 20
      });

      return results.map((item): ReviewItem => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.VOCABULARY,
        content: {
          primary: item.japanese,
          secondary: item.meaning,
          context: item.examples?.[0]?.japanese,
          formatted: {
            primary: item.japanese,
            secondary: item.reading,
            context: item.examples?.[0]?.english
          }
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: 'textbook-vocabulary',
          tags: [item.textbook, `lesson-${item.lesson}`],
          difficulty: item.difficulty || 5,
          properties: {
            textbook: item.textbook,
            lesson: item.lesson
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to search textbook vocabulary:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const item = await this.service.getCard(itemId);
      if (!item) return null;

      return {
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.VOCABULARY,
        content: {
          primary: item.japanese,
          secondary: item.meaning,
          context: item.examples?.[0]?.japanese,
          formatted: {
            primary: item.japanese,
            secondary: item.reading,
            context: item.examples?.[0]?.english
          }
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: 'textbook-vocabulary',
          tags: [item.textbook, `lesson-${item.lesson}`],
          difficulty: item.difficulty || 5,
          properties: {
            textbook: item.textbook,
            lesson: item.lesson
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      };
    } catch (error) {
      console.error('Failed to get textbook vocabulary item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized) return false;
      return await this.service.isHealthy();
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    await this.service.cleanup?.();
  }

  private calculateItemPriority(item: any): number {
    let priority = 5; // Base priority

    // Increase priority for overdue items
    if (new Date(item.dueDate) < new Date()) {
      priority += 3;
    }

    // Adjust based on difficulty
    if (item.difficulty) {
      priority += Math.floor(item.difficulty / 2);
    }

    // Adjust based on JLPT level (higher level = higher priority)
    if (item.jlptLevel) {
      const levelPriority = { 'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5 };
      priority += levelPriority[item.jlptLevel as keyof typeof levelPriority] || 0;
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
        [ContentType.VOCABULARY]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.FLASHCARD]: 0,
        [ContentType.GRAMMAR]: 0,
        [ContentType.SENTENCE]: 0,
        [ContentType.RADICAL]: 0,
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
 * Factory function to create a textbook vocabulary source
 */
export async function createTextbookVocabularySource(userId: string | null): Promise<TextbookVocabularySource> {
  const source = new TextbookVocabularySource(userId);
  return source;
}