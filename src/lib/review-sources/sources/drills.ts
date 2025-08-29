/**
 * Drills Review Source Implementation
 * 
 * This source tracks drill completions and provides items for review
 * based on performance patterns, mastery levels, and practice needs.
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

interface DrillStats {
  drillId: string;
  drillName: string;
  drillType: string;
  category: string; // kanji, vocabulary, grammar, etc.
  completions: number;
  lastCompleted: number;
  firstCompleted: number;
  averageScore: number;
  bestScore: number;
  averageTime: number;
  needsReview: boolean;
  priority: number;
  difficulty: number;
  tags: string[];
}

export class DrillsSource implements ReviewSource {
  readonly id = 'drills';
  readonly name = 'Practice Drills';
  readonly type = ReviewSourceType.CUSTOM_LISTS;
  readonly icon = '🎯';
  readonly description = 'Review completed drills to reinforce learning and improve performance';
  readonly supportedContentTypes = [ContentType.CUSTOM, ContentType.FLASHCARD, ContentType.GRAMMAR];
  readonly paths = {
    main: '/drills',
    settings: '/settings#drills'
  };

  private initialized = false;
  private drillStats: Map<string, DrillStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.CUSTOM_LISTS]?.defaultConfig || {
      enabled: true,
      maxItems: 15,
      priorityMultiplier: 1.1,
      settings: {
        reviewIntervalDays: 3,
        focusOnWeakAreas: true,
        minScoreThreshold: 70,
        includeRecentDrills: true
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.loadDrillStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize drills source: ${error}`);
    }
  }

  private async loadDrillStats(): Promise<void> {
    try {
      // Get drill-related events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const drillEvents = events.filter(event => 
        event.category === 'drill' || 
        event.context?.feature?.includes('drill') ||
        event.context?.page?.includes('drill') ||
        event.content?.metadata?.drill ||
        event.type === 'drill' ||
        event.content?.metadata?.practice === 'drill'
      );

      // Group events by drill identifier
      const drillEventsByDrill = new Map<string, typeof events>();
      drillEvents.forEach(event => {
        const drillId = event.content?.value || 
                       event.content?.metadata?.drillId ||
                       event.content?.metadata?.drillName ||
                       event.content?.id;
        
        if (drillId) {
          if (!drillEventsByDrill.has(drillId)) {
            drillEventsByDrill.set(drillId, []);
          }
          drillEventsByDrill.get(drillId)!.push(event);
        }
      });

      // Process drill events to build stats
      drillEventsByDrill.forEach((events, drillId) => {
        const completionEvents = events.filter(e => 
          e.type === 'complete' || e.type === 'finish' || e.content?.metadata?.completed
        );
        
        if (completionEvents.length > 0 || events.length >= 3) { // Include if completed or has significant activity
          const firstEvent = events[events.length - 1]; // Oldest event
          const lastEvent = events[0]; // Most recent event
          
          const stats: DrillStats = {
            drillId,
            drillName: firstEvent.content?.metadata?.drillName || 
                     firstEvent.content?.metadata?.name ||
                     firstEvent.content?.metadata?.title ||
                     `Drill ${drillId}`,
            drillType: firstEvent.content?.metadata?.drillType || 
                      firstEvent.content?.metadata?.type || 
                      'unknown',
            category: this.determineDrillCategory(events),
            completions: completionEvents.length,
            lastCompleted: lastEvent.timestamp,
            firstCompleted: firstEvent.timestamp,
            averageScore: this.calculateAverageScore(events),
            bestScore: this.calculateBestScore(events),
            averageTime: this.calculateAverageTime(events),
            needsReview: false,
            priority: 5,
            difficulty: this.calculateDrillDifficulty(events),
            tags: this.extractDrillTags(firstEvent)
          };

          // Update review necessity and priority
          this.updateDrillNeedForReview(stats);
          
          this.drillStats.set(drillId, stats);
        }
      });

    } catch (error) {
      console.error('Failed to load drill stats:', error);
      // Continue with empty stats
    }
  }

  private determineDrillCategory(events: any[]): string {
    // Analyze events to determine drill category
    const categoryHints = events.map(e => e.category).filter(Boolean);
    const featureHints = events.map(e => e.context?.feature).filter(Boolean);
    const metadataHints = events.map(e => e.content?.metadata?.category).filter(Boolean);
    
    const allHints = [...categoryHints, ...featureHints, ...metadataHints];
    
    // Count occurrences and return most common
    const counts: Record<string, number> = {};
    allHints.forEach(hint => {
      if (typeof hint === 'string') {
        const category = hint.toLowerCase();
        counts[category] = (counts[category] || 0) + 1;
      }
    });
    
    const sortedCategories = Object.entries(counts).sort(([,a], [,b]) => b - a);
    return sortedCategories[0]?.[0] || 'general';
  }

  private calculateAverageScore(events: any[]): number {
    const scoredEvents = events.filter(e => 
      e.content?.metadata?.score !== undefined || 
      e.content?.metadata?.rating !== undefined ||
      e.metrics?.score !== undefined
    );
    
    if (scoredEvents.length === 0) {
      // Try to calculate from success/failure events
      const successEvents = events.filter(e => e.type === 'success');
      const failureEvents = events.filter(e => e.type === 'failure');
      const totalOutcomeEvents = successEvents.length + failureEvents.length;
      
      if (totalOutcomeEvents > 0) {
        return Math.round((successEvents.length / totalOutcomeEvents) * 100);
      }
      
      return 0;
    }
    
    const totalScore = scoredEvents.reduce((sum, event) => {
      const score = event.content?.metadata?.score || 
                   event.metrics?.score || 
                   (event.content?.metadata?.rating ? event.content.metadata.rating * 25 : 0); // Convert 1-4 to 0-100
      return sum + score;
    }, 0);
    
    return Math.round(totalScore / scoredEvents.length);
  }

  private calculateBestScore(events: any[]): number {
    const scoredEvents = events.filter(e => 
      e.content?.metadata?.score !== undefined || 
      e.content?.metadata?.rating !== undefined ||
      e.metrics?.score !== undefined
    );
    
    if (scoredEvents.length === 0) return this.calculateAverageScore(events);
    
    const scores = scoredEvents.map(event => {
      return event.content?.metadata?.score || 
             event.metrics?.score || 
             (event.content?.metadata?.rating ? event.content.metadata.rating * 25 : 0);
    });
    
    return Math.max(...scores);
  }

  private calculateAverageTime(events: any[]): number {
    const timedEvents = events.filter(e => 
      e.metrics?.duration || e.content?.metadata?.duration || e.content?.metadata?.time
    );
    
    if (timedEvents.length === 0) return 0;
    
    const totalTime = timedEvents.reduce((sum, event) => {
      return sum + (event.metrics?.duration || event.content?.metadata?.duration || event.content?.metadata?.time || 0);
    }, 0);
    
    return totalTime / timedEvents.length;
  }

  private calculateDrillDifficulty(events: any[]): number {
    let difficulty = 5; // Base difficulty
    
    // Check for explicit difficulty metadata
    const difficultyEvent = events.find(e => e.content?.metadata?.difficulty);
    if (difficultyEvent) {
      difficulty = difficultyEvent.content.metadata.difficulty;
    } else {
      // Calculate difficulty based on performance patterns
      const avgScore = this.calculateAverageScore(events);
      
      if (avgScore < 40) difficulty += 3;
      else if (avgScore < 60) difficulty += 2;
      else if (avgScore < 80) difficulty += 1;
      else if (avgScore > 90) difficulty -= 1;
      
      // Adjust based on completion rate
      const completionEvents = events.filter(e => e.type === 'complete');
      const startEvents = events.filter(e => e.type === 'start' || e.type === 'begin');
      
      if (startEvents.length > 0) {
        const completionRate = completionEvents.length / startEvents.length;
        if (completionRate < 0.5) difficulty += 2;
        else if (completionRate < 0.8) difficulty += 1;
      }
    }
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private extractDrillTags(event: any): string[] {
    const tags: string[] = ['drill', 'practice'];
    
    const metadata = event.content?.metadata || {};
    
    if (metadata.drillType) tags.push(metadata.drillType);
    if (metadata.category) tags.push(metadata.category);
    if (metadata.jlptLevel) tags.push(metadata.jlptLevel);
    if (metadata.difficulty) {
      if (metadata.difficulty <= 3) tags.push('easy');
      else if (metadata.difficulty <= 6) tags.push('medium');
      else tags.push('hard');
    }
    if (event.category) tags.push(event.category);
    
    // Add feature-based tags
    const feature = event.context?.feature;
    if (feature) {
      if (feature.includes('kanji')) tags.push('kanji');
      if (feature.includes('vocab')) tags.push('vocabulary');
      if (feature.includes('grammar')) tags.push('grammar');
      if (feature.includes('reading')) tags.push('reading');
    }
    
    return tags;
  }

  private updateDrillNeedForReview(stats: DrillStats): void {
    const now = Date.now();
    const daysSinceLastCompleted = (now - stats.lastCompleted) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 3;
    
    let priority = 3;
    
    // Time-based review
    if (daysSinceLastCompleted >= reviewIntervalDays) {
      priority += Math.min(3, Math.floor(daysSinceLastCompleted / reviewIntervalDays));
      stats.needsReview = true;
    } else {
      stats.needsReview = false;
    }
    
    // Focus on weak areas
    const minScore = this.config.settings.minScoreThreshold || 70;
    if (this.config.settings.focusOnWeakAreas && stats.averageScore < minScore) {
      priority += 3;
      stats.needsReview = true;
    }
    
    // High priority for very low scores
    if (stats.averageScore < 50) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Include recent drills if configured
    if (this.config.settings.includeRecentDrills && daysSinceLastCompleted <= 1) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Priority for difficult drills
    if (stats.difficulty > 7) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Lower priority for well-performed drills
    if (stats.averageScore > 90 && stats.completions > 3) {
      priority -= 2;
    }
    
    // Higher priority if few completions (need more practice)
    if (stats.completions < 3) {
      priority += 1;
      stats.needsReview = true;
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
      
      // Filter drills that need review
      const itemsNeedingReview = Array.from(this.drillStats.values())
        .filter(stats => stats.needsReview);
      
      // Sort by priority (descending) and average score (ascending for weaker ones first)
      itemsNeedingReview.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.averageScore - b.averageScore;
      });

      // Take the top items up to the limit
      const selectedItems = itemsNeedingReview.slice(0, limit);

      // Convert to ReviewItem format
      return selectedItems.map((stats): ReviewItem => ({
        id: stats.drillId,
        sourceId: this.id,
        contentType: this.mapCategoryToContentType(stats.category),
        content: {
          primary: stats.drillName,
          secondary: `${stats.drillType} drill`,
          context: `Practice ${stats.category} skills`,
          formatted: {
            primary: stats.drillName,
            secondary: stats.drillType,
            context: `${stats.completions} completion${stats.completions !== 1 ? 's' : ''} • ${stats.averageScore}% avg • Best: ${stats.bestScore}%`
          }
        },
        dueDate: new Date(stats.lastCompleted + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.PRODUCTION, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            drillName: stats.drillName,
            drillType: stats.drillType,
            category: stats.category,
            completions: stats.completions,
            averageScore: stats.averageScore,
            bestScore: stats.bestScore,
            averageTime: stats.averageTime
          }
        },
        createdAt: new Date(stats.firstCompleted),
        updatedAt: new Date(stats.lastCompleted)
      }));
    } catch (error) {
      console.error('Failed to get due drill items:', error);
      return [];
    }
  }

  private mapCategoryToContentType(category: string): ContentType {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('kanji')) return ContentType.KANJI;
    if (lowerCategory.includes('vocab')) return ContentType.VOCABULARY;
    if (lowerCategory.includes('grammar')) return ContentType.GRAMMAR;
    if (lowerCategory.includes('sentence')) return ContentType.SENTENCE;
    if (lowerCategory.includes('flashcard')) return ContentType.FLASHCARD;
    
    return ContentType.CUSTOM;
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
      const allStats = Array.from(this.drillStats.values());
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let totalItems = allStats.length;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalScore = 0;
      let totalCompletions = 0;

      const itemsByType: Record<ContentType, number> = {
        [ContentType.CUSTOM]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.GRAMMAR]: 0,
        [ContentType.FLASHCARD]: 0,
        [ContentType.SENTENCE]: 0,
        [ContentType.RADICAL]: 0
      };

      allStats.forEach(stats => {
        if (stats.completions === 0 || (now - stats.firstCompleted) < (24 * 60 * 60 * 1000)) {
          newItems++;
        }
        
        totalScore += stats.averageScore;
        totalCompletions += stats.completions;
        
        // Count by content type
        const contentType = this.mapCategoryToContentType(stats.category);
        itemsByType[contentType]++;
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastCompleted + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      });

      const averageScore = totalItems > 0 ? totalScore / totalItems : 0;

      return {
        totalItems,
        dueToday,
        overdue,
        scheduled: totalItems - dueToday - overdue - newItems,
        newItems,
        itemsByType,
        itemsByPriority: this.calculatePriorityDistribution(allStats),
        averageMastery: averageScore,
        retentionRate: averageScore / 100,
        lastReviewSession: allStats.length > 0 ? 
          new Date(Math.max(...allStats.map(s => s.lastCompleted))) : undefined,
        studyStreak: await this.calculatePracticeStreak(),
        trends: {
          accuracy: averageScore > 75 ? 'improving' : 'stable',
          speed: 'stable', // TODO: Calculate based on time trends
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get drill stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(stats: DrillStats[]): Record<SourcePriority, number> {
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

  private async calculatePracticeStreak(): Promise<number> {
    try {
      const events = await learningEventsService.getRecentEvents(365);
      const drillEvents = events.filter(event => 
        event.category === 'drill' || 
        event.context?.feature?.includes('drill') ||
        event.context?.page?.includes('drill')
      );
      
      if (drillEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      drillEvents.forEach(event => {
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
      console.error('Failed to calculate practice streak:', error);
      return 0;
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Recalculate review needs if settings changed
    if (config.settings) {
      for (const stats of this.drillStats.values()) {
        this.updateDrillNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      const stats = this.drillStats.get(itemId);
      if (!stats) {
        console.warn(`No stats found for drill: ${itemId}`);
        return;
      }

      // Update stats based on review result
      stats.completions++;
      stats.lastCompleted = result.timestamp.getTime();
      
      // Update average score based on rating (1-4 scale converted to percentage)
      const score = (result.rating / 4) * 100;
      stats.averageScore = (stats.averageScore * (stats.completions - 1) + score) / stats.completions;
      
      // Update best score
      stats.bestScore = Math.max(stats.bestScore, score);
      
      // Update average time
      if (result.responseTime > 0) {
        stats.averageTime = (stats.averageTime * (stats.completions - 1) + result.responseTime) / stats.completions;
      }
      
      // Recalculate review needs
      this.updateDrillNeedForReview(stats);

      // Track the review event
      await learningEventsService.trackEvent({
        id: `drill_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: result.rating >= 3 ? 'success' : 'failure',
        category: 'drill',
        content: {
          value: stats.drillId,
          metadata: {
            drillId: stats.drillId,
            drillName: stats.drillName,
            drillType: stats.drillType,
            category: stats.category,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed,
            averageScore: stats.averageScore,
            completions: stats.completions,
            drill: true,
            practice: 'drill'
          }
        },
        sessionId: `drill_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'drills-review',
          device: 'web',
          platform: 'web',
          drill: true
        },
        metrics: {
          duration: result.responseTime,
          score: score
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process drill review:', error);
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

      for (const stats of this.drillStats.values()) {
        // Search by drill name, type, category, or tags
        if (stats.drillName.toLowerCase().includes(lowerQuery) || 
            stats.drillType.toLowerCase().includes(lowerQuery) ||
            stats.category.toLowerCase().includes(lowerQuery) ||
            stats.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          
          results.push({
            id: stats.drillId,
            sourceId: this.id,
            contentType: this.mapCategoryToContentType(stats.category),
            content: {
              primary: stats.drillName,
              secondary: `${stats.drillType} drill`,
              context: `${stats.category} practice`,
              formatted: {
                primary: stats.drillName,
                secondary: stats.drillType
              }
            },
            dueDate: new Date(stats.lastCompleted + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.PRODUCTION, StudyMode.RECOGNITION],
            metadata: {
              source: this.id,
              tags: stats.tags,
              difficulty: stats.difficulty,
              properties: {
                averageScore: stats.averageScore,
                completions: stats.completions
              }
            },
            createdAt: new Date(stats.firstCompleted),
            updatedAt: new Date(stats.lastCompleted)
          });
          
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search drill items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const stats = this.drillStats.get(itemId);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: this.mapCategoryToContentType(stats.category),
        content: {
          primary: stats.drillName,
          secondary: `${stats.drillType} drill`,
          context: `${stats.category} practice`,
          formatted: {
            primary: stats.drillName,
            secondary: stats.drillType
          }
        },
        dueDate: new Date(stats.lastCompleted + (this.config.settings.reviewIntervalDays || 3) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.PRODUCTION, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            averageScore: stats.averageScore,
            completions: stats.completions
          }
        },
        createdAt: new Date(stats.firstCompleted),
        updatedAt: new Date(stats.lastCompleted)
      };
    } catch (error) {
      console.error('Failed to get drill item:', error);
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
    this.drillStats.clear();
  }

  private getEmptyStats(): SourceStats {
    return {
      totalItems: 0,
      dueToday: 0,
      overdue: 0,
      scheduled: 0,
      newItems: 0,
      itemsByType: {
        [ContentType.CUSTOM]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.FLASHCARD]: 0,
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
 * Factory function to create a drills source
 */
export async function createDrillsSource(userId: string | null): Promise<DrillsSource> {
  const source = new DrillsSource(userId);
  return source;
}