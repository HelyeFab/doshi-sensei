/**
 * Conjugations Review Source Implementation
 * 
 * This source tracks verb conjugation practice and provides items for review
 * based on conjugation accuracy, mastery levels, and spaced repetition needs.
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

interface ConjugationStats {
  verbId: string;
  verb: string;
  baseForm: string;
  verbType: string; // ichidan, godan, irregular
  conjugationForm: string; // past, negative, te-form, etc.
  practiceCount: number;
  lastPracticed: number;
  firstPracticed: number;
  accuracyRate: number;
  averageResponseTime: number;
  needsReview: boolean;
  priority: number;
  difficulty: number;
  tags: string[];
}

export class ConjugationsSource implements ReviewSource {
  readonly id = 'conjugations';
  readonly name = 'Verb Conjugations';
  readonly type = ReviewSourceType.GRAMMAR_DRILLS;
  readonly icon = '🔄';
  readonly description = 'Review and practice Japanese verb conjugations';
  readonly supportedContentTypes = [ContentType.GRAMMAR, ContentType.VOCABULARY];
  readonly paths = {
    main: '/conjugations',
    settings: '/settings#conjugations'
  };

  private initialized = false;
  private conjugationStats: Map<string, ConjugationStats> = new Map();

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.GRAMMAR_DRILLS]?.defaultConfig || {
      enabled: true,
      maxItems: 20,
      priorityMultiplier: 1.3,
      settings: {
        reviewIntervalDays: 2,
        focusOnWeakConjugations: true,
        includeIrregularVerbs: true,
        minAccuracyThreshold: 75
      }
    }
  ) {}

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      await this.loadConjugationStats();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize conjugations source: ${error}`);
    }
  }

  private async loadConjugationStats(): Promise<void> {
    try {
      // Get conjugation and grammar events from analytics
      const events = await learningEventsService.getRecentEvents(1000);
      const conjugationEvents = events.filter(event => 
        event.category === 'grammar' || 
        event.context?.feature?.includes('conjugation') ||
        event.context?.feature?.includes('verb') ||
        event.content?.metadata?.conjugation ||
        event.content?.metadata?.verbForm ||
        event.content?.metadata?.grammar === 'verb'
      );

      // Group events by verb + conjugation form combination
      const conjugationEventsByKey = new Map<string, typeof events>();
      conjugationEvents.forEach(event => {
        const verb = event.content?.value || 
                    event.content?.metadata?.verb ||
                    event.content?.metadata?.baseForm;
        const form = event.content?.metadata?.conjugationForm ||
                    event.content?.metadata?.form ||
                    event.content?.metadata?.verbForm;
        
        if (verb && form) {
          const key = `${verb}_${form}`;
          if (!conjugationEventsByKey.has(key)) {
            conjugationEventsByKey.set(key, []);
          }
          conjugationEventsByKey.get(key)!.push(event);
        }
      });

      // Process conjugation events to build stats
      conjugationEventsByKey.forEach((events, key) => {
        const practiceEvents = events.filter(e => 
          e.type === 'practice' || e.type === 'complete' || e.type === 'success' || e.type === 'failure'
        );
        
        if (practiceEvents.length > 0) {
          const firstEvent = events[events.length - 1]; // Oldest event
          const lastEvent = events[0]; // Most recent event
          
          const verb = firstEvent.content?.value || firstEvent.content?.metadata?.verb || '';
          const form = firstEvent.content?.metadata?.conjugationForm || 
                      firstEvent.content?.metadata?.form || 'unknown';
          
          const stats: ConjugationStats = {
            verbId: key,
            verb,
            baseForm: firstEvent.content?.metadata?.baseForm || verb,
            verbType: firstEvent.content?.metadata?.verbType || 
                     firstEvent.content?.metadata?.type || 'unknown',
            conjugationForm: form,
            practiceCount: practiceEvents.length,
            lastPracticed: lastEvent.timestamp,
            firstPracticed: firstEvent.timestamp,
            accuracyRate: this.calculateAccuracyRate(events),
            averageResponseTime: this.calculateAverageResponseTime(events),
            needsReview: false,
            priority: 5,
            difficulty: this.calculateConjugationDifficulty(events, form, firstEvent.content?.metadata?.verbType),
            tags: this.extractConjugationTags(firstEvent, form)
          };

          // Update review necessity and priority
          this.updateConjugationNeedForReview(stats);
          
          this.conjugationStats.set(key, stats);
        }
      });

    } catch (error) {
      console.error('Failed to load conjugation stats:', error);
      // Continue with empty stats
    }
  }

  private calculateAccuracyRate(events: any[]): number {
    const successEvents = events.filter(e => e.type === 'success');
    const failureEvents = events.filter(e => e.type === 'failure');
    const totalOutcomeEvents = successEvents.length + failureEvents.length;
    
    if (totalOutcomeEvents === 0) {
      // Look for rating-based events
      const ratedEvents = events.filter(e => e.content?.metadata?.rating);
      if (ratedEvents.length > 0) {
        const avgRating = ratedEvents.reduce((sum, e) => 
          sum + (e.content?.metadata?.rating || 0), 0) / ratedEvents.length;
        return Math.round((avgRating / 4) * 100); // Convert 1-4 scale to percentage
      }
      return 60; // Default accuracy
    }
    
    return Math.round((successEvents.length / totalOutcomeEvents) * 100);
  }

  private calculateAverageResponseTime(events: any[]): number {
    const eventsWithDuration = events.filter(e => e.metrics?.duration);
    
    if (eventsWithDuration.length === 0) {
      // Look for responseTime in metadata
      const eventsWithResponseTime = events.filter(e => e.content?.metadata?.responseTime);
      if (eventsWithResponseTime.length > 0) {
        const totalTime = eventsWithResponseTime.reduce((sum, e) => 
          sum + (e.content?.metadata?.responseTime || 0), 0);
        return totalTime / eventsWithResponseTime.length;
      }
      return 0;
    }
    
    const totalDuration = eventsWithDuration.reduce((sum, e) => 
      sum + (e.metrics?.duration || 0), 0);
    
    return totalDuration / eventsWithDuration.length;
  }

  private calculateConjugationDifficulty(events: any[], form: string, verbType?: string): number {
    let difficulty = 5; // Base difficulty
    
    // Check for explicit difficulty metadata
    const difficultyEvent = events.find(e => e.content?.metadata?.difficulty);
    if (difficultyEvent) {
      difficulty = difficultyEvent.content.metadata.difficulty;
    } else {
      // Assign difficulty based on conjugation form
      const formDifficulty: Record<string, number> = {
        'present': 2,
        'past': 3,
        'negative': 4,
        'past-negative': 5,
        'te-form': 6,
        'ta-form': 6,
        'potential': 7,
        'passive': 7,
        'causative': 8,
        'causative-passive': 9,
        'conditional': 6,
        'volitional': 5,
        'imperative': 4,
        'prohibitive': 5
      };
      
      difficulty = formDifficulty[form.toLowerCase()] || 5;
      
      // Adjust based on verb type
      if (verbType === 'irregular') {
        difficulty += 2;
      } else if (verbType === 'godan') {
        difficulty += 1;
      }
      // ichidan verbs keep base difficulty
    }
    
    // Adjust based on accuracy patterns
    const accuracy = this.calculateAccuracyRate(events);
    if (accuracy < 50) difficulty += 2;
    else if (accuracy < 70) difficulty += 1;
    else if (accuracy > 90) difficulty -= 1;
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private extractConjugationTags(event: any, form: string): string[] {
    const tags: string[] = ['conjugation', 'verb', 'grammar'];
    
    const metadata = event.content?.metadata || {};
    
    if (metadata.verbType) tags.push(metadata.verbType);
    if (form) tags.push(form);
    if (metadata.jlptLevel) tags.push(metadata.jlptLevel);
    if (metadata.polite !== undefined) {
      tags.push(metadata.polite ? 'polite' : 'casual');
    }
    
    // Add form category tags
    const negativeforms = ['negative', 'past-negative'];
    const advancedForms = ['potential', 'passive', 'causative', 'causative-passive'];
    const basicForms = ['present', 'past', 'te-form', 'ta-form'];
    
    if (negativeforms.includes(form.toLowerCase())) tags.push('negative-form');
    if (advancedForms.includes(form.toLowerCase())) tags.push('advanced-form');
    if (basicForms.includes(form.toLowerCase())) tags.push('basic-form');
    
    return tags;
  }

  private updateConjugationNeedForReview(stats: ConjugationStats): void {
    const now = Date.now();
    const daysSinceLastPractice = (now - stats.lastPracticed) / (1000 * 60 * 60 * 24);
    const reviewIntervalDays = this.config.settings.reviewIntervalDays || 2;
    
    let priority = 4;
    
    // Time-based review
    if (daysSinceLastPractice >= reviewIntervalDays) {
      priority += Math.min(3, Math.floor(daysSinceLastPractice / reviewIntervalDays));
      stats.needsReview = true;
    } else {
      stats.needsReview = false;
    }
    
    // Focus on weak conjugations
    const minAccuracy = this.config.settings.minAccuracyThreshold || 75;
    if (this.config.settings.focusOnWeakConjugations && stats.accuracyRate < minAccuracy) {
      priority += 3;
      stats.needsReview = true;
    }
    
    // High priority for very low accuracy
    if (stats.accuracyRate < 50) {
      priority += 2;
      stats.needsReview = true;
    }
    
    // Priority for difficult conjugations
    if (stats.difficulty > 7) {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Include irregular verbs if configured
    if (this.config.settings.includeIrregularVerbs && stats.verbType === 'irregular') {
      priority += 1;
      stats.needsReview = true;
    }
    
    // Lower priority for well-mastered conjugations
    if (stats.accuracyRate > 90 && stats.practiceCount > 5) {
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
      const limit = Math.min(options?.limit || 20, this.config.maxItems || 20);
      
      // Filter conjugations that need review
      const itemsNeedingReview = Array.from(this.conjugationStats.values())
        .filter(stats => stats.needsReview);
      
      // Sort by priority (descending) and accuracy (ascending for weaker ones first)
      itemsNeedingReview.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.accuracyRate - b.accuracyRate;
      });

      // Take the top items up to the limit
      const selectedItems = itemsNeedingReview.slice(0, limit);

      // Convert to ReviewItem format
      return selectedItems.map((stats): ReviewItem => ({
        id: stats.verbId,
        sourceId: this.id,
        contentType: ContentType.GRAMMAR,
        content: {
          primary: stats.verb,
          secondary: `${stats.conjugationForm} form`,
          context: `Practice ${stats.verbType} verb conjugation`,
          formatted: {
            primary: stats.verb,
            secondary: stats.conjugationForm,
            context: `${stats.verbType} • ${stats.accuracyRate}% accuracy • ${stats.practiceCount} practice${stats.practiceCount !== 1 ? 's' : ''}`
          }
        },
        dueDate: new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.PRODUCTION, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            verb: stats.verb,
            baseForm: stats.baseForm,
            verbType: stats.verbType,
            conjugationForm: stats.conjugationForm,
            accuracyRate: stats.accuracyRate,
            practiceCount: stats.practiceCount,
            averageResponseTime: stats.averageResponseTime
          }
        },
        createdAt: new Date(stats.firstPracticed),
        updatedAt: new Date(stats.lastPracticed)
      }));
    } catch (error) {
      console.error('Failed to get due conjugation items:', error);
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
      const allStats = Array.from(this.conjugationStats.values());
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let totalItems = allStats.length;
      let dueToday = 0;
      let overdue = 0;
      let newItems = 0;
      let totalAccuracy = 0;

      allStats.forEach(stats => {
        if (stats.practiceCount === 1) {
          newItems++;
        }
        
        totalAccuracy += stats.accuracyRate;
        
        if (stats.needsReview) {
          const dueDate = new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000);
          
          if (dueDate <= todayStart) {
            overdue++;
          } else if (dueDate.getTime() <= todayStart.getTime() + 24 * 60 * 60 * 1000) {
            dueToday++;
          }
        }
      });

      const averageAccuracy = totalItems > 0 ? totalAccuracy / totalItems : 0;

      return {
        totalItems,
        dueToday,
        overdue,
        scheduled: totalItems - dueToday - overdue - newItems,
        newItems,
        itemsByType: {
          [ContentType.GRAMMAR]: totalItems,
          [ContentType.VOCABULARY]: 0,
          [ContentType.KANJI]: 0,
          [ContentType.FLASHCARD]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0,
          [ContentType.CUSTOM]: 0
        },
        itemsByPriority: this.calculatePriorityDistribution(allStats),
        averageMastery: averageAccuracy,
        retentionRate: averageAccuracy / 100,
        lastReviewSession: allStats.length > 0 ? 
          new Date(Math.max(...allStats.map(s => s.lastPracticed))) : undefined,
        studyStreak: await this.calculatePracticeStreak(),
        trends: {
          accuracy: averageAccuracy > 75 ? 'improving' : 'stable',
          speed: 'stable', // TODO: Calculate based on response time trends
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get conjugation stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculatePriorityDistribution(stats: ConjugationStats[]): Record<SourcePriority, number> {
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
      const conjugationEvents = events.filter(event => 
        event.category === 'grammar' || 
        event.context?.feature?.includes('conjugation') ||
        event.context?.feature?.includes('verb')
      );
      
      if (conjugationEvents.length === 0) return 0;

      // Group events by date
      const eventDates = new Set<string>();
      conjugationEvents.forEach(event => {
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
      for (const stats of this.conjugationStats.values()) {
        this.updateConjugationNeedForReview(stats);
      }
    }
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    try {
      const stats = this.conjugationStats.get(itemId);
      if (!stats) {
        console.warn(`No stats found for conjugation: ${itemId}`);
        return;
      }

      // Update stats based on review result
      stats.practiceCount++;
      stats.lastPracticed = result.timestamp.getTime();
      
      // Update accuracy rate based on rating (1-4 scale, 3+ is success)
      const isSuccess = result.rating >= 3;
      stats.accuracyRate = (stats.accuracyRate * (stats.practiceCount - 1) + (isSuccess ? 100 : 0)) / stats.practiceCount;
      
      // Update response time
      if (result.responseTime > 0) {
        stats.averageResponseTime = (stats.averageResponseTime * (stats.practiceCount - 1) + result.responseTime) / stats.practiceCount;
      }
      
      // Recalculate review needs
      this.updateConjugationNeedForReview(stats);

      // Track the review event
      await learningEventsService.trackEvent({
        id: `conjugation_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId || 'guest',
        timestamp: result.timestamp.getTime(),
        type: isSuccess ? 'success' : 'failure',
        category: 'grammar',
        content: {
          value: stats.verb,
          metadata: {
            verb: stats.verb,
            baseForm: stats.baseForm,
            verbType: stats.verbType,
            conjugationForm: stats.conjugationForm,
            rating: result.rating,
            responseTime: result.responseTime,
            studyMode: result.studyMode,
            hintsUsed: result.hintsUsed,
            accuracyRate: stats.accuracyRate,
            practiceCount: stats.practiceCount,
            conjugation: true,
            grammar: 'verb'
          }
        },
        sessionId: `conjugation_review_${Date.now()}`,
        context: {
          page: '/review',
          feature: 'conjugations-review',
          device: 'web',
          platform: 'web',
          conjugation: true
        },
        metrics: {
          duration: result.responseTime
        },
        synced: false
      });
    } catch (error) {
      console.error('Failed to process conjugation review:', error);
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

      for (const stats of this.conjugationStats.values()) {
        // Search by verb, conjugation form, verb type, or tags
        if (stats.verb.includes(query) || 
            stats.baseForm.includes(query) ||
            stats.conjugationForm.toLowerCase().includes(lowerQuery) ||
            stats.verbType.toLowerCase().includes(lowerQuery) ||
            stats.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          
          results.push({
            id: stats.verbId,
            sourceId: this.id,
            contentType: ContentType.GRAMMAR,
            content: {
              primary: stats.verb,
              secondary: `${stats.conjugationForm} form`,
              context: `${stats.verbType} verb conjugation`,
              formatted: {
                primary: stats.verb,
                secondary: stats.conjugationForm
              }
            },
            dueDate: new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000),
            priority: stats.priority,
            availableStudyModes: [StudyMode.PRODUCTION, StudyMode.RECOGNITION],
            metadata: {
              source: this.id,
              tags: stats.tags,
              difficulty: stats.difficulty,
              properties: {
                accuracyRate: stats.accuracyRate,
                practiceCount: stats.practiceCount
              }
            },
            createdAt: new Date(stats.firstPracticed),
            updatedAt: new Date(stats.lastPracticed)
          });
          
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search conjugation items:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const stats = this.conjugationStats.get(itemId);
      if (!stats) return null;

      return {
        id: itemId,
        sourceId: this.id,
        contentType: ContentType.GRAMMAR,
        content: {
          primary: stats.verb,
          secondary: `${stats.conjugationForm} form`,
          context: `${stats.verbType} verb conjugation`,
          formatted: {
            primary: stats.verb,
            secondary: stats.conjugationForm
          }
        },
        dueDate: new Date(stats.lastPracticed + (this.config.settings.reviewIntervalDays || 2) * 24 * 60 * 60 * 1000),
        priority: stats.priority,
        availableStudyModes: [StudyMode.PRODUCTION, StudyMode.RECOGNITION],
        metadata: {
          source: this.id,
          tags: stats.tags,
          difficulty: stats.difficulty,
          properties: {
            accuracyRate: stats.accuracyRate,
            practiceCount: stats.practiceCount
          }
        },
        createdAt: new Date(stats.firstPracticed),
        updatedAt: new Date(stats.lastPracticed)
      };
    } catch (error) {
      console.error('Failed to get conjugation item:', error);
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
    this.conjugationStats.clear();
  }

  private getEmptyStats(): SourceStats {
    return {
      totalItems: 0,
      dueToday: 0,
      overdue: 0,
      scheduled: 0,
      newItems: 0,
      itemsByType: {
        [ContentType.GRAMMAR]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.FLASHCARD]: 0,
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
 * Factory function to create a conjugations source
 */
export async function createConjugationsSource(userId: string | null): Promise<ConjugationsSource> {
  const source = new ConjugationsSource(userId);
  return source;
}