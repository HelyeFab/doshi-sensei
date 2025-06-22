import {
  FlashcardSession,
  FlashcardProgress,
  FlashcardReview,
  FlashcardType,
  FlashcardQuality,
  JapaneseWord
} from '@/types';
import {
  initializeFlashcardProgress,
  updateFlashcardProgress,
  getDueCards,
  calculateStudyStats,
  isCardDueForReview
} from './spacedRepetition';
import { DatabaseManager } from './indexedDB';
import WordListManager from './wordLists';

/**
 * Core Flashcard Engine
 * Manages flashcard sessions, progress tracking, and review scheduling
 */

export interface FlashcardSessionConfig {
  wordListIds: string[];
  maxCards?: number;
  cardTypes?: FlashcardType[];
  timeLimit?: number; // minutes
  reviewDueOnly?: boolean;
}

export interface FlashcardQuestion {
  word: JapaneseWord;
  cardType: FlashcardType;
  question: string;
  answer: string;
  hint?: string;
}

export class FlashcardManager {
  private dbManager: DatabaseManager;
  private currentUserId: string | null = null;

  constructor() {
    this.dbManager = new DatabaseManager();
  }

  /**
   * Set the current user for flashcard operations
   */
  setUser(userId: string) {
    this.currentUserId = userId;
  }

  /**
   * Get flashcard progress for a specific word
   */
  async getFlashcardProgress(wordId: string): Promise<FlashcardProgress | null> {
    if (!this.currentUserId) return null;

    try {
      const progressId = `${this.currentUserId}_${wordId}`;
      return await this.dbManager.get('flashcardProgress', progressId);
    } catch (error) {
      console.error('Error getting flashcard progress:', error);
      return null;
    }
  }

  /**
   * Get all flashcard progress for the current user
   */
  async getAllFlashcardProgress(): Promise<FlashcardProgress[]> {
    if (!this.currentUserId) return [];

    try {
      const allProgress = await this.dbManager.getAll('flashcardProgress');
      return allProgress.filter((progress: FlashcardProgress) => progress.userId === this.currentUserId);
    } catch (error) {
      console.error('Error getting all flashcard progress:', error);
      return [];
    }
  }

  /**
   * Initialize or get flashcard progress for a word
   */
  async getOrCreateFlashcardProgress(wordId: string, cardType: 'word' | 'kanji' | 'grammar' = 'word'): Promise<FlashcardProgress> {
    if (!this.currentUserId) {
      throw new Error('User not set');
    }

    let progress = await this.getFlashcardProgress(wordId);

    if (!progress) {
      progress = initializeFlashcardProgress(wordId, this.currentUserId, cardType);
      await this.dbManager.add('flashcardProgress', progress);
    }

    return progress;
  }

  /**
   * Update flashcard progress after a review
   */
  async updateProgress(
    wordId: string,
    quality: FlashcardQuality,
    responseTime: number
  ): Promise<FlashcardProgress> {
    if (!this.currentUserId) {
      throw new Error('User not set');
    }

    const currentProgress = await this.getOrCreateFlashcardProgress(wordId);
    const updatedProgress = updateFlashcardProgress(currentProgress, quality, responseTime);

    await this.dbManager.put('flashcardProgress', updatedProgress);
    return updatedProgress;
  }

  /**
   * Get cards due for review (excludes cards from recent sessions)
   */
  async getDueCards(): Promise<FlashcardProgress[]> {
    const allProgress = await this.getAllFlashcardProgress();
    return getDueCards(allProgress);
  }

  /**
   * Get cards for immediate review (from recent sessions)
   */
  async getImmediateReviewCards(): Promise<FlashcardProgress[]> {
    const allProgress = await this.getAllFlashcardProgress();
    const { isCardForImmediateReview } = await import('./spacedRepetition');

    return allProgress.filter(progress => isCardForImmediateReview(progress))
      .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
  }

  /**
   * Get all cards that need review (both due and immediate)
   */
  async getAllReviewCards(): Promise<{
    dueCards: FlashcardProgress[];
    immediateCards: FlashcardProgress[];
  }> {
    const [dueCards, immediateCards] = await Promise.all([
      this.getDueCards(),
      this.getImmediateReviewCards()
    ]);

    return { dueCards, immediateCards };
  }

  /**
   * Get study statistics
   */
  async getStudyStats() {
    const allProgress = await this.getAllFlashcardProgress();
    return calculateStudyStats(allProgress);
  }

  /**
   * Create a flashcard session
   */
  async createSession(config: FlashcardSessionConfig): Promise<FlashcardSession> {
    if (!this.currentUserId) {
      throw new Error('User not set');
    }

    const session: FlashcardSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUserId,
      wordListIds: config.wordListIds,
      startTime: new Date(),
      cardsReviewed: 0,
      cardsCorrect: 0,
      sessionType: config.reviewDueOnly ? 'review' : 'practice',
      avgResponseTime: 0
    };

    await this.dbManager.add('flashcardSessions', session);
    return session;
  }

  /**
   * Update a flashcard session
   */
  async updateSession(session: FlashcardSession): Promise<void> {
    await this.dbManager.put('flashcardSessions', session);
  }

  /**
   * Complete a flashcard session
   */
  async completeSession(sessionId: string, cardsReviewed: number, cardsCorrect: number): Promise<void> {
    const session = await this.dbManager.get('flashcardSessions', sessionId);
    if (session) {
      session.endTime = new Date();
      session.cardsReviewed = cardsReviewed;
      session.cardsCorrect = cardsCorrect;
      await this.dbManager.put('flashcardSessions', session);
    }
  }

  /**
   * Record a flashcard review
   */
  async recordReview(
    sessionId: string,
    wordId: string,
    cardType: FlashcardType,
    quality: FlashcardQuality,
    responseTime: number,
    wasCorrect: boolean,
    previousInterval: number,
    newInterval: number
  ): Promise<void> {
    if (!this.currentUserId) return;

    const review: FlashcardReview = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUserId,
      wordId,
      sessionId,
      reviewDate: new Date(),
      responseTime,
      quality,
      wasCorrect,
      cardType,
      previousInterval,
      newInterval
    };

    await this.dbManager.add('flashcardReviews', review);
  }

  /**
   * Generate flashcard questions from word lists
   */
  async generateFlashcardQuestions(
    config: FlashcardSessionConfig
  ): Promise<FlashcardQuestion[]> {
    // Get words from selected lists
    const words = await WordListManager.getWordsFromLists(config.wordListIds);

    if (words.length === 0) {
      return [];
    }

    // Filter words based on due status if specified
    let targetWords = words;
    if (config.reviewDueOnly) {
      const allProgress = await this.getAllFlashcardProgress();
      const progressMap = new Map(allProgress.map(p => [p.wordId, p]));

      targetWords = words.filter(word => {
        const progress = progressMap.get(word.id);
        return !progress || isCardDueForReview(progress);
      });
    }

    // Shuffle and limit words
    const shuffledWords = this.shuffleArray([...targetWords]);
    const limitedWords = shuffledWords.slice(0, config.maxCards || 20);

    // Generate questions for each word
    const questions: FlashcardQuestion[] = [];
    const cardTypes = config.cardTypes || ['kanji-to-meaning', 'meaning-to-kanji'];

    for (const word of limitedWords) {
      // Randomly select a card type for this word
      const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      const question = this.generateQuestion(word, cardType);
      questions.push(question);
    }

    return this.shuffleArray(questions);
  }

  /**
   * Generate a single flashcard question
   */
  private generateQuestion(word: JapaneseWord, cardType: FlashcardType): FlashcardQuestion {
    switch (cardType) {
      case 'kanji-to-meaning':
        return {
          word,
          cardType,
          question: word.kanji,
          answer: word.meaning,
          hint: word.kana
        };

      case 'meaning-to-kanji':
        return {
          word,
          cardType,
          question: word.meaning,
          answer: word.kanji,
          hint: word.kana
        };

      case 'reading-recognition':
        return {
          word,
          cardType,
          question: word.kanji,
          answer: word.kana,
          hint: word.meaning
        };

      default:
        return {
          word,
          cardType: 'kanji-to-meaning',
          question: word.kanji,
          answer: word.meaning,
          hint: word.kana
        };
    }
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get recent flashcard sessions
   */
  async getRecentSessions(limit: number = 10): Promise<FlashcardSession[]> {
    if (!this.currentUserId) return [];

    try {
      const allSessions = await this.dbManager.getAll('flashcardSessions');
      return allSessions
        .filter((session: FlashcardSession) => session.userId === this.currentUserId)
        .sort((a: FlashcardSession, b: FlashcardSession) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }

  /**
   * Get flashcard reviews for analysis
   */
  async getReviews(
    wordId?: string,
    limit?: number
  ): Promise<FlashcardReview[]> {
    if (!this.currentUserId) return [];

    try {
      const allReviews = await this.dbManager.getAll('flashcardReviews');
      let filteredReviews = allReviews.filter((review: FlashcardReview) => review.userId === this.currentUserId);

      if (wordId) {
        filteredReviews = filteredReviews.filter((review: FlashcardReview) => review.wordId === wordId);
      }

      const sortedReviews = filteredReviews.sort((a: FlashcardReview, b: FlashcardReview) =>
        b.reviewDate.getTime() - a.reviewDate.getTime()
      );

      return limit ? sortedReviews.slice(0, limit) : sortedReviews;
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  }

  /**
   * Reset progress for a specific word
   */
  async resetWordProgress(wordId: string): Promise<void> {
    if (!this.currentUserId) return;

    const progressId = `${this.currentUserId}_${wordId}`;
    await this.dbManager.delete('flashcardProgress', progressId);
  }

  /**
   * Reset all flashcard progress (for testing or user request)
   */
  async resetAllProgress(): Promise<void> {
    if (!this.currentUserId) return;

    const allProgress = await this.getAllFlashcardProgress();
    for (const progress of allProgress) {
      await this.dbManager.delete('flashcardProgress', progress.id);
    }
  }

  /**
   * Export flashcard data for backup
   */
  async exportFlashcardData() {
    if (!this.currentUserId) return null;

    const [progress, sessions, reviews] = await Promise.all([
      this.getAllFlashcardProgress(),
      this.getRecentSessions(100),
      this.getReviews(undefined, 1000)
    ]);

    return {
      userId: this.currentUserId,
      exportDate: new Date(),
      progress,
      sessions,
      reviews
    };
  }

  /**
   * Import flashcard data from backup
   */
  async importFlashcardData(data: any): Promise<void> {
    if (!this.currentUserId || data.userId !== this.currentUserId) {
      throw new Error('Invalid import data or user mismatch');
    }

    // Import progress
    for (const progress of data.progress || []) {
      await this.dbManager.put('flashcardProgress', progress);
    }

    // Import sessions
    for (const session of data.sessions || []) {
      await this.dbManager.put('flashcardSessions', session);
    }

    // Import reviews
    for (const review of data.reviews || []) {
      await this.dbManager.put('flashcardReviews', review);
    }
  }
}

// Create singleton instance
const flashcardManager = new FlashcardManager();
export default flashcardManager;
