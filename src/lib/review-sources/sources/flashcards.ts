/**
 * Flashcards Review Source Implementation
 * 
 * This source integrates with user-created flashcards and custom decks
 * to provide review items with multimedia support.
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

export class FlashcardsSource implements ReviewSource {
  readonly id = 'flashcards';
  readonly name = 'Flashcards';
  readonly type = ReviewSourceType.FLASHCARDS;
  readonly icon = '🗃️';
  readonly description = 'Custom flashcard decks with multimedia support';
  readonly supportedContentTypes = [ContentType.FLASHCARD, ContentType.CUSTOM];
  readonly paths = {
    main: '/drill/flashcards',
    settings: '/settings/flashcards'
  };

  private initialized = false;

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.FLASHCARDS].defaultConfig
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      // Initialize flashcard system
      // In a real implementation, this would connect to the flashcard storage system
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize flashcards source: ${error}`);
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
      const limit = Math.min(options?.limit || 40, this.config.maxItems || 40);
      
      // Mock data - in real implementation, this would fetch from user's flashcards
      const mockFlashcards = this.getMockFlashcards();
      const dueItems = mockFlashcards
        .filter(item => new Date(item.dueDate) <= new Date())
        .slice(0, limit);

      return dueItems.map((item): ReviewItem => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: item.front.text, // Front side
          secondary: item.back.text, // Back side
          context: item.notes, // Additional notes
          image: item.front.image ? { url: item.front.image } : undefined,
          audio: item.front.audio ? { url: item.front.audio, autoPlay: false } : undefined,
          formatted: {
            primary: item.front.text,
            secondary: item.back.text,
            context: item.deck // Show deck name as context
          }
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: 'flashcards',
          tags: [item.deck, ...(item.tags || [])],
          difficulty: item.difficulty || 5,
          properties: {
            deck: item.deck,
            hasImage: !!item.front.image || !!item.back.image,
            hasAudio: !!item.front.audio || !!item.back.audio,
            customTags: item.tags
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get due items from flashcards:', error);
      return [];
    }
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    try {
      // Mock stats - in real implementation, this would calculate from actual flashcard data
      const mockStats = {
        totalItems: 156,
        dueToday: 8,
        overdue: 2,
        scheduled: 120,
        newItems: 26,
        averageRetention: 85,
        studyStreak: 3,
        lastSession: Date.now() - 172800000 // 2 days ago
      };

      return {
        totalItems: mockStats.totalItems,
        dueToday: mockStats.dueToday,
        overdue: mockStats.overdue,
        scheduled: mockStats.scheduled,
        newItems: mockStats.newItems,
        itemsByType: {
          [ContentType.FLASHCARD]: mockStats.totalItems - 10,
          [ContentType.CUSTOM]: 10,
          [ContentType.KANJI]: 0,
          [ContentType.VOCABULARY]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0
        },
        itemsByPriority: {
          [SourcePriority.LOW]: Math.floor(mockStats.totalItems * 0.4),
          [SourcePriority.MEDIUM]: Math.floor(mockStats.totalItems * 0.4),
          [SourcePriority.HIGH]: Math.floor(mockStats.totalItems * 0.15),
          [SourcePriority.URGENT]: Math.floor(mockStats.totalItems * 0.05)
        },
        averageMastery: mockStats.averageRetention,
        retentionRate: mockStats.averageRetention / 100,
        lastReviewSession: new Date(mockStats.lastSession),
        studyStreak: mockStats.studyStreak,
        trends: {
          accuracy: 'stable',
          speed: 'improving',
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get flashcards stats:', error);
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

    try {
      // In real implementation, this would update the flashcard's review state
      console.log(`Processing flashcard review for ${itemId}:`, result);
    } catch (error) {
      console.error('Failed to process flashcard review:', error);
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
      const mockItems = this.getMockFlashcards();
      const results = mockItems
        .filter(item => 
          item.front.text.toLowerCase().includes(query.toLowerCase()) ||
          item.back.text.toLowerCase().includes(query.toLowerCase()) ||
          item.deck.toLowerCase().includes(query.toLowerCase()) ||
          item.notes?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, options?.limit || 20);

      return results.map((item): ReviewItem => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: item.front.text,
          secondary: item.back.text,
          context: item.notes
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: 'flashcards',
          tags: [item.deck, ...(item.tags || [])],
          difficulty: item.difficulty || 5
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to search flashcards:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const mockItems = this.getMockFlashcards();
      const item = mockItems.find(i => i.id === itemId);
      
      if (!item) return null;

      return {
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: item.front.text,
          secondary: item.back.text,
          context: item.notes
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: 'flashcards',
          tags: [item.deck, ...(item.tags || [])],
          difficulty: item.difficulty || 5,
          properties: {
            deck: item.deck,
            hasImage: !!item.front.image || !!item.back.image,
            hasAudio: !!item.front.audio || !!item.back.audio
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      };
    } catch (error) {
      console.error('Failed to get flashcard item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }

  private getMockFlashcards() {
    // Mock data representing flashcards
    return [
      {
        id: 'flashcard-1',
        front: { text: 'おはよう', image: null, audio: null },
        back: { text: 'Good morning', image: null, audio: null },
        notes: 'Common greeting used in the morning',
        deck: 'Basic Greetings',
        tags: ['greeting', 'polite'],
        dueDate: Date.now() - 1800000, // 30 minutes ago
        difficulty: 2,
        createdAt: Date.now() - 86400000 * 10,
        updatedAt: Date.now() - 86400000
      },
      {
        id: 'flashcard-2',
        front: { text: 'ありがとう', image: null, audio: null },
        back: { text: 'Thank you', image: null, audio: null },
        notes: 'Standard expression of gratitude',
        deck: 'Basic Greetings',
        tags: ['gratitude', 'polite'],
        dueDate: Date.now() + 3600000, // In 1 hour
        difficulty: 3,
        createdAt: Date.now() - 86400000 * 8,
        updatedAt: Date.now() - 86400000 * 2
      },
      {
        id: 'flashcard-3',
        front: { text: '頑張って', image: null, audio: null },
        back: { text: 'Good luck / Do your best', image: null, audio: null },
        notes: 'Encouraging expression, commonly used',
        deck: 'Encouragement',
        tags: ['encouragement', 'casual'],
        dueDate: Date.now() - 900000, // 15 minutes ago
        difficulty: 4,
        createdAt: Date.now() - 86400000 * 5,
        updatedAt: Date.now() - 86400000 * 1
      }
    ];
  }

  private calculateItemPriority(item: any): number {
    let priority = 5; // Base priority

    // Increase priority for overdue items
    if (new Date(item.dueDate) < new Date()) {
      const hoursOverdue = (Date.now() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60);
      priority += Math.min(2, Math.floor(hoursOverdue / 12));
    }

    // Adjust based on difficulty
    if (item.difficulty) {
      priority += Math.floor(item.difficulty / 3);
    }

    // Lower priority for custom flashcards (user-created content is less urgent)
    priority = Math.max(1, priority - 1);

    // Boost priority for cards with multimedia content
    if (item.front.image || item.front.audio || item.back.image || item.back.audio) {
      priority += 1;
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
        [ContentType.FLASHCARD]: 0,
        [ContentType.CUSTOM]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.GRAMMAR]: 0,
        [ContentType.SENTENCE]: 0,
        [ContentType.RADICAL]: 0
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
 * Factory function to create a flashcards source
 */
export async function createFlashcardsSource(userId: string | null): Promise<FlashcardsSource> {
  const source = new FlashcardsSource(userId);
  return source;
}