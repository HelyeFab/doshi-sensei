/**
 * Review Storage Layer
 * 
 * Provides CRUD operations for ReviewItem and ReviewProgress with:
 * - Efficient querying and filtering
 * - Batch operations for performance
 * - Automatic data validation
 * - Offline-first approach
 */

import {
  ReviewItem,
  ReviewProgress,
  ContentType,
  AlgorithmType,
  StorageError,
  SyncStatus
} from '../types';
import { IndexedDBManager, StoreNames } from './indexdb-manager';

/**
 * Query options for filtering reviews
 */
export interface ReviewQueryOptions {
  /** Filter by content types */
  contentTypes?: ContentType[];
  
  /** Filter by algorithms */
  algorithms?: AlgorithmType[];
  
  /** Filter by due date range */
  dueDateRange?: {
    start?: Date;
    end?: Date;
  };
  
  /** Filter by mastery level range */
  masteryRange?: {
    min?: number;
    max?: number;
  };
  
  /** Filter by tags */
  tags?: string[];
  
  /** Filter by source */
  source?: string;
  
  /** Limit number of results */
  limit?: number;
  
  /** Skip number of results (for pagination) */
  skip?: number;
  
  /** Sort options */
  sort?: {
    field: 'nextReview' | 'masteryLevel' | 'createdAt' | 'updatedAt';
    direction: 'asc' | 'desc';
  };
  
  /** Include deleted items */
  includeDeleted?: boolean;
}

/**
 * Bulk operation interface
 */
export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T;
}

/**
 * Review Storage Service
 */
export class ReviewStorage {
  private dbManager: IndexedDBManager;

  constructor(dbManager?: IndexedDBManager) {
    this.dbManager = dbManager || new IndexedDBManager();
  }

  // ============================================================================
  // ReviewItem Operations
  // ============================================================================

  /**
   * Create a new review item
   */
  public async createReviewItem(item: ReviewItem): Promise<ReviewItem> {
    this.validateReviewItem(item);
    
    const transaction = await this.dbManager.getTransaction('reviewItems', 'readwrite');
    const store = this.dbManager.getStore(transaction, 'reviewItems');
    
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      
      request.onsuccess = () => resolve(item);
      request.onerror = () => {
        if (request.error?.name === 'ConstraintError') {
          reject(new StorageError(`Review item with ID ${item.id} already exists`));
        } else {
          reject(new StorageError('Failed to create review item', request.error));
        }
      };
    });
  }

  /**
   * Get review item by ID
   */
  public async getReviewItem(id: string): Promise<ReviewItem | null> {
    const transaction = await this.dbManager.getTransaction('reviewItems', 'readonly');
    const store = this.dbManager.getStore(transaction, 'reviewItems');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(new StorageError('Failed to get review item', request.error));
      };
    });
  }

  /**
   * Update review item
   */
  public async updateReviewItem(item: ReviewItem): Promise<ReviewItem> {
    this.validateReviewItem(item);
    item.updatedAt = new Date();
    
    const transaction = await this.dbManager.getTransaction('reviewItems', 'readwrite');
    const store = this.dbManager.getStore(transaction, 'reviewItems');
    
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(new StorageError('Failed to update review item', request.error));
    });
  }

  /**
   * Delete review item
   */
  public async deleteReviewItem(id: string): Promise<void> {
    const transaction = await this.dbManager.getTransaction(['reviewItems', 'reviewProgress'], 'readwrite');
    const itemStore = this.dbManager.getStore(transaction, 'reviewItems');
    const progressStore = this.dbManager.getStore(transaction, 'reviewProgress');
    
    return new Promise((resolve, reject) => {
      // Delete the item
      const deleteItemRequest = itemStore.delete(id);
      
      // Also delete all related progress records
      const progressIndex = progressStore.index('itemId');
      const deleteProgressRequest = progressIndex.openCursor(id);
      
      let operationsCompleted = 0;
      const totalOperations = 2;
      
      const checkComplete = () => {
        operationsCompleted++;
        if (operationsCompleted === totalOperations) {
          resolve();
        }
      };
      
      deleteItemRequest.onsuccess = checkComplete;
      deleteItemRequest.onerror = () => reject(new StorageError('Failed to delete review item', deleteItemRequest.error));
      
      deleteProgressRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          checkComplete();
        }
      };
      deleteProgressRequest.onerror = () => reject(new StorageError('Failed to delete progress records', deleteProgressRequest.error));
    });
  }

  /**
   * Get review items by content type
   */
  public async getReviewItemsByType(contentType: ContentType): Promise<ReviewItem[]> {
    const transaction = await this.dbManager.getTransaction('reviewItems', 'readonly');
    const store = this.dbManager.getStore(transaction, 'reviewItems');
    const index = store.index('type');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(contentType);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new StorageError('Failed to get review items by type', request.error));
    });
  }

  // ============================================================================
  // ReviewProgress Operations  
  // ============================================================================

  /**
   * Create review progress for an item
   */
  public async createReviewProgress(progress: ReviewProgress): Promise<ReviewProgress> {
    this.validateReviewProgress(progress);
    
    const transaction = await this.dbManager.getTransaction('reviewProgress', 'readwrite');
    const store = this.dbManager.getStore(transaction, 'reviewProgress');
    
    return new Promise((resolve, reject) => {
      const request = store.add(progress);
      
      request.onsuccess = () => resolve(progress);
      request.onerror = () => {
        if (request.error?.name === 'ConstraintError') {
          reject(new StorageError(`Progress for user ${progress.userId} and item ${progress.itemId} already exists`));
        } else {
          reject(new StorageError('Failed to create review progress', request.error));
        }
      };
    });
  }

  /**
   * Get review progress by user and item
   */
  public async getReviewProgress(userId: string, itemId: string): Promise<ReviewProgress | null> {
    const transaction = await this.dbManager.getTransaction('reviewProgress', 'readonly');
    const store = this.dbManager.getStore(transaction, 'reviewProgress');
    
    return new Promise((resolve, reject) => {
      const request = store.get([userId, itemId]);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(new StorageError('Failed to get review progress', request.error));
      };
    });
  }

  /**
   * Update review progress
   */
  public async updateReviewProgress(progress: ReviewProgress): Promise<ReviewProgress> {
    this.validateReviewProgress(progress);
    progress.updatedAt = new Date();
    
    const transaction = await this.dbManager.getTransaction('reviewProgress', 'readwrite');
    const store = this.dbManager.getStore(transaction, 'reviewProgress');
    
    return new Promise((resolve, reject) => {
      const request = store.put(progress);
      
      request.onsuccess = () => resolve(progress);
      request.onerror = () => reject(new StorageError('Failed to update review progress', request.error));
    });
  }

  /**
   * Delete review progress
   */
  public async deleteReviewProgress(userId: string, itemId: string): Promise<void> {
    const transaction = await this.dbManager.getTransaction('reviewProgress', 'readwrite');
    const store = this.dbManager.getStore(transaction, 'reviewProgress');
    
    return new Promise((resolve, reject) => {
      const request = store.delete([userId, itemId]);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError('Failed to delete review progress', request.error));
    });
  }

  /**
   * Get all review progress for a user
   */
  public async getUserReviewProgress(userId: string): Promise<ReviewProgress[]> {
    const transaction = await this.dbManager.getTransaction('reviewProgress', 'readonly');
    const store = this.dbManager.getStore(transaction, 'reviewProgress');
    const index = store.index('userId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new StorageError('Failed to get user review progress', request.error));
    });
  }

  /**
   * Get due items for review
   */
  public async getDueItems(
    userId: string, 
    options: Partial<ReviewQueryOptions> = {}
  ): Promise<ReviewProgress[]> {
    const now = options.dueDateRange?.end || new Date();
    const transaction = await this.dbManager.getTransaction('reviewProgress', 'readonly');
    const store = this.dbManager.getStore(transaction, 'reviewProgress');
    const nextReviewIndex = store.index('nextReview');
    
    return new Promise((resolve, reject) => {
      const results: ReviewProgress[] = [];
      const range = IDBKeyRange.upperBound(now);
      const request = nextReviewIndex.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const progress = cursor.value as ReviewProgress;
          
          // Filter by user
          if (progress.userId === userId && !progress.deleted) {
            // Apply additional filters
            if (this.matchesFilters(progress, options)) {
              results.push(progress);
            }
          }
          
          // Check limit
          if (options.limit && results.length >= options.limit) {
            resolve(results);
            return;
          }
          
          cursor.continue();
        } else {
          // Apply sorting if specified
          if (options.sort) {
            this.sortResults(results, options.sort);
          }
          
          resolve(results);
        }
      };
      
      request.onerror = () => {
        reject(new StorageError('Failed to get due items', request.error));
      };
    });
  }

  /**
   * Search review progress with advanced filters
   */
  public async searchReviewProgress(
    userId: string,
    options: ReviewQueryOptions
  ): Promise<ReviewProgress[]> {
    const allProgress = await this.getUserReviewProgress(userId);
    
    let filtered = allProgress.filter(progress => {
      if (!options.includeDeleted && progress.deleted) {
        return false;
      }
      
      return this.matchesFilters(progress, options);
    });
    
    // Apply sorting
    if (options.sort) {
      this.sortResults(filtered, options.sort);
    }
    
    // Apply pagination
    if (options.skip) {
      filtered = filtered.slice(options.skip);
    }
    
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Batch create/update review items
   */
  public async batchUpdateReviewItems(items: ReviewItem[]): Promise<void> {
    const operations = items.map(item => ({
      store: 'reviewItems' as StoreNames,
      operation: 'put' as const,
      data: { ...item, updatedAt: new Date() }
    }));
    
    await this.dbManager.batch(operations);
  }

  /**
   * Batch create/update review progress
   */
  public async batchUpdateReviewProgress(progressList: ReviewProgress[]): Promise<void> {
    const operations = progressList.map(progress => ({
      store: 'reviewProgress' as StoreNames,
      operation: 'put' as const,
      data: { ...progress, updatedAt: new Date() }
    }));
    
    await this.dbManager.batch(operations);
  }

  // ============================================================================
  // Statistics and Analytics
  // ============================================================================

  /**
   * Get review statistics for a user
   */
  public async getReviewStats(userId: string): Promise<{
    totalItems: number;
    dueToday: number;
    overdueItems: number;
    masteryDistribution: Record<string, number>;
    algorithmDistribution: Record<AlgorithmType, number>;
    contentTypeDistribution: Record<ContentType, number>;
  }> {
    const allProgress = await this.getUserReviewProgress(userId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const stats = {
      totalItems: allProgress.filter(p => !p.deleted).length,
      dueToday: 0,
      overdueItems: 0,
      masteryDistribution: {} as Record<string, number>,
      algorithmDistribution: {} as Record<AlgorithmType, number>,
      contentTypeDistribution: {} as Record<ContentType, number>
    };
    
    for (const progress of allProgress) {
      if (progress.deleted) continue;
      
      // Due today
      if (progress.nextReview >= startOfDay && progress.nextReview < endOfDay) {
        stats.dueToday++;
      }
      
      // Overdue
      if (progress.nextReview < now) {
        stats.overdueItems++;
      }
      
      // Mastery distribution (by ranges)
      const masteryRange = this.getMasteryRange(progress.masteryLevel);
      stats.masteryDistribution[masteryRange] = (stats.masteryDistribution[masteryRange] || 0) + 1;
      
      // Algorithm distribution
      stats.algorithmDistribution[progress.algorithm] = (stats.algorithmDistribution[progress.algorithm] || 0) + 1;
    }
    
    return stats;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Validate review item data
   */
  private validateReviewItem(item: ReviewItem): void {
    if (!item.id || typeof item.id !== 'string') {
      throw new StorageError('Review item must have a valid ID');
    }
    
    if (!item.type || !Object.values(ContentType).includes(item.type as ContentType)) {
      throw new StorageError('Review item must have a valid content type');
    }
    
    if (!item.content) {
      throw new StorageError('Review item must have content');
    }
    
    if (!item.createdAt || !item.updatedAt) {
      throw new StorageError('Review item must have valid timestamps');
    }
  }

  /**
   * Validate review progress data
   */
  private validateReviewProgress(progress: ReviewProgress): void {
    if (!progress.itemId || typeof progress.itemId !== 'string') {
      throw new StorageError('Review progress must have a valid item ID');
    }
    
    if (!progress.userId || typeof progress.userId !== 'string') {
      throw new StorageError('Review progress must have a valid user ID');
    }
    
    if (!Object.values(AlgorithmType).includes(progress.algorithm)) {
      throw new StorageError('Review progress must have a valid algorithm type');
    }
    
    if (!progress.algorithmData) {
      throw new StorageError('Review progress must have algorithm data');
    }
    
    if (!progress.nextReview || !progress.createdAt || !progress.updatedAt) {
      throw new StorageError('Review progress must have valid timestamps');
    }
  }

  /**
   * Check if progress matches the given filters
   */
  private matchesFilters(progress: ReviewProgress, options: Partial<ReviewQueryOptions>): boolean {
    // Algorithm filter
    if (options.algorithms && !options.algorithms.includes(progress.algorithm)) {
      return false;
    }
    
    // Due date range filter
    if (options.dueDateRange) {
      const { start, end } = options.dueDateRange;
      if (start && progress.nextReview < start) return false;
      if (end && progress.nextReview > end) return false;
    }
    
    // Mastery range filter
    if (options.masteryRange) {
      const { min, max } = options.masteryRange;
      if (min !== undefined && progress.masteryLevel < min) return false;
      if (max !== undefined && progress.masteryLevel > max) return false;
    }
    
    return true;
  }

  /**
   * Sort results based on sort options
   */
  private sortResults(results: ReviewProgress[], sort: NonNullable<ReviewQueryOptions['sort']>): void {
    const { field, direction } = sort;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    results.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (field) {
        case 'nextReview':
          aVal = a.nextReview.getTime();
          bVal = b.nextReview.getTime();
          break;
        case 'masteryLevel':
          aVal = a.masteryLevel;
          bVal = b.masteryLevel;
          break;
        case 'createdAt':
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
        case 'updatedAt':
          aVal = a.updatedAt.getTime();
          bVal = b.updatedAt.getTime();
          break;
        default:
          return 0;
      }
      
      return (aVal - bVal) * multiplier;
    });
  }

  /**
   * Get mastery range category
   */
  private getMasteryRange(masteryLevel: number): string {
    if (masteryLevel < 25) return 'Beginner (0-24)';
    if (masteryLevel < 50) return 'Learning (25-49)';
    if (masteryLevel < 75) return 'Intermediate (50-74)';
    if (masteryLevel < 90) return 'Advanced (75-89)';
    return 'Master (90-100)';
  }
}