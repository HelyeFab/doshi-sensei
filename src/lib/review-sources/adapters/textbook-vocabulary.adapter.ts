/**
 * Textbook Vocabulary Review Source Adapter
 * 
 * Integrates the existing textbook vocabulary system with the Unified Review Hub.
 * Uses the FSRS spaced repetition system and IndexedDB storage already in place
 * for the 9,635 vocabulary cards from Genki and Minna no Nihongo textbooks.
 * 
 * Features:
 * - FSRS spaced repetition algorithm integration
 * - Golden Time detection for optimal review timing
 * - Statistics from existing storage system
 * - Preview items for review hub cards
 * - Seamless integration with existing infrastructure
 */

import {
  ReviewSource,
  ReviewItem,
  ReviewItemContent,
  SourceStats,
  SourceConfig,
  ReviewResult,
  ReviewSourceType,
  SourceStatus,
  SourcePriority
} from '../review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';
import { REVIEW_SOURCE_CONFIGS } from '../constants';
import { GoldenTimeCalculator, GoldenTimeResult } from '@/lib/unified-review/scheduling/golden-time';

// Import existing services
import { vocabStorage, VocabularyProgress } from '@/services/textbook-vocabulary/storage';
import { spacedRepetition } from '@/services/textbook-vocabulary/spaced-repetition';
import { VocabularyItem } from '@/app/tools/textbook-vocabulary/types';

/**
 * Configuration specific to textbook vocabulary
 */
interface TextbookVocabularyConfig extends SourceConfig {
  settings: {
    /** Preferred textbooks */
    textbooks: string[];
    /** Show furigana readings */
    showFurigana: boolean;
    /** Auto-play audio */
    playAudio: boolean;
    /** Include example sentences */
    includeExamples: boolean;
    /** Daily new cards limit */
    dailyNewCardsLimit: number;
    /** Maximum reviews per day */
    maxReviewsPerDay: number;
  };
}

/**
 * Textbook Vocabulary Review Source Adapter
 * 
 * Provides a unified interface to the existing textbook vocabulary system
 * for integration with the Review Hub.
 */
export class TextbookVocabularyAdapter implements ReviewSource {
  // Required interface properties
  public readonly id = 'textbook-vocabulary';
  public readonly name = 'Textbook Vocabulary';
  public readonly type = ReviewSourceType.TEXTBOOK_VOCABULARY;
  public readonly icon = '📚';
  public readonly description = 'Interactive vocabulary learning from Genki and Minna no Nihongo textbooks';
  public readonly paths = {
    main: '/tools/textbook-vocabulary',
    settings: '/tools/textbook-vocabulary/settings',
    reviewPath: '/tools/textbook-vocabulary?mode=review&returnTo=/review'
  };
  public readonly supportedContentTypes = [ContentType.VOCABULARY];
  public status: SourceStatus = SourceStatus.ACTIVE;
  public config: TextbookVocabularyConfig;

  // Internal state
  private initialized = false;
  private goldenTimeCalculator: GoldenTimeCalculator;
  private vocabularyCache = new Map<string, VocabularyItem>();
  private lastStatsUpdate = new Date(0);
  private cachedStats: SourceStats | null = null;

  // Constants for theme integration
  private readonly COLOR = 'orange'; // Matches existing textbook vocabulary theme

  constructor(config?: Partial<TextbookVocabularyConfig>) {
    // Initialize with default configuration
    const defaultConfig = REVIEW_SOURCE_CONFIGS[this.type].defaultConfig;
    
    this.config = {
      ...defaultConfig,
      settings: {
        textbooks: ['genki-1', 'genki-2', 'minna-1', 'minna-2'],
        showFurigana: true,
        playAudio: true,
        includeExamples: true,
        dailyNewCardsLimit: 20,
        maxReviewsPerDay: 100,
        ...defaultConfig.settings
      },
      ...config
    } as TextbookVocabularyConfig;

    // Initialize golden time calculator
    this.goldenTimeCalculator = new GoldenTimeCalculator({
      preferredTimes: [9, 14, 19], // 9 AM, 2 PM, 7 PM
      usePerformancePatterns: true,
      minSessionGap: 240, // 4 hours between sessions
      maxDailyStudy: 120 // 2 hours max per day
    });
  }

  // ============================================================================
  // Core Interface Methods
  // ============================================================================

  /**
   * Initialize the adapter
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the vocabulary storage
      await vocabStorage.init();

      // Load vocabulary data for caching
      await this.loadVocabularyData();

      this.status = SourceStatus.ACTIVE;
      this.initialized = true;

      console.log(`${this.name} adapter initialized successfully`);
      
    } catch (error) {
      this.status = SourceStatus.ERROR;
      throw new Error(`Failed to initialize ${this.name}: ${error}`);
    }
  }

  /**
   * Get items due for review
   */
  public async getDueItems(options?: {
    limit?: number;
    priority?: SourcePriority;
    contentTypes?: ContentType[];
    studyModes?: StudyMode[];
  }): Promise<ReviewItem[]> {
    this.ensureInitialized();

    const limit = Math.min(options?.limit || 30, this.config.maxItems || 50);

    try {
      // Get due cards from the existing spaced repetition system
      const dueProgress = await spacedRepetition.getDueCards();
      
      // Sort by priority (overdue items first, then by next review date)
      const sortedDue = dueProgress
        .sort((a, b) => {
          const now = new Date();
          const aOverdue = a.nextReview.getTime() < now.getTime();
          const bOverdue = b.nextReview.getTime() < now.getTime();
          
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          
          return a.nextReview.getTime() - b.nextReview.getTime();
        })
        .slice(0, limit);

      // Convert to ReviewItem format
      const reviewItems: ReviewItem[] = [];
      
      for (const progress of sortedDue) {
        const vocabItem = await this.getVocabularyItem(progress.id);
        if (vocabItem) {
          reviewItems.push(this.createReviewItem(vocabItem, progress));
        }
      }

      return reviewItems;
      
    } catch (error) {
      console.error('Error fetching due items from textbook vocabulary:', error);
      return [];
    }
  }

  /**
   * Get current statistics for this source
   */
  public async getStats(): Promise<SourceStats> {
    this.ensureInitialized();

    // Use cached stats if recent enough (within 5 minutes)
    const now = new Date();
    if (this.cachedStats && 
        (now.getTime() - this.lastStatsUpdate.getTime()) < 5 * 60 * 1000) {
      return this.cachedStats;
    }

    try {
      // Get statistics from the existing spaced repetition service
      const stats = await spacedRepetition.getStats();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Get all progress for detailed analysis
      const allTextbooks = this.config.settings.textbooks;
      let allProgress: VocabularyProgress[] = [];
      
      for (const textbook of allTextbooks) {
        const progress = await vocabStorage.getProgressByTextbook(textbook);
        allProgress = allProgress.concat(progress);
      }

      // Calculate detailed statistics
      const dueToday = allProgress.filter(p => {
        const dueDate = new Date(p.nextReview);
        return dueDate >= today && dueDate < tomorrow;
      }).length;

      const overdue = allProgress.filter(p => 
        new Date(p.nextReview) < today
      ).length;

      const scheduled = allProgress.filter(p => 
        new Date(p.nextReview) >= tomorrow
      ).length;

      const newItems = allProgress.filter(p => 
        p.reviewCount === 0
      ).length;

      const averageMastery = allProgress.length > 0
        ? allProgress.reduce((sum, p) => sum + p.masteryLevel, 0) / allProgress.length
        : 0;

      const retentionRate = allProgress.length > 0
        ? allProgress.filter(p => p.quality >= 3).length / allProgress.length * 100
        : 0;

      // Calculate study streak (simplified)
      const recentSessions = await vocabStorage.getStudySessions(undefined, 30);
      const studyStreak = this.calculateStudyStreak(recentSessions);

      // Determine trends based on recent performance
      const trends = this.analyzeTrends(allProgress);

      const sourceStats: SourceStats = {
        totalItems: stats.totalCards || allProgress.length,
        dueToday,
        overdue,
        scheduled,
        newItems,
        itemsByType: {
          [ContentType.VOCABULARY]: allProgress.length
        } as Record<ContentType, number>,
        itemsByPriority: this.categorizeByPriority(allProgress),
        averageMastery,
        retentionRate,
        lastReviewSession: this.getLastReviewSession(allProgress),
        studyStreak,
        trends
      };

      // Cache the results
      this.cachedStats = sourceStats;
      this.lastStatsUpdate = now;

      return sourceStats;
      
    } catch (error) {
      console.error('Error fetching textbook vocabulary statistics:', error);
      
      // Return minimal stats on error
      return {
        totalItems: 0,
        dueToday: 0,
        overdue: 0,
        scheduled: 0,
        newItems: 0,
        itemsByType: { [ContentType.VOCABULARY]: 0 } as Record<ContentType, number>,
        itemsByPriority: {
          [SourcePriority.LOW]: 0,
          [SourcePriority.MEDIUM]: 0,
          [SourcePriority.HIGH]: 0,
          [SourcePriority.URGENT]: 0
        } as Record<SourcePriority, number>,
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
   * Update source configuration
   */
  public async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.ensureInitialized();

    // Merge new configuration
    this.config = { ...this.config, ...config } as TextbookVocabularyConfig;

    // Handle configuration changes
    if (config.enabled !== undefined) {
      this.status = config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
    }

    // Clear cached stats when config changes
    this.cachedStats = null;

    console.log(`${this.name} configuration updated`);
  }

  /**
   * Process a review result and update the vocabulary progress
   */
  public async processReview(itemId: string, result: ReviewResult): Promise<void> {
    this.ensureInitialized();

    try {
      // Get the vocabulary item
      const vocabItem = await this.getVocabularyItem(itemId);
      if (!vocabItem) {
        throw new Error(`Vocabulary item ${itemId} not found`);
      }

      // Process the review using the existing spaced repetition system
      await spacedRepetition.processReview(itemId, result.rating, vocabItem);

      // Clear cached stats after review
      this.cachedStats = null;

      console.log(`Processed review for vocabulary item ${itemId}: rating=${result.rating}`);
      
    } catch (error) {
      console.error('Error processing review:', error);
      throw error;
    }
  }

  /**
   * Search for vocabulary items within this source
   */
  public async searchItems(query: string, options?: {
    contentTypes?: ContentType[];
    limit?: number;
  }): Promise<ReviewItem[]> {
    this.ensureInitialized();

    const limit = options?.limit || 20;
    const lowerQuery = query.toLowerCase();

    try {
      // Search through cached vocabulary items
      const matchingItems: ReviewItem[] = [];
      
      for (const [id, vocabItem] of this.vocabularyCache) {
        if (matchingItems.length >= limit) break;

        const matches = 
          vocabItem.japanese.toLowerCase().includes(lowerQuery) ||
          vocabItem.reading.toLowerCase().includes(lowerQuery) ||
          vocabItem.meaning.toLowerCase().includes(lowerQuery) ||
          vocabItem.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

        if (matches) {
          // Get progress for this item
          const progress = await vocabStorage.getProgress(id);
          matchingItems.push(this.createReviewItem(vocabItem, progress));
        }
      }

      return matchingItems;
      
    } catch (error) {
      console.error('Error searching vocabulary items:', error);
      return [];
    }
  }

  /**
   * Get item by ID
   */
  public async getItem(itemId: string): Promise<ReviewItem | null> {
    this.ensureInitialized();

    try {
      const vocabItem = await this.getVocabularyItem(itemId);
      if (!vocabItem) {
        return null;
      }

      const progress = await vocabStorage.getProgress(itemId);
      return this.createReviewItem(vocabItem, progress);
      
    } catch (error) {
      console.error('Error fetching vocabulary item:', error);
      return null;
    }
  }

  /**
   * Check if the source is healthy and available
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Check if storage is available
      await vocabStorage.init();
      
      // Check if we have vocabulary data
      const hasData = this.vocabularyCache.size > 0;
      
      // Check configuration validity
      const configValid = this.config.enabled !== undefined;

      const healthy = this.initialized && hasData && configValid;
      
      if (!healthy) {
        this.status = SourceStatus.ERROR;
      } else if (this.status === SourceStatus.ERROR) {
        this.status = SourceStatus.ACTIVE;
      }

      return healthy;
      
    } catch (error) {
      this.status = SourceStatus.ERROR;
      return false;
    }
  }

  // ============================================================================
  // Additional Methods for Review Hub Integration
  // ============================================================================

  /**
   * Get preview items for display in review hub cards
   * Returns a small sample of due items for preview purposes
   */
  public async getPreviewItems(limit: number = 3): Promise<ReviewItem[]> {
    this.ensureInitialized();

    try {
      const dueItems = await this.getDueItems({ limit });
      return dueItems.slice(0, limit);
    } catch (error) {
      console.error('Error getting preview items:', error);
      return [];
    }
  }

  /**
   * Get golden time assessment for optimal review timing
   */
  public async getGoldenTimeAssessment(): Promise<GoldenTimeResult> {
    this.ensureInitialized();

    try {
      // Get user's progress history for performance patterns
      const allProgress: VocabularyProgress[] = [];
      for (const textbook of this.config.settings.textbooks) {
        const progress = await vocabStorage.getProgressByTextbook(textbook);
        allProgress.push(...progress);
      }

      // Convert to the format expected by golden time calculator
      const progressHistory = allProgress
        .filter(p => p.lastReviewed)
        .map(p => ({
          itemId: p.id,
          userId: p.userId || 'anonymous',
          algorithm: 'fsrs' as any,
          algorithmData: {} as any,
          nextReview: p.nextReview,
          lastReview: p.lastReviewed,
          reviewCount: p.reviewCount,
          masteryLevel: p.masteryLevel,
          retentionRate: p.quality >= 3 ? 80 : 50,
          averageResponseTime: 3, // Estimated average
          studyModes: {} as any,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));

      // Get last study session
      const sessions = await vocabStorage.getStudySessions(undefined, 1);
      const lastSession = sessions.length > 0 ? sessions[0].startTime : undefined;

      return this.goldenTimeCalculator.assessCurrentTime(progressHistory, lastSession);
      
    } catch (error) {
      console.error('Error assessing golden time:', error);
      
      // Return default assessment on error
      return {
        isOptimal: false,
        score: 50,
        reason: 'Unable to assess optimal timing',
        peakHours: [9, 14, 19]
      };
    }
  }

  /**
   * Mark an item as reviewed (for external review systems)
   */
  public async markReviewed(itemId: string, rating: number, responseTime: number): Promise<void> {
    this.ensureInitialized();

    const reviewResult: ReviewResult = {
      itemId,
      rating,
      responseTime,
      studyMode: StudyMode.RECOGNITION,
      hintsUsed: false,
      timestamp: new Date()
    };

    await this.processReview(itemId, reviewResult);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Ensure the adapter is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} adapter is not initialized. Call init() first.`);
    }
  }

  /**
   * Load vocabulary data for caching
   */
  private async loadVocabularyData(): Promise<void> {
    try {
      // In a real implementation, you would load from the static JSON files
      // For now, we'll create a mock method that loads vocabulary data
      // This should integrate with the existing vocabulary loading system
      
      // Load vocabulary data from the textbook vocabulary system
      for (const textbook of this.config.settings.textbooks) {
        try {
          // This would call the existing API or data loading system
          const response = await fetch(`/api/textbook-vocabulary/${textbook}/all`);
          if (response.ok) {
            const vocabData = await response.json();
            if (Array.isArray(vocabData)) {
              vocabData.forEach((item: VocabularyItem) => {
                this.vocabularyCache.set(item.id, item);
              });
            }
          }
        } catch (error) {
          console.warn(`Could not load vocabulary for ${textbook}:`, error);
        }
      }

      console.log(`Loaded ${this.vocabularyCache.size} vocabulary items into cache`);
      
    } catch (error) {
      console.error('Error loading vocabulary data:', error);
      throw error;
    }
  }

  /**
   * Get vocabulary item by ID from cache or storage
   */
  private async getVocabularyItem(id: string): Promise<VocabularyItem | null> {
    // Check cache first
    if (this.vocabularyCache.has(id)) {
      return this.vocabularyCache.get(id)!;
    }

    // If not in cache, try to find it by searching through textbooks
    for (const textbook of this.config.settings.textbooks) {
      try {
        const response = await fetch(`/api/textbook-vocabulary/${textbook}/item/${id}`);
        if (response.ok) {
          const vocabItem = await response.json();
          if (vocabItem) {
            this.vocabularyCache.set(id, vocabItem);
            return vocabItem;
          }
        }
      } catch (error) {
        // Continue searching in other textbooks
      }
    }

    return null;
  }

  /**
   * Create a ReviewItem from vocabulary item and progress
   */
  private createReviewItem(
    vocabItem: VocabularyItem, 
    progress?: VocabularyProgress | null
  ): ReviewItem {
    const content: ReviewItemContent = {
      primary: vocabItem.japanese,
      secondary: vocabItem.meaning,
      context: vocabItem.reading
    };

    // Add formatted content with furigana if enabled
    if (this.config.settings.showFurigana) {
      content.formatted = {
        primary: vocabItem.japanese,
        secondary: vocabItem.meaning,
        context: vocabItem.reading
      };
    }

    // Add example sentences if enabled
    if (this.config.settings.includeExamples && vocabItem.examples.length > 0) {
      content.context = `${vocabItem.reading}\n\nExample: ${vocabItem.examples[0].japanese} - ${vocabItem.examples[0].english}`;
    }

    // Add audio if available and enabled
    if (this.config.settings.playAudio && vocabItem.audioFile) {
      content.audio = {
        url: vocabItem.audioFile,
        autoPlay: false
      };
    }

    return {
      id: vocabItem.id,
      sourceId: this.id,
      contentType: ContentType.VOCABULARY,
      content,
      dueDate: progress?.nextReview || new Date(),
      priority: this.calculatePriority(vocabItem, progress),
      availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
      metadata: {
        source: {
          textbook: vocabItem.textbook,
          lesson: vocabItem.lesson,
          jlptLevel: vocabItem.jlptLevel,
          frequency: vocabItem.frequency,
          masteryLevel: progress?.masteryLevel || 0,
          reviewCount: progress?.reviewCount || 0,
          lastReviewed: progress?.lastReviewed
        },
        tags: vocabItem.tags,
        difficulty: this.calculateDifficulty(vocabItem, progress),
        properties: {
          partOfSpeech: vocabItem.partOfSpeech,
          examples: vocabItem.examples,
          notes: vocabItem.notes
        }
      },
      createdAt: progress?.createdAt || new Date(),
      updatedAt: progress?.updatedAt || new Date()
    };
  }

  /**
   * Calculate priority based on vocabulary item and progress
   */
  private calculatePriority(
    vocabItem: VocabularyItem, 
    progress?: VocabularyProgress | null
  ): number {
    let priority = 5; // Base priority

    // Higher priority for overdue items
    if (progress && progress.nextReview < new Date()) {
      const overdueDays = (Date.now() - progress.nextReview.getTime()) / (24 * 60 * 60 * 1000);
      priority += Math.min(overdueDays * 2, 5);
    }

    // Higher priority for low mastery items
    if (progress && progress.masteryLevel < 50) {
      priority += 3;
    }

    // JLPT level priority
    if (vocabItem.jlptLevel) {
      const jlptPriority = { 'N5': 3, 'N4': 2, 'N3': 1, 'N2': 0, 'N1': 0 };
      priority += jlptPriority[vocabItem.jlptLevel] || 0;
    }

    return Math.min(priority, 10);
  }

  /**
   * Calculate difficulty based on vocabulary item and progress
   */
  private calculateDifficulty(
    vocabItem: VocabularyItem, 
    progress?: VocabularyProgress | null
  ): number {
    let difficulty = 5; // Base difficulty

    // JLPT level difficulty
    if (vocabItem.jlptLevel) {
      const jlptDifficulty = { 'N5': 2, 'N4': 3, 'N3': 5, 'N2': 7, 'N1': 9 };
      difficulty = jlptDifficulty[vocabItem.jlptLevel] || 5;
    }

    // Adjust based on user progress
    if (progress) {
      if (progress.masteryLevel > 80) {
        difficulty = Math.max(1, difficulty - 2);
      } else if (progress.masteryLevel < 30) {
        difficulty = Math.min(10, difficulty + 2);
      }
    }

    return difficulty;
  }

  /**
   * Categorize progress items by priority level
   */
  private categorizeByPriority(progress: VocabularyProgress[]): Record<SourcePriority, number> {
    const counts = {
      [SourcePriority.LOW]: 0,
      [SourcePriority.MEDIUM]: 0,
      [SourcePriority.HIGH]: 0,
      [SourcePriority.URGENT]: 0
    };

    for (const p of progress) {
      const now = new Date();
      const overdueDays = (now.getTime() - p.nextReview.getTime()) / (24 * 60 * 60 * 1000);
      
      if (overdueDays > 7) {
        counts[SourcePriority.URGENT]++;
      } else if (overdueDays > 3) {
        counts[SourcePriority.HIGH]++;
      } else if (overdueDays > 0 || p.masteryLevel < 50) {
        counts[SourcePriority.MEDIUM]++;
      } else {
        counts[SourcePriority.LOW]++;
      }
    }

    return counts;
  }

  /**
   * Calculate study streak from recent sessions
   */
  private calculateStudyStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const sortedSessions = sessions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedSessions.length; i++) {
      const sessionDate = new Date(sortedSessions[i].startTime);
      sessionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Analyze performance trends from progress data
   */
  private analyzeTrends(progress: VocabularyProgress[]): {
    accuracy: 'improving' | 'stable' | 'declining';
    speed: 'improving' | 'stable' | 'declining';
    retention: 'improving' | 'stable' | 'declining';
  } {
    // Simplified trend analysis
    const recentProgress = progress
      .filter(p => p.lastReviewed && p.lastReviewed > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => (b.lastReviewed?.getTime() || 0) - (a.lastReviewed?.getTime() || 0));

    const averageQuality = recentProgress.length > 0
      ? recentProgress.reduce((sum, p) => sum + p.quality, 0) / recentProgress.length
      : 3;

    const averageMastery = recentProgress.length > 0
      ? recentProgress.reduce((sum, p) => sum + p.masteryLevel, 0) / recentProgress.length
      : 50;

    return {
      accuracy: averageQuality >= 3.5 ? 'improving' : averageQuality >= 2.5 ? 'stable' : 'declining',
      speed: 'stable', // Would need response time data to calculate
      retention: averageMastery >= 70 ? 'improving' : averageMastery >= 50 ? 'stable' : 'declining'
    };
  }

  /**
   * Get the most recent review session date
   */
  private getLastReviewSession(progress: VocabularyProgress[]): Date | undefined {
    const lastReviewed = progress
      .filter(p => p.lastReviewed)
      .map(p => p.lastReviewed!)
      .sort((a, b) => b.getTime() - a.getTime());

    return lastReviewed.length > 0 ? lastReviewed[0] : undefined;
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    this.vocabularyCache.clear();
    this.cachedStats = null;
    this.initialized = false;
    this.status = SourceStatus.DISABLED;
    
    console.log(`${this.name} adapter destroyed`);
  }
}