import { StatsTracker } from '../statsTracker';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}));

// Mock Enhanced Storage Manager
jest.mock('@/utils/enhancedStorageManager2', () => ({
  EnhancedStorageManager2: {
    getInstance: jest.fn().mockReturnValue({
      saveData: jest.fn().mockResolvedValue(undefined),
      loadData: jest.fn().mockResolvedValue(null),
      deleteData: jest.fn().mockResolvedValue(undefined),
      getAllData: jest.fn().mockResolvedValue({})
    }),
    getFromStore: jest.fn().mockResolvedValue(null),
    saveToStore: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('StatsTracker', () => {
  let statsTracker: StatsTracker;

  beforeEach(() => {
    // Reset singleton instance
    (StatsTracker as any).instance = null;
    statsTracker = StatsTracker.getInstance();
  });

  describe('Uniqueness Tracking', () => {
    beforeEach(async () => {
      await statsTracker.initialize(null, false);
    });

    it('should track unique kanji correctly', async () => {
      // Track the same kanji multiple times
      await statsTracker.trackActivity('kanji', {
        itemId: '日',
        correct: 1,
        total: 1
      });
      
      await statsTracker.trackActivity('kanji', {
        itemId: '日',
        correct: 1,
        total: 1
      });
      
      await statsTracker.trackActivity('kanji', {
        itemId: '月',
        correct: 1,
        total: 1
      });

      const stats = statsTracker.getStats();
      expect(stats.learnedKanjiSet).toContain('日');
      expect(stats.learnedKanjiSet).toContain('月');
      expect(stats.totalKanjiLearned).toBe(2); // Should be 2, not 3
      expect(stats.kanjiStudySessions).toBe(3); // All sessions are counted
    });

    it('should track unique words correctly', async () => {
      // Track the same word multiple times
      await statsTracker.trackActivity('vocab', {
        itemId: 'taberu',
        itemTitle: '食べる'
      });
      
      await statsTracker.trackActivity('vocab', {
        itemId: 'taberu',
        itemTitle: '食べる'
      });
      
      await statsTracker.trackActivity('vocab', {
        itemId: 'nomu',
        itemTitle: '飲む'
      });

      const stats = statsTracker.getStats();
      expect(stats.learnedWordsSet).toContain('taberu');
      expect(stats.learnedWordsSet).toContain('nomu');
      expect(stats.totalWordsLearned).toBe(2); // Should be 2, not 3
      expect(stats.vocabStudied).toBe(3); // All study sessions are counted
    });

    it('should track unique Pokemon correctly', async () => {
      // Track the same Pokemon multiple times
      await statsTracker.trackActivity('game', {
        gameType: 'pokemon',
        itemId: 'pikachu',
        score: 1
      });
      
      await statsTracker.trackActivity('game', {
        gameType: 'pokemon',
        itemId: 'pikachu',
        score: 1
      });
      
      await statsTracker.trackActivity('game', {
        gameType: 'pokemon',
        itemId: 'charmander',
        score: 1
      });

      const stats = statsTracker.getStats();
      expect(stats.caughtPokemonSet).toContain('pikachu');
      expect(stats.caughtPokemonSet).toContain('charmander');
      expect(stats.pokemonCaught).toBe(2); // Should be 2, not 3
    });
  });

  describe('Data Validation', () => {
    beforeEach(async () => {
      await statsTracker.initialize(null, false);
    });

    it('should reject invalid correct/total combinations', async () => {
      const initialStats = statsTracker.getStats();
      
      // Try to track with correct > total
      await statsTracker.trackActivity('drill', {
        correct: 10,
        total: 5
      });

      const stats = statsTracker.getStats();
      expect(stats.totalQuestionsAnswered).toBe(initialStats.totalQuestionsAnswered);
      expect(stats.totalCorrectAnswers).toBe(initialStats.totalCorrectAnswers);
    });

    it('should reject negative values', async () => {
      const initialStats = statsTracker.getStats();
      
      // Try to track with negative values
      await statsTracker.trackActivity('drill', {
        correct: -5,
        total: 10
      });

      const stats = statsTracker.getStats();
      expect(stats.totalQuestionsAnswered).toBe(initialStats.totalQuestionsAnswered);
      
      // Try to track with negative score
      await statsTracker.trackActivity('game', {
        score: -100
      });
      
      expect(stats.totalGameScore).toBe(initialStats.totalGameScore);
    });
  });

  describe('Activity-Specific Accuracy', () => {
    beforeEach(async () => {
      await statsTracker.initialize(null, false);
    });

    it('should calculate drill-specific accuracy', async () => {
      await statsTracker.trackActivity('drill', {
        correct: 8,
        total: 10
      });
      
      await statsTracker.trackActivity('drill', {
        correct: 7,
        total: 10
      });

      const stats = statsTracker.getStats();
      expect(stats.drillStats.totalQuestions).toBe(20);
      expect(stats.drillStats.totalCorrect).toBe(15);
      expect(stats.drillAccuracy).toBe(75); // 15/20 = 75%
    });

    it('should calculate kanji-specific accuracy', async () => {
      await statsTracker.trackActivity('kanji', {
        itemId: '日',
        correct: 1,
        total: 1
      });
      
      await statsTracker.trackActivity('kanji', {
        itemId: '月',
        correct: 0,
        total: 1
      });

      const stats = statsTracker.getStats();
      expect(stats.kanjiStats.totalQuestions).toBe(2);
      expect(stats.kanjiStats.totalCorrect).toBe(1);
      expect(stats.kanjiAccuracy).toBe(50); // 1/2 = 50%
    });

    it('should calculate game-specific accuracy', async () => {
      await statsTracker.trackActivity('game', {
        gameType: 'kana-drop',
        correct: 18,
        total: 20,
        score: 180
      });

      const stats = statsTracker.getStats();
      expect(stats.gameStats.totalQuestions).toBe(20);
      expect(stats.gameStats.totalCorrect).toBe(18);
      expect(stats.gameAccuracy).toBe(90); // 18/20 = 90%
    });

    it('should maintain separate accuracies for different activity types', async () => {
      // Drill: 80% accuracy
      await statsTracker.trackActivity('drill', {
        correct: 8,
        total: 10
      });
      
      // Kanji: 60% accuracy
      await statsTracker.trackActivity('kanji', {
        itemId: '日',
        correct: 6,
        total: 10
      });
      
      // Game: 90% accuracy
      await statsTracker.trackActivity('game', {
        correct: 9,
        total: 10
      });

      const stats = statsTracker.getStats();
      expect(stats.drillAccuracy).toBe(80);
      expect(stats.kanjiAccuracy).toBe(60);
      expect(stats.gameAccuracy).toBe(90);
      
      // Overall accuracy should be weighted average
      expect(stats.overallAccuracy).toBe(77); // (8+6+9)/(10+10+10) = 23/30 = 76.67% ≈ 77%
    });
  });

  describe('Version Management', () => {
    it('should create stats with version 2.1', async () => {
      await statsTracker.initialize(null, false);
      const stats = statsTracker.getStats();
      expect(stats.version).toBe('2.1');
    });
  });
});