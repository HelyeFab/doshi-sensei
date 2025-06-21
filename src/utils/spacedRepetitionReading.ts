// Spaced Repetition System for Reading Vocabulary
import { JapaneseWord } from '@/types';
import { StudyListManager } from './studyListManager';

// SRS intervals in days
const SRS_INTERVALS = [1, 3, 7, 14, 30, 90, 180, 365];

export interface VocabularyReview {
  id: string;
  word: JapaneseWord;
  articleId: string;
  articleTitle: string;
  encounterDate: Date;
  lastReviewed?: Date;
  nextReview: Date;
  difficulty: number; // 0-7 (maps to SRS_INTERVALS)
  correctCount: number;
  incorrectCount: number;
  context: string; // Sentence where the word appeared
  isKnown: boolean;
  masteryLevel: 'learning' | 'graduated' | 'mastered';
}

export interface ReviewSession {
  id: string;
  date: Date;
  wordsReviewed: string[];
  accuracy: number;
  timeSpent: number; // in seconds
  source: 'reading' | 'manual';
}

export class ReadingSpacedRepetition {
  private static readonly STORAGE_KEY = 'doshi_reading_srs';
  private static readonly REVIEW_SESSIONS_KEY = 'doshi_review_sessions';

  // Add vocabulary from reading session
  static async addVocabularyFromReading(
    vocabularyWords: string[],
    articleId: string,
    articleTitle: string
  ): Promise<void> {
    const reviews = this.getAllReviews();
    const newReviews: VocabularyReview[] = [];

    for (const word of vocabularyWords) {
      // Check if word already exists in SRS
      const existingReview = reviews.find(r =>
        r.word.kanji === word || r.word.kana === word
      );

      if (!existingReview) {
        try {
          // Search for word data
          const { searchWords } = await import('./api');
          const searchResults = await searchWords(word, 1);

          if (searchResults.length > 0) {
            const wordData = searchResults[0];

            const review: VocabularyReview = {
              id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              word: wordData,
              articleId,
              articleTitle,
              encounterDate: new Date(),
              nextReview: new Date(Date.now() + SRS_INTERVALS[0] * 24 * 60 * 60 * 1000),
              difficulty: 0,
              correctCount: 0,
              incorrectCount: 0,
              context: `Encountered in: ${articleTitle}`,
              isKnown: false,
              masteryLevel: 'learning'
            };

            newReviews.push(review);
          }
        } catch (error) {
          console.error(`Failed to add word ${word} to SRS:`, error);
        }
      } else {
        // Word exists, update encounter info
        existingReview.context += ` | ${articleTitle}`;
        existingReview.encounterDate = new Date();
      }
    }

    // Save new reviews
    if (newReviews.length > 0) {
      reviews.push(...newReviews);
      this.saveReviews(reviews);
    }
  }

  // Get due reviews for today
  static getDueReviews(maxCount: number = 20): VocabularyReview[] {
    const reviews = this.getAllReviews();
    const now = new Date();

    return reviews
      .filter(review => review.nextReview <= now && !review.isKnown)
      .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
      .slice(0, maxCount);
  }

  // Process review result
  static processReview(
    reviewId: string,
    correct: boolean,
    timeSpent: number
  ): VocabularyReview | null {
    const reviews = this.getAllReviews();
    const reviewIndex = reviews.findIndex(r => r.id === reviewId);

    if (reviewIndex === -1) return null;

    const review = reviews[reviewIndex];
    review.lastReviewed = new Date();

    if (correct) {
      review.correctCount++;

      // Advance to next difficulty level
      if (review.difficulty < SRS_INTERVALS.length - 1) {
        review.difficulty++;
      }

      // Check if word should be marked as known
      if (review.correctCount >= 3 && review.difficulty >= 4) {
        review.isKnown = true;
        review.masteryLevel = 'mastered';
      } else if (review.correctCount >= 2 && review.difficulty >= 2) {
        review.masteryLevel = 'graduated';
      }
    } else {
      review.incorrectCount++;

      // Reset to beginning if answered incorrectly
      review.difficulty = Math.max(0, review.difficulty - 1);
      review.masteryLevel = 'learning';
    }

    // Calculate next review date
    const daysUntilNext = SRS_INTERVALS[review.difficulty];
    review.nextReview = new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000);

    // Save updated reviews
    this.saveReviews(reviews);

    // Log review session
    this.logReviewSession([reviewId], correct ? 100 : 0, timeSpent);

    return review;
  }

  // Get review statistics
  static getReviewStats(): {
    totalWords: number;
    dueToday: number;
    mastered: number;
    learning: number;
    averageAccuracy: number;
    streak: number;
  } {
    const reviews = this.getAllReviews();
    const sessions = this.getAllReviewSessions();

    const totalWords = reviews.length;
    const dueToday = this.getDueReviews(1000).length;
    const mastered = reviews.filter(r => r.masteryLevel === 'mastered').length;
    const learning = reviews.filter(r => r.masteryLevel === 'learning').length;

    // Calculate average accuracy
    const totalCorrect = reviews.reduce((sum, r) => sum + r.correctCount, 0);
    const totalAttempts = reviews.reduce((sum, r) => sum + r.correctCount + r.incorrectCount, 0);
    const averageAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    // Calculate streak (consecutive days with reviews)
    const streak = this.calculateReviewStreak(sessions);

    return {
      totalWords,
      dueToday,
      mastered,
      learning,
      averageAccuracy,
      streak
    };
  }

  // Get vocabulary recommendations based on reading history
  static getVocabularyRecommendations(): VocabularyReview[] {
    const reviews = this.getAllReviews();

    // Recommend words that appear frequently but haven't been mastered
    return reviews
      .filter(r => !r.isKnown && r.incorrectCount < r.correctCount)
      .sort((a, b) => {
        // Priority: more encounters, less difficulty
        const aScore = a.correctCount - a.difficulty;
        const bScore = b.correctCount - b.difficulty;
        return bScore - aScore;
      })
      .slice(0, 10);
  }

  // Mark word as known (skip SRS)
  static markAsKnown(reviewId: string): void {
    const reviews = this.getAllReviews();
    const review = reviews.find(r => r.id === reviewId);

    if (review) {
      review.isKnown = true;
      review.masteryLevel = 'mastered';
      review.nextReview = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      this.saveReviews(reviews);
    }
  }

  // Remove word from SRS
  static removeFromSRS(reviewId: string): void {
    const reviews = this.getAllReviews();
    const filteredReviews = reviews.filter(r => r.id !== reviewId);
    this.saveReviews(filteredReviews);
  }

  // Export SRS data for backup
  static exportSRSData(): string {
    const reviews = this.getAllReviews();
    const sessions = this.getAllReviewSessions();

    return JSON.stringify({
      reviews,
      sessions,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  // Import SRS data from backup
  static importSRSData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      if (data.reviews && Array.isArray(data.reviews)) {
        this.saveReviews(data.reviews);
      }

      if (data.sessions && Array.isArray(data.sessions)) {
        localStorage.setItem(this.REVIEW_SESSIONS_KEY, JSON.stringify(data.sessions));
      }

      return true;
    } catch (error) {
      console.error('Failed to import SRS data:', error);
      return false;
    }
  }

  // Private helper methods
  private static getAllReviews(): VocabularyReview[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveReviews(reviews: VocabularyReview[]): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reviews));
  }

  private static getAllReviewSessions(): ReviewSession[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.REVIEW_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static logReviewSession(
    wordIds: string[],
    accuracy: number,
    timeSpent: number
  ): void {
    const sessions = this.getAllReviewSessions();

    const session: ReviewSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(),
      wordsReviewed: wordIds,
      accuracy,
      timeSpent,
      source: 'reading'
    };

    sessions.push(session);
    localStorage.setItem(this.REVIEW_SESSIONS_KEY, JSON.stringify(sessions));
  }

  private static calculateReviewStreak(sessions: ReviewSession[]): number {
    if (sessions.length === 0) return 0;

    const sortedSessions = sessions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff === 0 || daysDiff === 1) {
        if (daysDiff === 1) {
          streak++;
          currentDate = sessionDate;
        }
      } else if (daysDiff > 1) {
        break;
      }
    }

    return streak;
  }
}

// Utility functions
export function getSRSIntervalText(difficulty: number): string {
  const days = SRS_INTERVALS[difficulty] || 1;

  if (days === 1) return '1日後';
  if (days < 30) return `${days}日後`;
  if (days < 365) return `${Math.round(days / 30)}ヶ月後`;
  return `${Math.round(days / 365)}年後`;
}

export function getMasteryLevelText(level: string): string {
  switch (level) {
    case 'learning': return '学習中';
    case 'graduated': return '卒業';
    case 'mastered': return '習得済み';
    default: return '未知';
  }
}

export function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 1) return 'text-red-600';
  if (difficulty <= 3) return 'text-yellow-600';
  if (difficulty <= 5) return 'text-blue-600';
  return 'text-green-600';
}
