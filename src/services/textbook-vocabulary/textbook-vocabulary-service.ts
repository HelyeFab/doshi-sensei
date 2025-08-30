/**
 * Textbook Vocabulary Service
 * Real implementation connecting to IndexedDB storage and FSRS spaced repetition
 */

import { vocabStorage, VocabularyProgress, StudySession } from './storage';
import { spacedRepetition, ReviewResult } from './spaced-repetition';
import type { VocabularyItem } from '@/app/tools/textbook-vocabulary/types';

// Import textbook data index
import textbookIndex from '@/data/textbook-vocabulary/index.json';

export interface VocabularyCard extends VocabularyItem {
  dueDate: Date;
  difficulty?: number;
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardSearchOptions {
  limit?: number;
  textbooks?: string[];
  jlptLevels?: string[];
}

export interface DueItemsOptions {
  limit?: number;
  includePrioritized?: boolean;
  textbooks?: string[];
}

export interface ReviewData {
  rating: number;
  responseTime?: number;
  studyMode?: string;
  hintsUsed?: number;
  timestamp: Date;
}

export interface ServiceStats {
  totalCards: number;
  dueToday: number;
  overdue: number;
  newCards: number;
  averageRetention: number;
  accuracyTrend?: 'improving' | 'stable' | 'declining';
  retentionTrend?: 'improving' | 'stable' | 'declining';
  lastSession?: Date;
  streak: number;
}

export interface ServiceSettings {
  showFurigana?: boolean;
  playAudio?: boolean;
  includeExamples?: boolean;
  selectedTextbooks?: string[];
}

export class TextbookVocabularyService {
  private userId: string | null;
  private initialized = false;
  private vocabularyCache = new Map<string, VocabularyItem[]>();
  
  constructor(userId: string | null = null) {
    this.userId = userId;
  }
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await vocabStorage.init();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize textbook vocabulary service:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.vocabularyCache.clear();
    this.initialized = false;
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.initialized) return false;
      // Simple health check - try to get stats
      await this.getStats();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Load vocabulary data for a specific textbook
   */
  private async loadVocabularyData(textbook: string): Promise<VocabularyItem[]> {
    if (this.vocabularyCache.has(textbook)) {
      return this.vocabularyCache.get(textbook)!;
    }
    
    try {
      // Use dynamic import to load from src/data/textbook-vocabulary
      const dataModule = await import(`@/data/textbook-vocabulary/${textbook}/all.json`);
      const data: VocabularyItem[] = dataModule.default;
      
      // Add textbook and lesson info if missing
      const processedData = data.map(item => ({
        ...item,
        textbook: textbook,
        lesson: item.lesson || 1
      }));
      
      this.vocabularyCache.set(textbook, processedData);
      return processedData;
    } catch (error) {
      console.error(`Error loading vocabulary data for ${textbook}:`, error);
      // Return empty array if data file doesn't exist
      return [];
    }
  }

  /**
   * Get all available textbooks
   */
  getAvailableTextbooks(): string[] {
    return Object.keys(textbookIndex.textbooks);
  }

  /**
   * Get a specific vocabulary card by ID
   */
  async getCard(cardId: string): Promise<VocabularyCard | null> {
    try {
      // Extract textbook from ID (assuming format like "genki-1-1-1544776574229")
      const textbookMatch = cardId.match(/^([^-]+-[^-]+)/);
      if (!textbookMatch) {
        console.error('Invalid card ID format:', cardId);
        return null;
      }
      
      const textbook = textbookMatch[1];
      const vocabularyData = await this.loadVocabularyData(textbook);
      const vocabularyItem = vocabularyData.find(item => item.id === cardId);
      
      if (!vocabularyItem) {
        return null;
      }
      
      // Get progress data
      const progress = await vocabStorage.getProgress(cardId);
      
      return {
        ...vocabularyItem,
        dueDate: progress?.nextReview || new Date(),
        difficulty: 5, // Default difficulty
        audioUrl: vocabularyItem.audioFile,
        createdAt: progress?.createdAt || new Date(),
        updatedAt: progress?.updatedAt || new Date()
      };
    } catch (error) {
      console.error('Error getting card:', error);
      return null;
    }
  }

  /**
   * Get cards due for review
   */
  async getDueItems(options: DueItemsOptions = {}): Promise<VocabularyCard[]> {
    const { limit = 30, includePrioritized = true, textbooks } = options;
    
    try {
      const selectedTextbooks = textbooks || this.getAvailableTextbooks();
      const allDueCards: VocabularyCard[] = [];
      
      // Get due progress from storage
      for (const textbook of selectedTextbooks) {
        const dueProgress = await vocabStorage.getDueCards(textbook);
        const vocabularyData = await this.loadVocabularyData(textbook);
        
        // Convert progress to cards
        for (const progress of dueProgress) {
          const vocabularyItem = vocabularyData.find(item => item.id === progress.id);
          if (vocabularyItem) {
            allDueCards.push({
              ...vocabularyItem,
              dueDate: progress.nextReview,
              difficulty: 5, // Default
              audioUrl: vocabularyItem.audioFile,
              createdAt: progress.createdAt,
              updatedAt: progress.updatedAt
            });
          }
        }
      }
      
      // Also include new cards (cards that haven't been studied yet)
      if (includePrioritized) {
        for (const textbook of selectedTextbooks) {
          const vocabularyData = await this.loadVocabularyData(textbook);
          const existingIds = await vocabStorage.getProgressIds(textbook);
          
          // Add new cards that haven't been studied
          for (const item of vocabularyData) {
            if (!existingIds.has(item.id) && allDueCards.length < limit) {
              allDueCards.push({
                ...item,
                dueDate: new Date(), // New cards are due immediately
                difficulty: 5,
                audioUrl: item.audioFile,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Sort by due date and priority
      allDueCards.sort((a, b) => {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        return aDue - bDue;
      });
      
      return allDueCards.slice(0, limit);
    } catch (error) {
      console.error('Error getting due items:', error);
      return [];
    }
  }

  /**
   * Search vocabulary cards
   */
  async searchCards(query: string, options: CardSearchOptions = {}): Promise<VocabularyCard[]> {
    const { limit = 20, textbooks } = options;
    const searchTerms = query.toLowerCase();
    
    try {
      const selectedTextbooks = textbooks || this.getAvailableTextbooks();
      const allResults: VocabularyCard[] = [];
      
      for (const textbook of selectedTextbooks) {
        const vocabularyData = await this.loadVocabularyData(textbook);
        
        for (const item of vocabularyData) {
          // Search in Japanese, reading, and meaning
          const matches = [
            item.japanese?.toLowerCase().includes(searchTerms),
            item.reading?.toLowerCase().includes(searchTerms),
            item.meaning?.toLowerCase().includes(searchTerms),
            item.tags?.some(tag => tag.toLowerCase().includes(searchTerms))
          ].some(Boolean);
          
          if (matches) {
            // Get progress for due date
            const progress = await vocabStorage.getProgress(item.id);
            
            allResults.push({
              ...item,
              dueDate: progress?.nextReview || new Date(),
              difficulty: 5,
              audioUrl: item.audioFile,
              createdAt: progress?.createdAt || new Date(),
              updatedAt: progress?.updatedAt || new Date()
            });
            
            if (allResults.length >= limit) break;
          }
        }
        
        if (allResults.length >= limit) break;
      }
      
      return allResults;
    } catch (error) {
      console.error('Error searching cards:', error);
      return [];
    }
  }

  /**
   * Record a review and update spaced repetition
   */
  async recordReview(cardId: string, reviewData: ReviewData): Promise<void> {
    try {
      // Get the vocabulary item
      const card = await this.getCard(cardId);
      if (!card) {
        throw new Error(`Card not found: ${cardId}`);
      }
      
      // Process the review using spaced repetition
      await spacedRepetition.processReview(cardId, reviewData.rating, card);
      
    } catch (error) {
      console.error('Error recording review:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(): Promise<ServiceStats> {
    try {
      const textbooks = this.getAvailableTextbooks();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let totalCards = 0;
      let dueToday = 0;
      let overdue = 0;
      let newCards = 0;
      let totalMastery = 0;
      let totalProgressCards = 0;
      
      // Calculate stats across all textbooks
      for (const textbook of textbooks) {
        const vocabularyData = await this.loadVocabularyData(textbook);
        const progressData = await vocabStorage.getProgressByTextbook(textbook);
        const existingIds = await vocabStorage.getProgressIds(textbook);
        
        totalCards += vocabularyData.length;
        newCards += vocabularyData.length - existingIds.size;
        
        // Count due and overdue cards
        for (const progress of progressData) {
          const dueDate = new Date(progress.nextReview);
          const isDueToday = dueDate <= now && dueDate >= today;
          const isOverdue = dueDate < today;
          
          if (isDueToday) dueToday++;
          if (isOverdue) overdue++;
          
          totalMastery += progress.masteryLevel;
          totalProgressCards++;
        }
      }
      
      // Get recent study session for streak calculation
      const recentSessions = await vocabStorage.getStudySessions(undefined, 30);
      const streak = this.calculateStreak(recentSessions);
      const lastSession = recentSessions[0]?.startTime;
      
      const averageRetention = totalProgressCards > 0 
        ? Math.round(totalMastery / totalProgressCards) 
        : 0;
      
      return {
        totalCards,
        dueToday,
        overdue,
        newCards,
        averageRetention,
        accuracyTrend: 'stable', // TODO: Calculate based on recent sessions
        retentionTrend: 'stable', // TODO: Calculate based on progress trends
        lastSession,
        streak
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalCards: 0,
        dueToday: 0,
        overdue: 0,
        newCards: 0,
        averageRetention: 0,
        streak: 0
      };
    }
  }

  /**
   * Update service settings
   */
  async updateSettings(settings: ServiceSettings): Promise<void> {
    // TODO: Implement settings storage if needed
    console.log('Settings updated:', settings);
  }

  /**
   * Calculate study streak based on sessions
   */
  private calculateStreak(sessions: StudySession[]): number {
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check if there's a session today or yesterday to start the streak
    const hasRecentSession = sessions.some(session => {
      const sessionDate = new Date(session.startTime);
      return this.isSameDay(sessionDate, today) || this.isSameDay(sessionDate, yesterday);
    });
    
    if (!hasRecentSession) return 0;
    
    // Count consecutive days with sessions
    for (let i = 0; i < 365; i++) { // Max 365 days to prevent infinite loop
      const hasSessionThisDay = sessions.some(session => 
        this.isSameDay(new Date(session.startTime), currentDate)
      );
      
      if (hasSessionThisDay) {
        streak++;
      } else {
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }
  
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}