/**
 * Stories Review Source Implementation
 * 
 * This source tracks story reading progress and suggests stories for review
 * based on reading completion, comprehension, and vocabulary retention needs.
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

interface StoryReadingStats {
  id: string;
  title: string;
  slug: string;
  readingSessions: number;
  lastRead: number;
  firstRead: number;
  completionRate: number;
  comprehensionScore: number;
  averageReadTime: number;
  needsReview: boolean;
  priority: number;
  difficulty: number;
  chapter?: string;
  series?: string;
  tags: string[];
}

export class StoriesSource implements ReviewSource {
  readonly id = 'stories';
  readonly name = 'Stories Review';
  readonly type = ReviewSourceType.READING_COMPREHENSION;
  readonly icon = '📖';
  readonly description = 'Review Japanese stories to improve reading comprehension and vocabulary retention';
  readonly supportedContentTypes = [ContentType.SENTENCE, ContentType.VOCABULARY];
  readonly paths = {
    main: '/stories',
    settings: '/settings#stories'
  };

  private initialized = false;
  private storyStats: Map<string, StoryReadingStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.READING_COMPREHENSION]?.defaultConfig || {
      enabled: true,
      maxItems: 12,
      priorityMultiplier: 1.2,
      settings: {
        reviewIntervalDays: 5,
        focusOnIncomplete: true,
        includePartialReads: true,
        minComprehensionScore: 60
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.loadStoryStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize stories source: ${error}`);
    }
  }

  private async loadStoryStats(): Promise<void> {
    try {
      // Get story-related events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const storyEvents = events.filter(event => 
        event.category === 'story' || 
        event.context?.feature?.includes('story') ||
        event.context?.page?.includes('stories')
      );

      // Group events by story content
      const storyEventsByContent = new Map<string, typeof events>();
      storyEvents.forEach(event => {
        const contentId = event.content?.value || 
                         event.content?.id || 
                         event.content?.metadata?.slug ||
                         event.content?.metadata?.storyId;
        
        if (contentId) {
          if (!storyEventsByContent.has(contentId)) {
            storyEventsByContent.set(contentId, []);
          }
          storyEventsByContent.get(contentId)!.push(event);
        }
      });

      // Process story events to build stats
      storyEventsByContent.forEach((events, storyId) => {
        const readingEvents = events.filter(e => 
          e.type === 'view' || e.type === 'complete' || e.type === 'progress'
        );
        
        if (readingEvents.length > 0) {
          const firstEvent = events[events.length - 1]; // Oldest event
          const lastEvent = events[0]; // Most recent event
          
          const stats: StoryReadingStats = {
            id: storyId,
            title: firstEvent.content?.metadata?.title || 
                   firstEvent.content?.metadata?.storyTitle ||
                   `Story ${storyId}`,
            slug: firstEvent.content?.metadata?.slug || storyId,
            readingSessions: this.countReadingSessions(events),
            lastRead: lastEvent.timestamp,
            firstRead: firstEvent.timestamp,
            completionRate: this.calculateCompletionRate(events),
            comprehensionScore: this.calculateComprehensionScore(events),
            averageReadTime: this.calculateAverageReadTime(events),
            needsReview: false,
            priority: 5,
            difficulty: this.calculateStoryDifficulty(events),
            chapter: firstEvent.content?.metadata?.chapter,
            series: firstEvent.content?.metadata?.series,
            tags: this.extractStoryTags(firstEvent)
          };

          // Update review necessity and priority
          this.updateStoryNeedForReview(stats);
          
          this.storyStats.set(storyId, stats);
        }
      });

    } catch (error) {
      console.error('Failed to load story stats:', error);
      // Continue with empty stats
    }
  }

  private countReadingSessions(events: any[]): number {
    // Count unique sessions based on significant time gaps
    if (events.length === 0) return 0;
    
    events.sort((a, b) => a.timestamp - b.timestamp);
    let sessions = 1;
    const sessionGapMs = 30 * 60 * 1000; // 30 minutes
    
    for (let i = 1; i < events.length; i++) {
      if (events[i].timestamp - events[i-1].timestamp > sessionGapMs) {
        sessions++;
      }
    }
    
    return sessions;
  }

  private calculateCompletionRate(events: any[]): number {
    const completeEvents = events.filter(e => e.type === 'complete');
    const viewEvents = events.filter(e => e.type === 'view' || e.type === 'progress');
    
    if (viewEvents.length === 0) return 0;
    
    // If there are completion events, consider completion rate
    if (completeEvents.length > 0) {
      return Math.min(100, (completeEvents.length / viewEvents.length) * 100);
    }
    
    // Check for progress indicators
    const progressEvents = events.filter(e => 
      e.content?.metadata?.progress || 
      e.content?.metadata?.percentComplete
    );
    
    if (progressEvents.length > 0) {
      const latestProgress = progressEvents[0]; // Most recent
      return latestProgress.content?.metadata?.percentComplete || 
             latestProgress.content?.metadata?.progress || 50;
    }
    
    return 50; // Default for partial reads
  }

  private calculateComprehensionScore(events: any[]): number {
    // Look for comprehension-related events or user ratings
    const scoreEvents = events.filter(e => 
      e.content?.metadata?.comprehensionScore ||
      e.content?.metadata?.rating ||
      e.type === 'success' || e.type === 'failure'
    );
    
    if (scoreEvents.length === 0) return 70; // Default score
    
    let totalScore = 0;
    let scoredEvents = 0;
    
    scoreEvents.forEach(event => {
      if (event.content?.metadata?.comprehensionScore) {
        totalScore += event.content.metadata.comprehensionScore;
        scoredEvents++;
      } else if (event.content?.metadata?.rating) {
        totalScore += (event.content.metadata.rating / 4) * 100; // Convert 1-4 to percentage
        scoredEvents++;
      } else if (event.type === 'success') {
        totalScore += 80;
        scoredEvents++;
      } else if (event.type === 'failure') {
        totalScore += 40;
        scoredEvents++;
      }
    });
    
    return scoredEvents > 0 ? totalScore / scoredEvents : 70;
  }

  private calculateAverageReadTime(events: any[]): number {
    const eventsWithDuration = events.filter(e => e.metrics?.duration);
    
    if (eventsWithDuration.length === 0) return 0;
    
    const totalDuration = eventsWithDuration.reduce((sum, e) => 
      sum + (e.metrics?.duration || 0), 0
    );
    
    return totalDuration / eventsWithDuration.length;
  }

  private calculateStoryDifficulty(events: any[]): number {
    let difficulty = 5; // Base difficulty
    
    // Check for explicit difficulty metadata
    const difficultyEvent = events.find(e => e.content?.metadata?.difficulty);
    if (difficultyEvent) {
      difficulty = difficultyEvent.content.metadata.difficulty;
    }
    
    // Adjust based on reading patterns
    const avgReadTime = this.calculateAverageReadTime(events);
    if (avgReadTime > 600) { // More than 10 minutes
      difficulty += 2;
    } else if (avgReadTime < 120) { // Less than 2 minutes
      difficulty -= 1;
    }
    
    // Adjust based on completion patterns
    const completionRate = this.calculateCompletionRate(events);
    if (completionRate < 30) {
      difficulty += 2; // Likely abandoned due to difficulty
    }
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private extractStoryTags(event: any): string[] {
    const tags: string[] = ['story'];
    
    const metadata = event.content?.metadata || {};
    
    if (metadata.genre) tags.push(metadata.genre);
    if (metadata.level) tags.push(`level-${metadata.level}`);
    if (metadata.series) tags.push(metadata.series);
    if (metadata.author) tags.push(`author-${metadata.author}`);
    if (metadata.jlptLevel) tags.push(metadata.jlptLevel);
    
    return tags;
  }

  private updateStoryNeedForReview(stats: StoryReadingStats): void {
    const now = Date.now();
    const daysSinceLastRead = (now - stats.lastRead) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 5;
    
    let priority = 3;
    
    // Increase priority based on time since last read
    if (daysSinceLastRead >= reviewIntervalDays) {
      priority += Math.min(4, Math.floor(daysSinceLastRead / reviewIntervalDays));
      stats.needsReview = true;
    } else {
      stats.needsReview = false;
    }
    
    // High priority for incomplete stories
    if (this.config.settings.focusOnIncomplete && stats.completionRate < 100) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Priority for low comprehension scores
    const minScore = this.config.settings.minComprehensionScore || 60;
    if (stats.comprehensionScore < minScore) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Include partial reads if configured
    if (this.config.settings.includePartialReads && 
        stats.completionRate < 80 && stats.completionRate > 20) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Decrease priority for well-read stories
    if (stats.completionRate > 90 && stats.comprehensionScore > 80 && stats.readingSessions > 1) {
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
      const limit = Math.min(options?.limit || 12, this.config.maxItems || 12);
      
      // Filter stories that need review
      const itemsNeedingReview = Array.from(this.storyStats.values())
        .filter(stats => stats.needsReview);
      
      // Sort by priority (descending) and last read (ascending)
      itemsNeedingReview.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.lastRead - b.lastRead;
      });

      // Take the top items up to the limit
      const selectedItems = itemsNeedingReview.slice(0, limit);

      // Convert to ReviewItem format
      return selectedItems.map((stats): ReviewItem => ({
        id: stats.id,
        sourceId: this.id,
        contentType: ContentType.SENTENCE,
        content: {
          primary: stats.title,
          secondary: this.getStoryDescription(stats),
          context: `Re-read this story to improve comprehension and vocabulary`,
          formatted: {
            primary: stats.title,
            secondary: `${Math.round(stats.completionRate)}% complete • ${this.formatRelativeTime(stats.lastRead)}`,
            context: `${stats.readingSessions} session${stats.readingSessions !== 1 ? 's' : ''} • ${Math.round(stats.comprehensionScore)}% comprehension`
          }
        },
        dueDate: new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 5) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            slug: stats.slug,
            completionRate: stats.completionRate,
            comprehensionScore: stats.comprehensionScore,
            readingSessions: stats.readingSessions,
            averageReadTime: stats.averageReadTime,
            chapter: stats.chapter,
            series: stats.series
          }
        },
        createdAt: new Date(stats.firstRead),
        updatedAt: new Date(stats.lastRead)
      }));
    } catch (error) {
      console.error('Failed to get due story items:', error);
      return [];
    }
  }

  private getStoryDescription(stats: StoryReadingStats): string {
    if (stats.completionRate < 50) {
      return 'Continue reading this story';
    } else if (stats.completionRate < 100) {
      return 'Finish reading this story';
    } else if (stats.comprehensionScore < 70) {
      return 'Review for better comprehension';
    } else {
      return 'Review vocabulary and comprehension';
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
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
      const allStats = Array.from(this.storyStats.values());
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let totalItems = allStats.length;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalComprehension = 0;

      allStats.forEach(stats => {
        if (stats.readingSessions === 1 && stats.completionRate < 50) {
          newItems++;
        }
        
        totalComprehension += stats.comprehensionScore;
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 5) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      });

      const averageComprehension = totalItems > 0 ? totalComprehension / totalItems : 0;

      return {
        totalItems,
        dueToday,
        overdue,
        scheduled: totalItems - dueToday - overdue - newItems,
        newItems,
        itemsByType: {
          [ContentType.SENTENCE]: totalItems,
          [ContentType.VOCABULARY]: 0,
          [ContentType.KANJI]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.RADICAL]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: this.calculatePriorityDistribution(allStats),
        averageMastery: averageComprehension,
        retentionRate: averageComprehension / 100,
        lastReviewSession: allStats.length > 0 ? 
          new Date(Math.max(...allStats.map(s => s.lastRead))) : undefined,
        studyStreak: await this.calculateReadingStreak(),
        trends: {
          accuracy: 'stable', // TODO: Calculate based on recent comprehension trends
          speed: 'stable',
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get story stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(stats: StoryReadingStats[]): Record<SourcePriority, number> {
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

  private async calculateReadingStreak(): Promise<number> {
    try {
      const events = await learningEventsService.getRecentEvents(365);
      const storyEvents = events.filter(event => 
        event.category === 'story' || 
        event.context?.feature?.includes('story') ||
        event.context?.page?.includes('stories')
      );
      
      if (storyEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      storyEvents.forEach(event => {
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
      console.error('Failed to calculate reading streak:', error);
      return 0;
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Recalculate review needs if settings changed
    if (config.settings) {
      for (const stats of this.storyStats.values()) {
        this.updateStoryNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      const stats = this.storyStats.get(itemId);
      if (!stats) {
        console.warn(`No stats found for story: ${itemId}`);
        return;
      }

      // Update stats based on review result
      stats.readingSessions++;
      stats.lastRead = result.timestamp.getTime();
      
      // Update comprehension score based on rating (1-4 scale)
      const comprehensionScore = (result.rating / 4) * 100;
      stats.comprehensionScore = (stats.comprehensionScore * (stats.readingSessions - 1) + comprehensionScore) / stats.readingSessions;
      
      // Update completion rate based on rating (4 = completed, 3+ = mostly complete)
      if (result.rating >= 4) {
        stats.completionRate = 100;
      } else if (result.rating >= 3) {
        stats.completionRate = Math.max(stats.completionRate, 80);
      }
      
      // Update read time if available
      if (result.responseTime > 0) {
        stats.averageReadTime = (stats.averageReadTime * (stats.readingSessions - 1) + result.responseTime) / stats.readingSessions;
      }
      
      // Recalculate review needs
      this.updateStoryNeedForReview(stats);

      // Track the review event
      await learningEventsService.trackEvent({
        id: `story_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: result.rating >= 3 ? 'success' : 'failure',
        category: 'story',
        content: {
          value: itemId,
          metadata: {
            title: stats.title,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed,
            completionRate: stats.completionRate,
            comprehensionScore: stats.comprehensionScore,
            readingSessions: stats.readingSessions
          }
        },
        sessionId: `story_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'stories-review',
          device: 'web',
          platform: 'web'
        },
        metrics: {
          duration: result.responseTime
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process story review:', error);
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

      for (const stats of this.storyStats.values()) {
        // Search by title, series, chapter, or tags
        if (stats.title.toLowerCase().includes(lowerQuery) || 
            stats.series?.toLowerCase().includes(lowerQuery) ||
            stats.chapter?.toLowerCase().includes(lowerQuery) ||
            stats.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          
          results.push({
            id: stats.id,
            sourceId: this.id,
            contentType: ContentType.SENTENCE,
            content: {
              primary: stats.title,
              secondary: this.getStoryDescription(stats),
              context: `Re-read this story to improve comprehension`,
              formatted: {
                primary: stats.title,
                secondary: `${Math.round(stats.completionRate)}% complete`
              }
            },
            dueDate: new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 5) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
            metadata: {
              source: this.id,
              tags: stats.tags,
              difficulty: stats.difficulty,
              properties: {
                completionRate: stats.completionRate,
                comprehensionScore: stats.comprehensionScore
              }
            },
            createdAt: new Date(stats.firstRead),
            updatedAt: new Date(stats.lastRead)
          });
          
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search story items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const stats = this.storyStats.get(itemId);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.SENTENCE,
        content: {
          primary: stats.title,
          secondary: this.getStoryDescription(stats),
          context: `Re-read this story to improve comprehension`,
          formatted: {
            primary: stats.title,
            secondary: `${Math.round(stats.completionRate)}% complete`
          }
        },
        dueDate: new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 5) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            completionRate: stats.completionRate,
            comprehensionScore: stats.comprehensionScore
          }
        },
        createdAt: new Date(stats.firstRead),
        updatedAt: new Date(stats.lastRead)
      };
    } catch (error) {
      console.error('Failed to get story item:', error);
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
    this.storyStats.clear();
  }

  private getEmptyStats(): SourceStats {
    return {
      totalItems: 0,
      dueToday: 0,
      overdue: 0,
      scheduled: 0,
      newItems: 0,
      itemsByType: {
        [ContentType.SENTENCE]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.FLASHCARD]: 0,
        [ContentType.GRAMMAR]: 0,
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
 * Factory function to create a stories source
 */
export async function createStoriesSource(userId: string | null): Promise<StoriesSource> {
  const source = new StoriesSource(userId);
  return source;
}