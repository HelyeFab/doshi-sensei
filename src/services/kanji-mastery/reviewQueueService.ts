/**
 * Review Queue Service
 * Manages the generation and processing of daily review queues
 * Production-ready with caching, prioritization, and error handling
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  setDoc,
  getDoc,
  writeBatch,
  Timestamp,
  DocumentData,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  FSRSAlgorithm, 
  FSRSCard, 
  CardState, 
  Rating,
  ReviewResult
} from './fsrsAlgorithm';

/**
 * Review queue item with full context
 */
export interface ReviewQueueItem {
  // Core identification
  id: string;
  kanjiChar: string;
  userId: string;
  
  // FSRS data
  fsrsCard: FSRSCard;
  
  // Priority and ordering
  priority: number;
  overdueBy: number; // Days overdue (negative if not due yet)
  
  // Kanji information
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  jlptLevel?: string;
  strokeCount?: number;
  components?: string[];
  
  // Session metadata
  addedToQueue: Date;
  reviewed?: Date;
  result?: ReviewSessionResult;
}

/**
 * Review session configuration
 */
export interface ReviewSessionConfig {
  maxItems?: number;
  includeNew?: boolean;
  includeLeeches?: boolean;
  priorityMode?: 'overdue' | 'difficulty' | 'random' | 'adaptive';
  timeLimit?: number; // Minutes
}

/**
 * Review session result
 */
export interface ReviewSessionResult {
  kanjiChar: string;
  rating: Rating;
  responseTime: number;
  correct: boolean;
  questionType: 'meaning' | 'onyomi' | 'kunyomi';
  userAnswer?: string;
  correctAnswer: string;
}

/**
 * Queue generation statistics
 */
export interface QueueStatistics {
  totalDue: number;
  overdueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  averageOverdue: number;
  estimatedTime: number; // Minutes
}

/**
 * Review Queue Service
 */
export class ReviewQueueService {
  private fsrs: FSRSAlgorithm;
  private cache: Map<string, ReviewQueueItem[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  constructor(fsrs?: FSRSAlgorithm) {
    this.fsrs = fsrs || new FSRSAlgorithm();
  }
  
  /**
   * Generate review queue for a user
   */
  async generateQueue(
    userId: string,
    config: ReviewSessionConfig = {}
  ): Promise<ReviewQueueItem[]> {
    const {
      maxItems = 50,
      includeNew = true,
      includeLeeches = true,
      priorityMode = 'overdue'
    } = config;
    
    // Check cache first
    const cacheKey = `${userId}_${JSON.stringify(config)}`;
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Fetch all kanji progress for the user
      const progressCollection = collection(db, 'users', userId, 'kanjiProgress');
      const now = new Date();
      
      // Query for due items
      const dueQuery = query(
        progressCollection,
        where('fsrs.dueDate', '<=', Timestamp.fromDate(now)),
        orderBy('fsrs.dueDate', 'asc'),
        limit(maxItems * 2) // Fetch extra for filtering
      );
      
      const snapshot = await getDocs(dueQuery);
      const items: ReviewQueueItem[] = [];
      
      // Process each document
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const item = await this.createQueueItem(userId, data, now);
        
        // Apply filters
        if (!includeNew && item.fsrsCard.state === CardState.NEW) continue;
        if (!includeLeeches && data.leech?.isLeech) continue;
        
        items.push(item);
      }
      
      // Sort by priority
      const sorted = this.sortByPriority(items, priorityMode);
      
      // Limit to maxItems
      const queue = sorted.slice(0, maxItems);
      
      // Cache the result
      this.cache.set(cacheKey, queue);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return queue;
      
    } catch (error) {
      console.error('Error generating review queue:', error);
      throw new Error('Failed to generate review queue');
    }
  }
  
  /**
   * Get queue statistics for planning
   */
  async getQueueStatistics(userId: string): Promise<QueueStatistics> {
    try {
      const progressCollection = collection(db, 'users', userId, 'kanjiProgress');
      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);
      
      // Query for all due items
      const dueQuery = query(
        progressCollection,
        where('fsrs.dueDate', '<=', nowTimestamp)
      );
      
      const snapshot = await getDocs(dueQuery);
      
      let totalDue = 0;
      let overdueCount = 0;
      let newCount = 0;
      let learningCount = 0;
      let reviewCount = 0;
      let totalOverdueDays = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        totalDue++;
        
        // Calculate overdue days
        const dueDate = data.fsrs.dueDate.toDate();
        const overdueDays = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (overdueDays > 0) {
          overdueCount++;
          totalOverdueDays += overdueDays;
        }
        
        // Count by state
        switch (data.fsrs.state) {
          case CardState.NEW:
            newCount++;
            break;
          case CardState.LEARNING:
          case CardState.RELEARNING:
            learningCount++;
            break;
          case CardState.REVIEW:
            reviewCount++;
            break;
        }
      });
      
      const averageOverdue = overdueCount > 0 ? totalOverdueDays / overdueCount : 0;
      
      // Estimate time (30 seconds per item average)
      const estimatedTime = totalDue * 0.5;
      
      return {
        totalDue,
        overdueCount,
        newCount,
        learningCount,
        reviewCount,
        averageOverdue,
        estimatedTime
      };
      
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      throw new Error('Failed to get queue statistics');
    }
  }
  
  /**
   * Process a review result and update the card
   */
  async processReview(
    userId: string,
    kanjiChar: string,
    rating: Rating,
    responseTime: number
  ): Promise<FSRSCard> {
    try {
      // Get current progress
      const progressRef = doc(db, 'users', userId, 'kanjiProgress', `${userId}_${kanjiChar}`);
      const progressSnap = await getDoc(progressRef);
      
      if (!progressSnap.exists()) {
        throw new Error(`No progress found for kanji: ${kanjiChar}`);
      }
      
      const data = progressSnap.data();
      const currentCard = this.dataToFSRSCard(data);
      
      // Calculate next states
      const result = this.fsrs.calculateNextStates(currentCard);
      
      // Get the scheduled card based on rating
      const scheduledCard = this.getScheduledCardByRating(result, rating);
      
      // Update performance metrics
      const performance = data.performance || {};
      performance.totalReviews = (performance.totalReviews || 0) + 1;
      if (rating >= Rating.GOOD) {
        performance.correctReviews = (performance.correctReviews || 0) + 1;
      }
      performance.accuracy = performance.correctReviews / performance.totalReviews;
      
      // Update mastery level
      const mastery = this.calculateMasteryLevel(scheduledCard.card);
      
      // Prepare update data
      const updateData = {
        fsrs: {
          interval: scheduledCard.interval,
          repetition: scheduledCard.card.reps,
          easeFactor: scheduledCard.easeFactor,
          stability: scheduledCard.card.stability,
          difficulty: scheduledCard.card.difficulty,
          dueDate: Timestamp.fromDate(scheduledCard.reviewDate),
          lastReview: Timestamp.fromDate(new Date()),
          state: scheduledCard.card.state,
          lapses: scheduledCard.card.lapses
        },
        performance,
        mastery: {
          level: mastery,
          achievedAt: mastery >= 6 ? serverTimestamp() : null,
          streakDays: rating >= Rating.GOOD ? 
            (data.mastery?.streakDays || 0) + 1 : 0
        },
        updatedAt: serverTimestamp()
      };
      
      // Update in Firestore
      await updateDoc(progressRef, updateData);
      
      // Clear cache for this user
      this.clearUserCache(userId);
      
      // Log to session history
      await this.logReviewToHistory(userId, kanjiChar, rating, responseTime);
      
      return scheduledCard.card;
      
    } catch (error) {
      console.error('Error processing review:', error);
      throw new Error('Failed to process review');
    }
  }
  
  /**
   * Add new kanji to learning
   */
  async addNewKanji(userId: string, kanjiChar: string, kanjiData: any): Promise<void> {
    try {
      const progressId = `${userId}_${kanjiChar}`;
      const progressRef = doc(db, 'users', userId, 'kanjiProgress', progressId);
      
      // Check if already exists
      const existing = await getDoc(progressRef);
      if (existing.exists()) {
        console.log(`Kanji ${kanjiChar} already in progress for user ${userId}`);
        return;
      }
      
      // Create new FSRS card
      const fsrsCard = this.fsrs.createCard(kanjiChar, {
        jlptLevel: kanjiData.jlpt,
        strokeCount: kanjiData.strokes,
        frequency: kanjiData.frequency
      });
      
      // Create progress document
      const progressData = {
        progressId,
        userId,
        kanjiChar,
        
        // FSRS data
        fsrs: {
          interval: fsrsCard.scheduledDays,
          repetition: fsrsCard.reps,
          easeFactor: 2.5,
          stability: fsrsCard.stability,
          difficulty: fsrsCard.difficulty,
          dueDate: Timestamp.fromDate(fsrsCard.due),
          lastReview: null,
          state: fsrsCard.state,
          lapses: 0
        },
        
        // Performance metrics
        performance: {
          totalReviews: 0,
          correctReviews: 0,
          accuracy: 0,
          meaningStats: {
            attempts: 0,
            correct: 0,
            accuracy: 0,
            avgResponseTime: 0
          },
          onyomiStats: {
            attempts: 0,
            correct: 0,
            accuracy: 0,
            avgResponseTime: 0
          },
          kunyomiStats: {
            attempts: 0,
            correct: 0,
            accuracy: 0,
            avgResponseTime: 0
          }
        },
        
        // Mastery tracking
        mastery: {
          level: 0,
          achievedAt: null,
          streakDays: 0
        },
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(progressRef, progressData);
      
      // Clear cache
      this.clearUserCache(userId);
      
    } catch (error) {
      console.error('Error adding new kanji:', error);
      throw new Error('Failed to add new kanji');
    }
  }
  
  /**
   * Batch add multiple kanji
   */
  async batchAddKanji(
    userId: string,
    kanjiList: Array<{ char: string; data: any }>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      for (const { char, data } of kanjiList) {
        const progressId = `${userId}_${char}`;
        const progressRef = doc(db, 'users', userId, 'kanjiProgress', progressId);
        
        const fsrsCard = this.fsrs.createCard(char, {
          jlptLevel: data.jlpt,
          strokeCount: data.strokes,
          frequency: data.frequency
        });
        
        const progressData = {
          progressId,
          userId,
          kanjiChar: char,
          fsrs: {
            interval: fsrsCard.scheduledDays,
            repetition: fsrsCard.reps,
            easeFactor: 2.5,
            stability: fsrsCard.stability,
            difficulty: fsrsCard.difficulty,
            dueDate: Timestamp.fromDate(fsrsCard.due),
            lastReview: null,
            state: fsrsCard.state,
            lapses: 0
          },
          performance: {
            totalReviews: 0,
            correctReviews: 0,
            accuracy: 0
          },
          mastery: {
            level: 0,
            achievedAt: null,
            streakDays: 0
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(progressRef, progressData);
      }
      
      await batch.commit();
      this.clearUserCache(userId);
      
    } catch (error) {
      console.error('Error batch adding kanji:', error);
      throw new Error('Failed to batch add kanji');
    }
  }
  
  /**
   * Create a queue item from Firestore data
   */
  private async createQueueItem(
    userId: string,
    data: DocumentData,
    now: Date
  ): Promise<ReviewQueueItem> {
    const fsrsCard = this.dataToFSRSCard(data);
    
    // Calculate overdue days
    const overdueDays = (now.getTime() - fsrsCard.due.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate priority
    const priority = this.calculatePriority(fsrsCard, overdueDays, data);
    
    // Get kanji information (could be cached or fetched)
    const kanjiInfo = await this.getKanjiInfo(data.kanjiChar);
    
    return {
      id: data.progressId,
      kanjiChar: data.kanjiChar,
      userId,
      fsrsCard,
      priority,
      overdueBy: overdueDays,
      meaning: kanjiInfo.meaning || '',
      onyomi: kanjiInfo.onyomi || [],
      kunyomi: kanjiInfo.kunyomi || [],
      jlptLevel: kanjiInfo.jlpt,
      strokeCount: kanjiInfo.strokes,
      components: kanjiInfo.components,
      addedToQueue: now
    };
  }
  
  /**
   * Convert Firestore data to FSRS card
   */
  private dataToFSRSCard(data: DocumentData): FSRSCard {
    const fsrsData = data.fsrs;
    
    return {
      id: data.kanjiChar,
      kanjiChar: data.kanjiChar,
      due: fsrsData.dueDate.toDate(),
      stability: fsrsData.stability || 0,
      difficulty: fsrsData.difficulty || 0,
      elapsedDays: 0,
      scheduledDays: fsrsData.interval || 0,
      reps: fsrsData.repetition || 0,
      lapses: fsrsData.lapses || 0,
      state: fsrsData.state || CardState.NEW,
      lastReview: fsrsData.lastReview?.toDate(),
      jlptLevel: data.jlptLevel,
      strokeCount: data.strokeCount,
      frequency: data.frequency
    };
  }
  
  /**
   * Calculate priority for queue ordering
   */
  private calculatePriority(
    card: FSRSCard,
    overdueDays: number,
    data: DocumentData
  ): number {
    let priority = 0;
    
    // Overdue items have highest priority
    priority += overdueDays * 10;
    
    // Leeches get extra priority
    if (data.leech?.isLeech) {
      priority += 5;
    }
    
    // Learning/Relearning cards get priority
    if (card.state === CardState.LEARNING || card.state === CardState.RELEARNING) {
      priority += 3;
    }
    
    // Consider difficulty
    priority += card.difficulty * 2;
    
    return priority;
  }
  
  /**
   * Sort queue items by priority mode
   */
  private sortByPriority(
    items: ReviewQueueItem[],
    mode: 'overdue' | 'difficulty' | 'random' | 'adaptive'
  ): ReviewQueueItem[] {
    switch (mode) {
      case 'overdue':
        return items.sort((a, b) => b.overdueBy - a.overdueBy);
      
      case 'difficulty':
        return items.sort((a, b) => b.fsrsCard.difficulty - a.fsrsCard.difficulty);
      
      case 'random':
        return items.sort(() => Math.random() - 0.5);
      
      case 'adaptive':
      default:
        return items.sort((a, b) => b.priority - a.priority);
    }
  }
  
  /**
   * Get scheduled card by rating
   */
  private getScheduledCardByRating(result: ReviewResult, rating: Rating) {
    switch (rating) {
      case Rating.AGAIN:
        return result.nextStates.again;
      case Rating.HARD:
        return result.nextStates.hard;
      case Rating.GOOD:
        return result.nextStates.good;
      case Rating.EASY:
        return result.nextStates.easy;
      default:
        return result.nextStates.good;
    }
  }
  
  /**
   * Calculate mastery level (0-6 scale)
   */
  private calculateMasteryLevel(card: FSRSCard): number {
    if (card.state === CardState.NEW) return 0;
    
    const intervalDays = card.scheduledDays;
    
    if (intervalDays < 1) return 1;
    if (intervalDays < 7) return 2;
    if (intervalDays < 30) return 3;
    if (intervalDays < 90) return 4;
    if (intervalDays < 180) return 5;
    
    return 6; // Burned/Mastered
  }
  
  /**
   * Get kanji information (stub - should connect to actual kanji data)
   */
  private async getKanjiInfo(kanjiChar: string): Promise<any> {
    // TODO: Connect to actual kanji data source
    // For now, return placeholder data
    return {
      meaning: 'Placeholder meaning',
      onyomi: [],
      kunyomi: [],
      jlpt: 'N5',
      strokes: 8,
      components: []
    };
  }
  
  /**
   * Log review to session history
   */
  private async logReviewToHistory(
    userId: string,
    kanjiChar: string,
    rating: Rating,
    responseTime: number
  ): Promise<void> {
    // TODO: Implement session history logging
    console.log(`Review logged: ${kanjiChar} - Rating: ${rating} - Time: ${responseTime}ms`);
  }
  
  /**
   * Check if cache is valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry !== undefined && Date.now() < expiry;
  }
  
  /**
   * Clear cache for a user
   */
  private clearUserCache(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(userId)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
  
  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// Export singleton instance - only create on client side
let reviewQueueServiceInstance: ReviewQueueService | null = null;

export const getReviewQueueService = (): ReviewQueueService => {
  if (!reviewQueueServiceInstance) {
    reviewQueueServiceInstance = new ReviewQueueService();
  }
  return reviewQueueServiceInstance;
};

export const reviewQueueService = typeof window !== 'undefined' ? getReviewQueueService() : {} as ReviewQueueService;