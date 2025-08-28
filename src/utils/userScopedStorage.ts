/**
 * User-scoped storage wrapper to ensure data isolation between users
 * This prevents critical security issues where one user can see another user's data
 */

import { EnhancedStorageManager2 } from './enhancedStorageManager2';

export class UserScopedStorage {
  /**
   * Get data from storage with user scoping
   * @param storeName The storage name
   * @param key The original key
   * @param userId The current user ID (null for guests)
   * @returns The stored data or null
   */
  static async getFromStore(storeName: string, key: string, userId: string | null): Promise<any> {
    // Create user-scoped key
    const scopedKey = this.createScopedKey(key, userId);
    return await EnhancedStorageManager2.getFromStore(storeName, scopedKey);
  }

  /**
   * Set data to storage with user scoping
   * @param storeName The storage name
   * @param key The original key
   * @param value The value to store
   * @param userId The current user ID (null for guests)
   */
  static async setToStore(storeName: string, key: string, value: any, userId: string | null): Promise<void> {
    // Create user-scoped key
    const scopedKey = this.createScopedKey(key, userId);
    return await EnhancedStorageManager2.saveToStore(storeName, scopedKey, value);
  }

  /**
   * Delete data from storage with user scoping
   * @param storeName The storage name
   * @param key The original key
   * @param userId The current user ID (null for guests)
   */
  static async deleteFromStore(storeName: string, key: string, userId: string | null): Promise<void> {
    // Create user-scoped key
    const scopedKey = this.createScopedKey(key, userId);
    return await EnhancedStorageManager2.deleteFromStore(storeName, scopedKey);
  }

  /**
   * Get multiple items from storage with user scoping (batch operation)
   * ADDED: Batch operation support for optimized range queries
   * @param storeName The storage name
   * @param keys Array of original keys
   * @param userId The current user ID (null for guests)
   * @returns Array of results with key-value pairs
   */
  static async getBatchFromStore(
    storeName: string, 
    keys: string[], 
    userId: string | null
  ): Promise<Array<{ key: string; value: any; error?: string }>> {
    // Create user-scoped keys
    const scopedKeys = keys.map(key => ({
      originalKey: key,
      scopedKey: this.createScopedKey(key, userId)
    }));

    // Execute batch get operations concurrently
    const results = await Promise.allSettled(
      scopedKeys.map(async ({ originalKey, scopedKey }) => {
        try {
          const value = await EnhancedStorageManager2.getFromStore(storeName, scopedKey);
          return { key: originalKey, value, error: undefined };
        } catch (error) {
          return { 
            key: originalKey, 
            value: null, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Extract results, preserving errors for individual items
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          key: keys[index],
          value: null,
          error: result.reason instanceof Error ? result.reason.message : 'Promise rejected'
        };
      }
    });
  }

  /**
   * Clear all data for a specific user from a store
   * @param storeName The storage name
   * @param userId The user ID to clear data for
   */
  static async clearUserData(storeName: string, userId: string | null): Promise<void> {
    // This would need to be implemented to iterate through all keys
    // For now, we'll log a warning
    console.warn('UserScopedStorage.clearUserData not fully implemented');
  }

  /**
   * Create a user-scoped key
   * @param key The original key
   * @param userId The user ID (null for guests)
   * @returns The scoped key
   */
  private static createScopedKey(key: string, userId: string | null): string {
    // Use 'guest' for non-authenticated users
    const userPrefix = userId || 'guest';
    return `${userPrefix}:${key}`;
  }

  /**
   * Extract the original key from a scoped key
   * @param scopedKey The scoped key
   * @returns The original key
   */
  static extractOriginalKey(scopedKey: string): string {
    const colonIndex = scopedKey.indexOf(':');
    if (colonIndex === -1) return scopedKey;
    return scopedKey.substring(colonIndex + 1);
  }

  /**
   * Extract the user ID from a scoped key
   * @param scopedKey The scoped key
   * @returns The user ID
   */
  static extractUserId(scopedKey: string): string {
    const colonIndex = scopedKey.indexOf(':');
    if (colonIndex === -1) return 'guest';
    return scopedKey.substring(0, colonIndex);
  }
}