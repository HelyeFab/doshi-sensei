import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReviewQueueService } from '../reviewQueueService';
import { FSRSAlgorithm } from '../fsrsAlgorithm';
import { DataSyncService } from '../dataSyncService';
import { Rating, State } from '../types';

// Mock dependencies
jest.mock('../fsrsAlgorithm');
jest.mock('../dataSyncService');

describe('ReviewQueueService', () => {
  let service: ReviewQueueService;
  let mockFSRS: jest.Mocked<FSRSAlgorithm>;
  let mockDataSync: jest.Mocked<DataSyncService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockFSRS = new FSRSAlgorithm() as jest.Mocked<FSRSAlgorithm>;
    mockDataSync = new DataSyncService() as jest.Mocked<DataSyncService>;
    
    service = new ReviewQueueService();
  });

  describe('generateQueue', () => {
    it('should generate a queue of due cards', async () => {
      const mockCards = [
        {
          char: '日',
          state: State.Review,
          dueDate: new Date('2025-01-16T08:00:00Z').toISOString(),
          scheduledDays: 1,
          elapsedDays: 1,
          reps: 2,
          lapses: 0,
          difficulty: 5,
          stability: 1.3,
          lastReview: new Date('2025-01-15T08:00:00Z').toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 4, frequency: 5 }
        },
        {
          char: '月',
          state: State.Review,
          dueDate: new Date('2025-01-16T09:00:00Z').toISOString(),
          scheduledDays: 2,
          elapsedDays: 2,
          reps: 3,
          lapses: 0,
          difficulty: 4.8,
          stability: 2.5,
          lastReview: new Date('2025-01-14T09:00:00Z').toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 4, frequency: 5 }
        },
        {
          char: '水',
          state: State.Learning,
          dueDate: new Date('2025-01-16T10:30:00Z').toISOString(),
          scheduledDays: 0,
          elapsedDays: 0,
          reps: 1,
          lapses: 0,
          difficulty: 5,
          stability: 0.4,
          lastReview: new Date('2025-01-16T10:00:00Z').toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 4, frequency: 5 }
        }
      ];

      mockDataSync.getDueCards = jest.fn().mockResolvedValue(mockCards);

      const queue = await service.generateQueue('user123', { maxCards: 10 });

      expect(queue).toHaveLength(3);
      expect(queue[0].kanjiChar).toBe('日'); // Most overdue first
      expect(queue[1].kanjiChar).toBe('月');
      expect(queue[2].kanjiChar).toBe('水');
      expect(mockDataSync.getDueCards).toHaveBeenCalledWith('user123', expect.any(Date));
    });

    it('should respect maxCards limit', async () => {
      const mockCards = Array(20).fill(null).map((_, i) => ({
        char: String.fromCharCode(0x4E00 + i), // Generate different kanji
        state: State.Review,
        dueDate: new Date('2025-01-16T08:00:00Z').toISOString(),
        scheduledDays: 1,
        elapsedDays: 1,
        reps: 2,
        lapses: 0,
        difficulty: 5,
        stability: 1.3,
        lastReview: new Date('2025-01-15T08:00:00Z').toISOString(),
        metadata: { jlptLevel: 5, strokeCount: 4, frequency: 5 }
      }));

      mockDataSync.getDueCards = jest.fn().mockResolvedValue(mockCards);

      const queue = await service.generateQueue('user123', { maxCards: 10 });

      expect(queue).toHaveLength(10);
    });

    it('should prioritize overdue cards', async () => {
      const now = new Date('2025-01-16T12:00:00Z');
      const mockCards = [
        {
          char: '新',
          state: State.Review,
          dueDate: new Date('2025-01-16T11:00:00Z').toISOString(), // 1 hour overdue
          scheduledDays: 3,
          elapsedDays: 3,
          reps: 4,
          lapses: 0,
          difficulty: 5,
          stability: 3,
          lastReview: new Date('2025-01-13T11:00:00Z').toISOString(),
          metadata: { jlptLevel: 4, strokeCount: 13, frequency: 4 }
        },
        {
          char: '古',
          state: State.Review,
          dueDate: new Date('2025-01-14T12:00:00Z').toISOString(), // 2 days overdue
          scheduledDays: 5,
          elapsedDays: 7,
          reps: 5,
          lapses: 0,
          difficulty: 4.5,
          stability: 5,
          lastReview: new Date('2025-01-09T12:00:00Z').toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 5, frequency: 5 }
        }
      ];

      mockDataSync.getDueCards = jest.fn().mockResolvedValue(mockCards);

      const queue = await service.generateQueue('user123', { maxCards: 10 });

      expect(queue[0].kanjiChar).toBe('古'); // More overdue comes first
      expect(queue[1].kanjiChar).toBe('新');
    });

    it('should use cached queue within expiry time', async () => {
      const mockCards = [
        {
          char: '本',
          state: State.Review,
          dueDate: new Date('2025-01-16T08:00:00Z').toISOString(),
          scheduledDays: 1,
          elapsedDays: 1,
          reps: 2,
          lapses: 0,
          difficulty: 5,
          stability: 1.3,
          lastReview: new Date('2025-01-15T08:00:00Z').toISOString(),
          metadata: { jlptLevel: 5, strokeCount: 5, frequency: 5 }
        }
      ];

      mockDataSync.getDueCards = jest.fn().mockResolvedValue(mockCards);

      // First call
      const queue1 = await service.generateQueue('user123');
      
      // Second call within cache expiry
      const queue2 = await service.generateQueue('user123');

      expect(queue1).toEqual(queue2);
      expect(mockDataSync.getDueCards).toHaveBeenCalledTimes(1); // Only called once due to cache
    });
  });

  describe('processReview', () => {
    it('should process a review and update the card', async () => {
      const mockCard = {
        char: '木',
        state: State.Review,
        dueDate: new Date('2025-01-16T08:00:00Z').toISOString(),
        scheduledDays: 1,
        elapsedDays: 1,
        reps: 2,
        lapses: 0,
        difficulty: 5,
        stability: 1.3,
        lastReview: new Date('2025-01-15T08:00:00Z').toISOString(),
        metadata: { jlptLevel: 5, strokeCount: 4, frequency: 5 }
      };

      const mockUpdatedCard = {
        ...mockCard,
        reps: 3,
        dueDate: new Date('2025-01-18T08:00:00Z').toISOString(),
        lastReview: new Date('2025-01-16T12:00:00Z').toISOString(),
        stability: 2.5
      };

      mockDataSync.getCard = jest.fn().mockResolvedValue(mockCard);
      mockFSRS.calculateNextStates = jest.fn().mockReturnValue({
        good: mockUpdatedCard,
        again: { ...mockUpdatedCard, lapses: 1 },
        hard: { ...mockUpdatedCard, difficulty: 5.2 },
        easy: { ...mockUpdatedCard, stability: 4 }
      });
      mockDataSync.updateCard = jest.fn().mockResolvedValue(undefined);

      const result = await service.processReview('user123', '木', Rating.Good, 3000);

      expect(result).toEqual(mockUpdatedCard);
      expect(mockDataSync.getCard).toHaveBeenCalledWith('user123', '木');
      expect(mockFSRS.calculateNextStates).toHaveBeenCalledWith(mockCard, expect.any(Date));
      expect(mockDataSync.updateCard).toHaveBeenCalledWith('user123', '木', mockUpdatedCard);
    });

    it('should clear cache after processing review', async () => {
      const mockCard = {
        char: '林',
        state: State.Review,
        dueDate: new Date('2025-01-16T08:00:00Z').toISOString(),
        scheduledDays: 1,
        elapsedDays: 1,
        reps: 2,
        lapses: 0,
        difficulty: 5,
        stability: 1.3,
        lastReview: new Date('2025-01-15T08:00:00Z').toISOString(),
        metadata: { jlptLevel: 5, strokeCount: 8, frequency: 4 }
      };

      mockDataSync.getCard = jest.fn().mockResolvedValue(mockCard);
      mockDataSync.getDueCards = jest.fn().mockResolvedValue([mockCard]);
      mockDataSync.updateCard = jest.fn().mockResolvedValue(undefined);
      mockFSRS.calculateNextStates = jest.fn().mockReturnValue({
        good: { ...mockCard, reps: 3 },
        again: mockCard,
        hard: mockCard,
        easy: mockCard
      });

      // Generate queue (should cache)
      await service.generateQueue('user123');
      expect(mockDataSync.getDueCards).toHaveBeenCalledTimes(1);

      // Process review
      await service.processReview('user123', '林', Rating.Good, 3000);

      // Generate queue again (cache should be cleared)
      await service.generateQueue('user123');
      expect(mockDataSync.getDueCards).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchAddKanji', () => {
    it('should add multiple kanji in batch', async () => {
      const kanjiList = [
        { char: '春', data: { jlptLevel: 4, strokeCount: 9, frequency: 4 } },
        { char: '夏', data: { jlptLevel: 4, strokeCount: 10, frequency: 4 } },
        { char: '秋', data: { jlptLevel: 4, strokeCount: 9, frequency: 4 } },
        { char: '冬', data: { jlptLevel: 4, strokeCount: 5, frequency: 4 } }
      ];

      mockDataSync.batchUpsertCards = jest.fn().mockResolvedValue(undefined);

      await service.batchAddKanji('user123', kanjiList);

      expect(mockDataSync.batchUpsertCards).toHaveBeenCalledWith(
        'user123',
        expect.arrayContaining([
          expect.objectContaining({
            char: '春',
            state: State.New,
            metadata: { jlptLevel: 4, strokeCount: 9, frequency: 4 }
          }),
          expect.objectContaining({
            char: '夏',
            state: State.New,
            metadata: { jlptLevel: 4, strokeCount: 10, frequency: 4 }
          }),
          expect.objectContaining({
            char: '秋',
            state: State.New,
            metadata: { jlptLevel: 4, strokeCount: 9, frequency: 4 }
          }),
          expect.objectContaining({
            char: '冬',
            state: State.New,
            metadata: { jlptLevel: 4, strokeCount: 5, frequency: 4 }
          })
        ])
      );
    });

    it('should clear cache after batch add', async () => {
      const mockCards = [
        {
          char: '森',
          state: State.Review,
          dueDate: new Date('2025-01-16T08:00:00Z').toISOString(),
          scheduledDays: 1,
          elapsedDays: 1,
          reps: 2,
          lapses: 0,
          difficulty: 5,
          stability: 1.3,
          lastReview: new Date('2025-01-15T08:00:00Z').toISOString(),
          metadata: { jlptLevel: 4, strokeCount: 12, frequency: 4 }
        }
      ];

      mockDataSync.getDueCards = jest.fn().mockResolvedValue(mockCards);
      mockDataSync.batchUpsertCards = jest.fn().mockResolvedValue(undefined);

      // Generate queue (should cache)
      await service.generateQueue('user123');
      expect(mockDataSync.getDueCards).toHaveBeenCalledTimes(1);

      // Batch add kanji
      await service.batchAddKanji('user123', [
        { char: '山', data: { jlptLevel: 5, strokeCount: 3, frequency: 5 } }
      ]);

      // Generate queue again (cache should be cleared)
      await service.generateQueue('user123');
      expect(mockDataSync.getDueCards).toHaveBeenCalledTimes(2);
    });
  });
});