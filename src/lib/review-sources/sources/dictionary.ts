/**
 * Dictionary Review Source Implementation
 * 
 * This source tracks dictionary lookups and provides vocabulary items for review
 * based on lookup frequency, retention needs, and vocabulary mastery.
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

interface DictionaryLookupStats {
  word: string;
  reading: string;
  meanings: string[];
  lookupCount: number;
  lastLookedUp: number;
  firstLookedUp: number;
  retentionScore: number;
  contextsSeen: string[];
  needsReview: boolean;
  priority: number;
  difficulty: number;
  partOfSpeech?: string[];
  tags: string[];
}

export class DictionarySource implements ReviewSource {
  readonly id = 'dictionary';
  readonly name = 'Dictionary Lookups';
  readonly type = ReviewSourceType.VOCABULARY;
  readonly icon = '📚';
  readonly description = 'Review vocabulary words you\'ve looked up in the dictionary';
  readonly supportedContentTypes = [ContentType.VOCABULARY];
  readonly paths = {
    main: '/vocabulary',
    settings: '/settings#dictionary'
  };

  private initialized = false;
  private dictionaryStats: Map<string, DictionaryLookupStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.VOCABULARY]?.defaultConfig || {
      enabled: true,
      maxItems: 25,
      priorityMultiplier: 1.0,
      settings: {
        reviewIntervalDays: 1,
        minLookupCount: 2, // Only include words looked up multiple times
        includeContexts: true,
        focusOnRecentLookups: true
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.loadDictionaryStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize dictionary source: ${error}`);
    }
  }

  private async loadDictionaryStats(): Promise<void> {
    try {
      // Get dictionary lookup and vocabulary events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const dictionaryEvents = events.filter(event => 
        event.category === 'vocabulary' || 
        event.context?.feature?.includes('dictionary') ||
        event.context?.feature?.includes('lookup') ||
        event.type === 'lookup' ||
        event.content?.metadata?.dictionary ||
        event.content?.metadata?.lookup
      );

      // Group events by word
      const wordEventsByWord = new Map<string, typeof events>();
      dictionaryEvents.forEach(event => {
        const word = event.content?.value || 
                    event.content?.metadata?.word ||
                    event.content?.metadata?.japanese;
        
        if (word) {
          if (!wordEventsByWord.has(word)) {
            wordEventsByWord.set(word, []);
          }
          wordEventsByWord.get(word)!.push(event);
        }
      });

      // Process word events to build stats
      wordEventsByWord.forEach((events, word) => {
        const lookupEvents = events.filter(e => 
          e.type === 'lookup' || e.type === 'view' || e.context?.feature?.includes('dictionary')
        );
        
        if (lookupEvents.length >= (this.config.settings.minLookupCount || 1)) {
          const firstEvent = events[events.length - 1]; // Oldest event
          const lastEvent = events[0]; // Most recent event
          
          const stats: DictionaryLookupStats = {
            word,
            reading: firstEvent.content?.metadata?.reading || 
                    firstEvent.content?.metadata?.kana || 
                    firstEvent.content?.metadata?.furigana || '',
            meanings: this.extractMeanings(events),
            lookupCount: lookupEvents.length,
            lastLookedUp: lastEvent.timestamp,
            firstLookedUp: firstEvent.timestamp,
            retentionScore: this.calculateRetentionScore(events),
            contextsSeen: this.extractContexts(events),
            needsReview: false,
            priority: 5,
            difficulty: this.calculateWordDifficulty(events, word),
            partOfSpeech: firstEvent.content?.metadata?.partOfSpeech || 
                          firstEvent.content?.metadata?.pos,
            tags: this.extractWordTags(firstEvent, word)
          };

          // Update review necessity and priority
          this.updateDictionaryWordNeedForReview(stats);
          
          this.dictionaryStats.set(word, stats);
        }
      });

    } catch (error) {
      console.error('Failed to load dictionary stats:', error);
      // Continue with empty stats
    }
  }

  private extractMeanings(events: any[]): string[] {
    const meanings = new Set<string>();
    
    events.forEach(event => {
      const metadata = event.content?.metadata || {};
      
      if (metadata.meanings && Array.isArray(metadata.meanings)) {
        metadata.meanings.forEach((m: string) => meanings.add(m));
      } else if (metadata.meaning) {
        meanings.add(metadata.meaning);
      } else if (metadata.definition) {
        meanings.add(metadata.definition);
      } else if (metadata.english) {
        meanings.add(metadata.english);
      }
    });
    
    return Array.from(meanings).slice(0, 3); // Limit to top 3 meanings
  }

  private calculateRetentionScore(events: any[]): number {
    // Calculate retention based on lookup frequency and patterns
    let retention = 50; // Base retention
    
    // Recent lookups suggest poor retention
    const recentEvents = events.filter(e => 
      Date.now() - e.timestamp < (7 * 24 * 60 * 60 * 1000) // Last 7 days
    );
    
    if (recentEvents.length > 1) {
      retention -= (recentEvents.length - 1) * 10; // Penalty for frequent recent lookups
    }
    
    // Multiple lookups over time suggest difficulty retaining
    const totalLookups = events.filter(e => 
      e.type === 'lookup' || e.context?.feature?.includes('dictionary')
    ).length;
    
    if (totalLookups > 3) {
      retention -= Math.min(30, (totalLookups - 3) * 5);
    }
    
    // Success events boost retention
    const successEvents = events.filter(e => e.type === 'success');
    retention += successEvents.length * 15;
    
    // Practice events boost retention
    const practiceEvents = events.filter(e => 
      e.type === 'practice' || e.context?.feature?.includes('practice')
    );
    retention += practiceEvents.length * 10;
    
    return Math.min(100, Math.max(0, retention));
  }

  private extractContexts(events: any[]): string[] {
    const contexts = new Set<string>();
    
    events.forEach(event => {
      if (event.content?.metadata?.context) {
        contexts.add(event.content.metadata.context);
      }
      if (event.content?.metadata?.sentence) {
        contexts.add(event.content.metadata.sentence);
      }
      if (event.context?.page) {
        contexts.add(`From: ${event.context.page}`);
      }
    });
    
    return Array.from(contexts).slice(0, 3); // Limit to 3 contexts
  }

  private calculateWordDifficulty(events: any[], word: string): number {
    let difficulty = 5; // Base difficulty
    
    // Check for explicit difficulty metadata
    const difficultyEvent = events.find(e => e.content?.metadata?.difficulty);
    if (difficultyEvent) {
      difficulty = difficultyEvent.content.metadata.difficulty;
    }
    
    // Word length suggests complexity
    if (word.length > 4) difficulty += 1;
    if (word.length > 6) difficulty += 1;
    
    // Multiple lookups suggest difficulty
    const lookupCount = events.filter(e => 
      e.type === 'lookup' || e.context?.feature?.includes('dictionary')
    ).length;
    
    if (lookupCount > 3) difficulty += 1;
    if (lookupCount > 5) difficulty += 1;
    
    // JLPT level affects difficulty
    const jlptEvent = events.find(e => e.content?.metadata?.jlptLevel);
    if (jlptEvent) {
      const level = jlptEvent.content.metadata.jlptLevel;
      const levelDifficulty = { 'N5': 1, 'N4': 2, 'N3': 4, 'N2': 6, 'N1': 8 };
      difficulty = levelDifficulty[level as keyof typeof levelDifficulty] || difficulty;
    }
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private extractWordTags(event: any, word: string): string[] {
    const tags: string[] = ['dictionary', 'lookup'];
    
    const metadata = event.content?.metadata || {};
    
    if (metadata.jlptLevel) tags.push(metadata.jlptLevel);
    if (metadata.partOfSpeech) {
      if (Array.isArray(metadata.partOfSpeech)) {
        tags.push(...metadata.partOfSpeech);
      } else {
        tags.push(metadata.partOfSpeech);
      }
    }
    if (metadata.frequency) {
      if (metadata.frequency < 1000) tags.push('common');
      else if (metadata.frequency < 5000) tags.push('frequent');
      else tags.push('rare');
    }
    
    // Categorize by script type
    if (/[\u4e00-\u9faf]/.test(word)) tags.push('kanji');
    if (/[\u3040-\u309f]/.test(word)) tags.push('hiragana');
    if (/[\u30a0-\u30ff]/.test(word)) tags.push('katakana');
    
    return tags;
  }

  private updateDictionaryWordNeedForReview(stats: DictionaryLookupStats): void {
    const now = Date.now();
    const daysSinceLastLookup = (now - stats.lastLookedUp) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 1;
    
    let priority = 3;
    
    // Recent lookups suggest this word needs review
    if (this.config.settings.focusOnRecentLookups && daysSinceLastLookup <= 1) {
      priority += 3;
      stats.needsReview = true;
    }
    
    // Multiple lookups suggest difficulty
    if (stats.lookupCount >= 3) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Time-based review
    if (daysSinceLastLookup >= reviewIntervalDays) {
      priority += Math.min(2, Math.floor(daysSinceLastLookup / reviewIntervalDays));
      stats.needsReview = true;
    }
    
    // Low retention score needs attention
    if (stats.retentionScore < 50) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Difficult words get higher priority
    if (stats.difficulty > 7) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Well-retained words get lower priority
    if (stats.retentionScore > 80 && stats.lookupCount === 1) {
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
      const limit = Math.min(options?.limit || 25, this.config.maxItems || 25);
      
      // Filter words that need review
      const itemsNeedingReview = Array.from(this.dictionaryStats.values())
        .filter(stats => stats.needsReview);
      
      // Sort by priority (descending) and lookup count (descending for frequently looked up words)
      itemsNeedingReview.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.lookupCount - a.lookupCount;
      });

      // Take the top items up to the limit
      const selectedItems = itemsNeedingReview.slice(0, limit);

      // Convert to ReviewItem format
      return selectedItems.map((stats): ReviewItem => ({
        id: `word_${stats.word}`,
        sourceId: this.id,
        contentType: ContentType.VOCABULARY,
        content: {
          primary: stats.word,
          secondary: stats.meanings.join(', '),
          context: this.config.settings.includeContexts && stats.contextsSeen.length > 0 ? 
                  stats.contextsSeen[0] : undefined,
          formatted: {
            primary: stats.word,
            secondary: stats.reading,
            context: `${stats.lookupCount} lookup${stats.lookupCount !== 1 ? 's' : ''} • ${stats.retentionScore}% retained`
          }
        },
        dueDate: new Date(stats.lastLookedUp + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            word: stats.word,
            reading: stats.reading,
            meanings: stats.meanings,
            lookupCount: stats.lookupCount,
            retentionScore: stats.retentionScore,
            contextsSeen: stats.contextsSeen,
            partOfSpeech: stats.partOfSpeech
          }
        },
        createdAt: new Date(stats.firstLookedUp),
        updatedAt: new Date(stats.lastLookedUp)
      }));
    } catch (error) {
      console.error('Failed to get due dictionary items:', error);
      return [];
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    try {
      const allStats = Array.from(this.dictionaryStats.values());
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let totalItems = allStats.length;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalRetention = 0;

      allStats.forEach(stats => {
        if (stats.lookupCount === 1 && (now - stats.firstLookedUp) < (24 * 60 * 60 * 1000)) {
          newItems++;
        }
        
        totalRetention += stats.retentionScore;
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastLookedUp + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      });

      const averageRetention = totalItems > 0 ? totalRetention / totalItems : 0;

      return {
        totalItems,
        dueToday,
        overdue,
        scheduled: totalItems - dueToday - overdue - newItems,
        newItems,
        itemsByType: {
          [ContentType.VOCABULARY]: totalItems,
          [ContentType.KANJI]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: this.calculatePriorityDistribution(allStats),
        averageMastery: averageRetention,
        retentionRate: averageRetention / 100,
        lastReviewSession: allStats.length > 0 ? 
          new Date(Math.max(...allStats.map(s => s.lastLookedUp))) : undefined,
        studyStreak: await this.calculateLookupStreak(),
        trends: {
          accuracy: 'stable', // TODO: Calculate based on recent retention trends
          speed: 'stable',
          retention: averageRetention > 70 ? 'improving' : 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get dictionary stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(stats: DictionaryLookupStats[]): Record<SourcePriority, number> {
    const distribution = {
      [SourcePriority.LOW]: 0,
      [SourcePriority.MEDIUM]: 0,
      [SourcePriority.HIGH]: 0,
      [SourcePriority.URGENT]: 0
    };

    stats.forEach(stat => {
      if (stat.priority >= 8) distribution[SourcePriority.URGENT]++;
      else if (stat.priority >= 6) distribution[SourcePriority.HIGH]++;
      else if (stat.priority >= 4) distribution[SourcePriority.MEDIUM]++;
      else distribution[SourcePriority.LOW]++;
    });

    return distribution;
  }

  private async calculateLookupStreak(): Promise<number> {
    try {
      const events = await learningEventsService.getRecentEvents(365);
      const dictionaryEvents = events.filter(event => 
        event.category === 'vocabulary' || 
        event.context?.feature?.includes('dictionary') ||
        event.type === 'lookup'
      );
      
      if (dictionaryEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      dictionaryEvents.forEach(event => {
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
      console.error('Failed to calculate lookup streak:', error);
      return 0;
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Recalculate review needs if settings changed
    if (config.settings) {
      for (const stats of this.dictionaryStats.values()) {
        this.updateDictionaryWordNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      // Extract word from itemId (format: "word_単語")
      const word = itemId.replace('word_', '');
      const stats = this.dictionaryStats.get(word);
      
      if (!stats) {
        console.warn(`No stats found for dictionary word: ${itemId}`);
        return;
      }

      // Update retention score based on rating (1-4 scale, 3+ is success)
      const isSuccess = result.rating >= 3;
      const retentionChange = isSuccess ? 15 : -10;
      stats.retentionScore = Math.min(100, Math.max(0, stats.retentionScore + retentionChange));
      
      // Update last looked up time
      stats.lastLookedUp = result.timestamp.getTime();
      
      // Recalculate review needs
      this.updateDictionaryWordNeedForReview(stats);

      // Track the review event
      await learningEventsService.trackEvent({
        id: `dictionary_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: isSuccess ? 'success' : 'failure',
        category: 'vocabulary',
        content: {
          value: word,
          metadata: {
            word,
            reading: stats.reading,
            meanings: stats.meanings,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed,
            retentionScore: stats.retentionScore,
            lookupCount: stats.lookupCount,
            dictionary: true,
            lookup: true
          }
        },
        sessionId: `dictionary_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'dictionary-review',
          device: 'web',
          platform: 'web',
          dictionary: true
        },
        metrics: {
          duration: result.responseTime
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process dictionary review:', error);
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

      for (const stats of this.dictionaryStats.values()) {
        // Search by word, reading, meanings, or tags
        if (stats.word.includes(query) || 
            stats.reading.toLowerCase().includes(lowerQuery) ||
            stats.meanings.some(meaning => meaning.toLowerCase().includes(lowerQuery)) ||
            stats.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          
          results.push({
            id: `word_${stats.word}`,
            sourceId: this.id,
            contentType: ContentType.VOCABULARY,
            content: {
              primary: stats.word,
              secondary: stats.meanings.join(', '),
              context: `Dictionary lookup review`,
              formatted: {
                primary: stats.word,
                secondary: stats.reading
              }
            },
            dueDate: new Date(stats.lastLookedUp + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
            metadata: {
              source: this.id,
              tags: stats.tags,
              difficulty: stats.difficulty,
              properties: {
                lookupCount: stats.lookupCount,
                retentionScore: stats.retentionScore
              }
            },
            createdAt: new Date(stats.firstLookedUp),
            updatedAt: new Date(stats.lastLookedUp)
          });
          
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search dictionary items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const word = itemId.replace('word_', '');
      const stats = this.dictionaryStats.get(word);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.VOCABULARY,
        content: {
          primary: stats.word,
          secondary: stats.meanings.join(', '),
          context: `Dictionary lookup review`,
          formatted: {
            primary: stats.word,
            secondary: stats.reading
          }
        },
        dueDate: new Date(stats.lastLookedUp + (this.config.settings.reviewIntervalDays || 1) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            lookupCount: stats.lookupCount,
            retentionScore: stats.retentionScore
          }
        },
        createdAt: new Date(stats.firstLookedUp),
        updatedAt: new Date(stats.lastLookedUp)
      };
    } catch (error) {
      console.error('Failed to get dictionary item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.initialized;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    this.dictionaryStats.clear();
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
 * Factory function to create a dictionary source
 */
export async function createDictionarySource(userId: string | null): Promise<DictionarySource> {
  const source = new DictionarySource(userId);
  return source;
}