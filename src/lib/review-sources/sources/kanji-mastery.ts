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

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.KANJI_MASTERY].defaultConfig
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      // Initialize kanji mastery system
      // In a real implementation, this would connect to the actual kanji mastery service
      this.initialized = true;
    } catch (error) {
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

    try {
      const limit = Math.min(options?.limit || 50, this.config.maxItems || 50);
      
      // Mock data - in real implementation, this would fetch from IndexedDB/Firebase
      const mockKanjiItems = this.getMockKanjiItems();
      const dueItems = mockKanjiItems
        .filter(item => new Date(item.dueDate) <= new Date())
        .slice(0, limit);

      return dueItems.map((item): ReviewItem => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: {
          primary: item.character, // The kanji character
          secondary: item.meanings.join(', '), // English meanings
          context: item.examples?.[0]?.word, // Example word
          formatted: {
            primary: item.character,
            secondary: item.readings.join(', '), // Readings
            context: item.examples?.[0]?.meaning // Example meaning
          }
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [
          StudyMode.RECOGNITION, 
          StudyMode.PRODUCTION, 
          StudyMode.READING
        ],
        metadata: {
          source: 'kanji-mastery',
          tags: [
            `grade-${item.grade}`,
            item.jlptLevel || 'no-jlpt',
            `strokes-${item.strokes}`
          ],
          difficulty: item.difficulty || 5,
          properties: {
            character: item.character,
            grade: item.grade,
            jlptLevel: item.jlptLevel,
            strokes: item.strokes,
            onyomi: item.readings.filter(r => r.type === 'onyomi').map(r => r.reading),
            kunyomi: item.readings.filter(r => r.type === 'kunyomi').map(r => r.reading),
            radicals: item.radicals
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get due items from kanji mastery:', error);
      return [];
    }
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    try {
      // Mock stats - in real implementation, this would calculate from actual data
      const mockStats = {
        totalItems: 247,
        dueToday: 15,
        overdue: 3,
        scheduled: 180,
        newItems: 49,
        averageRetention: 78,
        studyStreak: 5,
        lastSession: Date.now() - 86400000 // Yesterday
      };

      return {
        totalItems: mockStats.totalItems,
        dueToday: mockStats.dueToday,
        overdue: mockStats.overdue,
        scheduled: mockStats.scheduled,
        newItems: mockStats.newItems,
        itemsByType: {
          [ContentType.KANJI]: mockStats.totalItems - 20,
          [ContentType.RADICAL]: 20,
          [ContentType.VOCABULARY]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: {
          [SourcePriority.LOW]: Math.floor(mockStats.totalItems * 0.2),
          [SourcePriority.MEDIUM]: Math.floor(mockStats.totalItems * 0.5),
          [SourcePriority.HIGH]: Math.floor(mockStats.totalItems * 0.25),
          [SourcePriority.URGENT]: Math.floor(mockStats.totalItems * 0.05)
        },
        averageMastery: mockStats.averageRetention,
        retentionRate: mockStats.averageRetention / 100,
        lastReviewSession: new Date(mockStats.lastSession),
        studyStreak: mockStats.studyStreak,
        trends: {
          accuracy: 'improving',
          speed: 'stable',
          retention: 'improving'
        }
      };
    } catch (error) {
      console.error('Failed to get kanji mastery stats:', error);
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
      // In real implementation, this would update the FSRS algorithm state
      console.log(`Processing kanji review for ${itemId}:`, result);
    } catch (error) {
      console.error('Failed to process kanji mastery review:', error);
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
      const mockItems = this.getMockKanjiItems();
      const results = mockItems
        .filter(item => 
          item.character.includes(query) ||
          item.meanings.some(m => m.toLowerCase().includes(query.toLowerCase())) ||
          item.readings.some(r => r.reading.includes(query))
        )
        .slice(0, options?.limit || 20);

      return results.map((item): ReviewItem => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: {
          primary: item.character,
          secondary: item.meanings.join(', '),
          context: item.examples?.[0]?.word
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: 'kanji-mastery',
          tags: [`grade-${item.grade}`, item.jlptLevel || 'no-jlpt'],
          difficulty: item.difficulty || 5
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to search kanji mastery:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const mockItems = this.getMockKanjiItems();
      const item = mockItems.find(i => i.id === itemId);
      
      if (!item) return null;

      return {
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: {
          primary: item.character,
          secondary: item.meanings.join(', '),
          context: item.examples?.[0]?.word
        },
        dueDate: new Date(item.dueDate),
        priority: this.calculateItemPriority(item),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: 'kanji-mastery',
          tags: [`grade-${item.grade}`, item.jlptLevel || 'no-jlpt'],
          difficulty: item.difficulty || 5,
          properties: {
            character: item.character,
            grade: item.grade,
            jlptLevel: item.jlptLevel,
            strokes: item.strokes
          }
        },
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      };
    } catch (error) {
      console.error('Failed to get kanji mastery item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }

  private getMockKanjiItems() {
    // Mock data representing kanji items
    return [
      {
        id: 'kanji-1',
        character: '人',
        meanings: ['person', 'people'],
        readings: [
          { type: 'onyomi', reading: 'ジン' },
          { type: 'onyomi', reading: 'ニン' },
          { type: 'kunyomi', reading: 'ひと' }
        ],
        grade: 1,
        jlptLevel: 'N5',
        strokes: 2,
        radicals: ['人'],
        examples: [
          { word: '人間', reading: 'にんげん', meaning: 'human being' }
        ],
        dueDate: Date.now() - 3600000, // 1 hour ago
        difficulty: 3,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now() - 86400000
      },
      {
        id: 'kanji-2',
        character: '水',
        meanings: ['water'],
        readings: [
          { type: 'onyomi', reading: 'スイ' },
          { type: 'kunyomi', reading: 'みず' }
        ],
        grade: 1,
        jlptLevel: 'N5',
        strokes: 4,
        radicals: ['水'],
        examples: [
          { word: '水曜日', reading: 'すいようび', meaning: 'Wednesday' }
        ],
        dueDate: Date.now() + 3600000, // In 1 hour
        difficulty: 4,
        createdAt: Date.now() - 86400000 * 25,
        updatedAt: Date.now() - 86400000 * 2
      },
      {
        id: 'kanji-3',
        character: '学',
        meanings: ['learning', 'study', 'school'],
        readings: [
          { type: 'onyomi', reading: 'ガク' },
          { type: 'kunyomi', reading: 'まな' }
        ],
        grade: 1,
        jlptLevel: 'N5',
        strokes: 8,
        radicals: ['学'],
        examples: [
          { word: '学校', reading: 'がっこう', meaning: 'school' }
        ],
        dueDate: Date.now() - 7200000, // 2 hours ago
        difficulty: 5,
        createdAt: Date.now() - 86400000 * 20,
        updatedAt: Date.now() - 86400000 * 3
      }
    ];
  }

  private calculateItemPriority(item: any): number {
    let priority = 5; // Base priority

    // Increase priority for overdue items
    if (new Date(item.dueDate) < new Date()) {
      const hoursOverdue = (Date.now() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60);
      priority += Math.min(3, Math.floor(hoursOverdue / 24));
    }

    // Adjust based on difficulty
    if (item.difficulty) {
      priority += Math.floor(item.difficulty / 3);
    }

    // Adjust based on grade (elementary kanji get higher priority)
    if (item.grade && item.grade <= 6) {
      priority += Math.max(0, 7 - item.grade);
    }

    // Adjust based on JLPT level
    const jlptPriority = { 'N5': 3, 'N4': 2, 'N3': 1, 'N2': 0, 'N1': 0 };
    if (item.jlptLevel) {
      priority += jlptPriority[item.jlptLevel as keyof typeof jlptPriority] || 0;
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