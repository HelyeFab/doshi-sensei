/**
 * Example Review Source Implementation
 * 
 * This is a reference implementation showing how to create a review source
 * that integrates with the Unified Review Hub system.
 * 
 * This example demonstrates:
 * - Implementing the ReviewSource interface
 * - Handling initialization and configuration
 * - Providing due items and statistics
 * - Processing review results
 * - Error handling and health checks
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
} from './review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';
import { REVIEW_SOURCE_CONFIGS } from './constants';

/**
 * Example configuration for the source
 */
interface ExampleSourceConfig extends SourceConfig {
  settings: {
    /** Example setting: difficulty level */
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    /** Example setting: include audio */
    includeAudio: boolean;
    /** Example setting: show furigana */
    showFurigana: boolean;
  };
}

/**
 * Example data structure for source items
 */
interface ExampleItem {
  id: string;
  question: string;
  answer: string;
  difficulty: number;
  lastReviewed?: Date;
  nextReview: Date;
  reviewCount: number;
  successRate: number;
  tags: string[];
}

/**
 * Example Review Source Implementation
 * 
 * This source simulates a vocabulary practice system with mock data
 * and demonstrates all required interface methods.
 */
export class ExampleReviewSource implements ReviewSource {
  // Required interface properties
  public readonly id = 'example-source';
  public readonly name = 'Example Source';
  public readonly type = ReviewSourceType.CUSTOM_LISTS;
  public readonly icon = '🎯';
  public readonly description = 'Example review source for demonstration';
  public readonly paths = {
    main: '/example/main',
    settings: '/example/settings',
    stats: '/example/stats'
  };
  public readonly supportedContentTypes = [ContentType.VOCABULARY, ContentType.CUSTOM];
  public status: SourceStatus = SourceStatus.ACTIVE;
  public config: ExampleSourceConfig;

  // Internal state
  private items: ExampleItem[] = [];
  private initialized = false;
  private lastStatsUpdate = new Date();

  constructor(config?: Partial<ExampleSourceConfig>) {
    // Initialize with default configuration
    const defaultConfig = REVIEW_SOURCE_CONFIGS[this.type].defaultConfig;
    
    this.config = {
      ...defaultConfig,
      settings: {
        difficultyLevel: 'intermediate',
        includeAudio: false,
        showFurigana: true,
        ...defaultConfig.settings
      },
      ...config
    } as ExampleSourceConfig;

    this.generateMockData();
  }

  // ============================================================================
  // Core Interface Methods
  // ============================================================================

  /**
   * Initialize the source
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Simulate initialization work (loading data, connecting to services, etc.)
      await this.simulateAsyncOperation(500);

      // In a real implementation, you might:
      // - Load data from IndexedDB
      // - Initialize external connections
      // - Validate configuration
      // - Set up event listeners

      this.status = SourceStatus.ACTIVE;
      this.initialized = true;

      console.log(`${this.name} initialized successfully`);
      
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

    const limit = Math.min(options?.limit || 20, this.config.maxItems || 50);
    const now = new Date();

    // Filter items that are due
    const dueItems = this.items
      .filter(item => item.nextReview <= now)
      .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
      .slice(0, limit);

    // Convert to ReviewItem format
    const reviewItems: ReviewItem[] = dueItems.map(item => ({
      id: item.id,
      sourceId: this.id,
      contentType: ContentType.VOCABULARY,
      content: this.createReviewItemContent(item),
      dueDate: item.nextReview,
      priority: item.difficulty,
      availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
      metadata: {
        source: {
          successRate: item.successRate,
          reviewCount: item.reviewCount,
          lastReviewed: item.lastReviewed
        },
        tags: item.tags,
        difficulty: item.difficulty
      },
      createdAt: new Date(), // In real implementation, store this
      updatedAt: new Date()
    }));

    return reviewItems;
  }

  /**
   * Get current statistics for this source
   */
  public async getStats(): Promise<SourceStats> {
    this.ensureInitialized();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Calculate statistics from our items
    const dueToday = this.items.filter(item => 
      item.nextReview >= today && item.nextReview < tomorrow
    ).length;

    const overdue = this.items.filter(item => 
      item.nextReview < today
    ).length;

    const scheduled = this.items.filter(item => 
      item.nextReview >= tomorrow
    ).length;

    const newItems = this.items.filter(item => 
      item.reviewCount === 0
    ).length;

    const averageMastery = this.items.length > 0
      ? this.items.reduce((sum, item) => sum + item.successRate, 0) / this.items.length
      : 0;

    const retentionRate = this.items.length > 0
      ? this.items.reduce((sum, item) => sum + item.successRate, 0) / this.items.length
      : 0;

    // Calculate study streak (simplified - would need session history)
    const studyStreak = Math.floor(Math.random() * 30); // Mock value

    this.lastStatsUpdate = now;

    return {
      totalItems: this.items.length,
      dueToday,
      overdue,
      scheduled,
      newItems,
      itemsByType: {
        [ContentType.VOCABULARY]: this.items.length
      } as Record<ContentType, number>,
      itemsByPriority: {
        [SourcePriority.LOW]: this.items.filter(i => i.difficulty <= 3).length,
        [SourcePriority.MEDIUM]: this.items.filter(i => i.difficulty > 3 && i.difficulty <= 6).length,
        [SourcePriority.HIGH]: this.items.filter(i => i.difficulty > 6 && i.difficulty <= 8).length,
        [SourcePriority.URGENT]: this.items.filter(i => i.difficulty > 8).length
      } as Record<SourcePriority, number>,
      averageMastery,
      retentionRate,
      lastReviewSession: this.items
        .filter(item => item.lastReviewed)
        .reduce((latest, item) => 
          !latest || (item.lastReviewed && item.lastReviewed > latest) 
            ? item.lastReviewed! 
            : latest, 
          undefined as Date | undefined
        ),
      studyStreak,
      trends: {
        accuracy: averageMastery > 70 ? 'improving' : averageMastery > 50 ? 'stable' : 'declining',
        speed: 'stable',
        retention: retentionRate > 80 ? 'improving' : retentionRate > 60 ? 'stable' : 'declining'
      }
    };
  }

  /**
   * Update source configuration
   */
  public async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.ensureInitialized();

    // Merge new configuration
    this.config = { ...this.config, ...config } as ExampleSourceConfig;

    // Handle configuration changes
    if (config.enabled !== undefined) {
      this.status = config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
    }

    // In a real implementation, you might:
    // - Save config to storage
    // - Update internal state based on new config
    // - Trigger re-initialization if needed

    console.log(`${this.name} configuration updated`);
  }

  /**
   * Process a review result
   */
  public async processReview(itemId: string, result: ReviewResult): Promise<void> {
    this.ensureInitialized();

    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found in ${this.name}`);
    }

    // Update item based on review result
    item.lastReviewed = result.timestamp;
    item.reviewCount++;

    // Update success rate based on rating (1-4 scale)
    const success = result.rating >= 3 ? 1 : 0;
    item.successRate = (item.successRate * (item.reviewCount - 1) + success) / item.reviewCount;

    // Calculate next review date based on performance
    const baseInterval = this.calculateNextInterval(result.rating, item.reviewCount);
    item.nextReview = new Date(Date.now() + baseInterval * 24 * 60 * 60 * 1000);

    // In a real implementation, you would:
    // - Save updated item to storage
    // - Update any external systems
    // - Trigger analytics updates

    console.log(`Processed review for ${itemId}: rating=${result.rating}, next review in ${baseInterval} days`);
  }

  /**
   * Search for items within this source
   */
  public async searchItems(query: string, options?: {
    contentTypes?: ContentType[];
    limit?: number;
  }): Promise<ReviewItem[]> {
    this.ensureInitialized();

    const limit = options?.limit || 20;
    const lowerQuery = query.toLowerCase();

    const matchingItems = this.items
      .filter(item => 
        item.question.toLowerCase().includes(lowerQuery) ||
        item.answer.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit)
      .map(item => ({
        id: item.id,
        sourceId: this.id,
        contentType: ContentType.VOCABULARY,
        content: this.createReviewItemContent(item),
        dueDate: item.nextReview,
        priority: item.difficulty,
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: { successRate: item.successRate },
          tags: item.tags,
          difficulty: item.difficulty
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    return matchingItems;
  }

  /**
   * Get item by ID
   */
  public async getItem(itemId: string): Promise<ReviewItem | null> {
    this.ensureInitialized();

    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      sourceId: this.id,
      contentType: ContentType.VOCABULARY,
      content: this.createReviewItemContent(item),
      dueDate: item.nextReview,
      priority: item.difficulty,
      availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
      metadata: {
        source: { 
          successRate: item.successRate,
          reviewCount: item.reviewCount,
          lastReviewed: item.lastReviewed 
        },
        tags: item.tags,
        difficulty: item.difficulty
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Check if the source is healthy and available
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Perform health checks
      const isInitialized = this.initialized;
      const hasItems = this.items.length > 0;
      const configValid = this.config.enabled !== undefined;

      // In a real implementation, you might:
      // - Test database connections
      // - Verify external service availability
      // - Check data integrity
      // - Validate permissions

      const healthy = isInitialized && hasItems && configValid;
      
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
  // Optional Interface Methods (examples)
  // ============================================================================

  /**
   * Add new items to the source
   */
  public async addItems(items: Array<{
    question: string;
    answer: string;
    difficulty?: number;
    tags?: string[];
  }>): Promise<string[]> {
    this.ensureInitialized();

    const newItemIds: string[] = [];

    for (const itemData of items) {
      const id = `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newItem: ExampleItem = {
        id,
        question: itemData.question,
        answer: itemData.answer,
        difficulty: itemData.difficulty || 5,
        nextReview: new Date(), // Due immediately for new items
        reviewCount: 0,
        successRate: 0,
        tags: itemData.tags || []
      };

      this.items.push(newItem);
      newItemIds.push(id);
    }

    console.log(`Added ${newItemIds.length} items to ${this.name}`);
    return newItemIds;
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    this.items = [];
    this.initialized = false;
    this.status = SourceStatus.DISABLED;
    
    // In a real implementation:
    // - Close database connections
    // - Clean up event listeners
    // - Cancel pending operations
    
    console.log(`${this.name} destroyed`);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Ensure the source is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} is not initialized. Call init() first.`);
    }
  }

  /**
   * Create review item content from internal item
   */
  private createReviewItemContent(item: ExampleItem): ReviewItemContent {
    const content: ReviewItemContent = {
      primary: item.question,
      secondary: item.answer
    };

    // Add furigana if enabled
    if (this.config.settings.showFurigana) {
      content.formatted = {
        primary: item.question, // Would add furigana markup in real implementation
        secondary: item.answer
      };
    }

    // Add context based on tags
    if (item.tags.length > 0) {
      content.context = `Tags: ${item.tags.join(', ')}`;
    }

    return content;
  }

  /**
   * Calculate next review interval based on performance
   */
  private calculateNextInterval(rating: number, reviewCount: number): number {
    // Simple interval calculation (real implementation would use SRS algorithm)
    const baseIntervals = [0.25, 1, 2, 4]; // Again, Hard, Good, Easy (in days)
    const baseInterval = baseIntervals[rating - 1] || 1;
    
    // Increase interval based on review count
    const multiplier = Math.pow(1.3, Math.min(reviewCount - 1, 10));
    
    return Math.max(0.25, baseInterval * multiplier);
  }

  /**
   * Generate mock data for demonstration
   */
  private generateMockData(): void {
    const mockItems: Partial<ExampleItem>[] = [
      { question: '猫', answer: 'cat', difficulty: 3, tags: ['animals', 'basic'] },
      { question: '犬', answer: 'dog', difficulty: 3, tags: ['animals', 'basic'] },
      { question: '本', answer: 'book', difficulty: 2, tags: ['objects', 'basic'] },
      { question: '学校', answer: 'school', difficulty: 4, tags: ['places', 'education'] },
      { question: '友達', answer: 'friend', difficulty: 5, tags: ['people', 'relationships'] },
      { question: '時間', answer: 'time', difficulty: 6, tags: ['abstract', 'time'] },
      { question: '勉強', answer: 'study', difficulty: 5, tags: ['education', 'verbs'] },
      { question: '食べる', answer: 'to eat', difficulty: 4, tags: ['verbs', 'food'] },
      { question: '飲む', answer: 'to drink', difficulty: 4, tags: ['verbs', 'food'] },
      { question: '見る', answer: 'to see/watch', difficulty: 3, tags: ['verbs', 'basic'] }
    ];

    this.items = mockItems.map((item, index) => ({
      id: `mock-${index}`,
      question: item.question!,
      answer: item.answer!,
      difficulty: item.difficulty!,
      nextReview: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within a week
      reviewCount: Math.floor(Math.random() * 10),
      successRate: 0.6 + Math.random() * 0.4, // 60-100% success rate
      tags: item.tags!,
      lastReviewed: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined
    }));
  }

  /**
   * Simulate async operation (for demo purposes)
   */
  private async simulateAsyncOperation(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}