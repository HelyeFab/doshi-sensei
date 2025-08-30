/**
 * Unified Review Data Store
 * Single source of truth for all review operations
 */

import { getEventBus } from '../review-events/EventBus';
import {
  ReviewEventType,
  EventPriority,
  ReviewSource,
  ReviewResult
} from '../review-events/types';
import {
  UnifiedReviewItem,
  GetDueItemsParams,
  UnifiedDueItems,
  RecordReviewParams,
  ReviewResultData,
  ConflictStrategy,
  ConflictData,
  Transaction,
  Operation,
  DataStoreConfig,
  ReviewStoreError,
  ConflictError,
  StorageAdapter,
  CacheEntry,
  LocalChanges,
  RemoteChanges,
  ContentType,
  ReviewState,
  AlgorithmType
} from './types';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { FirebaseAdapter } from './adapters/FirebaseAdapter';
import { MemoryCacheAdapter } from './adapters/MemoryCacheAdapter';
import { SyncEngine } from './SyncEngine';
import { TransactionManager } from './TransactionManager';
import { getTextbookVocabularyItems, getKanjiMasteryItems } from './source-connectors';

/**
 * UnifiedReviewDataStore - Central data management for reviews
 */
export class UnifiedReviewDataStore {
  private static instance: UnifiedReviewDataStore;
  private localDB: StorageAdapter;
  private remoteDB: StorageAdapter;
  private cache: StorageAdapter;
  private syncEngine: SyncEngine;
  private transactionManager: TransactionManager;
  private config: Required<DataStoreConfig>;
  private eventBus = getEventBus();
  private isInitialized = false;

  private constructor(config?: DataStoreConfig) {
    // Initialize configuration
    this.config = {
      localDB: config?.localDB || new IndexedDBAdapter('review_hub_db'),
      remoteDB: config?.remoteDB || new FirebaseAdapter(),
      cache: config?.cache || new MemoryCacheAdapter(100), // 100MB default
      enableSync: config?.enableSync ?? true,
      syncInterval: config?.syncInterval ?? 30000, // 30 seconds
      conflictStrategy: config?.conflictStrategy ?? ConflictStrategy.LAST_WRITE_WINS,
      maxCacheSize: config?.maxCacheSize ?? 100, // 100MB
      enableTransactions: config?.enableTransactions ?? true
    };

    // Initialize adapters
    this.localDB = this.config.localDB;
    this.remoteDB = this.config.remoteDB;
    this.cache = this.config.cache;

    // Initialize sync engine
    this.syncEngine = new SyncEngine(
      this.localDB,
      this.remoteDB,
      this.config.conflictStrategy
    );

    // Initialize transaction manager
    this.transactionManager = new TransactionManager(
      this.localDB,
      this.remoteDB,
      this.cache
    );

    // Initialize the store
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: DataStoreConfig): UnifiedReviewDataStore {
    if (!this.instance) {
      this.instance = new UnifiedReviewDataStore(config);
    }
    return this.instance;
  }

  /**
   * Get completed items count for today
   */
  async getCompletedToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Query from local DB for now (would query Firebase in production)
      const key = `stats:${userId}:${today.toISOString().split('T')[0]}`;
      const stats = await this.cache.get(key);
      return stats?.completed || 0;
    } catch (error) {
      console.error('[UnifiedDataStore] Failed to get completed today:', error);
      return 0;
    }
  }

  /**
   * Get current streak for user
   */
  async getCurrentStreak(userId: string): Promise<number> {
    try {
      const key = `streak:${userId}`;
      const streak = await this.cache.get(key);
      return streak || 0;
    } catch (error) {
      console.error('[UnifiedDataStore] Failed to get streak:', error);
      return 0;
    }
  }

  /**
   * Sync with remote database
   */
  async syncWithRemote(userId: string): Promise<void> {
    if (!this.config.enableSync) return;
    
    try {
      await this.syncEngine.sync(userId);
    } catch (error) {
      console.error('[UnifiedDataStore] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Initialize the data store
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Setup sync engine if enabled
      if (this.config.enableSync) {
        await this.syncEngine.initialize();
        this.setupSyncSchedule();
      }

      // Subscribe to relevant events
      this.subscribeToEvents();

      this.isInitialized = true;
      console.log('[UnifiedDataStore] Initialized successfully');
    } catch (error) {
      throw new ReviewStoreError('Failed to initialize data store', error as Error);
    }
  }

  /**
   * Record a review with full transaction support
   */
  async recordReview(params: RecordReviewParams): Promise<ReviewResultData> {
    const transaction = this.config.enableTransactions
      ? await this.transactionManager.beginTransaction()
      : null;

    try {
      // 1. Validate access permissions
      const hasAccess = await this.validateAccess(params.userId, params.subscriptionTier);
      if (!hasAccess) {
        throw new ReviewStoreError('Access denied: Daily limit reached');
      }

      // 2. Get the item
      const item = await this.getItem(params.itemId);
      if (!item) {
        throw new ReviewStoreError(`Item not found: ${params.itemId}`);
      }

      // 3. Update review data (optimistic update)
      const updatedItem = await this.updateReviewData(item, params);
      
      // 4. Save to local database immediately
      const localResult = await this.saveToLocal(updatedItem, transaction);

      // 5. Emit event for real-time updates
      await this.emitReviewEvent(params, localResult);

      // 6. Queue for remote sync
      if (this.config.enableSync) {
        await this.syncEngine.queueSync(localResult);
      }

      // 7. Invalidate cache
      await this.invalidateCache(params.itemId);

      // 8. Commit transaction
      if (transaction) {
        await transaction.commit();
      }

      return {
        itemId: localResult.id,
        success: true,
        nextReviewDate: localResult.scheduling.nextReviewAt!,
        interval: localResult.scheduling.interval,
        easeFactor: localResult.scheduling.easeFactor,
        repetitions: localResult.scheduling.repetitions,
        syncId: localResult.sync.version.toString()
      };

    } catch (error) {
      // Rollback on error
      if (transaction) {
        await transaction.rollback();
      }
      throw new ReviewStoreError('Failed to record review', error as Error);
    }
  }

  /**
   * Get due items with intelligent aggregation and caching
   */
  async getDueItems(params: GetDueItemsParams): Promise<UnifiedDueItems> {
    const cacheKey = this.generateCacheKey(params);

    // Try cache first
    if (!params.forceRefresh) {
      const cached = await this.getFromCache<UnifiedDueItems>(cacheKey);
      if (cached) {
        console.log('[UnifiedDataStore] Cache hit for due items');
        return cached;
      }
    }

    try {
      // Get all sources
      const sources = params.sources || this.getAllSources();
      
      // Aggregate from all sources in parallel
      const aggregatedPromises = sources.map(source =>
        this.getSourceDueItems(source, params)
      );
      const aggregated = await Promise.all(aggregatedPromises);

      // Merge and deduplicate
      const unified = this.mergeAndDeduplicate(aggregated.flat());

      // Apply intelligent scheduling
      const scheduled = await this.applySchedulingAlgorithm(unified, params);

      // Save all items to local DB for quick access during reviews
      // This is critical for the review process to work
      for (const item of scheduled) {
        await this.localDB.set(`item:${item.id}`, item);
      }

      // Calculate statistics
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result: UnifiedDueItems = {
        items: scheduled,
        total: scheduled.length,
        overdue: scheduled.filter(item => item.scheduling.dueDate < now).length,
        dueToday: scheduled.filter(item => {
          const due = item.scheduling.dueDate;
          return due >= now && due < tomorrow;
        }).length,
        dueTomorrow: scheduled.filter(item => {
          const due = item.scheduling.dueDate;
          return due >= tomorrow && due < new Date(tomorrow.getTime() + 86400000);
        }).length,
        sources: this.countBySources(scheduled),
        nextReviewTime: this.getNextReviewTime(scheduled)
      };

      // Cache results
      await this.setCache(cacheKey, result, params.ttl || 300000); // 5 min default

      return result;

    } catch (error) {
      throw new ReviewStoreError('Failed to get due items', error as Error);
    }
  }

  /**
   * Resolve conflicts between local and remote data
   */
  async resolveConflict(
    local: UnifiedReviewItem,
    remote: UnifiedReviewItem
  ): Promise<UnifiedReviewItem> {
    const strategy = this.config.conflictStrategy;

    switch (strategy) {
      case ConflictStrategy.LAST_WRITE_WINS:
        return local.metadata.updatedAt > remote.metadata.updatedAt ? local : remote;

      case ConflictStrategy.MERGE:
        return this.mergeReviewData(local, remote);

      case ConflictStrategy.REMOTE_WINS:
        return remote;

      case ConflictStrategy.LOCAL_WINS:
        return local;

      case ConflictStrategy.USER_DECIDES:
        // Emit event for user resolution
        await this.eventBus.emit({
          type: ReviewEventType.SYNC_CONFLICT,
          source: ReviewSource.REVIEW_HUB,
          userId: 'system',
          data: {
            itemId: local.id,
            itemType: local.contentType,
            metadata: { local, remote }
          },
          priority: EventPriority.HIGH
        });
        // For now, use last write wins as fallback
        return local.metadata.updatedAt > remote.metadata.updatedAt ? local : remote;

      default:
        throw new ReviewStoreError(`Unknown conflict strategy: ${strategy}`);
    }
  }

  /**
   * Perform full synchronization
   */
  async performSync(userId: string): Promise<void> {
    if (!this.config.enableSync) {
      throw new ReviewStoreError('Sync is not enabled');
    }

    try {
      await this.eventBus.emit({
        type: ReviewEventType.SYNC_STARTED,
        source: ReviewSource.REVIEW_HUB,
        userId,
        data: {
          itemId: 'sync',
          itemType: 'kanji'
        },
        priority: EventPriority.NORMAL
      });

      const result = await this.syncEngine.performSync(userId);

      await this.eventBus.emit({
        type: ReviewEventType.SYNC_COMPLETED,
        source: ReviewSource.REVIEW_HUB,
        userId,
        data: {
          itemId: 'sync',
          itemType: 'kanji',
          metadata: result
        },
        priority: EventPriority.NORMAL
      });

    } catch (error) {
      await this.eventBus.emit({
        type: ReviewEventType.SYNC_FAILED,
        source: ReviewSource.REVIEW_HUB,
        userId,
        data: {
          itemId: 'sync',
          itemType: 'kanji',
          metadata: { error: (error as Error).message }
        },
        priority: EventPriority.HIGH
      });
      throw error;
    }
  }

  // Private helper methods

  private async validateAccess(
    userId: string,
    subscriptionTier?: string
  ): Promise<boolean> {
    // This will be implemented with the Global Access Control
    // For now, return true to continue development
    return true;
  }

  private async getItem(itemId: string): Promise<UnifiedReviewItem | null> {
    // Try local first
    const local = await this.localDB.get(`item:${itemId}`);
    if (local) return local;

    // Try remote
    const remote = await this.remoteDB.get(`item:${itemId}`);
    if (remote) {
      // Cache locally
      await this.localDB.set(`item:${itemId}`, remote);
      return remote;
    }

    // If not in databases, try to get from the current session's loaded items
    // This is critical because items from source connectors aren't saved to DB yet
    const userId = this.config.userId || 'guest';
    const cachedData = await this.getCachedData(`due-items:${userId}`);
    if (cachedData && cachedData.items) {
      const item = cachedData.items.find((i: UnifiedReviewItem) => i.id === itemId);
      if (item) {
        // Save to local DB for future access
        await this.localDB.set(`item:${itemId}`, item);
        return item;
      }
    }

    // As last resort, try to fetch directly from source systems
    // This requires parsing the itemId to determine the source
    if (itemId.startsWith('textbook-vocab-')) {
      const items = await getTextbookVocabularyItems({ userId, limit: 1000 });
      const item = items.find(i => i.id === itemId);
      if (item) {
        await this.localDB.set(`item:${itemId}`, item);
        return item;
      }
    } else if (itemId.startsWith('kanji-mastery-')) {
      const items = await getKanjiMasteryItems({ userId, limit: 1000 });
      const item = items.find(i => i.id === itemId);
      if (item) {
        await this.localDB.set(`item:${itemId}`, item);
        return item;
      }
    }

    return null;
  }

  private async updateReviewData(
    item: UnifiedReviewItem,
    params: RecordReviewParams
  ): Promise<UnifiedReviewItem> {
    const now = new Date();
    
    // Update based on result
    const isCorrect = params.result === ReviewResult.CORRECT;
    
    // Update scheduling (simplified - actual implementation would use FSRS/SM2)
    const scheduling = { ...item.scheduling };
    if (isCorrect) {
      scheduling.repetitions++;
      scheduling.interval = Math.min(scheduling.interval * scheduling.easeFactor, 365);
      scheduling.easeFactor = Math.min(scheduling.easeFactor + 0.1, 2.5);
    } else {
      scheduling.repetitions = 0;
      scheduling.interval = 1;
      scheduling.easeFactor = Math.max(scheduling.easeFactor - 0.2, 1.3);
      scheduling.lapses++;
    }
    
    scheduling.lastReviewedAt = now;
    scheduling.nextReviewAt = new Date(now.getTime() + scheduling.interval * 86400000);
    scheduling.dueDate = scheduling.nextReviewAt;

    // Update metadata
    const metadata = { ...item.metadata };
    metadata.updatedAt = now;
    metadata.lastReviewedAt = now;
    metadata.lastReviewSource = params.source;

    // Update sync info
    const sync = { ...item.sync };
    sync.version++;
    sync.localChanges = true;

    return {
      ...item,
      scheduling,
      metadata,
      sync
    };
  }

  private async saveToLocal(
    item: UnifiedReviewItem,
    transaction: Transaction | null
  ): Promise<UnifiedReviewItem> {
    const key = `item:${item.id}`;
    
    if (transaction) {
      transaction.addOperation({
        type: 'update',
        entity: 'review',
        data: { key, value: item },
        rollbackData: await this.localDB.get(key)
      });
    }
    
    await this.localDB.set(key, item);
    return item;
  }

  private async emitReviewEvent(
    params: RecordReviewParams,
    item: UnifiedReviewItem
  ): Promise<void> {
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_REVIEWED,
      source: params.source,
      userId: params.userId,
      data: {
        itemId: item.id,
        itemType: item.contentType,
        content: item.content,
        result: params.result,
        duration: params.duration,
        metadata: params.metadata
      },
      priority: EventPriority.NORMAL
    });
  }

  private async invalidateCache(itemId: string): Promise<void> {
    // Invalidate all cache entries that might contain this item
    const patterns = [
      `due:*${itemId}*`,
      `item:${itemId}`,
      `stats:*`
    ];
    
    for (const pattern of patterns) {
      await this.cache.delete(pattern);
    }
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const entry = await this.cache.get(key) as CacheEntry<T> | null;
    if (!entry) return null;
    
    const now = Date.now();
    if (entry.timestamp.getTime() + entry.ttl < now) {
      await this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private async setCache<T>(key: string, data: T, ttl: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl,
      hits: 0
    };
    await this.cache.set(key, entry, ttl);
  }

  private generateCacheKey(params: GetDueItemsParams): string {
    const parts = [
      'due',
      params.userId,
      params.sources?.join(',') || 'all',
      params.contentTypes?.join(',') || 'all',
      params.limit || 'unlimited',
      params.offset || 0
    ];
    return parts.join(':');
  }

  private getAllSources(): ReviewSource[] {
    return Object.values(ReviewSource);
  }

  private async getSourceDueItems(
    source: ReviewSource,
    params: GetDueItemsParams
  ): Promise<UnifiedReviewItem[]> {
    // Import the source connectors (using mock for now while fixing real connectors)
    const { 
      getKanjiMasteryItems, 
      getTextbookVocabularyItems,
      getFlashcardItems,
      getStudyListItems,
      getDrillPracticeItems 
    } = await import('./source-connectors');
    
    const connectorParams = {
      userId: params.userId,
      contentTypes: params.contentTypes,
      limit: params.limit,
      offset: params.offset,
      includeOverdue: params.includeOverdue
    };
    
    switch (source) {
      case ReviewSource.KANJI_MASTERY:
        return await getKanjiMasteryItems(connectorParams);
        
      case ReviewSource.TEXTBOOK_VOCAB:
        return await getTextbookVocabularyItems(connectorParams);
        
      case ReviewSource.FLASHCARDS:
        return await getFlashcardItems(connectorParams);
        
      case ReviewSource.VOCABULARY_PAGE:
      case ReviewSource.KANJI_BROWSER:
        // Both use study lists
        return await getStudyListItems(connectorParams);
        
      case ReviewSource.DRILL_PRACTICE:
        return await getDrillPracticeItems(connectorParams);
        
      case ReviewSource.KANA_STUDY:
      case ReviewSource.STORY_MODE:
      case ReviewSource.GAMES:
        // These sources don't have traditional review items yet
        // They could be added later
        return [];
        
      case ReviewSource.REVIEW_HUB:
        // Review hub doesn't have its own items, it aggregates from others
        return [];
        
      default:
        console.warn(`Unknown review source: ${source}`);
        return [];
    }
  }

  private mergeAndDeduplicate(items: UnifiedReviewItem[]): UnifiedReviewItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private async applySchedulingAlgorithm(
    items: UnifiedReviewItem[],
    params: GetDueItemsParams
  ): Promise<UnifiedReviewItem[]> {
    // Apply intelligent scheduling
    // For now, just sort by due date and apply limit
    const sorted = items.sort((a, b) => 
      a.scheduling.dueDate.getTime() - b.scheduling.dueDate.getTime()
    );
    
    if (params.limit) {
      return sorted.slice(params.offset || 0, (params.offset || 0) + params.limit);
    }
    
    return sorted;
  }

  private mergeReviewData(
    local: UnifiedReviewItem,
    remote: UnifiedReviewItem
  ): UnifiedReviewItem {
    // Merge strategy: take the best of both
    return {
      ...local,
      scheduling: {
        ...local.scheduling,
        // Use the higher repetition count
        repetitions: Math.max(local.scheduling.repetitions, remote.scheduling.repetitions),
        // Use the more recent review date
        lastReviewedAt: local.scheduling.lastReviewedAt! > remote.scheduling.lastReviewedAt!
          ? local.scheduling.lastReviewedAt
          : remote.scheduling.lastReviewedAt
      },
      metadata: {
        ...local.metadata,
        // Merge tags
        tags: [...new Set([...local.metadata.tags, ...remote.metadata.tags])],
        // Use most recent update
        updatedAt: local.metadata.updatedAt > remote.metadata.updatedAt
          ? local.metadata.updatedAt
          : remote.metadata.updatedAt
      },
      sync: {
        ...local.sync,
        version: Math.max(local.sync.version, remote.sync.version) + 1,
        lastSyncedAt: new Date(),
        localChanges: false,
        remoteChanges: false,
        conflictStatus: 'resolved'
      }
    };
  }

  private countBySources(items: UnifiedReviewItem[]): Record<ReviewSource, number> {
    const counts: Partial<Record<ReviewSource, number>> = {};
    
    for (const item of items) {
      counts[item.sourceType] = (counts[item.sourceType] || 0) + 1;
    }
    
    return counts as Record<ReviewSource, number>;
  }

  private getNextReviewTime(items: UnifiedReviewItem[]): Date | undefined {
    if (items.length === 0) return undefined;
    
    const times = items
      .map(item => item.scheduling.nextReviewAt)
      .filter(time => time !== undefined) as Date[];
    
    if (times.length === 0) return undefined;
    
    return new Date(Math.min(...times.map(t => t.getTime())));
  }

  private setupSyncSchedule(): void {
    if (!this.config.enableSync) return;
    
    setInterval(() => {
      // Auto-sync for all active users
      this.performSync('current-user').catch(error => {
        console.error('[UnifiedDataStore] Auto-sync failed:', error);
      });
    }, this.config.syncInterval);
  }

  private subscribeToEvents(): void {
    // Subscribe to relevant events
    this.eventBus.subscribe(
      ReviewEventType.ITEM_REVIEWED,
      async (event) => {
        // Handle review events from other sources
        if (event.source !== ReviewSource.REVIEW_HUB) {
          // Update our cache and trigger sync
          await this.invalidateCache(event.data.itemId);
        }
      }
    );
  }
}

// Export singleton instance getter
export const getUnifiedDataStore = (config?: DataStoreConfig) => 
  UnifiedReviewDataStore.getInstance(config);