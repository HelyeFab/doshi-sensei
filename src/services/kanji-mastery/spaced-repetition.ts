/**
 * Kanji Mastery Spaced Repetition Service
 * Uses FSRS algorithm for optimal kanji retention
 */

import { 
  createEmptyCard, 
  fsrs, 
  generatorParameters,
  Rating,
  Card,
  Grade
} from 'ts-fsrs';
import { kanjiStorage, KanjiProgress } from './storage';

export interface KanjiReviewResult {
  card: Card;
  nextReview: Date;
  interval: number;
  easeFactor: number;
  retentionRate: number;
}

export interface KanjiStudyStats {
  totalKanji: number;
  learnedKanji: number;
  dueForReview: number;
  masteredKanji: number;
  retentionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
}

class KanjiSpacedRepetitionService {
  private f: ReturnType<typeof fsrs>;
  
  constructor() {
    // Initialize FSRS with parameters optimized for kanji learning
    const params = generatorParameters({
      enable_fuzz: true, // Prevent same-day bunching
      maximum_interval: 365, // Max 1 year between reviews
      w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61] // Optimized for kanji
    });
    this.f = fsrs(params);
  }

  /**
   * Initialize a new card for a kanji
   */
  createNewCard(kanjiId: string): Card {
    return createEmptyCard(new Date());
  }

  /**
   * Process a kanji review and calculate next review time
   * @param kanjiId The kanji character
   * @param rating User's rating (1-5)
   * @param studyMode 'recognition' | 'production' | 'writing'
   * @returns Review result with next review date
   */
  async processReview(
    kanjiId: string, 
    rating: number,
    studyMode: 'recognition' | 'production' | 'writing' = 'recognition'
  ): Promise<KanjiReviewResult> {
    // Get existing progress or create new
    const progress = await kanjiStorage.getProgress(kanjiId);
    let card: Card;

    if (progress) {
      // Reconstruct card from saved progress
      card = {
        due: new Date(progress.nextReview),
        stability: progress.easeFactor,
        difficulty: progress.difficulty || 5,
        elapsed_days: progress.interval,
        scheduled_days: progress.interval,
        reps: progress.reviewCount,
        lapses: progress.lapses || 0,
        state: this.getCardState(progress),
        last_review: progress.lastReviewed
      };
    } else {
      // Create new card
      card = this.createNewCard(kanjiId);
    }

    // Map our 1-5 rating to FSRS ratings
    const fsrsRating = this.mapRatingToFSRS(rating);
    
    // Calculate next review
    const now = new Date();
    const scheduling_cards = this.f.repeat(card, now);
    const nextCard = scheduling_cards[fsrsRating].card;

    // Calculate retention rate based on performance
    const retentionRate = this.calculateRetentionRate(nextCard, rating);

    // Save progress
    const updatedProgress: KanjiProgress = {
      id: kanjiId,
      lastReviewed: now,
      nextReview: nextCard.due,
      reviewCount: nextCard.reps,
      easeFactor: nextCard.stability,
      interval: nextCard.scheduled_days,
      difficulty: nextCard.difficulty,
      lapses: nextCard.lapses,
      lastQuality: rating,
      retentionRate,
      studyModes: {
        ...progress?.studyModes,
        [studyMode]: {
          reviewCount: (progress?.studyModes?.[studyMode]?.reviewCount || 0) + 1,
          lastQuality: rating,
          averageQuality: this.updateAverageQuality(
            progress?.studyModes?.[studyMode]?.averageQuality || 0,
            progress?.studyModes?.[studyMode]?.reviewCount || 0,
            rating
          )
        }
      },
      createdAt: progress?.createdAt || now,
      updatedAt: now
    };

    await kanjiStorage.saveProgress(updatedProgress);

    // Update streak
    await this.updateStreak();

    return {
      card: nextCard,
      nextReview: nextCard.due,
      interval: nextCard.scheduled_days,
      easeFactor: nextCard.stability,
      retentionRate
    };
  }

  /**
   * Get kanji due for review
   */
  async getDueKanji(limit?: number): Promise<KanjiProgress[]> {
    const allProgress = await kanjiStorage.getAllProgress();
    const now = new Date();
    
    const dueKanji = allProgress
      .filter(p => new Date(p.nextReview) <= now)
      .sort((a, b) => {
        // Prioritize by how overdue they are
        const aDue = new Date(a.nextReview).getTime();
        const bDue = new Date(b.nextReview).getTime();
        return aDue - bDue;
      });
    
    return limit ? dueKanji.slice(0, limit) : dueKanji;
  }

  /**
   * Get new kanji to learn (not yet studied)
   */
  async getNewKanji(jlptLevel: string, limit: number): Promise<string[]> {
    const studied = await kanjiStorage.getStudiedKanji();
    const studiedSet = new Set(studied);
    
    // Load kanji for the level
    const response = await fetch(`/api/kanji/jlpt_${jlptLevel.toLowerCase().replace('n', '')}`);
    const kanjiList = await response.json();
    
    // Filter out already studied kanji
    const newKanji = kanjiList
      .filter((k: any) => !studiedSet.has(k.kanji))
      .slice(0, limit)
      .map((k: any) => k.kanji);
    
    return newKanji;
  }

  /**
   * Get study statistics
   */
  async getStats(): Promise<KanjiStudyStats> {
    const allProgress = await kanjiStorage.getAllProgress();
    const sessions = await kanjiStorage.getStudySessions();
    const now = new Date();
    
    const dueCount = allProgress.filter(p => new Date(p.nextReview) <= now).length;
    const masteredCount = allProgress.filter(p => p.retentionRate >= 90 && p.reviewCount >= 5).length;
    const totalReviews = allProgress.reduce((sum, p) => sum + p.reviewCount, 0);
    const averageRetention = allProgress.length > 0
      ? allProgress.reduce((sum, p) => sum + p.retentionRate, 0) / allProgress.length
      : 0;
    
    // Calculate streak
    const streak = await this.getCurrentStreak();
    
    return {
      totalKanji: allProgress.length,
      learnedKanji: allProgress.filter(p => p.reviewCount > 0).length,
      dueForReview: dueCount,
      masteredKanji: masteredCount,
      retentionRate: Math.round(averageRetention),
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalReviews
    };
  }

  /**
   * Map our 1-5 rating system to FSRS ratings
   */
  private mapRatingToFSRS(rating: number): Grade {
    switch (rating) {
      case 1: return Rating.Again; // Forgot completely
      case 2: return Rating.Hard;  // Struggled
      case 3: 
      case 4: return Rating.Good;  // Recalled correctly
      case 5: return Rating.Easy;  // Instant recall
      default: return Rating.Good;
    }
  }

  /**
   * Calculate retention rate based on card performance
   */
  private calculateRetentionRate(card: Card, lastRating: number): number {
    // Base retention on stability, review count, and recent performance
    const stabilityFactor = Math.min(card.stability / 90, 1) * 40; // 40% from stability
    const reviewFactor = Math.min(card.reps / 20, 1) * 30; // 30% from review count
    const performanceFactor = (lastRating / 5) * 30; // 30% from last performance
    
    return Math.round(stabilityFactor + reviewFactor + performanceFactor);
  }

  /**
   * Get card state from progress
   */
  private getCardState(progress: KanjiProgress): number {
    if (progress.reviewCount === 0) return 0; // New
    if (progress.reviewCount < 3) return 1; // Learning
    if (progress.interval < 21) return 2; // Young
    return 3; // Mature
  }

  /**
   * Update average quality rating
   */
  private updateAverageQuality(currentAvg: number, count: number, newRating: number): number {
    return (currentAvg * count + newRating) / (count + 1);
  }

  /**
   * Update study streak
   */
  private async updateStreak(): Promise<void> {
    const sessions = await kanjiStorage.getStudySessions();
    const today = new Date().toDateString();
    
    // Check if already studied today
    const studiedToday = sessions.some(s => 
      new Date(s.date).toDateString() === today
    );
    
    if (!studiedToday) {
      await kanjiStorage.recordStudySession({
        date: new Date(),
        kanjiReviewed: 1,
        averageQuality: 0,
        timeSpent: 0
      });
    }
  }

  /**
   * Get current and longest streak
   */
  private async getCurrentStreak(): Promise<{ current: number; longest: number }> {
    const sessions = await kanjiStorage.getStudySessions();
    if (sessions.length === 0) return { current: 0, longest: 0 };
    
    // Sort sessions by date
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    // Calculate current streak
    const today = new Date();
    const lastSession = new Date(sortedSessions[0].date);
    const daysDiff = Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      currentStreak = 1;
      
      // Count consecutive days
      for (let i = 1; i < sortedSessions.length; i++) {
        const prevDate = new Date(sortedSessions[i - 1].date);
        const currDate = new Date(sortedSessions[i].date);
        const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak
    for (let i = 1; i < sortedSessions.length; i++) {
      const prevDate = new Date(sortedSessions[i - 1].date);
      const currDate = new Date(sortedSessions[i].date);
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    
    return { current: currentStreak, longest: longestStreak };
  }
}

// Export singleton instance
export const kanjiSRS = new KanjiSpacedRepetitionService();