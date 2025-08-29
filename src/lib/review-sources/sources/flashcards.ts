/**
 * Flashcards Review Source Implementation
 * 
 * This source integrates with user-created flashcards and custom decks
 * to provide review items with multimedia support.
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
import StudyListManager from '@/utils/studyListManager';
import { flashcardSRSManager } from '@/utils/flashcardSRSManager';
import { FlashcardItem, isAnkiCard, getFlashcardDisplayText } from '@/types/flashcard';
import { JapaneseWord } from '@/types';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export class FlashcardsSource implements ReviewSource {
  readonly id = 'flashcards';
  readonly name = 'Flashcards';
  readonly type = ReviewSourceType.FLASHCARDS;
  readonly icon = '🗃️';
  readonly description = 'Custom flashcard decks with multimedia support';
  readonly supportedContentTypes = [ContentType.FLASHCARD, ContentType.CUSTOM];
  readonly paths = {
    main: '/drill/flashcards',
    settings: '/settings/flashcards'
  };

  private initialized = false;
  private cachedFlashcards: FlashcardItem[] | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private userId: string | null,
    public config: SourceConfig = REVIEW_SOURCE_CONFIGS[ReviewSourceType.FLASHCARDS].defaultConfig
  ) {
    // Initialize flashcard SRS manager if user is provided
    if (this.userId && auth?.currentUser) {
      flashcardSRSManager.setUser(this.userId, false); // Subscription status should be updated separately
    }
  }

  get status(): SourceStatus {
    if (!this.initialized) return SourceStatus.DISABLED;
    return this.config.enabled ? SourceStatus.ACTIVE : SourceStatus.PAUSED;
  }

  async init(): Promise<void> {
    try {
      // Check if we have Firebase (allow graceful degradation)
      if (!auth && typeof window !== 'undefined') {
        console.warn('Firebase auth not available - flashcards may have limited functionality');
      }

      // Initialize flashcard SRS manager
      if (this.userId) {
        try {
          // Note: Subscription status should be set separately via updateSubscriptionStatus method
          flashcardSRSManager.setUser(this.userId, false);
        } catch (error) {
          console.warn('Failed to initialize SRS manager - using local storage only:', error);
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize flashcards source:', error);
      // Don't throw - allow graceful degradation
      this.initialized = false;
    }
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

    if (!this.userId) {
      return []; // No user, no flashcards
    }

    try {
      const limit = Math.min(options?.limit || 40, this.config.maxItems || 40);
      
      // Get user's flashcards from StudyListManager
      const flashcards = await this.getRealFlashcards();
      
      if (flashcards.length === 0) {
        return [];
      }

      // Get card IDs and load their SRS data
      const cardIds = flashcards.map(card => card.id);
      const srsDataMap = await flashcardSRSManager.loadSRSData(cardIds);
      
      // Filter for due items
      const now = new Date();
      const dueItems = flashcards.filter(card => {
        const srsData = srsDataMap.get(card.id);
        if (!srsData) return true; // New cards are considered due
        return srsData.due <= now;
      }).slice(0, limit);

      // Convert to ReviewItem format
      return dueItems.map((card): ReviewItem => {
        const srsData = srsDataMap.get(card.id);
        const displayText = this.getCardDisplayText(card);
        
        return {
          id: card.id,
          sourceId: this.id,
          contentType: ContentType.FLASHCARD,
          content: {
            primary: displayText.front,
            secondary: displayText.back,
            context: displayText.context || undefined || undefined,
            image: displayText.image ? { url: displayText.image } : undefined,
            audio: displayText.audio ? { url: displayText.audio, autoPlay: false } : undefined,
            formatted: {
              primary: displayText.front,
              secondary: displayText.back,
              context: displayText.context || undefined
            }
          },
          dueDate: srsData?.due || new Date(),
          priority: this.calculateItemPriorityFromSRS(card, srsData),
          availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
          metadata: {
            source: 'flashcards',
            tags: displayText.tags,
            difficulty: this.getDifficultyFromSRS(srsData),
            properties: {
              cardType: isAnkiCard(card) ? 'anki' : 'word',
              hasImage: !!displayText.image,
              hasAudio: !!displayText.audio,
              srsStatus: srsData?.status || 'new',
              interval: srsData?.interval || 0,
              reviews: srsData?.reviews || 0
            }
          },
          createdAt: new Date(card.createdAt || Date.now()),
          updatedAt: new Date(card.updatedAt || Date.now())
        };
      });
    } catch (error) {
      console.error('Failed to get due items from flashcards:', error);
      return [];
    }
  }

  async getStats(): Promise<SourceStats> {
    if (!this.initialized) {
      return this.getEmptyStats();
    }

    if (!this.userId) {
      return this.getEmptyStats();
    }

    try {
      // Get real statistics from flashcard SRS manager with error handling
      let srsStats;
      try {
        srsStats = await flashcardSRSManager.getStatistics();
      } catch (srsError) {
        console.warn('Failed to get SRS statistics, using fallback:', srsError);
        // Use fallback stats calculation
        srsStats = {
          totalCards: 0,
          dueToday: 0,
          newCards: 0,
          learningCards: 0,
          reviewCards: 0,
          averageEase: 2.5,
          totalReviews: 0
        };
      }
      
      // Get all user flashcards to calculate type distribution
      const flashcards = await this.getRealFlashcards();
      
      // Fallback stats if no flashcards or SRS error
      if (flashcards.length === 0) {
        return {
          ...this.getEmptyStats(),
          totalItems: 0
        };
      }
      
      const cardIds = flashcards.map(card => card.id);
      let srsDataMap = new Map();
      
      try {
        srsDataMap = await flashcardSRSManager.loadSRSData(cardIds);
      } catch (srsError) {
        console.warn('Failed to load SRS data, using empty map:', srsError);
        // Continue with empty SRS data map
      }
      
      // Calculate overdue items
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let overdue = 0;
      let scheduled = 0;
      const priorityCounts = {
        [SourcePriority.LOW]: 0,
        [SourcePriority.MEDIUM]: 0,
        [SourcePriority.HIGH]: 0,
        [SourcePriority.URGENT]: 0
      };
      
      flashcards.forEach(card => {
        try {
          const srsData = srsDataMap.get(card.id);
          const priority = this.calculateItemPriorityFromSRS(card, srsData);
          
          // Count priority distribution
          if (priority <= 3) priorityCounts[SourcePriority.LOW]++;
          else if (priority <= 5) priorityCounts[SourcePriority.MEDIUM]++;
          else if (priority <= 7) priorityCounts[SourcePriority.HIGH]++;
          else priorityCounts[SourcePriority.URGENT]++;
          
          if (srsData && srsData.due) {
            if (srsData.due < oneDayAgo) {
              overdue++;
            } else if (srsData.due > now) {
              scheduled++;
            }
          }
        } catch (cardError) {
          console.warn(`Error processing card ${card.id}:`, cardError);
          // Default to medium priority
          priorityCounts[SourcePriority.MEDIUM]++;
        }
      });
      
      // Count flashcard types
      const ankiCards = flashcards.filter(card => {
        try {
          return isAnkiCard(card);
        } catch {
          return false;
        }
      }).length;
      const wordCards = flashcards.length - ankiCards;
      
      return {
        totalItems: srsStats.totalCards || flashcards.length,
        dueToday: srsStats.dueToday || 0,
        overdue: overdue,
        scheduled: scheduled,
        newItems: srsStats.newCards || 0,
        itemsByType: {
          [ContentType.FLASHCARD]: ankiCards,
          [ContentType.VOCABULARY]: wordCards,
          [ContentType.CUSTOM]: 0,
          [ContentType.KANJI]: 0,
          [ContentType.GRAMMAR]: 0,
          [ContentType.SENTENCE]: 0,
          [ContentType.RADICAL]: 0
        },
        itemsByPriority: priorityCounts,
        averageMastery: Math.round((srsStats.averageEase || 2.5) * 20), // Convert to percentage-like score
        retentionRate: Math.min(1, (srsStats.averageEase || 2.5) / 4), // Normalize ease to 0-1
        lastReviewSession: await this.getLastReviewSession(),
        studyStreak: await this.calculateStudyStreak(),
        trends: {
          accuracy: 'stable', // Could be enhanced with historical data
          speed: 'stable',
          retention: 'stable'
        }
      };
    } catch (error) {
      console.error('Failed to get flashcards stats:', error);
      return this.getEmptyStats();
    }
  }

  async updateConfig(config: Partial<SourceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async processReview(itemId: string, result: ReviewResult): Promise<void> {
    if (!this.initialized) {
      throw new Error('Source not initialized');
    }

    if (!this.userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Load current SRS data
      const srsDataMap = await flashcardSRSManager.loadSRSData([itemId]);
      const currentSRS = srsDataMap.get(itemId);
      
      if (!currentSRS) {
        console.warn(`No SRS data found for card ${itemId}`);
        return;
      }
      
      // Convert ReviewResult to SRS rating
      let rating: 'again' | 'hard' | 'good' | 'easy';
      
      // Calculate accuracy from rating (1-4 scale)
      const accuracy = result.rating / 4;
      
      if (accuracy < 0.3) {
        rating = 'again';
      } else if (accuracy < 0.6) {
        rating = 'hard';
      } else if (accuracy < 0.9) {
        rating = 'good';
      } else {
        rating = 'easy';
      }
      
      // Update SRS data would be handled by the SRS algorithm
      // This is typically done in the UI layer (FlashcardReviewPage)
      // But we can track the review here
      console.log(`Processed flashcard review for ${itemId} with rating: ${rating}`);
      
    } catch (error) {
      console.error('Failed to process flashcard review:', error);
      throw error;
    }
  }

  async searchItems(query: string, options?: {
    contentTypes?: ContentType[];
    limit?: number;
  }): Promise<ReviewItem[]> {
    if (!this.initialized || !this.userId) {
      return [];
    }

    try {
      const flashcards = await this.getRealFlashcards();
      const cardIds = flashcards.map(card => card.id);
      const srsDataMap = await flashcardSRSManager.loadSRSData(cardIds);
      
      const queryLower = query.toLowerCase();
      const results = flashcards
        .filter(card => {
          const displayText = this.getCardDisplayText(card);
          return (
            displayText.front.toLowerCase().includes(queryLower) ||
            displayText.back.toLowerCase().includes(queryLower) ||
            displayText.context?.toLowerCase().includes(queryLower) ||
            displayText.tags.some(tag => tag.toLowerCase().includes(queryLower))
          );
        })
        .slice(0, options?.limit || 20);

      return results.map((card): ReviewItem => {
        const srsData = srsDataMap.get(card.id);
        const displayText = this.getCardDisplayText(card);
        
        return {
          id: card.id,
          sourceId: this.id,
          contentType: ContentType.FLASHCARD,
          content: {
            primary: displayText.front,
            secondary: displayText.back,
            context: displayText.context || undefined
          },
          dueDate: srsData?.due || new Date(),
          priority: this.calculateItemPriorityFromSRS(card, srsData),
          availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
          metadata: {
            source: 'flashcards',
            tags: displayText.tags,
            difficulty: this.getDifficultyFromSRS(srsData)
          },
          createdAt: new Date(card.createdAt || Date.now()),
          updatedAt: new Date(card.updatedAt || Date.now())
        };
      });
    } catch (error) {
      console.error('Failed to search flashcards:', error);
      return [];
    }
  }

  async getItem(itemId: string): Promise<ReviewItem | null> {
    if (!this.initialized || !this.userId) {
      return null;
    }

    try {
      const flashcards = await this.getRealFlashcards();
      const card = flashcards.find(c => c.id === itemId);
      
      if (!card) return null;

      const srsDataMap = await flashcardSRSManager.loadSRSData([itemId]);
      const srsData = srsDataMap.get(itemId);
      const displayText = this.getCardDisplayText(card);

      return {
        id: card.id,
        sourceId: this.id,
        contentType: ContentType.FLASHCARD,
        content: {
          primary: displayText.front,
          secondary: displayText.back,
          context: displayText.context || undefined || undefined,
          image: displayText.image ? { url: displayText.image } : undefined,
          audio: displayText.audio ? { url: displayText.audio, autoPlay: false } : undefined
        },
        dueDate: srsData?.due || new Date(),
        priority: this.calculateItemPriorityFromSRS(card, srsData),
        availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
        metadata: {
          source: 'flashcards',
          tags: displayText.tags,
          difficulty: this.getDifficultyFromSRS(srsData),
          properties: {
            cardType: isAnkiCard(card) ? 'anki' : 'word',
            hasImage: !!displayText.image,
            hasAudio: !!displayText.audio,
            srsStatus: srsData?.status || 'new',
            interval: srsData?.interval || 0,
            reviews: srsData?.reviews || 0
          }
        },
        createdAt: new Date(card.createdAt || Date.now()),
        updatedAt: new Date(card.updatedAt || Date.now())
      };
    } catch (error) {
      console.error('Failed to get flashcard item:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Get real flashcards from StudyListManager with caching
   */
  private async getRealFlashcards(): Promise<FlashcardItem[]> {
    try {
      // Check cache validity
      const now = Date.now();
      if (this.cachedFlashcards && (now - this.lastCacheTime) < this.CACHE_DURATION) {
        return this.cachedFlashcards;
      }

      // Get all study lists with error handling
      let allLists;
      try {
        allLists = await StudyListManager.getAllStudyLists();
      } catch (error) {
        console.error('Failed to get study lists:', error);
        // Return empty array or cached data if available
        return this.cachedFlashcards || [];
      }
      
      let allFlashcards: FlashcardItem[] = [];
      
      // Get items from all lists with individual error handling
      for (const list of allLists) {
        try {
          const { words, ankiCards } = await StudyListManager.getItemsInList(list.id);
          
          // Convert JapaneseWords to FlashcardItems
          const wordCards: FlashcardItem[] = words.map(word => ({
            ...word,
            createdAt: word.createdAt || Date.now(),
            updatedAt: word.updatedAt || Date.now()
          }));
          
          // Convert AnkiCards to FlashcardItems
          const ankiFlashcards: FlashcardItem[] = ankiCards.map(card => ({
            id: card.id,
            itemType: 'anki_card' as const,
            ankiData: card.ankiData,
            kanji: card.ankiData?.front || '',
            kana: '',
            meaning: card.ankiData?.back || '',
            type: 'anki' as any,
            createdAt: card.savedAt?.getTime() || Date.now(),
            updatedAt: card.savedAt?.getTime() || Date.now()
          }));
          
          allFlashcards = [...allFlashcards, ...wordCards, ...ankiFlashcards];
        } catch (listError) {
          console.warn(`Failed to get items from list ${list.id}:`, listError);
          // Continue with other lists
        }
      }
      
      // Remove duplicates by ID
      const uniqueFlashcards = allFlashcards.filter((card, index, self) => 
        index === self.findIndex(c => c.id === card.id)
      );
      
      // Cache the results
      this.cachedFlashcards = uniqueFlashcards;
      this.lastCacheTime = now;
      
      return uniqueFlashcards;
    } catch (error) {
      console.error('Failed to get real flashcards:', error);
      // Return cached data if available, otherwise empty array
      return this.cachedFlashcards || [];
    }
  }

  /**
   * Calculate item priority based on SRS data
   */
  private calculateItemPriorityFromSRS(card: FlashcardItem, srsData?: any): number {
    let priority = 5; // Base priority

    if (srsData) {
      const now = new Date();
      
      // Increase priority for overdue items
      if (srsData.due < now) {
        const hoursOverdue = (now.getTime() - srsData.due.getTime()) / (1000 * 60 * 60);
        priority += Math.min(3, Math.floor(hoursOverdue / 12));
      }

      // Adjust based on ease (lower ease = higher priority)
      if (srsData.ease) {
        priority += Math.max(0, 3 - Math.floor(srsData.ease / 1000)); // Typical ease is 2500
      }

      // Increase priority for cards with many lapses
      if (srsData.lapses) {
        priority += Math.min(2, srsData.lapses);
      }

      // New cards get medium priority
      if (srsData.status === 'new') {
        priority = 6;
      }
    } else {
      // New cards without SRS data
      priority = 6;
    }

    // Boost priority for cards with multimedia content
    const displayText = this.getCardDisplayText(card);
    if (displayText.image || displayText.audio) {
      priority += 1;
    }

    return Math.min(10, Math.max(1, priority));
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
        [ContentType.CUSTOM]: 0,
        [ContentType.KANJI]: 0,
        [ContentType.VOCABULARY]: 0,
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

  /**
   * Get display text for a flashcard
   */
  private getCardDisplayText(card: FlashcardItem): {
    front: string;
    back: string;
    context?: string;
    image?: string;
    audio?: string;
    tags: string[];
  } {
    if (isAnkiCard(card) && card.ankiData) {
      return {
        front: card.ankiData.front,
        back: card.ankiData.back,
        context: card.ankiData.deckName,
        image: undefined, // Could be extracted from Anki media
        audio: undefined, // Could be extracted from Anki media
        tags: card.ankiData.tags || []
      };
    } else {
      // Regular word card
      const word = card as JapaneseWord;
      return {
        front: word.kanji || word.kana,
        back: word.meaning,
        context: word.type,
        image: undefined,
        audio: undefined,
        tags: word.tags || []
      };
    }
  }

  /**
   * Get difficulty score from SRS data
   */
  private getDifficultyFromSRS(srsData?: any): number {
    if (!srsData) return 5; // Default medium difficulty
    
    // Convert ease to 1-10 scale (typical ease is around 2500)
    const easeBased = Math.max(1, Math.min(10, 11 - Math.floor(srsData.ease / 300)));
    
    // Factor in lapses (more lapses = more difficult)
    const lapsesBased = Math.min(3, srsData.lapses || 0);
    
    return Math.min(10, easeBased + lapsesBased);
  }

  /**
   * Get last review session date from Firebase with error handling
   */
  private async getLastReviewSession(): Promise<Date | undefined> {
    if (!this.userId) return undefined;
    
    try {
      // This could be enhanced to track last session in Firebase
      // For now, estimate from SRS data with error handling
      const flashcards = await this.getRealFlashcards();
      if (flashcards.length === 0) return undefined;
      
      const cardIds = flashcards.map(card => card.id);
      let srsDataMap;
      
      try {
        srsDataMap = await flashcardSRSManager.loadSRSData(cardIds);
      } catch (srsError) {
        console.warn('Failed to load SRS data for last review session:', srsError);
        return undefined;
      }
      
      let lastReview: Date | undefined;
      
      for (const srsData of srsDataMap.values()) {
        try {
          if (srsData && srsData.lastReview) {
            if (!lastReview || srsData.lastReview > lastReview) {
              lastReview = srsData.lastReview;
            }
          }
        } catch (dateError) {
          console.warn('Error processing SRS date:', dateError);
          // Continue with other entries
        }
      }
      
      return lastReview;
    } catch (error) {
      console.error('Failed to get last review session:', error);
      return undefined;
    }
  }

  /**
   * Calculate study streak (days of consecutive study) with error handling
   */
  private async calculateStudyStreak(): Promise<number> {
    try {
      // This would require more sophisticated tracking in Firebase
      // For now, we could estimate based on recent review activity
      if (!this.userId) return 0;
      
      // Could be enhanced to check Firebase for daily review records
      // For now, return a safe default
      return 0;
    } catch (error) {
      console.warn('Failed to calculate study streak:', error);
      return 0;
    }
  }

  /**
   * Update subscription status for enhanced features
   */
  async updateSubscriptionStatus(hasSubscription: boolean): Promise<void> {
    if (this.userId) {
      flashcardSRSManager.setUser(this.userId, hasSubscription);
    }
  }

  /**
   * Clear cache to force refresh
   */
  clearCache(): void {
    this.cachedFlashcards = null;
    this.lastCacheTime = 0;
  }
}

/**
 * Factory function to create a flashcards source
 */
export async function createFlashcardsSource(userId: string | null): Promise<FlashcardsSource> {
  const source = new FlashcardsSource(userId);
  
  try {
    await source.init();
  } catch (error) {
    console.error('Failed to initialize flashcards source:', error);
    // Return source anyway for graceful degradation
  }
  
  return source;
}