/**
 * Articles Review Source Implementation
 * 
 * This source tracks article reading history and suggests articles for review
 * based on reading patterns, comprehension needs, and spaced repetition.
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
import { ArticleIndexedDB } from '@/lib/cache/articleIndexedDB';
import { learningEventsService } from '@/services/analytics/LearningEventsService';

interface ArticleReadingStats {
  id: string;
  title: string;
  slug: string;
  readCount: number;
  lastRead: number;
  firstRead: number;
  averageReadTime: number;
  completionRate: number;
  needsReview: boolean;
  priority: number;
  difficulty: number;
  tags: string[];
}

export class ArticlesSource implements ReviewSource {
  readonly id = 'articles';
  readonly name = 'Articles Review';
  readonly type = ReviewSourceType.READING_COMPREHENSION;
  readonly icon = '📰';
  readonly description = 'Review and practice reading comprehension with previously read articles';
  readonly supportedContentTypes = [ContentType.SENTENCE, ContentType.VOCABULARY];
  readonly paths = {
    main: '/news',
    settings: '/settings#reading'
  };

  private initialized = false;
  private articleStats: Map<string, ArticleReadingStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.READING_COMPREHENSION]?.defaultConfig || {
      enabled: true,
      maxItems: 15,
      priorityMultiplier: 1.0,
      settings: {
        reviewIntervalDays: 3,
        focusOnDifficult: true,
        includePartiallyRead: true,
        minReadTime: 30 // seconds
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await ArticleIndexedDB.initialize();
      await this.loadArticleStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize articles source: ${error}`);
    }
  }

  private async loadArticleStats(): Promise<void> {
    try {
      // Load cached articles from IndexedDB
      const cachedArticles = await ArticleIndexedDB.getAllArticles();
      
      // Get article reading events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const articleEvents = events.filter(event => 
        event.category === 'article' || event.context?.feature?.includes('article')
      );

      // Initialize stats for cached articles
      cachedArticles.forEach(article => {
        if (article.lastAccessed && article.cachedAt) {
          this.articleStats.set(article.id, {
            id: article.id,
            title: article.title,
            slug: article.slug,
            readCount: 1,
            lastRead: article.lastAccessed,
            firstRead: article.cachedAt,
            averageReadTime: article.readingTime || 0,
            completionRate: 100, // Assume cached articles were fully read
            needsReview: false,
            priority: 3,
            difficulty: 5,
            tags: article.tags || []
          });
        }
      });

      // Process article events to update/enhance stats
      const articleEventsByContent = new Map<string, typeof events>();
      articleEvents.forEach(event => {
        const contentId = event.content?.value || event.content?.id;
        if (contentId) {
          if (!articleEventsByContent.has(contentId)) {
            articleEventsByContent.set(contentId, []);
          }
          articleEventsByContent.get(contentId)!.push(event);
        }
      });

      // Update stats based on events
      articleEventsByContent.forEach((events, contentId) => {
        const existingStats = this.articleStats.get(contentId);
        const readEvents = events.filter(e => e.type === 'view' || e.type === 'complete');
        
        if (readEvents.length > 0) {
          const stats: ArticleReadingStats = existingStats || {
            id: contentId,
            title: events[0]?.content?.metadata?.title || `Article ${contentId}`,
            slug: contentId,
            readCount: 0,
            lastRead: 0,
            firstRead: Date.now(),
            averageReadTime: 0,
            completionRate: 0,
            needsReview: false,
            priority: 3,
            difficulty: 5,
            tags: []
          };

          // Update read statistics
          stats.readCount = readEvents.length;
          stats.lastRead = Math.max(...readEvents.map(e => e.timestamp));
          stats.firstRead = Math.min(stats.firstRead, ...readEvents.map(e => e.timestamp));
          
          // Calculate completion rate
          const completeEvents = events.filter(e => e.type === 'complete');
          stats.completionRate = completeEvents.length > 0 ? 
            (completeEvents.length / readEvents.length) * 100 : 50;

          // Calculate average read time
          const eventsWithDuration = events.filter(e => e.metrics?.duration);
          if (eventsWithDuration.length > 0) {
            stats.averageReadTime = eventsWithDuration.reduce((sum, e) => 
              sum + (e.metrics?.duration || 0), 0) / eventsWithDuration.length;
          }

          // Determine difficulty from reading patterns
          stats.difficulty = this.calculateArticleDifficulty(stats, events);
          
          // Update review necessity
          this.updateArticleNeedForReview(stats);
          
          this.articleStats.set(contentId, stats);
        }
      });

    } catch (error) {
      console.error('Failed to load article stats:', error);
      // Continue with empty stats
    }
  }

  private calculateArticleDifficulty(stats: ArticleReadingStats, events: any[]): number {
    let difficulty = 5;
    
    // Difficulty based on read time vs expected time
    const expectedReadTime = 180; // 3 minutes average
    if (stats.averageReadTime > expectedReadTime * 1.5) {
      difficulty += 2; // Took longer than expected
    } else if (stats.averageReadTime < expectedReadTime * 0.5) {
      difficulty -= 1; // Quick read (might be too easy or skipped)
    }
    
    // Difficulty based on completion rate
    if (stats.completionRate < 50) {
      difficulty += 3; // Often abandoned
    } else if (stats.completionRate < 80) {
      difficulty += 1;
    }
    
    // Difficulty based on re-reading frequency
    if (stats.readCount > 3) {
      difficulty += 1; // Required multiple readings
    }
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private updateArticleNeedForReview(stats: ArticleReadingStats): void {
    const now = Date.now();
    const daysSinceLastRead = (now - stats.lastRead) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 3;
    
    let priority = 3;
    
    // Increase priority based on time since last read
    if (daysSinceLastRead >= reviewIntervalDays) {
      priority += Math.min(3, Math.floor(daysSinceLastRead / reviewIntervalDays));
      stats.needsReview = true;
    } else {
      stats.needsReview = false;
    }
    
    // Increase priority for difficult articles
    if (this.config.settings.focusOnDifficult && stats.difficulty > 7) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Increase priority for partially read articles
    if (this.config.settings.includePartiallyRead && stats.completionRate < 80) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Decrease priority for well-read articles
    if (stats.completionRate > 90 && stats.readCount > 1) {
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
      const limit = Math.min(options?.limit || 15, this.config.maxItems || 15);
      
      // Filter articles that need review
      const itemsNeedingReview = Array.from(this.articleStats.values())
        .filter(stats => stats.needsReview);
      
      // Sort by priority (descending) and last read (ascending for older articles)
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
          secondary: `Reading comprehension review`,
          context: `Re-read this article to improve comprehension and vocabulary retention`,
          formatted: {
            primary: stats.title,
            secondary: `Last read ${this.formatRelativeTime(stats.lastRead)}`,
            context: `${stats.readCount} read${stats.readCount !== 1 ? 's' : ''} • ${Math.round(stats.completionRate)}% completion`
          }
        },
        dueDate: new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: ['article', 'reading', ...stats.tags],
          difficulty: stats.difficulty,
          properties: {
            slug: stats.slug,
            readCount: stats.readCount,
            completionRate: stats.completionRate,
            averageReadTime: stats.averageReadTime,
            lastRead: stats.lastRead,
            articleTags: stats.tags
          }
        },
        createdAt: new Date(stats.firstRead),
        updatedAt: new Date(stats.lastRead)
      }));
    } catch (error) {
      console.error('Failed to get due article items:', error);
      return [];
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
      const allStats = Array.from(this.articleStats.values());
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let totalItems = allStats.length;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalCompletionRate = 0;

      allStats.forEach(stats => {
        if (stats.readCount === 1 && stats.completionRate < 100) {
          newItems++;
        }
        
        totalCompletionRate += stats.completionRate;
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      });

      const averageCompletion = totalItems > 0 ? totalCompletionRate / totalItems : 0;

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
        averageMastery: averageCompletion,
        retentionRate: averageCompletion / 100,
        lastReviewSession: allStats.length > 0 ? 
          new Date(Math.max(...allStats.map(s => s.lastRead))) : undefined,
        studyStreak: await this.calculateReadingStreak(),
        trends: {
          accuracy: 'stable', // TODO: Calculate based on recent completion rates
          speed: 'stable',
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get article stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(stats: ArticleReadingStats[]): Record<SourcePriority, number> {
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
      const articleEvents = events.filter(event => 
        event.category === 'article' || event.context?.feature?.includes('article')
      );
      
      if (articleEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      articleEvents.forEach(event => {
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
      for (const stats of this.articleStats.values()) {
        this.updateArticleNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      const stats = this.articleStats.get(itemId);
      if (!stats) {
        console.warn(`No stats found for article: ${itemId}`);
        return;
      }

      // Update stats based on review result
      stats.readCount++;
      stats.lastRead = result.timestamp.getTime();
      
      // Calculate completion based on rating (1-4 scale, 3+ is good completion)
      const completionScore = result.rating >= 3 ? 100 : 50;
      stats.completionRate = (stats.completionRate * (stats.readCount - 1) + completionScore) / stats.readCount;
      
      // Update read time if available
      if (result.responseTime > 0) {
        stats.averageReadTime = (stats.averageReadTime * (stats.readCount - 1) + result.responseTime) / stats.readCount;
      }
      
      // Recalculate review needs
      this.updateArticleNeedForReview(stats);

      // Track the review event
      await learningEventsService.trackEvent({
        id: `article_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: result.rating >= 3 ? 'success' : 'failure',
        category: 'article',
        content: {
          value: itemId,
          metadata: {
            title: stats.title,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed,
            completionRate: stats.completionRate,
            readCount: stats.readCount
          }
        },
        sessionId: `article_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'articles-review',
          device: 'web',
          platform: 'web'
        },
        metrics: {
          duration: result.responseTime
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process article review:', error);
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

      for (const stats of this.articleStats.values()) {
        // Search by title, slug, or tags
        if (stats.title.toLowerCase().includes(lowerQuery) || 
            stats.slug.toLowerCase().includes(lowerQuery) ||
            stats.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          
          results.push({
            id: stats.id,
            sourceId: this.id,
            contentType: ContentType.SENTENCE,
            content: {
              primary: stats.title,
              secondary: 'Reading comprehension review',
              context: `Re-read this article to improve comprehension`,
              formatted: {
                primary: stats.title,
                secondary: `Last read ${this.formatRelativeTime(stats.lastRead)}`
              }
            },
            dueDate: new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
            metadata: {
              source: this.id,
              tags: ['article', 'reading', ...stats.tags],
              difficulty: stats.difficulty,
              properties: {
                slug: stats.slug,
                readCount: stats.readCount,
                completionRate: stats.completionRate
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
      console.error('Failed to search article items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const stats = this.articleStats.get(itemId);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.SENTENCE,
        content: {
          primary: stats.title,
          secondary: 'Reading comprehension review',
          context: `Re-read this article to improve comprehension`,
          formatted: {
            primary: stats.title,
            secondary: `Last read ${this.formatRelativeTime(stats.lastRead)}`
          }
        },
        dueDate: new Date(stats.lastRead + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.READING, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: ['article', 'reading', ...stats.tags],
          difficulty: stats.difficulty,
          properties: {
            slug: stats.slug,
            readCount: stats.readCount,
            completionRate: stats.completionRate
          }
        },
        createdAt: new Date(stats.firstRead),
        updatedAt: new Date(stats.lastRead)
      };
    } catch (error) {
      console.error('Failed to get article item:', error);
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
    this.articleStats.clear();
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
 * Factory function to create an articles source
 */
export async function createArticlesSource(userId: string | null): Promise<ArticlesSource> {
  const source = new ArticlesSource(userId);
  return source;
}