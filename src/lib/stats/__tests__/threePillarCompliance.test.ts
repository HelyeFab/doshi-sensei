/**
 * Three-Pillar Architecture Compliance Test Suite
 * 
 * This test suite ensures that the stats system strictly adheres to the 
 * three-pillar architecture rules for different user types.
 */

import { StatsTracker } from '../statsTracker';
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}));

// Mock Firestore
jest.mock('firebase/firestore');

// Mock Enhanced Storage Manager
jest.mock('@/utils/enhancedStorageManager2');

describe('Three-Pillar Architecture Compliance', () => {
  let statsTracker: StatsTracker;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // User fixtures
  const guestUser = null;
  const freeUser: User = { uid: 'free-123', email: 'free@test.com' } as User;
  const premiumUser: User = { uid: 'premium-456', email: 'premium@test.com' } as User;

  beforeEach(() => {
    // Reset singleton
    (StatsTracker as any).instance = null;
    statsTracker = StatsTracker.getInstance();

    // Setup spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Guest User Compliance', () => {
    it('should NEVER persist any data for guest users', async () => {
      await statsTracker.initialize(guestUser, false);

      // Track multiple activities
      await statsTracker.trackActivity('drill', { correct: 5, total: 10 });
      await statsTracker.trackActivity('story', { itemId: 'story-1' });
      await statsTracker.trackActivity('game', { 
        gameType: 'pokemon', 
        itemId: 'pikachu',
        score: 100 
      });

      // Verify NO storage operations occurred
      expect(EnhancedStorageManager2.saveToStore).not.toHaveBeenCalled();
      expect(EnhancedStorageManager2.getFromStore).not.toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
      expect(getDoc).not.toHaveBeenCalled();

      // Verify appropriate logs
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Guest user - skipping IndexedDB')
      );
    });

    it('should maintain stats in memory for session duration', async () => {
      await statsTracker.initialize(guestUser, false);

      // Track activities
      await statsTracker.trackActivity('drill', { correct: 8, total: 10 });
      await statsTracker.trackActivity('article', { itemId: 'article-1' });

      // Stats should be available in memory
      const stats = statsTracker.getStats();
      expect(stats.drillsCompleted).toBe(1);
      expect(stats.articlesRead).toBe(1);
      expect(stats.totalActivities).toBe(2);
      expect(stats.drillAccuracy).toBe(80);

      // But no persistence
      expect(EnhancedStorageManager2.saveToStore).not.toHaveBeenCalled();
    });

    it('should calculate activities data without storage', async () => {
      await statsTracker.initialize(guestUser, false);

      // Track today's activities
      await statsTracker.trackActivity('flashcard', { correct: 10, total: 15 });
      await statsTracker.trackActivity('game', { gameType: 'kana-drop' });

      const activities = await statsTracker.getActivitiesData();
      
      // Should have today's data in memory
      expect(activities.today).not.toBeNull();
      expect(activities.today?.summary.flashcardsReviewed).toBe(1);
      expect(activities.today?.summary.gamesPlayed).toBe(1);

      // No storage operations
      expect(EnhancedStorageManager2.saveToStore).not.toHaveBeenCalled();
    });

    it('should not attempt sync operations', async () => {
      await statsTracker.initialize(guestUser, false);
      
      await statsTracker.forceSync();

      expect(setDoc).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔄 [StatsTracker] Sync skipped - not premium user'
      );
    });
  });

  describe('Free User Compliance', () => {
    beforeEach(() => {
      // Mock IndexedDB operations to succeed
      (EnhancedStorageManager2.saveToStore as jest.Mock).mockResolvedValue(undefined);
      (EnhancedStorageManager2.getFromStore as jest.Mock).mockResolvedValue(null);
    });

    it('should use IndexedDB ONLY for free users', async () => {
      await statsTracker.initialize(freeUser, false);

      await statsTracker.trackActivity('drill', { correct: 7, total: 10 });

      // Should save to IndexedDB
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalledWith(
        expect.any(String),
        'userStats',
        expect.objectContaining({
          userId: 'free-123',
          drillsCompleted: 1
        })
      );

      // Should NOT save to Firebase
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should save daily activities to IndexedDB only', async () => {
      await statsTracker.initialize(freeUser, false);

      await statsTracker.trackActivity('story', { itemId: 'story-1' });
      await statsTracker.trackActivity('article', { itemId: 'article-1' });

      // Should save activities to IndexedDB
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalledWith(
        expect.stringContaining('Activities'),
        expect.any(String), // Date string
        expect.objectContaining({
          summary: expect.objectContaining({
            storiesRead: 1,
            articlesRead: 1
          })
        })
      );

      // No Firebase operations
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should reject sync attempts for free users', async () => {
      await statsTracker.initialize(freeUser, false);

      // Track some activities
      await statsTracker.trackActivity('game', { score: 100 });
      
      // Attempt sync
      await statsTracker.forceSync();

      // Should not sync to cloud
      expect(setDoc).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔄 [StatsTracker] Sync skipped - not premium user'
      );
    });

    it('should load existing data from IndexedDB', async () => {
      const existingStats = {
        userId: 'free-123',
        currentStreak: 7,
        totalActivities: 50,
        pokemonCaught: 10,
        version: '2.1'
      };

      (EnhancedStorageManager2.getFromStore as jest.Mock)
        .mockResolvedValueOnce(existingStats);

      await statsTracker.initialize(freeUser, false);

      // Should load from IndexedDB
      expect(EnhancedStorageManager2.getFromStore).toHaveBeenCalledWith(
        expect.any(String),
        'userStats'
      );

      // Should NOT check Firebase
      expect(getDoc).not.toHaveBeenCalled();

      // Stats should be loaded
      const stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(7);
      expect(stats.totalActivities).toBe(50);
    });
  });

  describe('Premium User Compliance', () => {
    beforeEach(() => {
      // Mock storage operations
      (EnhancedStorageManager2.saveToStore as jest.Mock).mockResolvedValue(undefined);
      (EnhancedStorageManager2.getFromStore as jest.Mock).mockResolvedValue(null);
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    });

    it('should use BOTH IndexedDB and Firebase for premium users', async () => {
      await statsTracker.initialize(premiumUser, true);

      await statsTracker.trackActivity('drill', { correct: 9, total: 10 });

      // Should save to IndexedDB
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalledWith(
        expect.any(String),
        'userStats',
        expect.objectContaining({
          userId: 'premium-456',
          drillsCompleted: 1
        })
      );

      // Should have sync timer active
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ [StatsTracker] Sync timer started');
    });

    it('should sync to Firebase when forced', async () => {
      await statsTracker.initialize(premiumUser, true);

      await statsTracker.trackActivity('story', { itemId: 'story-1' });
      await statsTracker.forceSync();

      // Should sync to Firebase
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        expect.objectContaining({
          userId: 'premium-456',
          storiesRead: 1
        }),
        expect.any(Object) // merge options
      );
    });

    it('should prioritize cloud data if newer', async () => {
      const localStats = {
        userId: 'premium-456',
        currentStreak: 3,
        lastUpdated: Date.now() - 7200000, // 2 hours old
        version: '2.1'
      };

      const cloudStats = {
        userId: 'premium-456',
        currentStreak: 5,
        lastUpdated: { toMillis: () => Date.now() - 3600000 }, // 1 hour old
        version: '2.1'
      };

      (EnhancedStorageManager2.getFromStore as jest.Mock)
        .mockResolvedValueOnce(localStats);
      
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => cloudStats
      });

      await statsTracker.initialize(premiumUser, true);

      // Should check both sources
      expect(EnhancedStorageManager2.getFromStore).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();

      // Should use cloud data (newer)
      const stats = statsTracker.getStats();
      expect(stats.currentStreak).toBe(5);

      // Should save cloud data locally
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalledWith(
        expect.any(String),
        'userStats',
        expect.objectContaining({
          currentStreak: 5
        })
      );
    });

    it('should sync activities to Firebase', async () => {
      await statsTracker.initialize(premiumUser, true);

      // Track activities
      await statsTracker.trackActivity('flashcard', { correct: 20, total: 25 });
      await statsTracker.trackActivity('game', { 
        gameType: 'kanji-quest',
        score: 500 
      });

      // Force sync
      await statsTracker.forceSync();

      // Should sync daily activities
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(), // activity doc reference
        expect.objectContaining({
          summary: expect.objectContaining({
            flashcardsReviewed: 1,
            gamesPlayed: 1
          })
        })
      );
    });

    it('should handle sync failures gracefully', async () => {
      (setDoc as jest.Mock).mockRejectedValue(new Error('Network error'));

      await statsTracker.initialize(premiumUser, true);
      await statsTracker.trackActivity('drill', { correct: 5, total: 10 });
      
      // Should not throw
      await expect(statsTracker.forceSync()).resolves.not.toThrow();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync error'),
        expect.any(Error)
      );

      // Local data should still work
      const stats = statsTracker.getStats();
      expect(stats.drillsCompleted).toBe(1);
    });
  });

  describe('User Type Transitions', () => {
    it('should handle guest → free user transition', async () => {
      // Start as guest
      await statsTracker.initialize(guestUser, false);
      await statsTracker.trackActivity('drill', { correct: 5, total: 10 });

      // No storage for guest
      expect(EnhancedStorageManager2.saveToStore).not.toHaveBeenCalled();

      // Transition to free user
      await statsTracker.initialize(freeUser, false);

      // Should now save to IndexedDB
      await statsTracker.trackActivity('story', { itemId: 'story-1' });
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalled();
    });

    it('should handle free → premium transition', async () => {
      // Start as free
      await statsTracker.initialize(freeUser, false);
      
      // Only IndexedDB
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Sync timer started')
      );

      // Upgrade to premium
      await statsTracker.initialize(freeUser, true);

      // Should start sync timer
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ [StatsTracker] Sync timer started');
    });

    it('should handle premium → free downgrade', async () => {
      // Start as premium
      await statsTracker.initialize(premiumUser, true);
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ [StatsTracker] Sync timer started');

      // Downgrade to free
      await statsTracker.initialize(premiumUser, false);

      // Should stop sync timer
      expect(consoleLogSpy).toHaveBeenCalledWith('⏹️ [StatsTracker] Sync timer stopped');

      // Should still save to IndexedDB
      await statsTracker.trackActivity('drill', {});
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalled();

      // But not to Firebase
      await statsTracker.forceSync();
      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across storage layers', async () => {
      await statsTracker.initialize(premiumUser, true);

      // Track various activities
      await statsTracker.trackActivity('drill', { correct: 8, total: 10 });
      await statsTracker.trackActivity('game', { 
        gameType: 'pokemon',
        itemId: 'bulbasaur',
        score: 150
      });
      await statsTracker.trackActivity('story', { itemId: 'story-1' });

      const stats = statsTracker.getStats();

      // Force sync
      await statsTracker.forceSync();

      // Verify both storage calls have same data
      expect(EnhancedStorageManager2.saveToStore).toHaveBeenCalledWith(
        expect.any(String),
        'userStats',
        expect.objectContaining({
          drillsCompleted: 1,
          gamesPlayed: 1,
          storiesRead: 1,
          pokemonCaught: 1
        })
      );

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          drillsCompleted: 1,
          gamesPlayed: 1,
          storiesRead: 1,
          pokemonCaught: 1
        }),
        expect.any(Object)
      );
    });

    it('should never mix user data', async () => {
      // User 1
      await statsTracker.initialize(freeUser, false);
      await statsTracker.trackActivity('drill', { correct: 5, total: 10 });

      let stats = statsTracker.getStats();
      expect(stats.userId).toBe('free-123');
      expect(stats.drillsCompleted).toBe(1);

      // Switch to User 2
      const anotherUser: User = { uid: 'another-789', email: 'another@test.com' } as User;
      await statsTracker.initialize(anotherUser, false);

      stats = statsTracker.getStats();
      expect(stats.userId).toBe('another-789');
      expect(stats.drillsCompleted).toBe(0); // Fresh stats
    });
  });
});