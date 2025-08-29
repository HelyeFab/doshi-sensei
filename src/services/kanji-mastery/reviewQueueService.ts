/**
 * Review Queue Service for Kanji Mastery System
 * Integrates FSRS algorithm with DataSyncService for production-ready spaced repetition
 */

import { FSRSAlgorithm, FSRSCard, Rating, CardState, ScheduledCard } from './fsrsAlgorithm';
import { DataSyncService } from './dataSyncService';
import { State } from './types';

export interface QueueOptions {
  maxCards?: number;
  newCardsPerDay?: number;
  reviewsPerDay?: number;
  prioritizeOverdue?: boolean;
}

export interface KanjiData {
  char: string;
  data: {
    jlptLevel: number;
    strokeCount: number;
    frequency: number;
    meanings?: string[];
    readings?: { on: string[]; kun: string[] };
  };
}

export interface ReviewQueueItem {
  kanjiChar: string;
  state: State;
  dueDate: string;
  scheduledDays: number;
  elapsedDays: number;
  reps: number;
  lapses: number;
  difficulty: number;
  stability: number;
  lastReview: string | null;
  metadata: {
    jlptLevel: number;
    strokeCount: number;
    frequency: number;
  };
}

export class ReviewQueueService {
  private fsrs: FSRSAlgorithm;
  private dataSync: DataSyncService;
  
  constructor(dataSync?: DataSyncService) {
    this.fsrs = new FSRSAlgorithm();
    this.dataSync = dataSync || new DataSyncService();
  }
  
  /**
   * Batch add kanji to the review system
   */
  async batchAddKanji(userId: string, kanjiList: KanjiData[]): Promise<void> {
    const now = new Date();
    
    for (const kanji of kanjiList) {
      // Check if kanji already exists
      const existing = await this.dataSync.getCard(userId, kanji.char);
      if (existing) continue;
      
      // Create new FSRS card
      const card = this.fsrs.createCard(kanji.char, {
        jlptLevel: `N${kanji.data.jlptLevel}`,
        strokeCount: kanji.data.strokeCount,
        frequency: kanji.data.frequency
      });
      
      // Convert to our storage format
      const cardData = {
        char: kanji.char,
        state: State.New,
        dueDate: now.toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 0,
        lapses: 0,
        difficulty: 5, // Default middle difficulty
        stability: 0,
        lastReview: null,
        metadata: {
          jlptLevel: kanji.data.jlptLevel,
          strokeCount: kanji.data.strokeCount,
          frequency: kanji.data.frequency
        }
      };
      
      await this.dataSync.updateCard(userId, kanji.char, cardData);
    }
  }
  
  /**
   * Generate review queue with proper prioritization
   */
  async generateQueue(userId: string, options: QueueOptions = {}): Promise<ReviewQueueItem[]> {
    const {
      maxCards = 50,
      newCardsPerDay = 20,
      reviewsPerDay = 100,
      prioritizeOverdue = true
    } = options;
    
    // Get all user progress
    const allProgress = await this.dataSync.getAllProgressLocal(userId);
    if (!allProgress || allProgress.length === 0) {
      return [];
    }
    
    const now = new Date();
    const queue: ReviewQueueItem[] = [];
    
    // Convert to queue items and filter due cards
    const dueCards = allProgress
      .map(progress => this.convertToQueueItem(progress))
      .filter(item => {
        const dueDate = new Date(item.dueDate);
        return dueDate <= now;
      });
    
    // Separate by type
    const newCards = dueCards.filter(item => item.state === State.New);
    const learningCards = dueCards.filter(item => item.state === State.Learning || item.state === State.Relearning);
    const reviewCards = dueCards.filter(item => item.state === State.Review);
    
    // Sort by priority
    if (prioritizeOverdue) {
      // Sort by how overdue they are
      reviewCards.sort((a, b) => {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        const nowTime = now.getTime();
        return (nowTime - aDue) - (nowTime - bDue);
      });
      
      learningCards.sort((a, b) => {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        return aDue - bDue;
      });
    }
    
    // Add cards to queue respecting limits
    let cardsAdded = 0;
    
    // 1. Learning/Relearning cards (highest priority)
    for (const card of learningCards) {
      if (cardsAdded >= maxCards) break;
      queue.push(card);
      cardsAdded++;
    }
    
    // 2. Review cards
    let reviewsAdded = 0;
    for (const card of reviewCards) {
      if (cardsAdded >= maxCards || reviewsAdded >= reviewsPerDay) break;
      queue.push(card);
      cardsAdded++;
      reviewsAdded++;
    }
    
    // 3. New cards
    let newCardsAdded = 0;
    for (const card of newCards) {
      if (cardsAdded >= maxCards || newCardsAdded >= newCardsPerDay) break;
      queue.push(card);
      cardsAdded++;
      newCardsAdded++;
    }
    
    return queue;
  }
  
  /**
   * Process a review with FSRS algorithm
   */
  async processReview(
    userId: string, 
    kanjiChar: string, 
    rating: Rating, 
    responseTime: number
  ): Promise<ReviewQueueItem> {
    // Get current card state
    const currentProgress = await this.dataSync.getCard(userId, kanjiChar);
    if (!currentProgress) {
      throw new Error(`Card not found: ${kanjiChar}`);
    }
    
    // Convert to FSRS card
    const fsrsCard = this.convertToFSRSCard(currentProgress);
    
    // Calculate next state
    const result = this.fsrs.calculateNextStates(fsrsCard);
    const nextState = this.getNextStateForRating(result, rating);
    
    // Update performance tracking
    const performance = currentProgress.performance || {
      totalReviews: 0,
      totalResponseTime: 0,
      correctCount: 0
    };
    
    performance.totalReviews++;
    performance.totalResponseTime += responseTime;
    if (rating >= Rating.GOOD) {
      performance.correctCount++;
    }
    
    // Create updated card data
    const updatedData = {
      char: kanjiChar,
      state: this.convertCardStateToState(nextState.card.state),
      dueDate: nextState.card.due.toISOString(),
      scheduledDays: nextState.card.scheduledDays,
      elapsedDays: nextState.card.elapsedDays,
      reps: nextState.card.reps,
      lapses: nextState.card.lapses,
      difficulty: nextState.card.difficulty,
      stability: nextState.card.stability,
      lastReview: new Date().toISOString(),
      performance,
      metadata: currentProgress.metadata
    };
    
    // Save updated card
    await this.dataSync.updateCard(userId, kanjiChar, updatedData);
    
    // Return queue item format
    return this.convertToQueueItem({
      ...currentProgress,
      ...updatedData
    });
  }
  
  /**
   * Convert storage format to FSRS card
   */
  private convertToFSRSCard(progress: any): FSRSCard {
    return {
      id: progress.kanjiChar,
      kanjiChar: progress.kanjiChar,
      due: new Date(progress.dueDate || progress.fsrs?.dueDate || new Date()),
      stability: progress.stability || progress.fsrs?.stability || 0,
      difficulty: progress.difficulty || progress.fsrs?.difficulty || 5,
      elapsedDays: progress.elapsedDays || progress.fsrs?.elapsedDays || 0,
      scheduledDays: progress.scheduledDays || progress.fsrs?.scheduledDays || 0,
      reps: progress.reps || progress.fsrs?.repetition || 0,
      lapses: progress.lapses || progress.fsrs?.lapses || 0,
      state: this.convertStateToCardState(progress.state || State.New),
      lastReview: progress.lastReview ? new Date(progress.lastReview) : undefined,
      jlptLevel: progress.metadata?.jlptLevel ? `N${progress.metadata.jlptLevel}` : undefined,
      strokeCount: progress.metadata?.strokeCount,
      frequency: progress.metadata?.frequency
    };
  }
  
  /**
   * Convert our State enum to FSRS CardState
   */
  private convertStateToCardState(state: State): CardState {
    switch (state) {
      case State.New: return CardState.NEW;
      case State.Learning: return CardState.LEARNING;
      case State.Review: return CardState.REVIEW;
      case State.Relearning: return CardState.RELEARNING;
      default: return CardState.NEW;
    }
  }
  
  /**
   * Convert FSRS CardState to our State enum
   */
  private convertCardStateToState(cardState: CardState): State {
    switch (cardState) {
      case CardState.NEW: return State.New;
      case CardState.LEARNING: return State.Learning;
      case CardState.REVIEW: return State.Review;
      case CardState.RELEARNING: return State.Relearning;
      default: return State.New;
    }
  }
  
  /**
   * Get the next state based on rating
   */
  private getNextStateForRating(result: any, rating: Rating): ScheduledCard {
    switch (rating) {
      case Rating.AGAIN: return result.nextStates.again;
      case Rating.HARD: return result.nextStates.hard;
      case Rating.GOOD: return result.nextStates.good;
      case Rating.EASY: return result.nextStates.easy;
      default: return result.nextStates.good;
    }
  }
  
  /**
   * Convert progress data to queue item format
   */
  private convertToQueueItem(progress: any): ReviewQueueItem {
    return {
      kanjiChar: progress.kanjiChar || progress.char,
      state: progress.state || State.New,
      dueDate: progress.dueDate || progress.fsrs?.dueDate || new Date().toISOString(),
      scheduledDays: progress.scheduledDays || progress.fsrs?.scheduledDays || 0,
      elapsedDays: progress.elapsedDays || progress.fsrs?.elapsedDays || 0,
      reps: progress.reps || progress.fsrs?.repetition || 0,
      lapses: progress.lapses || progress.fsrs?.lapses || 0,
      difficulty: progress.difficulty || progress.fsrs?.difficulty || 5,
      stability: progress.stability || progress.fsrs?.stability || 0,
      lastReview: progress.lastReview || progress.fsrs?.lastReview,
      metadata: progress.metadata || {
        jlptLevel: 5,
        strokeCount: 4,
        frequency: 5
      }
    };
  }
  
  /**
   * Get due card count for today
   */
  async getDueCount(userId: string): Promise<{ new: number; learning: number; review: number }> {
    const queue = await this.generateQueue(userId, { maxCards: 1000 });
    
    return {
      new: queue.filter(item => item.state === State.New).length,
      learning: queue.filter(item => 
        item.state === State.Learning || item.state === State.Relearning
      ).length,
      review: queue.filter(item => item.state === State.Review).length
    };
  }
  
  /**
   * Get study session statistics
   */
  async getSessionStats(userId: string): Promise<any> {
    return this.dataSync.getUserStats(userId);
  }
}