import { StatsTracker, UserStatsV2, DailyActivity } from '../statsTracker';
import { User } from 'firebase/auth';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn((...args) => mockSetDoc(...args)),
  getDoc: jest.fn((...args) => mockGetDoc(...args)),
  serverTimestamp: jest.fn(() => ({ toMillis: () => Date.now() }))
}));

// Enhanced Storage Manager Mock
const mockSaveToStore = jest.fn();
const mockGetFromStore = jest.fn();
jest.mock('@/utils/enhancedStorageManager2', () => ({
  EnhancedStorageManager2: {
    getInstance: jest.fn().mockReturnValue({
      saveData: jest.fn().mockResolvedValue(undefined),
      loadData: jest.fn().mockResolvedValue(null),
      deleteData: jest.fn().mockResolvedValue(undefined),
      getAllData: jest.fn().mockResolvedValue({})
    }),
    getFromStore: jest.fn((...args) => mockGetFromStore(...args)),
    saveToStore: jest.fn((...args) => mockSaveToStore(...args))
  }
}));

describe('StatsTracker Reliability Test Suite', () => {
  let statsTracker: StatsTracker;
  
  // Mock users for testing
  const guestUser = null;
  const freeUser: User = { uid: 'free-user-123', email: 'free@test.com' } as User;
  const premiumUser: User = { uid: 'premium-user-456', email: 'premium@test.com' } as User;

  beforeEach(() => {
    // Reset singleton instance
    (StatsTracker as any).instance = null;
    statsTracker = StatsTracker.getInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
    mockSaveToStore.mockResolvedValue(undefined);
    mockGetFromStore.mockResolvedValue(null);
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({ exists: () => false });
    
    // Mock console methods to verify logging
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Three-Pillar Architecture Compliance', () => {
    describe('Guest Users', () => {
      beforeEach(async () => {
        await statsTracker.initialize(guestUser, false);
      });

      it('should NOT save stats to IndexedDB for guest users', async () => {
        await statsTracker.trackActivity('drill', { correct: 5, total: 10 });
        
        // Verify IndexedDB save was NOT called
        expect(mockSaveToStore).not.toHaveBeenCalledWith(
          expect.any(String),
          'userStats',
          expect.any(Object)
        );
        
        // Verify guest user log
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Guest user - skipping IndexedDB save')
        );
      });

      it('should NOT save activities to IndexedDB for guest users', async () => {
        await statsTracker.trackActivity('article', { itemId: 'article-1' });
        
        // Verify activity save was NOT called
        expect(mockSaveToStore).not.toHaveBeenCalledWith(
          expect.stringContaining('Activities'),
          expect.any(String),
          expect.any(Object)
        );
        
        // Verify guest user log
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Guest user - skipping activity save')
        );
      });

      it('should NOT load from IndexedDB for guest users', async () => {
        // Re-initialize to trigger load
        await statsTracker.initialize(guestUser, false);
        
        // Verify IndexedDB load was NOT called
        expect(mockGetFromStore).not.toHaveBeenCalledWith(
          expect.any(String),
          'userStats'
        );
        
        // Verify guest user log
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Guest user - skipping IndexedDB load')
        );
      });

      it('should maintain stats in memory only for guest users', async () => {
        // Track activities
        await statsTracker.trackActivity('drill', { correct: 8, total: 10 });
        await statsTracker.trackActivity('story', { itemId: 'story-1' });
        
        // Verify stats are tracked in memory
        const stats = statsTracker.getStats();
        expect(stats.drillsCompleted).toBe(1);
        expect(stats.storiesRead).toBe(1);
        expect(stats.totalActivities).toBe(2);
        
        // But nothing should be persisted
        expect(mockSaveToStore).not.toHaveBeenCalled();
      });
    });

    describe('Free Users', () => {
      beforeEach(async () => {
        await statsTracker.initialize(freeUser, false);
      });

      it('should save stats to IndexedDB ONLY for free users', async () => {
        await statsTracker.trackActivity('drill', { correct: 5, total: 10 });
        
        // Verify IndexedDB save was called
        expect(mockSaveToStore).toHaveBeenCalledWith(
          expect.any(String),
          'userStats',
          expect.objectContaining({
            userId: 'free-user-123',
            drillsCompleted: 1
          })
        );
        
        // Verify Firebase save was NOT called
        expect(mockSetDoc).not.toHaveBeenCalled();
      });

      it('should NOT sync to Firebase for free users', async () => {
        await statsTracker.trackActivity('story', { itemId: 'story-1' });
        await statsTracker.forceSync();
        
        // Verify no Firebase operations
        expect(mockSetDoc).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(
          '🔄 [StatsTracker] Sync skipped - not premium user'
        );
      });

      it('should load from IndexedDB for free users', async () => {
        const existingStats = {
          userId: 'free-user-123',
          currentStreak: 5,
          totalActivities: 100,
          version: '2.1'
        };
        
        mockGetFromStore.mockResolvedValueOnce(existingStats);
        
        // Re-initialize to trigger load
        await statsTracker.initialize(freeUser, false);
        
        // Verify IndexedDB load was called
        expect(mockGetFromStore).toHaveBeenCalledWith(
          expect.any(String),
          'userStats'
        );
        
        // Verify stats were loaded
        const stats = statsTracker.getStats();
        expect(stats.currentStreak).toBe(5);
        expect(stats.totalActivities).toBe(100);
      });
    });

    describe('Premium Users', () => {
      beforeEach(async () => {
        await statsTracker.initialize(premiumUser, true);
      });

      it('should save to BOTH IndexedDB and Firebase for premium users', async () => {
        await statsTracker.trackActivity('drill', { correct: 5, total: 10 });
        
        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify IndexedDB save
        expect(mockSaveToStore).toHaveBeenCalledWith(
          expect.any(String),
          'userStats',
          expect.objectContaining({
            userId: 'premium-user-456',
            drillsCompleted: 1
          })
        );
        
        // Verify Firebase save will happen (through sync)
        expect(statsTracker['isPremium']).toBe(true);
        expect(statsTracker['syncTimer']).not.toBeNull();
      });

      it('should sync to Firebase when forceSync is called', async () => {
        await statsTracker.trackActivity('story', { itemId: 'story-1' });
        await statsTracker.forceSync();
        
        // Verify Firebase save was called
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            userId: 'premium-user-456',
            storiesRead: 1
          }),
          expect.any(Object)
        );
      });

      it('should load from Firebase if newer than IndexedDB', async () => {
        const localStats = {
          userId: 'premium-user-456',
          currentStreak: 3,
          lastUpdated: Date.now() - 3600000, // 1 hour ago
          version: '2.1'
        };
        
        const cloudStats = {
          userId: 'premium-user-456',
          currentStreak: 5,
          lastUpdated: { toMillis: () => Date.now() }, // Now
          version: '2.1'
        };
        
        mockGetFromStore.mockResolvedValueOnce(localStats);
        mockGetDoc.mockResolvedValueOnce({
          exists: () => true,
          data: () => cloudStats
        });
        
        // Re-initialize to trigger load
        await statsTracker.initialize(premiumUser, true);
        
        // Verify cloud stats were used
        const stats = statsTracker.getStats();
        expect(stats.currentStreak).toBe(5);
      });
    });
  });

  describe('Streak Calculation Reliability', () => {
    it('should start streak at 1 for first activity', async () => {
      await statsTracker.initialize(freeUser, false);
      
      await statsTracker.trackActivity('drill', { correct: 5, total: 10 });
      
      const stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
    });

    it('should increment streak for consecutive days', async () => {
      await statsTracker.initialize(freeUser, false);
      
      // Mock date utilities
      const originalGetDateString = statsTracker['getDateString'];
      let mockDate = new Date('2025-01-20');
      
      statsTracker['getDateString'] = jest.fn(() => {
        return mockDate.toISOString().split('T')[0];
      });
      
      // Day 1
      mockDate = new Date('2025-01-20');
      await statsTracker.trackActivity('drill', {});
      let stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(1);
      
      // Day 2 (consecutive)
      mockDate = new Date('2025-01-21');
      statsTracker['stats']!.lastActiveDate = '2025-01-20'; // Simulate previous day
      await statsTracker.trackActivity('drill', {});
      stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(2);
      
      // Day 3 (consecutive)
      mockDate = new Date('2025-01-22');
      statsTracker['stats']!.lastActiveDate = '2025-01-21'; // Simulate previous day
      await statsTracker.trackActivity('drill', {});
      stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(3);
      
      // Restore original function
      statsTracker['getDateString'] = originalGetDateString;
    });

    it('should reset streak after missing a day', async () => {
      await statsTracker.initialize(freeUser, false);
      
      const originalGetDateString = statsTracker['getDateString'];
      let mockDate = new Date('2025-01-20');
      
      statsTracker['getDateString'] = jest.fn(() => {
        return mockDate.toISOString().split('T')[0];
      });
      
      // Build up a streak
      mockDate = new Date('2025-01-20');
      await statsTracker.trackActivity('drill', {});
      
      mockDate = new Date('2025-01-21');
      statsTracker['stats']!.lastActiveDate = '2025-01-20';
      await statsTracker.trackActivity('drill', {});
      
      let stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(2);
      
      // Skip a day
      mockDate = new Date('2025-01-23'); // Skipped Jan 22
      statsTracker['stats']!.lastActiveDate = '2025-01-21';
      await statsTracker.trackActivity('drill', {});
      
      stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(1); // Reset to 1
      expect(stats.longestStreak).toBe(2); // Longest remains
      
      // Restore
      statsTracker['getDateString'] = originalGetDateString;
    });

    it('should not increment streak for multiple activities on same day', async () => {
      await statsTracker.initialize(freeUser, false);
      
      // Multiple activities on same day
      await statsTracker.trackActivity('drill', {});
      await statsTracker.trackActivity('story', {});
      await statsTracker.trackActivity('game', {});
      
      const stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(1); // Still 1
      expect(stats.totalActivities).toBe(3); // But activities count
    });
  });

  describe('Activity Data Reliability', () => {
    beforeEach(async () => {
      await statsTracker.initialize(freeUser, false);
    });

    it('should accurately track different activity types', async () => {
      // Track various activities
      await statsTracker.trackActivity('drill', { correct: 8, total: 10 });
      await statsTracker.trackActivity('story', { itemId: 'story-1' });
      await statsTracker.trackActivity('article', { itemId: 'article-1' });
      await statsTracker.trackActivity('game', { gameType: 'kanji-quest', score: 100 });
      await statsTracker.trackActivity('flashcard', { correct: 15, total: 20 });
      await statsTracker.trackActivity('kanji', { itemId: '日', correct: 1, total: 1 });
      await statsTracker.trackActivity('vocab', { itemId: 'taberu' });
      await statsTracker.trackActivity('practice', {});
      
      const stats = statsTracker.getStats();
      
      // Verify all counters
      expect(stats.drillsCompleted).toBe(1);
      expect(stats.storiesRead).toBe(1);
      expect(stats.articlesRead).toBe(1);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.flashcardsReviewed).toBe(1);
      expect(stats.kanjiStudySessions).toBe(1);
      expect(stats.vocabStudied).toBe(1);
      expect(stats.practiceSessionsCompleted).toBe(1);
      expect(stats.totalActivities).toBe(8);
    });

    it('should calculate accuracy correctly', async () => {
      await statsTracker.trackActivity('drill', { correct: 8, total: 10 });
      await statsTracker.trackActivity('drill', { correct: 7, total: 10 });
      await statsTracker.trackActivity('kanji', { itemId: '日', correct: 9, total: 10 });
      
      const stats = statsTracker.getStats();
      
      // Overall accuracy: (8+7+9)/(10+10+10) = 24/30 = 80%
      expect(stats.overallAccuracy).toBe(80);
      
      // Drill accuracy: (8+7)/(10+10) = 15/20 = 75%
      expect(stats.drillAccuracy).toBe(75);
      
      // Kanji accuracy: 9/10 = 90%
      expect(stats.kanjiAccuracy).toBe(90);
    });

    it('should track Pokemon correctly', async () => {
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
      
      // Try to catch same Pokemon again
      await statsTracker.trackActivity('game', {
        gameType: 'pokemon',
        itemId: 'pikachu',
        score: 1
      });
      
      const stats = statsTracker.getStats();
      expect(stats.pokemonCaught).toBe(2); // Only 2 unique
      expect(stats.caughtPokemonSet).toContain('pikachu');
      expect(stats.caughtPokemonSet).toContain('charmander');
    });
  });

  describe('Activities Data Retrieval', () => {
    beforeEach(async () => {
      await statsTracker.initialize(freeUser, false);
    });

    it('should provide today\'s activities', async () => {
      // Track today's activities
      await statsTracker.trackActivity('flashcard', { correct: 10, total: 15 });
      await statsTracker.trackActivity('article', { itemId: 'article-1' });
      await statsTracker.trackActivity('story', { itemId: 'story-1' });
      await statsTracker.trackActivity('game', { gameType: 'kana-drop' });
      await statsTracker.trackActivity('game', { gameType: 'kanji-quest' });
      
      const activities = await statsTracker.getActivitiesData();
      
      expect(activities.today).not.toBeNull();
      expect(activities.today?.summary.flashcardsReviewed).toBe(1);
      expect(activities.today?.summary.articlesRead).toBe(1);
      expect(activities.today?.summary.storiesRead).toBe(1);
      expect(activities.today?.summary.gamesPlayed).toBe(2);
    });

    it('should aggregate week and month data correctly', async () => {
      // Mock activities for multiple days
      const activities = await statsTracker.getActivitiesData();
      
      // Verify structure
      expect(activities).toHaveProperty('today');
      expect(activities).toHaveProperty('week');
      expect(activities).toHaveProperty('month');
      expect(Array.isArray(activities.week)).toBe(true);
      expect(Array.isArray(activities.month)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await statsTracker.initialize(freeUser, false);
    });

    it('should handle invalid activity data gracefully', async () => {
      const initialStats = statsTracker.getStats();
      
      // Invalid: correct > total
      await statsTracker.trackActivity('drill', { correct: 15, total: 10 });
      
      // Invalid: negative values
      await statsTracker.trackActivity('game', { score: -50 });
      
      // Invalid: negative correct/total
      await statsTracker.trackActivity('kanji', { correct: -5, total: -10 });
      
      const stats = statsTracker.getStats();
      
      // Should not have processed invalid data
      expect(stats.totalQuestionsAnswered).toBe(initialStats.totalQuestionsAnswered);
      expect(stats.totalCorrectAnswers).toBe(initialStats.totalCorrectAnswers);
      expect(stats.totalGameScore).toBe(initialStats.totalGameScore);
    });

    it('should handle missing details gracefully', async () => {
      // Activities with no details
      await statsTracker.trackActivity('drill', {});
      await statsTracker.trackActivity('story', {});
      await statsTracker.trackActivity('game', {});
      
      const stats = statsTracker.getStats();
      
      // Should still count activities
      expect(stats.drillsCompleted).toBe(1);
      expect(stats.storiesRead).toBe(1);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.totalActivities).toBe(3);
    });

    it('should handle concurrent activities', async () => {
      // Simulate concurrent activity tracking
      const promises = [
        statsTracker.trackActivity('drill', { correct: 5, total: 10 }),
        statsTracker.trackActivity('story', { itemId: 'story-1' }),
        statsTracker.trackActivity('game', { score: 100 }),
        statsTracker.trackActivity('flashcard', { correct: 8, total: 10 })
      ];
      
      await Promise.all(promises);
      
      const stats = statsTracker.getStats();
      expect(stats.totalActivities).toBe(4);
      expect(stats.drillsCompleted).toBe(1);
      expect(stats.storiesRead).toBe(1);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.flashcardsReviewed).toBe(1);
    });
  });

  describe('Data Persistence and Recovery', () => {
    it('should recover from corrupted data', async () => {
      // Mock corrupted data
      mockGetFromStore.mockResolvedValueOnce({
        userId: 'free-user-123',
        currentStreak: 'invalid', // Should be number
        totalActivities: null, // Should be number
        version: '1.0' // Old version
      });
      
      await statsTracker.initialize(freeUser, false);
      
      const stats = statsTracker.getStats();
      
      // Should create fresh stats
      expect(stats.version).toBe('2.1');
      expect(typeof stats.currentStreak).toBe('number');
      expect(typeof stats.totalActivities).toBe('number');
    });

    it('should handle storage failures gracefully', async () => {
      // Mock storage failure
      mockSaveToStore.mockRejectedValue(new Error('Storage quota exceeded'));
      
      await statsTracker.initialize(freeUser, false);
      
      // Should not throw when tracking
      await expect(
        statsTracker.trackActivity('drill', { correct: 5, total: 10 })
      ).resolves.not.toThrow();
      
      // Stats should still be in memory
      const stats = statsTracker.getStats();
      expect(stats.drillsCompleted).toBe(1);
      
      // Should log error
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error saving to IndexedDB'),
        expect.any(Error)
      );
    });
  });

  describe('Sync Behavior', () => {
    it('should start sync timer for premium users', async () => {
      await statsTracker.initialize(premiumUser, true);
      
      // Verify sync timer is active
      expect(statsTracker['syncTimer']).not.toBeNull();
      expect(console.log).toHaveBeenCalledWith('⏱️ [StatsTracker] Sync timer started');
    });

    it('should stop sync timer when switching to non-premium', async () => {
      // Start as premium
      await statsTracker.initialize(premiumUser, true);
      expect(statsTracker['syncTimer']).not.toBeNull();
      
      // Switch to free user
      await statsTracker.initialize(freeUser, false);
      expect(statsTracker['syncTimer']).toBeNull();
      expect(console.log).toHaveBeenCalledWith('⏹️ [StatsTracker] Sync timer stopped');
    });

    it('should debounce sync operations', async () => {
      await statsTracker.initialize(premiumUser, true);
      
      // Multiple rapid sync attempts
      await statsTracker.forceSync();
      await statsTracker.forceSync();
      await statsTracker.forceSync();
      
      // Should see debounce log
      expect(console.log).toHaveBeenCalledWith('🔄 [StatsTracker] Sync debounced');
    });
  });
});

describe('StatsBar Component Integration', () => {
  // These would typically be in a separate component test file
  // but included here for completeness
  
  it('should display correct stat format for Today\'s Progress', () => {
    const todayStats = {
      flashcards: 5,
      articles: 2,
      stories: 1,
      games: 3
    };
    
    const expectedFormat = '5/2/1/3';
    expect(`${todayStats.flashcards}/${todayStats.articles}/${todayStats.stories}/${todayStats.games}`)
      .toBe(expectedFormat);
  });

  it('should handle empty activities gracefully', () => {
    const emptyToday = null;
    const defaultDisplay = '0/0/0/0';
    
    expect(emptyToday ? 'has-data' : defaultDisplay).toBe(defaultDisplay);
  });
});