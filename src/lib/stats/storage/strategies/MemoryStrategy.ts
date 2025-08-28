/**
 * Memory storage strategy implementation
 * Used for testing and guest users
 */

import { IStorageStrategy, UserStatsV2, StorageError } from '../../core/interfaces';
import { LOG_PREFIXES } from '../../core/constants';

export class MemoryStrategy implements IStorageStrategy {
  private stats: UserStatsV2 | null = null;
  private readonly logger: (message: string) => void;

  constructor(logger: (message: string) => void = console.log) {
    this.logger = logger;
  }

  getName(): string {
    return 'Memory';
  }

  /**
   * Load stats from memory
   */
  async load(): Promise<UserStatsV2 | null> {
    this.logger(`${LOG_PREFIXES.STORAGE} Loading stats from memory...`);
    
    if (this.stats) {
      this.logger(`${LOG_PREFIXES.STORAGE} Stats found in memory`);
      return { ...this.stats }; // Return copy to prevent mutation
    }

    this.logger(`${LOG_PREFIXES.STORAGE} No stats found in memory`);
    return null;
  }

  /**
   * Save stats to memory
   */
  async save(stats: UserStatsV2): Promise<void> {
    if (!stats) {
      throw new StorageError('No stats data to save', 'save');
    }

    this.logger(`${LOG_PREFIXES.STORAGE} Saving stats to memory...`);
    this.stats = { 
      ...stats, 
      lastUpdated: Date.now() 
    };
    this.logger(`${LOG_PREFIXES.STORAGE} Successfully saved stats to memory`);
  }

  /**
   * Clear memory storage
   */
  async clear(): Promise<void> {
    this.logger(`${LOG_PREFIXES.STORAGE} Clearing memory storage...`);
    this.stats = null;
    this.logger(`${LOG_PREFIXES.STORAGE} Successfully cleared memory storage`);
  }

  /**
   * Get current memory usage info
   */
  getMemoryInfo(): { hasStats: boolean; lastUpdated: number | null } {
    return {
      hasStats: this.stats !== null,
      lastUpdated: this.stats?.lastUpdated || null
    };
  }
}