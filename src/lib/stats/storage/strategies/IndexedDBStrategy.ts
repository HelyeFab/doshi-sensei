/**
 * IndexedDB storage strategy implementation
 * Handles local storage with user scoping
 */

import { IStorageStrategy, UserStatsV2, StorageError } from '../../core/interfaces';
import { STORAGE_KEYS, LOG_PREFIXES } from '../../core/constants';
import { UserScopedStorage } from '@/utils/userScopedStorage';

export class IndexedDBStrategy implements IStorageStrategy {
  private readonly userId: string | null;
  private readonly logger: (message: string) => void;

  constructor(
    userId: string | null,
    logger: (message: string) => void = console.log
  ) {
    this.userId = userId;
    this.logger = logger;
  }

  getName(): string {
    return 'IndexedDB';
  }

  /**
   * Load stats from IndexedDB
   */
  async load(): Promise<UserStatsV2 | null> {
    if (!this.userId) {
      this.logger(`${LOG_PREFIXES.STORAGE} IndexedDB: No user ID, skipping load`);
      return null;
    }

    try {
      this.logger(`${LOG_PREFIXES.STORAGE} Loading stats from IndexedDB for user ${this.userId.substr(0, 8)}...`);

      const stored = await UserScopedStorage.getFromStore(
        STORAGE_KEYS.STATS,
        'userStats',
        this.userId
      );

      if (!stored) {
        this.logger(`${LOG_PREFIXES.STORAGE} No stats found in IndexedDB`);
        return null;
      }

      // Validate version compatibility
      if (stored.version !== '2.1') {
        this.logger(`${LOG_PREFIXES.STORAGE} Version mismatch: ${stored.version} vs 2.1`);
        return null;
      }

      // Remove storage-specific fields
      const { id, ...cleanStats } = stored;
      this.logger(`${LOG_PREFIXES.STORAGE} Successfully loaded stats from IndexedDB`);
      
      return cleanStats as UserStatsV2;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} IndexedDB load failed: ${message}`);
      throw new StorageError(`Failed to load from IndexedDB: ${message}`, 'load');
    }
  }

  /**
   * Save stats to IndexedDB
   */
  async save(stats: UserStatsV2): Promise<void> {
    if (!this.userId) {
      this.logger(`${LOG_PREFIXES.STORAGE} IndexedDB: No user ID, skipping save`);
      return;
    }

    if (!stats) {
      throw new StorageError('No stats data to save', 'save');
    }

    try {
      this.logger(`${LOG_PREFIXES.STORAGE} Saving stats to IndexedDB for user ${this.userId.substr(0, 8)}...`);

      // Ensure userId matches
      const statsToSave = {
        ...stats,
        userId: this.userId,
        lastUpdated: Date.now()
      };

      await UserScopedStorage.setToStore(
        STORAGE_KEYS.STATS,
        'userStats',
        statsToSave,
        this.userId
      );

      this.logger(`${LOG_PREFIXES.STORAGE} Successfully saved stats to IndexedDB`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} IndexedDB save failed: ${message}`);
      throw new StorageError(`Failed to save to IndexedDB: ${message}`, 'save');
    }
  }

  /**
   * Clear all data for current user
   */
  async clear(): Promise<void> {
    if (!this.userId) {
      this.logger(`${LOG_PREFIXES.STORAGE} IndexedDB: No user ID, skipping clear`);
      return;
    }

    try {
      this.logger(`${LOG_PREFIXES.STORAGE} Clearing IndexedDB data for user ${this.userId.substr(0, 8)}...`);

      await UserScopedStorage.deleteFromStore(
        STORAGE_KEYS.STATS,
        'userStats',
        this.userId
      );

      this.logger(`${LOG_PREFIXES.STORAGE} Successfully cleared IndexedDB data`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} IndexedDB clear failed: ${message}`);
      throw new StorageError(`Failed to clear IndexedDB: ${message}`, 'clear');
    }
  }
}