import { describe, it, expect, beforeEach } from '@jest/globals';
import { FSRSAlgorithm } from '../fsrsAlgorithm';
import { FSRSCard, Rating, State } from '../types';

describe('FSRSAlgorithm', () => {
  let algorithm: FSRSAlgorithm;
  let now: Date;

  beforeEach(() => {
    algorithm = new FSRSAlgorithm();
    now = new Date('2025-01-16T10:00:00Z');
  });

  describe('calculateNextStates', () => {
    it('should initialize a new card correctly', () => {
      const newCard: FSRSCard = {
        char: '人',
        state: State.New,
        dueDate: now.toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 0,
        lapses: 0,
        difficulty: 5,
        stability: 0,
        lastReview: null,
        metadata: {
          jlptLevel: 5,
          strokeCount: 2,
          frequency: 5
        }
      };

      const result = algorithm.calculateNextStates(newCard, now);

      // Check all rating options
      expect(result.again.state).toBe(State.Learning);
      expect(result.again.reps).toBe(1);
      expect(result.again.lapses).toBe(1);

      expect(result.hard.state).toBe(State.Learning);
      expect(result.hard.reps).toBe(1);

      expect(result.good.state).toBe(State.Learning);
      expect(result.good.reps).toBe(1);

      expect(result.easy.state).toBe(State.Review);
      expect(result.easy.reps).toBe(1);
    });

    it('should calculate kanji difficulty based on JLPT level', () => {
      const easyKanji: FSRSCard = {
        char: '一',
        state: State.New,
        dueDate: now.toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 0,
        lapses: 0,
        difficulty: 5,
        stability: 0,
        lastReview: null,
        metadata: {
          jlptLevel: 5,
          strokeCount: 1,
          frequency: 5
        }
      };

      const hardKanji: FSRSCard = {
        char: '鬱',
        state: State.New,
        dueDate: now.toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 0,
        lapses: 0,
        difficulty: 5,
        stability: 0,
        lastReview: null,
        metadata: {
          jlptLevel: 1,
          strokeCount: 29,
          frequency: 1
        }
      };

      const easyResult = algorithm.calculateNextStates(easyKanji, now);
      const hardResult = algorithm.calculateNextStates(hardKanji, now);

      // Harder kanji should have shorter intervals
      const easyGoodInterval = new Date(easyResult.good.dueDate).getTime() - now.getTime();
      const hardGoodInterval = new Date(hardResult.good.dueDate).getTime() - now.getTime();

      expect(hardGoodInterval).toBeLessThan(easyGoodInterval);
    });

    it('should handle learning state transitions correctly', () => {
      const learningCard: FSRSCard = {
        char: '水',
        state: State.Learning,
        dueDate: now.toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 1,
        lapses: 0,
        difficulty: 5,
        stability: 0.4,
        lastReview: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        metadata: {
          jlptLevel: 5,
          strokeCount: 4,
          frequency: 5
        }
      };

      const result = algorithm.calculateNextStates(learningCard, now);

      expect(result.again.state).toBe(State.Learning);
      expect(result.again.lapses).toBe(learningCard.lapses + 1);

      expect(result.good.state).toBe(State.Learning);
      expect(result.good.reps).toBe(learningCard.reps + 1);

      expect(result.easy.state).toBe(State.Review);
      expect(result.easy.reps).toBe(learningCard.reps + 1);
    });

    it('should handle review state with proper intervals', () => {
      const reviewCard: FSRSCard = {
        char: '火',
        state: State.Review,
        dueDate: now.toISOString(),
        scheduledDays: 1,
        elapsedDays: 1,
        reps: 5,
        lapses: 0,
        difficulty: 5,
        stability: 2.5,
        lastReview: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        metadata: {
          jlptLevel: 5,
          strokeCount: 4,
          frequency: 5
        }
      };

      const result = algorithm.calculateNextStates(reviewCard, now);

      // Again should move to relearning
      expect(result.again.state).toBe(State.Relearning);
      expect(result.again.lapses).toBe(reviewCard.lapses + 1);

      // Good should keep in review with longer interval
      expect(result.good.state).toBe(State.Review);
      const goodInterval = new Date(result.good.dueDate).getTime() - now.getTime();
      expect(goodInterval).toBeGreaterThan(24 * 60 * 60 * 1000); // More than 1 day

      // Easy should have even longer interval
      expect(result.easy.state).toBe(State.Review);
      const easyInterval = new Date(result.easy.dueDate).getTime() - now.getTime();
      expect(easyInterval).toBeGreaterThan(goodInterval);
    });

    it('should apply fuzz to prevent card bunching', () => {
      const card: FSRSCard = {
        char: '木',
        state: State.Review,
        dueDate: now.toISOString(),
        scheduledDays: 7,
        elapsedDays: 7,
        reps: 3,
        lapses: 0,
        difficulty: 5,
        stability: 8,
        lastReview: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          jlptLevel: 5,
          strokeCount: 4,
          frequency: 5
        }
      };

      // Run multiple times to check for fuzz variation
      const intervals = new Set<number>();
      for (let i = 0; i < 10; i++) {
        const result = algorithm.calculateNextStates(card, now);
        const interval = new Date(result.good.dueDate).getTime() - now.getTime();
        intervals.add(interval);
      }

      // Should have some variation due to fuzz
      expect(intervals.size).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle cards with no metadata gracefully', () => {
      const card: FSRSCard = {
        char: '金',
        state: State.New,
        dueDate: now.toISOString(),
        scheduledDays: 0,
        elapsedDays: 0,
        reps: 0,
        lapses: 0,
        difficulty: 5,
        stability: 0,
        lastReview: null,
        metadata: {} // Empty metadata
      };

      const result = algorithm.calculateNextStates(card, now);
      
      // Should still calculate without errors
      expect(result.again).toBeDefined();
      expect(result.hard).toBeDefined();
      expect(result.good).toBeDefined();
      expect(result.easy).toBeDefined();
    });

    it('should handle overdue cards correctly', () => {
      const overdueCard: FSRSCard = {
        char: '土',
        state: State.Review,
        dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days overdue
        scheduledDays: 3,
        elapsedDays: 10,
        reps: 3,
        lapses: 0,
        difficulty: 5,
        stability: 3,
        lastReview: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          jlptLevel: 5,
          strokeCount: 3,
          frequency: 5
        }
      };

      const result = algorithm.calculateNextStates(overdueCard, now);

      // Overdue cards should be treated appropriately
      expect(result.again.state).toBe(State.Relearning);
      expect(result.good.stability).toBeLessThan(overdueCard.stability * 2); // Stability shouldn't grow too much
    });
  });
});