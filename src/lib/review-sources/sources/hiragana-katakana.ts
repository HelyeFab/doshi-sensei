/**
 * Hiragana/Katakana Review Source Implementation
 * 
 * This source tracks kana practice sessions and provides items that need review
 * based on user's learning analytics and recent study patterns.
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
import { learningEventsService } from '@/services/analytics/LearningEventsService';
import { kanaData, KanaCharacter } from '@/data/kanaData';

interface KanaLearningStats {
  character: string;
  romaji: string;
  type: 'hiragana' | 'katakana';
  lastPracticed: number;
  practiceCount: number;
  successRate: number;
  averageResponseTime: number;
  needsReview: boolean;
  priority: number;
}

export class HiraganaKatakanaSource implements ReviewSource {
  readonly id = 'hiragana-katakana';
  readonly name = 'Hiragana & Katakana';
  readonly type = ReviewSourceType.CUSTOM_LISTS; // Using closest available type
  readonly icon = 'あ';
  readonly description = 'Practice reading and writing hiragana and katakana characters';
  readonly supportedContentTypes = [ContentType.FLASHCARD];
  readonly paths = {
    main: '/practice',
    settings: '/settings#kana'
  };

  private initialized = false;
  private kanaStats: Map<string, KanaLearningStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.CUSTOM_LISTS]?.defaultConfig || {
      enabled: true,
      maxItems: 20,
      priorityMultiplier: 1.0,
      settings: {
        includeHiragana: true,
        includeKatakana: true,
        focusOnWeakAreas: true,
        reviewIntervalDays: 1
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.loadKanaStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize hiragana/katakana source: ${error}`);
    }
  }

  private async loadKanaStats(): Promise<void> {
    try {
      // Get recent kana learning events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const kanaEvents = events.filter(event => event.category === 'kana');

      // Initialize stats for all kana characters
      kanaData.forEach(kana => {
        // Hiragana stats
        this.kanaStats.set(`hiragana_${kana.id}`, {
          character: kana.hiragana,
          romaji: kana.romaji,
          type: 'hiragana',
          lastPracticed: 0,
          practiceCount: 0,
          successRate: 0,
          averageResponseTime: 0,
          needsReview: true,
          priority: 5
        });

        // Katakana stats
        this.kanaStats.set(`katakana_${kana.id}`, {
          character: kana.katakana,
          romaji: kana.romaji,
          type: 'katakana',
          lastPracticed: 0,
          practiceCount: 0,
          successRate: 0,
          averageResponseTime: 0,
          needsReview: true,
          priority: 5
        });
      });

      // Process kana events to update stats
      kanaEvents.forEach(event => {
        const metadata = event.content.metadata;
        if (metadata?.studyType && metadata?.romaji) {
          const key = `${metadata.studyType}_${this.findKanaIdByRomaji(metadata.romaji)}`;
          const stats = this.kanaStats.get(key);
          
          if (stats) {
            stats.practiceCount++;
            stats.lastPracticed = Math.max(stats.lastPracticed, event.timestamp);
            
            // Update success rate based on event type
            if (event.type === 'complete') {
              stats.successRate = (stats.successRate * (stats.practiceCount - 1) + 100) / stats.practiceCount;
            } else if (event.type === 'abandon') {
              stats.successRate = (stats.successRate * (stats.practiceCount - 1) + 0) / stats.practiceCount;
            }
            
            // Update response time if available
            if (event.metrics?.duration) {
              stats.averageResponseTime = (stats.averageResponseTime * (stats.practiceCount - 1) + event.metrics.duration) / stats.practiceCount;
            }
            
            // Calculate priority and review necessity
            this.updateKanaNeedForReview(stats);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load kana stats:', error);
      // Continue with default empty stats
    }
  }

  private findKanaIdByRomaji(romaji: string): string {
    const kana = kanaData.find(k => k.romaji === romaji);
    return kana?.id || '';
  }

  private updateKanaNeedForReview(stats: KanaLearningStats): void {
    const now = Date.now();
    const daysSinceLastPractice = (now - stats.lastPracticed) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 1;
    
    // Calculate priority based on multiple factors
    let priority = 5;
    
    // Increase priority if not practiced recently
    if (stats.practiceCount === 0) {
      priority = 8; // New characters
      stats.needsReview = true;
    } else if (daysSinceLastPractice >= reviewIntervalDays) {
      priority += Math.min(3, Math.floor(daysSinceLastPractice / reviewIntervalDays));
      stats.needsReview = true;
    } else {
      stats.needsReview = false;
    }
    
    // Increase priority for low success rate
    if (stats.successRate < 70 && stats.practiceCount > 0) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Decrease priority for well-learned characters
    if (stats.successRate > 90 && stats.practiceCount > 5) {
      priority -= 1;
    }
    
    stats.priority = Math.min(10, Math.max(1, priority));
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
      const limit = Math.min(options?.limit || 20, this.config.maxItems || 20);
      
      // Filter items that need review
      const itemsNeedingReview: KanaLearningStats[] = [];
      
      for (const [key, stats] of this.kanaStats.entries()) {
        const shouldInclude = this.shouldIncludeKanaType(stats.type) && 
                             stats.needsReview;
        
        if (shouldInclude) {
          itemsNeedingReview.push(stats);
        }
      }
      
      // Sort by priority (descending) and last practiced (ascending)
      itemsNeedingReview.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.lastPracticed - b.lastPracticed;
      });

      // Take the top items up to the limit
      const selectedItems = itemsNeedingReview.slice(0, limit);

      // Convert to ReviewItem format
      return selectedItems.map((stats): ReviewItem => ({
        id: `${stats.type}_${stats.romaji}`,
        sourceId: this.id,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: stats.character, // Show kana character
          secondary: stats.romaji,  // Show romanization
          context: `${stats.type.charAt(0).toUpperCase() + stats.type.slice(1)} character`,
          formatted: {
            primary: stats.character,
            secondary: stats.romaji,
            context: stats.type
          }
        },
        dueDate: new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: this.id,
          tags: [stats.type, 'kana', 'basic'],
          difficulty: this.calculateDifficulty(stats),
          properties: {
            kanaType: stats.type,
            romaji: stats.romaji,
            character: stats.character,
            practiceCount: stats.practiceCount,
            successRate: stats.successRate
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(stats.lastPracticed || Date.now())
      }));
    } catch (error) {
      console.error('Failed to get due kana items:', error);
      return [];
    }
  }

  private shouldIncludeKanaType(type: 'hiragana' | 'katakana'): boolean {
    const includeHiragana = this.config.settings.includeHiragana !== false;
    const includeKatakana = this.config.settings.includeKatakana !== false;
    
    return (type === 'hiragana' && includeHiragana) || 
           (type === 'katakana' && includeKatakana);
  }

  private calculateDifficulty(stats: KanaLearningStats): number {
    if (stats.practiceCount === 0) return 1; // New items are easy to start
    
    let difficulty = 5;
    
    // Adjust based on success rate
    if (stats.successRate < 50) difficulty += 3;
    else if (stats.successRate < 70) difficulty += 1;
    else if (stats.successRate > 90) difficulty -= 2;
    
    return Math.min(10, Math.max(1, difficulty));
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    try {
      let totalItems = 0;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalSuccessRate = 0;
      let itemsWithStats = 0;

      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const [key, stats] of this.kanaStats.entries()) {
        if (!this.shouldIncludeKanaType(stats.type)) continue;
        
        totalItems++;
        
        if (stats.practiceCount === 0) {
          newItems++;
        } else {
          totalSuccessRate += stats.successRate;
          itemsWithStats++;
        }
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      }

      const averageSuccessRate = itemsWithStats > 0 ? totalSuccessRate / itemsWithStats : 0;

      return {
        totalItems,
        dueToday,
        overdue,
        scheduled: totalItems - dueToday - overdue - newItems,
        newItems,
        itemsByType: {
          [ContentType.FLASHCARD]: totalItems,
          [ContentType.VOCABULARY]: 0,
          [ContentType.KANJI]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: this.calculatePriorityDistribution(),
        averageMastery: averageSuccessRate,
        retentionRate: averageSuccessRate / 100,
        studyStreak: await this.calculateStudyStreak(),
        trends: {
          accuracy: 'stable', // TODO: Calculate based on recent performance
          speed: 'stable',
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get kana stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(): Record<SourcePriority, number> {
    const distribution = {
      [SourcePriority.LOW]: 0,
      [SourcePriority.MEDIUM]: 0,
      [SourcePriority.HIGH]: 0,
      [SourcePriority.URGENT]: 0
    };

    for (const [key, stats] of this.kanaStats.entries()) {
      if (!this.shouldIncludeKanaType(stats.type)) continue;
      
      if (stats.priority >= 8) distribution[SourcePriority.URGENT]++;
      else if (stats.priority >= 6) distribution[SourcePriority.HIGH]++;
      else if (stats.priority >= 4) distribution[SourcePriority.MEDIUM]++;
      else distribution[SourcePriority.LOW]++;
    }

    return distribution;
  }

  private async calculateStudyStreak(): Promise<number> {
    try {
      const events = await learningEventsService.getRecentEvents(365);
      const kanaEvents = events.filter(event => event.category === 'kana');
      
      if (kanaEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      kanaEvents.forEach(event => {
        const date = new Date(event.timestamp);
        eventDates.add(date.toDateString());
      });

      // Calculate consecutive days from today backwards
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        
        if (eventDates.has(checkDate.toDateString())) {
          streak++;
        } else if (i > 0) { // Allow today to be empty
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Failed to calculate study streak:', error);
      return 0;
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Recalculate review needs if settings changed
    if (config.settings) {
      for (const [key, stats] of this.kanaStats.entries()) {
        this.updateKanaNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      // Extract kana info from itemId (format: "hiragana_a" or "katakana_ka")
      const [type, romaji] = itemId.split('_');
      const kanaId = this.findKanaIdByRomaji(romaji);
      const key = `${type}_${kanaId}`;
      
      const stats = this.kanaStats.get(key);
      if (!stats) {
        console.warn(`No stats found for kana: ${itemId}`);
        return;
      }

      // Update stats based on review result
      stats.practiceCount++;
      stats.lastPracticed = result.timestamp.getTime();
      
      // Calculate success based on rating (1-4 scale, 3+ is success)
      const isSuccess = result.rating >= 3;
      stats.successRate = (stats.successRate * (stats.practiceCount - 1) + (isSuccess ? 100 : 0)) / stats.practiceCount;
      
      // Update response time
      stats.averageResponseTime = (stats.averageResponseTime * (stats.practiceCount - 1) + result.responseTime) / stats.practiceCount;
      
      // Recalculate review needs
      this.updateKanaNeedForReview(stats);

      // Track the event in analytics (for future analysis)
      await learningEventsService.trackEvent({
        id: `kana_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: isSuccess ? 'success' : 'failure',
        category: 'kana',
        content: {
          value: romaji,
          metadata: {
            studyType: type,
            character: stats.character,
            romaji: romaji,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed
          }
        },
        sessionId: `kana_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'hiragana-katakana-review',
          device: 'web',
          platform: 'web'
        },
        metrics: {
          duration: result.responseTime
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process kana review:', error);
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
      const results: ReviewItem[] = [];
      const limit = options?.limit || 20;
      const lowerQuery = query.toLowerCase();

      for (const [key, stats] of this.kanaStats.entries()) {
        if (!this.shouldIncludeKanaType(stats.type)) continue;
        
        // Search by romaji or character
        if (stats.romaji.toLowerCase().includes(lowerQuery) || 
            stats.character.includes(query) ||
            stats.type.toLowerCase().includes(lowerQuery)) {
          
          results.push({
            id: `${stats.type}_${stats.romaji}`,
            sourceId: this.id,
            contentType: ContentType.FLASHCARD,
            content: {
              primary: stats.character,
              secondary: stats.romaji,
              context: `${stats.type.charAt(0).toUpperCase() + stats.type.slice(1)} character`,
              formatted: {
                primary: stats.character,
                secondary: stats.romaji
              }
            },
            dueDate: new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
            metadata: {
              source: this.id,
              tags: [stats.type, 'kana'],
              difficulty: this.calculateDifficulty(stats),
              properties: {
                kanaType: stats.type,
                romaji: stats.romaji,
                character: stats.character
              }
            },
            createdAt: new Date(),
            updatedAt: new Date(stats.lastPracticed || Date.now())
          });
          
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search kana items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const [type, romaji] = itemId.split('_');
      const kanaId = this.findKanaIdByRomaji(romaji);
      const key = `${type}_${kanaId}`;
      
      const stats = this.kanaStats.get(key);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: stats.character,
          secondary: stats.romaji,
          context: `${stats.type.charAt(0).toUpperCase() + stats.type.slice(1)} character`,
          formatted: {
            primary: stats.character,
            secondary: stats.romaji
          }
        },
        dueDate: new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: this.id,
          tags: [stats.type, 'kana'],
          difficulty: this.calculateDifficulty(stats),
          properties: {
            kanaType: stats.type,
            romaji: stats.romaji,
            character: stats.character
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(stats.lastPracticed || Date.now())
      };
    } catch (error) {
      console.error('Failed to get kana item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.initialized && kanaData.length > 0;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    this.kanaStats.clear();
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
        [ContentType.VOCABULARY]: 0,
        [ContentType.KANJI]: 0,
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
 * Factory function to create a hiragana/katakana source
 */
export async function createHiraganaKatakanaSource(userId: string | null): Promise<HiraganaKatakanaSource> {
  const source = new HiraganaKatakanaSource(userId);
  return source;
}