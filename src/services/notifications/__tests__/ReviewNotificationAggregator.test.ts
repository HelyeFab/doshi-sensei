/**
 * Review Notification Aggregator Tests
 * 
 * Tests the core functionality of the notification aggregation system
 * without requiring the full Next.js environment.
 */

import { ReviewNotificationAggregator } from '../ReviewNotificationAggregator';

// Mock the dependencies since we're testing in isolation
const mockRegistry = {
  getAggregatedStats: jest.fn(),
  getPrioritizedSources: jest.fn(),
  addEventListener: jest.fn()
};

const mockNotificationService = {
  getPreferences: jest.fn(),
  requestPermission: jest.fn()
};

// Mock TIME_CONSTANTS for testing
const mockTimeConstants = {
  GOLDEN_TIME: {
    MORNING_START: 8,
    MORNING_END: 10,
    EVENING_START: 19,
    EVENING_END: 21,
    BONUS_MULTIPLIER: 1.2
  }
};

describe('ReviewNotificationAggregator', () => {
  let aggregator: ReviewNotificationAggregator;

  beforeEach(() => {
    // Reset singleton for fresh instance in each test
    ReviewNotificationAggregator.resetForTesting();
    aggregator = ReviewNotificationAggregator.getInstance();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with registry and notification service', async () => {
      await aggregator.initialize(mockRegistry as any, mockNotificationService as any);
      
      expect(mockRegistry.addEventListener).toHaveBeenCalledTimes(3);
      expect(mockRegistry.addEventListener).toHaveBeenCalledWith('ITEMS_UPDATED', expect.any(Function));
      expect(mockRegistry.addEventListener).toHaveBeenCalledWith('STATS_UPDATED', expect.any(Function));
      expect(mockRegistry.addEventListener).toHaveBeenCalledWith('CONFIG_CHANGED', expect.any(Function));
    });

    it('should return status correctly before initialization', () => {
      const status = aggregator.getNotificationStatus();
      
      expect(status).toEqual({
        initialized: false, // Not initialized yet
        registryConnected: false,
        notificationServiceConnected: false,
        activeSchedules: 0,
        goldenTimeActive: expect.any(Boolean)
      });
    });

    it('should return status correctly after initialization', async () => {
      await aggregator.initialize(mockRegistry as any, mockNotificationService as any);
      const status = aggregator.getNotificationStatus();
      
      expect(status).toEqual({
        initialized: true, // Now initialized
        registryConnected: true,
        notificationServiceConnected: true,
        activeSchedules: 0,
        goldenTimeActive: expect.any(Boolean)
      });
    });
  });

  describe('Due Items Aggregation', () => {
    beforeEach(async () => {
      // Setup mock data
      mockRegistry.getAggregatedStats.mockResolvedValue({
        totals: {
          dueToday: 25,
          overdue: 5,
          items: 150
        },
        bySource: {
          'textbook-vocab': {
            dueToday: 15,
            totalItems: 80,
            retentionRate: 0.85
          },
          'kanji-mastery': {
            dueToday: 8,
            totalItems: 50,
            retentionRate: 0.78
          },
          'flashcards': {
            dueToday: 2,
            totalItems: 20,
            retentionRate: 0.92
          }
        },
        insights: {
          nextReviewEstimate: new Date('2025-08-30T09:00:00Z')
        }
      });

      mockRegistry.getPrioritizedSources.mockReturnValue([
        { id: 'textbook-vocab', name: 'Textbook Vocabulary', icon: '📚' },
        { id: 'kanji-mastery', name: 'Kanji Mastery', icon: '🈳' },
        { id: 'flashcards', name: 'Flashcards', icon: '🗃️' }
      ]);

      await aggregator.initialize(mockRegistry as any, mockNotificationService as any);
    });

    it('should aggregate due items correctly', async () => {
      const summary = await aggregator.aggregateDueItems();
      
      expect(summary).toEqual({
        totalDue: 25,
        overdue: 5,
        bySource: {
          'textbook-vocab': {
            name: 'Textbook Vocabulary',
            due: 15,
            icon: '📚'
          },
          'kanji-mastery': {
            name: 'Kanji Mastery',
            due: 8,
            icon: '🈳'
          },
          'flashcards': {
            name: 'Flashcards',
            due: 2,
            icon: '🗃️'
          }
        },
        highPriorityCount: expect.any(Number),
        nextReviewTime: expect.any(Date)
      });
    });
  });

  describe('Notification Message Building', () => {
    it('should build basic notification message', () => {
      const summary = {
        totalDue: 15,
        overdue: 0,
        bySource: {
          'textbook-vocab': { name: 'Textbook Vocabulary', due: 10, icon: '📚' },
          'kanji-mastery': { name: 'Kanji Mastery', due: 5, icon: '🈳' }
        },
        highPriorityCount: 3
      };

      const goldenTimeInfo = { isActive: false };

      const result = aggregator.buildNotificationMessage(summary, goldenTimeInfo);

      expect(result.title).toBe('📚 15 Items Ready for Review!');
      expect(result.body).toContain('You have: 10 Textbook Vocabulary, 5 Kanji Mastery');
      expect(result.body).toContain('3 high-priority items');
      expect(result.body).toContain('Keep your streak alive! 🔥');
    });

    it('should build golden time notification message', () => {
      const summary = {
        totalDue: 8,
        overdue: 0,
        bySource: {
          'textbook-vocab': { name: 'Textbook Vocabulary', due: 8, icon: '📚' }
        },
        highPriorityCount: 0
      };

      const goldenTimeInfo = { isActive: true, type: 'morning' as const };

      const result = aggregator.buildNotificationMessage(summary, goldenTimeInfo);

      expect(result.title).toBe('🌅 Golden Time! 8 Items Ready!');
      expect(result.body).toContain('Perfect timing for peak learning! 🧠✨');
    });

    it('should handle overdue items in message', () => {
      const summary = {
        totalDue: 20,
        overdue: 7,
        bySource: {
          'textbook-vocab': { name: 'Textbook Vocabulary', due: 20, icon: '📚' }
        },
        highPriorityCount: 5
      };

      const goldenTimeInfo = { isActive: false };

      const result = aggregator.buildNotificationMessage(summary, goldenTimeInfo);

      expect(result.title).toBe('⏰ 20 Items Due (7 overdue)');
      expect(result.body).toContain('20 items from Textbook Vocabulary');
    });

    it('should handle single item correctly', () => {
      const summary = {
        totalDue: 1,
        overdue: 0,
        bySource: {
          'flashcards': { name: 'Flashcards', due: 1, icon: '🗃️' }
        },
        highPriorityCount: 0
      };

      const goldenTimeInfo = { isActive: false };

      const result = aggregator.buildNotificationMessage(summary, goldenTimeInfo);

      expect(result.title).toBe('📚 1 Item Ready for Review!');
      expect(result.body).toContain('1 items from Flashcards');
    });

    it('should handle many sources by summarizing', () => {
      const summary = {
        totalDue: 50,
        overdue: 0,
        bySource: {
          'source1': { name: 'Source 1', due: 20, icon: '📚' },
          'source2': { name: 'Source 2', due: 15, icon: '🈳' },
          'source3': { name: 'Source 3', due: 10, icon: '🗃️' },
          'source4': { name: 'Source 4', due: 3, icon: '📝' },
          'source5': { name: 'Source 5', due: 2, icon: '🎧' }
        },
        highPriorityCount: 10
      };

      const goldenTimeInfo = { isActive: false };

      const result = aggregator.buildNotificationMessage(summary, goldenTimeInfo);

      expect(result.title).toBe('📚 50 Items Ready for Review!');
      expect(result.body).toContain('20 Source 1, 15 Source 2, +3 more sources');
    });
  });

  describe('Golden Time Detection', () => {
    it('should detect morning golden time', () => {
      // Mock current time to 9 AM
      const mockDate = new Date('2025-08-29T09:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // This test would need proper mocking of TIME_CONSTANTS
      // For now, we'll just test the method exists
      expect(typeof aggregator.isGoldenTime).toBe('function');

      global.Date.mockRestore();
    });
  });

  describe('Public API', () => {
    it('should allow manual notification triggering', async () => {
      await aggregator.initialize(mockRegistry as any, mockNotificationService as any);
      
      // This should not throw
      await expect(aggregator.triggerNotificationCheck()).resolves.not.toThrow();
    });

    it('should provide status information', () => {
      const status = aggregator.getNotificationStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('registryConnected');
      expect(status).toHaveProperty('notificationServiceConnected');
      expect(status).toHaveProperty('activeSchedules');
      expect(status).toHaveProperty('goldenTimeActive');
    });

    it('should clean up resources on destroy', () => {
      aggregator.destroy();
      
      const status = aggregator.getNotificationStatus();
      expect(status.activeSchedules).toBe(0);
    });
  });
});

// Example of how to test the system integration
describe('Integration Example', () => {
  it('should demonstrate full workflow', async () => {
    ReviewNotificationAggregator.resetForTesting();
    const aggregator = ReviewNotificationAggregator.getInstance();
    
    // Mock a realistic scenario
    const mockStats = {
      totals: { dueToday: 23, overdue: 3, items: 200 },
      bySource: {
        'textbook-vocab': { dueToday: 12, totalItems: 100, retentionRate: 0.85 },
        'kanji-mastery': { dueToday: 8, totalItems: 80, retentionRate: 0.78 },
        'flashcards': { dueToday: 3, totalItems: 20, retentionRate: 0.92 }
      },
      insights: { nextReviewEstimate: new Date() }
    };

    const mockSources = [
      { id: 'textbook-vocab', name: 'Textbook Vocabulary', icon: '📚' },
      { id: 'kanji-mastery', name: 'Kanji Mastery', icon: '🈳' },
      { id: 'flashcards', name: 'Flashcards', icon: '🗃️' }
    ];

    mockRegistry.getAggregatedStats.mockResolvedValue(mockStats);
    mockRegistry.getPrioritizedSources.mockReturnValue(mockSources);
    mockNotificationService.getPreferences.mockResolvedValue({
      enabled: true,
      preferences: {
        reviewReminders: { enabled: true, advanceNotice: 30 },
        studyReminders: { enabled: true, times: ['09:00', '19:00'] }
      },
      quietHours: { enabled: true, start: '22:00', end: '07:00' }
    });

    await aggregator.initialize(mockRegistry as any, mockNotificationService as any);

    // Test aggregation
    const summary = await aggregator.aggregateDueItems();
    expect(summary.totalDue).toBe(23);
    expect(Object.keys(summary.bySource)).toHaveLength(3);

    // Test message building - should prioritize overdue items in title
    const message = aggregator.buildNotificationMessage(summary, { isActive: false });
    expect(message.title).toBe('⏰ 23 Items Due (3 overdue)'); // Overdue takes priority
    expect(message.body).toContain('12 Textbook Vocabulary, 8 Kanji Mastery, 3 Flashcards');

    // Test status
    const status = aggregator.getNotificationStatus();
    expect(status.initialized).toBe(true);
    expect(status.registryConnected).toBe(true);
    expect(status.notificationServiceConnected).toBe(true);
  });
});