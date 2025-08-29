/**
 * Kanji Mastery Review Source Adapter
 * 
 * Integrates the Kanji Mastery feature with the Unified Review Hub system.
 * This adapter provides seamless access to kanji review items, progress tracking,
 * and statistics from the existing Kanji Mastery storage system.
 * 
 * Features:
 * - FSRS spaced repetition integration
 * - Multiple study modes (recognition, production, writing)
 * - JLPT level filtering
 * - Due item prioritization
 * - Progress statistics and analytics
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
import { kanjiMasteryStorage, KanjiProgress } from '@/services/kanji-mastery/indexdb-storage';
import { kanjiSpacedRepetition } from '@/services/kanji-mastery/spaced-repetition-service';

/**
 * Kanji Mastery specific configuration
 */
interface KanjiMasteryConfig extends SourceConfig {
  settings: {
    /** JLPT levels to include (N5, N4, N3, N2, N1) */
    jlptLevels: string[];
    /** Default study mode */
    defaultStudyMode: 'recognition' | 'production' | 'writing';
    /** Enable furigana hints */
    showFurigana: boolean;
    /** Include stroke order information */
    includeStrokeOrder: boolean;
    /** Maximum kanji per session */
    maxKanjiPerSession: number;
    /** Include new kanji in reviews */
    includeNewKanji: boolean;
    /** Daily new kanji limit */
    newKanjiLimit: number;
  };
}

/**
 * Extended kanji data for reviews
 */
interface ExtendedKanjiData {
  character: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  jlpt?: string;
  grade?: number;
  strokes?: number;
  frequency?: number;
  examples?: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
}

/**
 * Kanji Mastery Review Source Adapter
 * 
 * This adapter connects the existing Kanji Mastery system with the Unified Review Hub,
 * providing a standardized interface for kanji reviews while preserving all the
 * advanced features like FSRS scheduling and multi-mode study support.
 */
export class KanjiMasteryAdapter implements ReviewSource {
  // Required interface properties
  public readonly id = 'kanji-mastery';
  public readonly name = 'Kanji Mastery';
  public readonly type = ReviewSourceType.KANJI_MASTERY;
  public readonly icon = '🈷️';
  public readonly description = 'Master kanji with spaced repetition and multi-mode practice';
  public readonly paths = {
    main: '/tools/kanji-mastery',
    settings: '/tools/kanji-mastery/settings',
    stats: '/tools/kanji-mastery/stats',
    reviewPath: '/tools/kanji-mastery?mode=review&returnTo=/review'
  };
  public readonly supportedContentTypes = [ContentType.KANJI];
  public status: SourceStatus = SourceStatus.ACTIVE;
  public config: KanjiMasteryConfig;

  // Internal state
  private initialized = false;
  private kanjiDatabase: Map<string, ExtendedKanjiData> = new Map();

  constructor(config?: Partial<KanjiMasteryConfig>) {
    // Initialize with default configuration
    this.config = {
      enabled: true,
      maxItems: 50,
      priorityMultiplier: 1.0,
      preferredStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING],
      settings: {
        jlptLevels: ['N5', 'N4', 'N3', 'N2', 'N1'],
        defaultStudyMode: 'recognition',
        showFurigana: true,
        includeStrokeOrder: false,
        maxKanjiPerSession: 20,
        includeNewKanji: true,
        newKanjiLimit: 5,
        ...config?.settings
      },
      scheduling: {
        frequency: 'normal',
        minInterval: 10 // 10 minutes minimum between reviews
      },
      ...config
    } as KanjiMasteryConfig;
  }

  // ============================================================================
  // Core Interface Methods
  // ============================================================================

  /**
   * Initialize the Kanji Mastery adapter
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the underlying storage system
      await kanjiMasteryStorage.init();

      // Load kanji data (this would be from a comprehensive kanji database)
      await this.loadKanjiDatabase();

      this.status = SourceStatus.ACTIVE;
      this.initialized = true;

      console.log(`${this.name} adapter initialized successfully`);
      
    } catch (error) {
      this.status = SourceStatus.ERROR;
      throw new Error(`Failed to initialize ${this.name}: ${error}`);
    }
  }

  /**
   * Get kanji items due for review
   */
  public async getDueItems(options?: {
    limit?: number;
    priority?: SourcePriority;
    contentTypes?: ContentType[];
    studyModes?: StudyMode[];
  }): Promise<ReviewItem[]> {
    this.ensureInitialized();

    if (options?.contentTypes && !options.contentTypes.includes(ContentType.KANJI)) {
      return [];
    }

    const limit = Math.min(options?.limit || 20, this.config.maxItems || 50);
    
    // Get due kanji from all enabled JLPT levels
    const dueKanjiPromises = this.config.settings.jlptLevels.map(level => 
      kanjiMasteryStorage.getDueCards(level)
    );
    
    const allDueKanji = (await Promise.all(dueKanjiPromises)).flat();
    
    // Sort by priority (overdue items first, then by next review date)
    const now = new Date();
    const sortedKanji = allDueKanji
      .sort((a, b) => {
        const aOverdue = new Date(a.nextReview).getTime() - now.getTime();
        const bOverdue = new Date(b.nextReview).getTime() - now.getTime();
        
        // Overdue items first
        if (aOverdue < 0 && bOverdue >= 0) return -1;
        if (bOverdue < 0 && aOverdue >= 0) return 1;
        
        // Then by how overdue/due they are
        return aOverdue - bOverdue;
      })
      .slice(0, limit);

    // Convert to ReviewItem format
    const reviewItems: ReviewItem[] = [];
    
    for (const kanjiProgress of sortedKanji) {
      const kanjiData = this.kanjiDatabase.get(kanjiProgress.id);
      if (!kanjiData) continue; // Skip if kanji data not found

      const reviewItem: ReviewItem = {
        id: kanjiProgress.id,
        sourceId: this.id,
        contentType: ContentType.KANJI,
        content: this.createReviewItemContent(kanjiData, kanjiProgress),
        dueDate: new Date(kanjiProgress.nextReview),
        priority: this.calculatePriority(kanjiProgress),
        availableStudyModes: this.getAvailableStudyModes(kanjiProgress),
        metadata: {
          source: {
            jlptLevel: kanjiProgress.jlptLevel,
            grade: kanjiProgress.grade,
            masteryLevel: kanjiProgress.masteryLevel,
            reviewCount: kanjiProgress.reviewCount,
            lastReviewed: kanjiProgress.lastReviewed,
            retentionRate: kanjiProgress.retentionRate,
            studyModes: kanjiProgress.studyModes
          },
          tags: this.generateTags(kanjiData, kanjiProgress),
          difficulty: kanjiProgress.difficulty,
          properties: {
            strokes: kanjiData.strokes,
            frequency: kanjiData.frequency,
            examples: kanjiData.examples
          }
        },
        createdAt: kanjiProgress.createdAt,
        updatedAt: kanjiProgress.updatedAt
      };

      reviewItems.push(reviewItem);
    }

    return reviewItems;
  }

  /**
   * Get current statistics for Kanji Mastery
   */
  public async getStats(): Promise<SourceStats> {
    this.ensureInitialized();

    // Get comprehensive statistics from the storage system
    const stats = await kanjiMasteryStorage.getStats();
    const allProgress = await kanjiMasteryStorage.getAllProgress();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Calculate detailed statistics
    const dueToday = allProgress.filter(p => {
      const due = new Date(p.nextReview);
      return due >= today && due < tomorrow;
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

    // Calculate items by priority based on mastery level and difficulty
    const itemsByPriority = {
      [SourcePriority.LOW]: allProgress.filter(p => p.masteryLevel >= 80).length,
      [SourcePriority.MEDIUM]: allProgress.filter(p => p.masteryLevel >= 60 && p.masteryLevel < 80).length,
      [SourcePriority.HIGH]: allProgress.filter(p => p.masteryLevel >= 40 && p.masteryLevel < 60).length,
      [SourcePriority.URGENT]: allProgress.filter(p => p.masteryLevel < 40).length
    };

    // Calculate trends based on recent performance
    const recentSessions = stats.recentSessions || [];
    const trends = this.calculateTrends(recentSessions, allProgress);

    // Find the most recent review session
    const lastReviewSession = allProgress
      .filter(p => p.lastReviewed)
      .reduce((latest, p) => 
        !latest || p.lastReviewed > latest ? p.lastReviewed : latest, 
        undefined as Date | undefined
      );

    return {
      totalItems: stats.totalKanji,
      dueToday,
      overdue,
      scheduled,
      newItems,
      itemsByType: {
        [ContentType.KANJI]: stats.totalKanji
      } as Record<ContentType, number>,
      itemsByPriority: itemsByPriority as Record<SourcePriority, number>,
      averageMastery: stats.averageMastery,
      retentionRate: this.calculateOverallRetentionRate(allProgress),
      lastReviewSession,
      studyStreak: this.calculateStudyStreak(recentSessions),
      trends
    };
  }

  /**
   * Update source configuration
   */
  public async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.ensureInitialized();

    // Merge new configuration
    this.config = { ...this.config, ...config } as KanjiMasteryConfig;

    // Handle configuration changes
    if (config.enabled !== undefined) {
      this.status = config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
    }

    // Update settings in storage if needed
    if (config.settings) {
      await kanjiMasteryStorage.saveSettings({
        defaultStudyMode: (config.settings as any).defaultStudyMode,
        dailyNewKanji: (config.settings as any).newKanjiLimit,
        enableHints: (config.settings as any).showFurigana,
        enableSRS: true // Always enabled for this adapter
      });
    }

    console.log(`${this.name} configuration updated`);
  }

  /**
   * Process a review result from the Unified Review Hub
   */
  public async processReview(itemId: string, result: ReviewResult): Promise<void> {
    this.ensureInitialized();

    const kanjiData = this.kanjiDatabase.get(itemId);
    if (!kanjiData) {
      throw new Error(`Kanji ${itemId} not found in database`);
    }

    // Map the review result to our internal format and process it
    // using the existing FSRS-based spaced repetition service
    const studyMode = this.mapStudyModeToInternal(result.studyMode);
    
    try {
      await kanjiSpacedRepetition.processReview(
        itemId,
        result.rating,
        {
          character: kanjiData.character,
          meanings: kanjiData.meanings,
          onyomi: kanjiData.onyomi,
          kunyomi: kanjiData.kunyomi,
          jlpt: kanjiData.jlpt,
          grade: kanjiData.grade,
          strokes: kanjiData.strokes || 0
        },
        studyMode
      );

      console.log(`Processed review for kanji ${itemId}: rating=${result.rating}, mode=${studyMode}`);
      
    } catch (error) {
      console.error(`Failed to process review for kanji ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Search for kanji items
   */
  public async searchItems(query: string, options?: {
    contentTypes?: ContentType[];
    limit?: number;
  }): Promise<ReviewItem[]> {
    this.ensureInitialized();

    if (options?.contentTypes && !options.contentTypes.includes(ContentType.KANJI)) {
      return [];
    }

    const limit = options?.limit || 20;
    const lowerQuery = query.toLowerCase();
    const matchingKanji: ReviewItem[] = [];

    // Search through kanji database
    for (const [kanjiChar, kanjiData] of this.kanjiDatabase) {
      if (matchingKanji.length >= limit) break;

      const matches = 
        kanjiChar === query || // Exact kanji match
        kanjiData.meanings.some(meaning => 
          meaning.toLowerCase().includes(lowerQuery)
        ) ||
        kanjiData.onyomi.some(reading => 
          reading.toLowerCase().includes(lowerQuery)
        ) ||
        kanjiData.kunyomi.some(reading => 
          reading.toLowerCase().includes(lowerQuery)
        );

      if (matches) {
        const progress = await kanjiMasteryStorage.getProgress(kanjiChar);
        
        const reviewItem: ReviewItem = {
          id: kanjiChar,
          sourceId: this.id,
          contentType: ContentType.KANJI,
          content: this.createReviewItemContent(kanjiData, progress),
          dueDate: progress ? new Date(progress.nextReview) : new Date(),
          priority: progress ? this.calculatePriority(progress) : 5,
          availableStudyModes: this.getAvailableStudyModes(progress),
          metadata: {
            source: progress ? {
              jlptLevel: progress.jlptLevel,
              masteryLevel: progress.masteryLevel,
              reviewCount: progress.reviewCount
            } : {},
            tags: this.generateTags(kanjiData, progress),
            difficulty: progress?.difficulty || 5,
            properties: {
              strokes: kanjiData.strokes,
              frequency: kanjiData.frequency
            }
          },
          createdAt: progress?.createdAt || new Date(),
          updatedAt: progress?.updatedAt || new Date()
        };

        matchingKanji.push(reviewItem);
      }
    }

    return matchingKanji;
  }

  /**
   * Get a specific kanji item by ID
   */
  public async getItem(itemId: string): Promise<ReviewItem | null> {
    this.ensureInitialized();

    const kanjiData = this.kanjiDatabase.get(itemId);
    if (!kanjiData) {
      return null;
    }

    const progress = await kanjiMasteryStorage.getProgress(itemId);

    return {
      id: itemId,
      sourceId: this.id,
      contentType: ContentType.KANJI,
      content: this.createReviewItemContent(kanjiData, progress),
      dueDate: progress ? new Date(progress.nextReview) : new Date(),
      priority: progress ? this.calculatePriority(progress) : 5,
      availableStudyModes: this.getAvailableStudyModes(progress),
      metadata: {
        source: progress ? {
          jlptLevel: progress.jlptLevel,
          masteryLevel: progress.masteryLevel,
          reviewCount: progress.reviewCount,
          retentionRate: progress.retentionRate,
          studyModes: progress.studyModes
        } : {},
        tags: this.generateTags(kanjiData, progress),
        difficulty: progress?.difficulty || 5,
        properties: {
          strokes: kanjiData.strokes,
          frequency: kanjiData.frequency,
          examples: kanjiData.examples
        }
      },
      createdAt: progress?.createdAt || new Date(),
      updatedAt: progress?.updatedAt || new Date()
    };
  }

  /**
   * Check if the source is healthy and available
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Check if storage system is working
      const stats = await kanjiMasteryStorage.getStats();
      const hasKanjiData = this.kanjiDatabase.size > 0;
      const isConfigValid = this.config.enabled !== undefined;

      const healthy = this.initialized && hasKanjiData && isConfigValid && stats !== null;
      
      if (!healthy) {
        this.status = SourceStatus.ERROR;
      } else if (this.status === SourceStatus.ERROR) {
        this.status = SourceStatus.ACTIVE;
      }

      return healthy;
    } catch (error) {
      this.status = SourceStatus.ERROR;
      console.error(`Kanji Mastery health check failed:`, error);
      return false;
    }
  }

  // ============================================================================
  // Additional Methods for Review Hub Integration
  // ============================================================================

  /**
   * Get preview items for the review hub dashboard
   * Returns 3 sample due kanji for preview cards
   */
  public async getPreviewItems(): Promise<ReviewItem[]> {
    const dueItems = await this.getDueItems({ limit: 3 });
    return dueItems;
  }

  /**
   * Mark an item as reviewed (used by the review hub)
   */
  public async markReviewed(itemId: string, rating: number, studyMode: StudyMode, responseTime: number): Promise<void> {
    const reviewResult: ReviewResult = {
      itemId,
      rating,
      responseTime,
      studyMode,
      hintsUsed: false, // Could be enhanced to track this
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
   * Load kanji database (mock implementation)
   * In a real implementation, this would load from a comprehensive kanji database
   */
  private async loadKanjiDatabase(): Promise<void> {
    // Mock kanji data - in production this would load from a comprehensive database
    const mockKanjiData: ExtendedKanjiData[] = [
      // N5 Level
      { character: '人', meanings: ['person'], onyomi: ['ジン', 'ニン'], kunyomi: ['ひと'], jlpt: 'N5', grade: 1, strokes: 2 },
      { character: '日', meanings: ['day', 'sun'], onyomi: ['ニチ', 'ジツ'], kunyomi: ['ひ', 'か'], jlpt: 'N5', grade: 1, strokes: 4 },
      { character: '本', meanings: ['book', 'origin'], onyomi: ['ホン'], kunyomi: ['もと'], jlpt: 'N5', grade: 1, strokes: 5 },
      { character: '学', meanings: ['study', 'learning'], onyomi: ['ガク'], kunyomi: ['まな'], jlpt: 'N5', grade: 1, strokes: 8 },
      { character: '時', meanings: ['time', 'hour'], onyomi: ['ジ'], kunyomi: ['とき'], jlpt: 'N5', grade: 2, strokes: 10 },
      // Add more kanji data as needed
    ];

    // Store in our database map
    for (const kanji of mockKanjiData) {
      this.kanjiDatabase.set(kanji.character, kanji);
    }

    console.log(`Loaded ${mockKanjiData.length} kanji into database`);
  }

  /**
   * Create review item content for a kanji
   */
  private createReviewItemContent(kanjiData: ExtendedKanjiData, progress: KanjiProgress | null): ReviewItemContent {
    const content: ReviewItemContent = {
      primary: kanjiData.character,
      secondary: kanjiData.meanings.join(', '),
      context: `Readings: ${[...kanjiData.onyomi, ...kanjiData.kunyomi].join(', ')}`
    };

    // Add furigana if enabled
    if (this.config.settings.showFurigana && kanjiData.kunyomi.length > 0) {
      content.formatted = {
        primary: kanjiData.character,
        secondary: kanjiData.meanings.join(', '),
        context: `On: ${kanjiData.onyomi.join(', ')} | Kun: ${kanjiData.kunyomi.join(', ')}`
      };
    }

    // Add additional context for advanced learners
    if (kanjiData.examples && kanjiData.examples.length > 0) {
      const exampleText = kanjiData.examples
        .slice(0, 2) // Show max 2 examples
        .map(ex => `${ex.word} (${ex.reading}): ${ex.meaning}`)
        .join(' | ');
      
      content.context += ` | Examples: ${exampleText}`;
    }

    return content;
  }

  /**
   * Calculate priority based on kanji progress
   */
  private calculatePriority(progress: KanjiProgress): number {
    // Higher priority for:
    // - Lower mastery level
    // - More overdue items
    // - Items with recent mistakes
    
    const masteryFactor = Math.max(1, 10 - (progress.masteryLevel / 10));
    const overdueFactor = Math.max(1, Math.min(5, 
      (Date.now() - new Date(progress.nextReview).getTime()) / (24 * 60 * 60 * 1000)
    ));
    const retentionFactor = Math.max(1, (100 - progress.retentionRate) / 20);
    
    return Math.min(10, Math.round((masteryFactor + overdueFactor + retentionFactor) / 3));
  }

  /**
   * Get available study modes for a kanji
   */
  private getAvailableStudyModes(progress: KanjiProgress | null): StudyMode[] {
    const modes = [StudyMode.RECOGNITION, StudyMode.PRODUCTION, StudyMode.READING];
    
    // Add typing mode for advanced learners
    if (progress && progress.masteryLevel > 50) {
      modes.push(StudyMode.TYPING);
    }
    
    return modes;
  }

  /**
   * Generate tags for a kanji item
   */
  private generateTags(kanjiData: ExtendedKanjiData, progress: KanjiProgress | null): string[] {
    const tags: string[] = [];
    
    if (kanjiData.jlpt) tags.push(kanjiData.jlpt);
    if (kanjiData.grade) tags.push(`Grade-${kanjiData.grade}`);
    if (kanjiData.strokes && kanjiData.strokes <= 5) tags.push('simple');
    if (kanjiData.strokes && kanjiData.strokes > 15) tags.push('complex');
    if (progress && progress.masteryLevel >= 80) tags.push('mastered');
    if (progress && progress.masteryLevel < 40) tags.push('struggling');
    if (progress && progress.reviewCount === 0) tags.push('new');
    
    return tags;
  }

  /**
   * Map Unified Review Hub study mode to internal format
   */
  private mapStudyModeToInternal(studyMode: StudyMode): 'recognition' | 'production' | 'writing' {
    switch (studyMode) {
      case StudyMode.RECOGNITION:
      case StudyMode.READING:
        return 'recognition';
      case StudyMode.PRODUCTION:
      case StudyMode.TYPING:
        return 'production';
      default:
        return 'recognition';
    }
  }

  /**
   * Calculate overall retention rate from all progress items
   */
  private calculateOverallRetentionRate(allProgress: KanjiProgress[]): number {
    if (allProgress.length === 0) return 0;
    
    const totalRetention = allProgress.reduce((sum, p) => sum + (p.retentionRate || 0), 0);
    return Math.round(totalRetention / allProgress.length);
  }

  /**
   * Calculate study streak from recent sessions
   */
  private calculateStudyStreak(recentSessions: any[]): number {
    // This would need to be implemented based on the session data structure
    // For now, return a simple calculation
    if (recentSessions.length === 0) return 0;
    
    let streak = 0;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < recentSessions.length; i++) {
      const session = recentSessions[i];
      const sessionDate = new Date(session.startTime || session.date);
      const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / msPerDay);
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(recentSessions: any[], allProgress: KanjiProgress[]): {
    accuracy: 'improving' | 'stable' | 'declining';
    speed: 'improving' | 'stable' | 'declining';
    retention: 'improving' | 'stable' | 'declining';
  } {
    // Simple trend calculation - could be more sophisticated
    const overallRetention = this.calculateOverallRetentionRate(allProgress);
    const averageMastery = allProgress.length > 0 
      ? allProgress.reduce((sum, p) => sum + p.masteryLevel, 0) / allProgress.length 
      : 0;
    
    return {
      accuracy: averageMastery > 70 ? 'improving' : averageMastery > 50 ? 'stable' : 'declining',
      speed: 'stable', // Would need response time data to calculate
      retention: overallRetention > 80 ? 'improving' : overallRetention > 60 ? 'stable' : 'declining'
    };
  }
}

// Export the adapter class for use in the review sources registry
export default KanjiMasteryAdapter;