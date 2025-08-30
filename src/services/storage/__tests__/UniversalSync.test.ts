/**
 * Comprehensive tests for Universal Sync Solution
 * 
 * Tests all aspects of the unified storage layer including:
 * - Local storage operations
 * - Cloud sync for premium users
 * - Data migration
 * - Conflict resolution
 * - Realtime sync
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnifiedStorageLayer, unifiedStorage } from '../UnifiedStorageLayer';
import { StorageMigration } from '../StorageMigration';
import { StorageInitializer } from '../StorageInitializer';

// Mock Firebase
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn()
};

const mockDb = {
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn()
};

jest.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  db: mockDb
}));

// Mock subscription manager
const mockSubscriptionManager = {
  getSubscription: jest.fn()
};

jest.mock('@/lib/subscriptions/manager', () => ({
  subscriptionManager: mockSubscriptionManager
}));

// Mock IndexedDB
const mockDbManager = {
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  count: jest.fn()
};

jest.mock('@/utils/indexedDB', () => ({
  DatabaseManager: jest.fn().mockImplementation(() => mockDbManager)
}));

// Mock Enhanced Storage Manager
const mockEnhancedStorage = {
  saveData: jest.fn(),
  loadData: jest.fn()
};

jest.mock('@/utils/storage', () => ({
  default: mockEnhancedStorage
}));

describe('UnifiedStorageLayer', () => {
  let storage: UnifiedStorageLayer;

  beforeEach(() => {
    storage = UnifiedStorageLayer.getInstance();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default user (not premium)
    mockAuth.currentUser = { uid: 'test-user-id' };
    mockSubscriptionManager.getSubscription.mockResolvedValue({ plan: 'free' });
  });

  describe('Local Storage Operations', () => {
    it('should save data locally for free users', async () => {
      const testData = { 
        id: 'test-progress-1',
        textbook: 'genki-1',
        lesson: 1,
        reviewCount: 5 
      };

      mockDbManager.put.mockResolvedValue(undefined);

      await storage.save('textbook_vocabulary_progress', 'test-progress-1', testData);

      expect(mockDbManager.put).toHaveBeenCalledWith(
        'textbook_vocabulary_progress',
        expect.objectContaining({
          id: 'test-progress-1',
          data: testData,
          updatedAt: expect.any(Date),
          syncVersion: expect.any(Number),
          userId: 'test-user-id'
        })
      );

      // Should not call Firebase for free users
      expect(mockDb.setDoc).not.toHaveBeenCalled();
    });

    it('should load data from local storage', async () => {
      const testData = { 
        id: 'test-progress-1',
        textbook: 'genki-1',
        reviewCount: 5 
      };

      mockDbManager.get.mockResolvedValue({ data: testData });

      const result = await storage.load('textbook_vocabulary_progress', 'test-progress-1');

      expect(result).toEqual(testData);
      expect(mockDbManager.get).toHaveBeenCalledWith('textbook_vocabulary_progress', 'test-progress-1');
    });

    it('should load all data from local storage', async () => {
      const testData = [
        { id: '1', textbook: 'genki-1', reviewCount: 5 },
        { id: '2', textbook: 'genki-2', reviewCount: 3 }
      ];

      mockDbManager.getAll.mockResolvedValue(
        testData.map(data => ({ data }))
      );

      const result = await storage.loadAll('textbook_vocabulary_progress');

      expect(result).toEqual(testData);
      expect(mockDbManager.getAll).toHaveBeenCalledWith('textbook_vocabulary_progress');
    });

    it('should delete data locally', async () => {
      mockDbManager.delete.mockResolvedValue(undefined);

      await storage.delete('textbook_vocabulary_progress', 'test-progress-1');

      expect(mockDbManager.delete).toHaveBeenCalledWith('textbook_vocabulary_progress', 'test-progress-1');
    });
  });

  describe('Premium User Cloud Sync', () => {
    beforeEach(() => {
      // Setup premium user
      mockSubscriptionManager.getSubscription.mockResolvedValue({ 
        plan: 'monthly' 
      });
      
      mockDb.setDoc.mockResolvedValue(undefined);
    });

    it('should sync to Firebase for premium users', async () => {
      const testData = { 
        id: 'premium-test-1',
        textbook: 'genki-1',
        reviewCount: 10 
      };

      mockDbManager.put.mockResolvedValue(undefined);

      await storage.save('textbook_vocabulary_progress', 'premium-test-1', testData);

      // Should save locally
      expect(mockDbManager.put).toHaveBeenCalled();

      // Should also sync to Firebase
      expect(mockDb.setDoc).toHaveBeenCalledWith(
        expect.any(Object), // doc reference
        expect.objectContaining({
          ...testData,
          updatedAt: expect.any(Object),
          syncVersion: expect.any(Number),
          userId: 'test-user-id'
        }),
        { merge: false }
      );
    });

    it('should batch sync multiple items to Firebase', async () => {
      const testItems = [
        { id: 'batch-1', data: { textbook: 'genki-1', reviewCount: 5 } },
        { id: 'batch-2', data: { textbook: 'genki-2', reviewCount: 8 } }
      ];

      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      };

      mockDb.writeBatch.mockReturnValue(mockBatch);
      mockDbManager.put.mockResolvedValue(undefined);

      await storage.saveBatch('textbook_vocabulary_progress', testItems);

      // Should save all items locally
      expect(mockDbManager.put).toHaveBeenCalledTimes(2);

      // Should batch sync to Firebase
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should load from cloud first when cloudFirst option is set', async () => {
      const cloudData = { 
        id: 'cloud-test-1',
        textbook: 'genki-1',
        reviewCount: 15,
        updatedAt: { toDate: () => new Date() }
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => cloudData
      };

      mockDb.getDoc.mockResolvedValue(mockDocSnap);
      mockDbManager.put.mockResolvedValue(undefined);

      const result = await storage.load(
        'textbook_vocabulary_progress', 
        'cloud-test-1',
        { cloudFirst: true }
      );

      expect(result).toEqual(cloudData);
      expect(mockDb.getDoc).toHaveBeenCalled();
      
      // Should update local cache with cloud data
      expect(mockDbManager.put).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(() => {
      mockSubscriptionManager.getSubscription.mockResolvedValue({ 
        plan: 'yearly' 
      });
    });

    it('should resolve conflicts using last-write strategy', async () => {
      const localData = [
        { 
          id: '1', 
          textbook: 'genki-1', 
          reviewCount: 5,
          updatedAt: new Date('2023-01-01')
        }
      ];

      const cloudData = [
        { 
          id: '1', 
          textbook: 'genki-1', 
          reviewCount: 8,
          updatedAt: { toDate: () => new Date('2023-01-02') }
        }
      ];

      mockDbManager.getAll.mockResolvedValue(
        localData.map(data => ({ data }))
      );
      
      const mockSnapshot = {
        docs: cloudData.map(data => ({ data: () => data }))
      };
      mockDb.getDocs.mockResolvedValue(mockSnapshot);

      const syncResult = await storage.performFullSync('textbook_vocabulary_progress');

      expect(syncResult.success).toBe(true);
      expect(syncResult.itemsSynced).toBe(1);
      
      // Cloud version should win (newer)
      expect(mockDbManager.put).toHaveBeenCalledWith(
        'textbook_vocabulary_progress',
        expect.objectContaining({
          data: expect.objectContaining({
            reviewCount: 8 // Cloud version
          })
        })
      );
    });
  });

  describe('Realtime Sync', () => {
    beforeEach(() => {
      mockSubscriptionManager.getSubscription.mockResolvedValue({ 
        plan: 'monthly' 
      });
    });

    it('should initialize realtime sync for premium users', async () => {
      const mockUnsubscribe = jest.fn();
      const mockOnSnapshot = jest.fn().mockReturnValue(mockUnsubscribe);
      
      mockDb.collection.mockReturnValue({});
      global.onSnapshot = mockOnSnapshot;

      await storage.initializeRealtimeSync('textbook_vocabulary_progress');

      expect(mockDb.collection).toHaveBeenCalledWith(
        'users/test-user-id/textbookVocabularyProgress'
      );
    });

    it('should not initialize realtime sync for free users', async () => {
      mockSubscriptionManager.getSubscription.mockResolvedValue({ 
        plan: 'free' 
      });

      await storage.initializeRealtimeSync('textbook_vocabulary_progress');

      expect(mockDb.collection).not.toHaveBeenCalled();
    });

    it('should stop realtime sync properly', async () => {
      const mockUnsubscribe = jest.fn();
      storage['realtimeListeners'].set('test_feature', mockUnsubscribe);

      storage.stopRealtimeSync('test_feature');

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(storage['realtimeListeners'].has('test_feature')).toBe(false);
    });
  });
});

describe('Storage Migration', () => {
  let migration: StorageMigration;

  beforeEach(() => {
    migration = StorageMigration.getInstance();
    mockAuth.currentUser = { uid: 'migration-test-user' };
  });

  it('should detect when migration is needed', async () => {
    // Mock existing data
    mockDbManager.count.mockResolvedValue(5);
    localStorage.removeItem('unified_storage_migrated');

    const needsMigration = await migration.needsMigration();

    expect(needsMigration).toBe(true);
  });

  it('should not migrate if already completed', async () => {
    localStorage.setItem('unified_storage_migrated', Date.now().toString());

    const needsMigration = await migration.needsMigration();

    expect(needsMigration).toBe(false);
  });

  it('should migrate textbook vocabulary data', async () => {
    const mockProgressData = [
      { id: 'vocab-1', textbook: 'genki-1', reviewCount: 5 },
      { id: 'vocab-2', textbook: 'genki-2', reviewCount: 3 }
    ];

    mockDbManager.getAll.mockResolvedValue(mockProgressData);
    unifiedStorage.save = jest.fn().mockResolvedValue(undefined);

    const result = await migration['migrateTextbookVocabulary']();

    expect(result.feature).toBe('textbook_vocabulary');
    expect(result.migrated).toBe(2);
    expect(result.errors).toBe(0);
    expect(unifiedStorage.save).toHaveBeenCalledTimes(2);
  });
});

describe('Storage Initializer', () => {
  let initializer: StorageInitializer;

  beforeEach(() => {
    initializer = StorageInitializer.getInstance();
  });

  it('should initialize storage system on startup', async () => {
    mockAuth.currentUser = { uid: 'init-test-user' };
    mockSubscriptionManager.getSubscription.mockResolvedValue({ plan: 'monthly' });

    unifiedStorage.initializeRealtimeSync = jest.fn().mockResolvedValue(undefined);
    unifiedStorage.performFullSync = jest.fn().mockResolvedValue({
      success: true,
      enabled: true,
      itemCount: 10
    });

    await initializer.initialize();

    expect(initializer.isInitialized()).toBe(true);
    expect(unifiedStorage.initializeRealtimeSync).toHaveBeenCalled();
  });

  it('should stop sync when user signs out', async () => {
    unifiedStorage.stopRealtimeSync = jest.fn();

    // Simulate user sign out
    initializer['currentUser'] = null;
    initializer['stopAllSync']();

    expect(unifiedStorage.stopRealtimeSync).toHaveBeenCalled();
  });

  it('should provide sync status summary', async () => {
    mockAuth.currentUser = { uid: 'status-test-user' };
    
    unifiedStorage.getSyncStatus = jest.fn().mockResolvedValue({
      enabled: true,
      itemCount: 15,
      lastSync: new Date()
    });

    const summary = await initializer.getSyncStatusSummary();

    expect(summary.totalFeatures).toBeGreaterThan(0);
    expect(summary.syncEnabled).toBeGreaterThan(0);
    expect(summary.totalItems).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  it('should handle complete user workflow', async () => {
    // Setup premium user
    mockAuth.currentUser = { uid: 'integration-test-user' };
    mockSubscriptionManager.getSubscription.mockResolvedValue({ plan: 'yearly' });

    // Mock all storage operations
    mockDbManager.put.mockResolvedValue(undefined);
    mockDbManager.get.mockResolvedValue(null);
    mockDb.setDoc.mockResolvedValue(undefined);

    // 1. Save vocabulary progress
    const vocabularyProgress = {
      id: 'vocab-integration-1',
      textbook: 'genki-1',
      lesson: 5,
      reviewCount: 12,
      easeFactor: 2.5
    };

    await unifiedStorage.save('textbook_vocabulary_progress', vocabularyProgress.id, vocabularyProgress);

    // Should save locally and sync to cloud
    expect(mockDbManager.put).toHaveBeenCalled();
    expect(mockDb.setDoc).toHaveBeenCalled();

    // 2. Save kanji progress
    const kanjiProgress = {
      id: '人',
      reviewCount: 8,
      difficulty: 3,
      masteryLevel: 85
    };

    await unifiedStorage.save('kanji_mastery_progress', kanjiProgress.id, kanjiProgress);

    expect(mockDbManager.put).toHaveBeenCalledTimes(2);
    expect(mockDb.setDoc).toHaveBeenCalledTimes(2);

    // 3. Batch save game progress
    const gameData = [
      { id: 'level-1', data: { score: 1500, completed: true } },
      { id: 'level-2', data: { score: 2200, completed: true } }
    ];

    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    mockDb.writeBatch.mockReturnValue(mockBatch);

    await unifiedStorage.saveBatch('stroke_order_game', gameData);

    expect(mockBatch.commit).toHaveBeenCalled();

    // 4. Load data should work from local storage
    mockDbManager.get.mockResolvedValue({ data: vocabularyProgress });

    const loadedVocab = await unifiedStorage.load('textbook_vocabulary_progress', vocabularyProgress.id);

    expect(loadedVocab).toEqual(vocabularyProgress);
  });

  it('should gracefully handle offline scenarios', async () => {
    // Setup user but simulate offline (Firebase calls fail)
    mockAuth.currentUser = { uid: 'offline-test-user' };
    mockSubscriptionManager.getSubscription.mockResolvedValue({ plan: 'monthly' });

    // Firebase operations fail
    mockDb.setDoc.mockRejectedValue(new Error('Network error'));
    
    // Local storage still works
    mockDbManager.put.mockResolvedValue(undefined);

    const testData = {
      id: 'offline-test-1',
      textbook: 'genki-1',
      reviewCount: 5
    };

    // Should not throw error even if cloud sync fails
    await expect(
      unifiedStorage.save('textbook_vocabulary_progress', testData.id, testData)
    ).resolves.toBeUndefined();

    // Local save should have been attempted
    expect(mockDbManager.put).toHaveBeenCalled();
  });
});

describe('Error Handling', () => {
  it('should handle IndexedDB errors gracefully', async () => {
    mockAuth.currentUser = { uid: 'error-test-user' };
    mockDbManager.put.mockRejectedValue(new Error('IndexedDB quota exceeded'));
    mockEnhancedStorage.saveData.mockResolvedValue(undefined);

    const testData = { id: 'error-test-1', data: 'test' };

    // Should fall back to enhanced storage manager
    await unifiedStorage.save('user_settings', testData.id, testData);

    expect(mockEnhancedStorage.saveData).toHaveBeenCalled();
  });

  it('should handle Firebase permission errors', async () => {
    mockAuth.currentUser = { uid: 'permission-test-user' };
    mockSubscriptionManager.getSubscription.mockResolvedValue({ plan: 'monthly' });
    
    mockDbManager.put.mockResolvedValue(undefined);
    mockDb.setDoc.mockRejectedValue(new Error('Permission denied'));

    const testData = { id: 'permission-test-1', data: 'test' };

    // Should not throw error
    await expect(
      unifiedStorage.save('textbook_vocabulary_progress', testData.id, testData)
    ).resolves.toBeUndefined();

    // Local save should still work
    expect(mockDbManager.put).toHaveBeenCalled();
  });

  it('should handle subscription check failures', async () => {
    mockAuth.currentUser = { uid: 'sub-error-test-user' };
    mockSubscriptionManager.getSubscription.mockRejectedValue(new Error('Subscription check failed'));
    
    mockDbManager.put.mockResolvedValue(undefined);

    const testData = { id: 'sub-error-test-1', data: 'test' };

    // Should treat user as non-premium and only save locally
    await unifiedStorage.save('textbook_vocabulary_progress', testData.id, testData);

    expect(mockDbManager.put).toHaveBeenCalled();
    expect(mockDb.setDoc).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  // Cleanup
  unifiedStorage.destroy();
  jest.clearAllMocks();
});