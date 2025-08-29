/**
 * Moodboard Review Source Implementation
 * 
 * This source tracks kanji moodboard study sessions and provides items for review
 * based on visual learning patterns and kanji retention needs.
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

interface MoodboardKanjiStats {
  kanji: string;
  meaning: string;
  reading: string;
  studySessions: number;
  lastStudied: number;
  firstStudied: number;
  recognitionScore: number;
  visualRetention: number;
  needsReview: boolean;
  priority: number;
  difficulty: number;
  moodboardId?: string;
  tags: string[];
}

export class MoodboardSource implements ReviewSource {
  readonly id = 'moodboard';
  readonly name = 'Kanji Moodboard';
  readonly type = ReviewSourceType.CUSTOM_LISTS;
  readonly icon = '🎨';
  readonly description = 'Visual kanji learning through moodboard study sessions';
  readonly supportedContentTypes = [ContentType.KANJI, ContentType.VOCABULARY];
  readonly paths = {
    main: '/kanji-browser',
    settings: '/settings#moodboard'
  };

  private initialized = false;
  private moodboardStats: Map<string, MoodboardKanjiStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.CUSTOM_LISTS]?.defaultConfig || {
      enabled: true,
      maxItems: 18,
      priorityMultiplier: 1.1,
      settings: {
        reviewIntervalDays: 2,
        focusOnVisualRecognition: true,
        includeReadings: true,
        minRetentionScore: 65
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.loadMoodboardStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize moodboard source: ${error}`);
    }
  }

  private async loadMoodboardStats(): Promise<void> {
    try {
      // Get moodboard and kanji-related events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const moodboardEvents = events.filter(event => 
        event.category === 'kanji' || 
        event.context?.feature?.includes('moodboard') ||
        event.context?.page?.includes('kanji') ||
        event.content?.metadata?.moodboard ||
        event.content?.metadata?.visualStudy
      );

      // Group events by kanji character
      const kanjiEventsByCharacter = new Map<string, typeof events>();
      moodboardEvents.forEach(event => {
        const kanji = event.content?.value || 
                     event.content?.metadata?.kanji ||
                     event.content?.metadata?.character;
        
        if (kanji && kanji.length === 1 && /[\u4e00-\u9faf]/.test(kanji)) {
          if (!kanjiEventsByCharacter.has(kanji)) {
            kanjiEventsByCharacter.set(kanji, []);
          }
          kanjiEventsByCharacter.get(kanji)!.push(event);
        }
      });

      // Process kanji events to build stats
      kanjiEventsByCharacter.forEach((events, kanji) => {
        const studyEvents = events.filter(e => 
          e.type === 'view' || e.type === 'complete' || e.type === 'practice'
        );
        
        if (studyEvents.length > 0) {
          const firstEvent = events[events.length - 1]; // Oldest event
          const lastEvent = events[0]; // Most recent event
          
          const stats: MoodboardKanjiStats = {
            kanji,
            meaning: firstEvent.content?.metadata?.meaning || 
                    firstEvent.content?.metadata?.english || 
                    'Unknown meaning',
            reading: firstEvent.content?.metadata?.reading || 
                    firstEvent.content?.metadata?.kana || 
                    'Unknown reading',
            studySessions: this.countStudySessions(events),
            lastStudied: lastEvent.timestamp,
            firstStudied: firstEvent.timestamp,
            recognitionScore: this.calculateRecognitionScore(events),
            visualRetention: this.calculateVisualRetention(events),
            needsReview: false,
            priority: 5,
            difficulty: this.calculateKanjiDifficulty(events, kanji),
            moodboardId: firstEvent.content?.metadata?.moodboardId,
            tags: this.extractKanjiTags(firstEvent, kanji)
          };

          // Update review necessity and priority
          this.updateMoodboardKanjiNeedForReview(stats);
          
          this.moodboardStats.set(kanji, stats);
        }
      });

    } catch (error) {
      console.error('Failed to load moodboard stats:', error);
      // Continue with empty stats
    }
  }

  private countStudySessions(events: any[]): number {
    // Count unique sessions based on time gaps
    if (events.length === 0) return 0;
    
    events.sort((a, b) => a.timestamp - b.timestamp);
    let sessions = 1;
    const sessionGapMs = 20 * 60 * 1000; // 20 minutes
    
    for (let i = 1; i < events.length; i++) {
      if (events[i].timestamp - events[i-1].timestamp > sessionGapMs) {
        sessions++;
      }
    }
    
    return sessions;
  }

  private calculateRecognitionScore(events: any[]): number {
    const successEvents = events.filter(e => e.type === 'success');
    const failureEvents = events.filter(e => e.type === 'failure');
    const totalOutcomeEvents = successEvents.length + failureEvents.length;
    
    if (totalOutcomeEvents === 0) return 70; // Default score
    
    return Math.round((successEvents.length / totalOutcomeEvents) * 100);
  }

  private calculateVisualRetention(events: any[]): number {
    // Look for visual-specific events or retention indicators
    const visualEvents = events.filter(e => 
      e.content?.metadata?.visualStudy ||
      e.content?.metadata?.moodboard ||
      e.context?.feature?.includes('moodboard')
    );
    
    if (visualEvents.length === 0) return 60; // Default retention
    
    // Calculate retention based on study frequency and success patterns
    const recentEvents = events.filter(e => 
      Date.now() - e.timestamp < (7 * 24 * 60 * 60 * 1000) // Last 7 days
    );
    
    let retention = 60;
    
    // Boost retention for recent activity
    if (recentEvents.length > 0) {
      retention += Math.min(20, recentEvents.length * 5);
    }
    
    // Boost retention for successful recognitions
    const recentSuccesses = recentEvents.filter(e => e.type === 'success');
    if (recentSuccesses.length > 0) {
      retention += Math.min(20, recentSuccesses.length * 10);
    }
    
    return Math.min(100, retention);
  }

  private calculateKanjiDifficulty(events: any[], kanji: string): number {
    let difficulty = 5; // Base difficulty
    
    // Check for explicit difficulty metadata
    const difficultyEvent = events.find(e => e.content?.metadata?.difficulty);
    if (difficultyEvent) {
      difficulty = difficultyEvent.content.metadata.difficulty;
    } else {
      // Estimate difficulty based on stroke count (rough approximation)
      // This is a simplified heuristic - ideally you'd have stroke data
      const strokeCount = this.estimateStrokeCount(kanji);
      if (strokeCount > 15) difficulty += 2;
      else if (strokeCount > 10) difficulty += 1;
      else if (strokeCount < 5) difficulty -= 1;
    }
    
    // Adjust based on success patterns
    const successRate = this.calculateRecognitionScore(events);
    if (successRate < 50) difficulty += 2;
    else if (successRate < 70) difficulty += 1;
    else if (successRate > 90) difficulty -= 1;
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private estimateStrokeCount(kanji: string): number {
    // This is a very rough approximation based on Unicode ranges
    // In a real implementation, you'd want to use actual stroke count data
    const codePoint = kanji.codePointAt(0) || 0;
    
    if (codePoint >= 0x4E00 && codePoint <= 0x4FFF) return 6;  // Basic CJK
    if (codePoint >= 0x5000 && codePoint <= 0x5FFF) return 8;  // More complex
    if (codePoint >= 0x6000 && codePoint <= 0x6FFF) return 10; // Complex
    if (codePoint >= 0x7000 && codePoint <= 0x7FFF) return 12; // Very complex
    if (codePoint >= 0x8000 && codePoint <= 0x8FFF) return 14; // Extremely complex
    if (codePoint >= 0x9000 && codePoint <= 0x9FFF) return 16; // Most complex
    
    return 8; // Default
  }

  private extractKanjiTags(event: any, kanji: string): string[] {
    const tags: string[] = ['kanji', 'moodboard'];
    
    const metadata = event.content?.metadata || {};
    
    if (metadata.jlptLevel) tags.push(metadata.jlptLevel);
    if (metadata.grade) tags.push(`grade-${metadata.grade}`);
    if (metadata.frequency) {
      if (metadata.frequency < 100) tags.push('common');
      else if (metadata.frequency < 500) tags.push('frequent');
      else tags.push('rare');
    }
    if (metadata.category) tags.push(metadata.category);
    if (metadata.radicals) tags.push('has-radicals');
    
    return tags;
  }

  private updateMoodboardKanjiNeedForReview(stats: MoodboardKanjiStats): void {
    const now = Date.now();
    const daysSinceLastStudy = (now - stats.lastStudied) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 2;
    
    let priority = 4;
    
    // Increase priority based on time since last study
    if (daysSinceLastStudy >= reviewIntervalDays) {
      priority += Math.min(3, Math.floor(daysSinceLastStudy / reviewIntervalDays));
      stats.needsReview = true;
    } else {
      stats.needsReview = false;
    }
    
    // High priority for poor recognition
    if (stats.recognitionScore < (this.config.settings.minRetentionScore || 65)) {
      priority += 3;
      stats.needsReview = true;
    }
    
    // Focus on visual recognition if configured
    if (this.config.settings.focusOnVisualRecognition && stats.visualRetention < 70) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Priority for difficult kanji
    if (stats.difficulty > 7) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Reduce priority for well-learned kanji
    if (stats.recognitionScore > 90 && stats.visualRetention > 85 && stats.studySessions > 3) {
      priority -= 2;
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
      const limit = Math.min(options?.limit || 18, this.config.maxItems || 18);
      
      // Filter kanji that need review
      const itemsNeedingReview = Array.from(this.moodboardStats.values())
        .filter(stats => stats.needsReview);
      
      // Sort by priority (descending) and last studied (ascending)
      itemsNeedingReview.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.lastStudied - b.lastStudied;
      });

      // Take the top items up to the limit
      const selectedItems = itemsNeedingReview.slice(0, limit);

      // Convert to ReviewItem format
      return selectedItems.map((stats): ReviewItem => ({
        id: `kanji_${stats.kanji}`,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: {
          primary: stats.kanji,
          secondary: stats.meaning,
          context: `Practice visual recognition and meaning`,
          formatted: {
            primary: stats.kanji,
            secondary: this.config.settings.includeReadings ? stats.reading : stats.meaning,
            context: `${stats.recognitionScore}% recognition • ${stats.visualRetention}% retention`
          }
        },
        dueDate: new Date(stats.lastStudied + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            kanji: stats.kanji,
            meaning: stats.meaning,
            reading: stats.reading,
            recognitionScore: stats.recognitionScore,
            visualRetention: stats.visualRetention,
            studySessions: stats.studySessions,
            moodboardId: stats.moodboardId
          }
        },
        createdAt: new Date(stats.firstStudied),
        updatedAt: new Date(stats.lastStudied)
      }));
    } catch (error) {
      console.error('Failed to get due moodboard items:', error);
      return [];
    }
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    try {
      const allStats = Array.from(this.moodboardStats.values());
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let totalItems = allStats.length;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalRecognition = 0;
      let totalRetention = 0;

      allStats.forEach(stats => {
        if (stats.studySessions === 1) {
          newItems++;
        }
        
        totalRecognition += stats.recognitionScore;
        totalRetention += stats.visualRetention;
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastStudied + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      });

      const averageRecognition = totalItems > 0 ? totalRecognition / totalItems : 0;
      const averageRetention = totalItems > 0 ? totalRetention / totalItems : 0;

      return {
        totalItems,
        dueToday,
        overdue,
        scheduled: totalItems - dueToday - overdue - newItems,
        newItems,
        itemsByType: {
          [ContentType.KANJI]: totalItems,
          [ContentType.VOCABULARY]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: this.calculatePriorityDistribution(allStats),
        averageMastery: (averageRecognition + averageRetention) / 2,
        retentionRate: averageRetention / 100,
        lastReviewSession: allStats.length > 0 ? 
          new Date(Math.max(...allStats.map(s => s.lastStudied))) : undefined,
        studyStreak: await this.calculateStudyStreak(),
        trends: {
          accuracy: 'stable', // TODO: Calculate based on recent recognition trends
          speed: 'stable',
          retention: averageRetention > 75 ? 'improving' : 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get moodboard stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(stats: MoodboardKanjiStats[]): Record<SourcePriority, number> {
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

  private async calculateStudyStreak(): Promise<number> {
    try {
      const events = await learningEventsService.getRecentEvents(365);
      const moodboardEvents = events.filter(event => 
        event.category === 'kanji' || 
        event.context?.feature?.includes('moodboard') ||
        event.context?.page?.includes('kanji')
      );
      
      if (moodboardEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      moodboardEvents.forEach(event => {
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
      for (const stats of this.moodboardStats.values()) {
        this.updateMoodboardKanjiNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      // Extract kanji from itemId (format: "kanji_漢")
      const kanji = itemId.replace('kanji_', '');
      const stats = this.moodboardStats.get(kanji);
      
      if (!stats) {
        console.warn(`No stats found for moodboard kanji: ${itemId}`);
        return;
      }

      // Update stats based on review result
      stats.studySessions++;
      stats.lastStudied = result.timestamp.getTime();
      
      // Update recognition score based on rating (1-4 scale, 3+ is success)
      const isSuccess = result.rating >= 3;
      stats.recognitionScore = (stats.recognitionScore * (stats.studySessions - 1) + (isSuccess ? 100 : 0)) / stats.studySessions;
      
      // Update visual retention (boost if it's a visual study mode)
      const isVisualStudy = result.studyMode === StudyMode.RECOGNITION || 
                           result.context?.visualStudy;
      if (isVisualStudy) {
        const retentionBoost = isSuccess ? 10 : -5;
        stats.visualRetention = Math.min(100, Math.max(0, stats.visualRetention + retentionBoost));
      }
      
      // Recalculate review needs
      this.updateMoodboardKanjiNeedForReview(stats);

      // Track the review event
      await learningEventsService.trackEvent({
        id: `moodboard_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: isSuccess ? 'success' : 'failure',
        category: 'kanji',
        content: {
          value: kanji,
          metadata: {
            kanji,
            meaning: stats.meaning,
            reading: stats.reading,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed,
            recognitionScore: stats.recognitionScore,
            visualRetention: stats.visualRetention,
            studySessions: stats.studySessions,
            moodboard: true,
            visualStudy: true
          }
        },
        sessionId: `moodboard_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'moodboard-review',
          device: 'web',
          platform: 'web',
          visualStudy: true
        },
        metrics: {
          duration: result.responseTime
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process moodboard review:', error);
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

      for (const stats of this.moodboardStats.values()) {
        // Search by kanji, meaning, reading, or tags
        if (stats.kanji.includes(query) || 
            stats.meaning.toLowerCase().includes(lowerQuery) ||
            stats.reading.toLowerCase().includes(lowerQuery) ||
            stats.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          
          results.push({
            id: `kanji_${stats.kanji}`,
            sourceId: this.id,
            contentType: ContentType.KANJI,
            content: {
              primary: stats.kanji,
              secondary: stats.meaning,
              context: `Moodboard visual study`,
              formatted: {
                primary: stats.kanji,
                secondary: stats.meaning
              }
            },
            dueDate: new Date(stats.lastStudied + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
            metadata: {
              source: this.id,
              tags: stats.tags,
              difficulty: stats.difficulty,
              properties: {
                recognitionScore: stats.recognitionScore,
                visualRetention: stats.visualRetention
              }
            },
            createdAt: new Date(stats.firstStudied),
            updatedAt: new Date(stats.lastStudied)
          });
          
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search moodboard items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const kanji = itemId.replace('kanji_', '');
      const stats = this.moodboardStats.get(kanji);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: {
          primary: stats.kanji,
          secondary: stats.meaning,
          context: `Moodboard visual study`,
          formatted: {
            primary: stats.kanji,
            secondary: stats.meaning
          }
        },
        dueDate: new Date(stats.lastStudied + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            recognitionScore: stats.recognitionScore,
            visualRetention: stats.visualRetention
          }
        },
        createdAt: new Date(stats.firstStudied),
        updatedAt: new Date(stats.lastStudied)
      };
    } catch (error) {
      console.error('Failed to get moodboard item:', error);
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
    this.moodboardStats.clear();
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
        [ContentType.VOCABULARY]: 0,
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
 * Factory function to create a moodboard source
 */
export async function createMoodboardSource(userId: string | null): Promise<MoodboardSource> {
  const source = new MoodboardSource(userId);
  return source;
}