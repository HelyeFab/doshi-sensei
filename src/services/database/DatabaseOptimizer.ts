/**
 * Database Optimizer
 * Handles connection pooling, query optimization, and indexing strategies
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';
import { cacheManager } from '../cache/CacheManager';

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface QueryPlan {
  query: string;
  estimatedCost: number;
  indexes: string[];
  executionTime?: number;
  cached: boolean;
}

export interface IndexStrategy {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  unique?: boolean;
  partial?: string;
}

export interface QueryStats {
  totalQueries: number;
  cachedQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  failedQueries: number;
  cacheHitRate: number;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  
  // Connection pool management
  private connectionPool: Map<string, any> = new Map();
  private availableConnections: any[] = [];
  private activeConnections: Set<any> = new Set();
  private connectionQueue: Array<(conn: any) => void> = [];
  
  // Query optimization
  private queryCache: Map<string, any> = new Map();
  private queryPlans: Map<string, QueryPlan> = new Map();
  private preparedStatements: Map<string, any> = new Map();
  
  // Statistics
  private queryStats: QueryStats = {
    totalQueries: 0,
    cachedQueries: 0,
    averageExecutionTime: 0,
    slowQueries: 0,
    failedQueries: 0,
    cacheHitRate: 0
  };
  
  // Configuration
  private poolConfig: ConnectionPoolConfig = {
    minConnections: 2,
    maxConnections: 10,
    connectionTimeout: 5000,
    idleTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  };
  
  private slowQueryThreshold = 100; // ms
  private eventBus = getEventBus();

  private constructor() {
    this.initialize();
  }

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * Initialize database optimizer
   */
  private async initialize(): Promise<void> {
    // Create initial connection pool
    await this.createConnectionPool();
    
    // Setup monitoring
    this.startMonitoring();
    
    // Create recommended indexes
    await this.createOptimalIndexes();
    
    console.log('[DatabaseOptimizer] Initialized with pool size:', this.poolConfig.maxConnections);
  }

  /**
   * Create connection pool
   */
  private async createConnectionPool(): Promise<void> {
    // In production, this would create actual database connections
    // For now, we'll simulate with mock connections
    
    for (let i = 0; i < this.poolConfig.minConnections; i++) {
      const connection = await this.createConnection();
      this.availableConnections.push(connection);
    }
    
    console.log(`[DatabaseOptimizer] Created ${this.poolConfig.minConnections} initial connections`);
  }

  /**
   * Create a single database connection
   */
  private async createConnection(): Promise<any> {
    // In production, this would create an actual database connection
    // For IndexedDB, we return a database instance
    
    return new Promise((resolve) => {
      const request = indexedDB.open('review-hub-optimized', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        
        // Add connection metadata
        const connection = {
          id: `conn_${Date.now()}_${Math.random()}`,
          db,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          queryCount: 0
        };
        
        resolve(connection);
      };
      
      request.onerror = () => {
        console.error('[DatabaseOptimizer] Failed to create connection');
        resolve(null);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create optimized object stores with indexes
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create optimized object stores with indexes
   */
  private createObjectStores(db: IDBDatabase): void {
    // Reviews store with composite indexes
    if (!db.objectStoreNames.contains('reviews')) {
      const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
      
      // Composite indexes for common queries
      reviewStore.createIndex('userId_dueDate', ['userId', 'dueDate'], { unique: false });
      reviewStore.createIndex('userId_source', ['userId', 'source'], { unique: false });
      reviewStore.createIndex('userId_contentType', ['userId', 'contentType'], { unique: false });
      reviewStore.createIndex('dueDate', 'dueDate', { unique: false });
      reviewStore.createIndex('lastReviewedAt', 'lastReviewedAt', { unique: false });
    }
    
    // User stats store
    if (!db.objectStoreNames.contains('userStats')) {
      const statsStore = db.createObjectStore('userStats', { keyPath: 'userId' });
      statsStore.createIndex('lastActive', 'lastActive', { unique: false });
      statsStore.createIndex('streak', 'streak', { unique: false });
    }
    
    // Cache store for query results
    if (!db.objectStoreNames.contains('queryCache')) {
      const cacheStore = db.createObjectStore('queryCache', { keyPath: 'queryHash' });
      cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      cacheStore.createIndex('accessCount', 'accessCount', { unique: false });
    }
    
    console.log('[DatabaseOptimizer] Created optimized object stores with indexes');
  }

  /**
   * Get connection from pool
   */
  async getConnection(): Promise<any> {
    // Try to get available connection
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;
      this.activeConnections.add(connection);
      connection.lastUsed = Date.now();
      return connection;
    }
    
    // Create new connection if under limit
    if (this.activeConnections.size < this.poolConfig.maxConnections) {
      const connection = await this.createConnection();
      this.activeConnections.add(connection);
      return connection;
    }
    
    // Wait for available connection
    return new Promise((resolve) => {
      this.connectionQueue.push(resolve);
      
      // Timeout handling
      setTimeout(() => {
        const index = this.connectionQueue.indexOf(resolve);
        if (index > -1) {
          this.connectionQueue.splice(index, 1);
          resolve(null); // Timeout
        }
      }, this.poolConfig.connectionTimeout);
    });
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection: any): void {
    this.activeConnections.delete(connection);
    
    // Serve waiting requests first
    if (this.connectionQueue.length > 0) {
      const resolver = this.connectionQueue.shift()!;
      this.activeConnections.add(connection);
      resolver(connection);
    } else {
      // Return to available pool
      this.availableConnections.push(connection);
    }
  }

  /**
   * Execute optimized query
   */
  async executeQuery<T = any>(
    query: string,
    params?: any[],
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<T> {
    const startTime = performance.now();
    this.queryStats.totalQueries++;
    
    try {
      // Check query cache first
      if (options.cache !== false) {
        const cacheKey = this.getQueryCacheKey(query, params);
        const cached = await cacheManager.get(cacheKey);
        
        if (cached) {
          this.queryStats.cachedQueries++;
          this.updateCacheHitRate();
          return cached as T;
        }
      }
      
      // Get connection from pool
      const connection = await this.getConnection();
      if (!connection) {
        throw new Error('Failed to get database connection');
      }
      
      try {
        // Execute query with optimization
        const result = await this.executeOptimizedQuery(connection, query, params);
        
        // Cache result if requested
        if (options.cache !== false) {
          const cacheKey = this.getQueryCacheKey(query, params);
          await cacheManager.set(cacheKey, result, { ttl: 60000 }); // 1 minute cache
        }
        
        // Track execution time
        const executionTime = performance.now() - startTime;
        this.updateQueryStats(executionTime);
        
        // Log slow queries
        if (executionTime > this.slowQueryThreshold) {
          this.logSlowQuery(query, params, executionTime);
        }
        
        return result as T;
        
      } finally {
        // Always release connection
        this.releaseConnection(connection);
      }
      
    } catch (error) {
      this.queryStats.failedQueries++;
      console.error('[DatabaseOptimizer] Query failed:', error);
      throw error;
    }
  }

  /**
   * Execute optimized query on connection
   */
  private async executeOptimizedQuery(
    connection: any,
    query: string,
    params?: any[]
  ): Promise<any> {
    // Parse query to determine operation type
    const operation = this.parseQueryOperation(query);
    
    switch (operation.type) {
      case 'SELECT':
        return this.executeSelect(connection, operation, params);
      case 'INSERT':
        return this.executeInsert(connection, operation, params);
      case 'UPDATE':
        return this.executeUpdate(connection, operation, params);
      case 'DELETE':
        return this.executeDelete(connection, operation, params);
      default:
        throw new Error(`Unsupported operation: ${operation.type}`);
    }
  }

  /**
   * Execute SELECT query with optimization
   */
  private async executeSelect(connection: any, operation: any, params?: any[]): Promise<any> {
    const { db } = connection;
    const { store, index, range, limit } = operation;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      
      let request;
      if (index) {
        const idx = objectStore.index(index);
        request = range ? idx.getAll(range, limit) : idx.getAll(null, limit);
      } else {
        request = range ? objectStore.getAll(range, limit) : objectStore.getAll(null, limit);
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute INSERT with batching
   */
  private async executeInsert(connection: any, operation: any, params?: any[]): Promise<any> {
    const { db } = connection;
    const { store, data } = operation;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      // Batch insert for better performance
      const results: any[] = [];
      let completed = 0;
      
      const items = Array.isArray(data) ? data : [data];
      
      items.forEach(item => {
        const request = objectStore.add(item);
        
        request.onsuccess = () => {
          results.push(request.result);
          completed++;
          
          if (completed === items.length) {
            resolve(results);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Execute UPDATE with optimization
   */
  private async executeUpdate(connection: any, operation: any, params?: any[]): Promise<any> {
    const { db } = connection;
    const { store, key, data } = operation;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      const request = objectStore.put({ ...data, id: key });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute DELETE with batching
   */
  private async executeDelete(connection: any, operation: any, params?: any[]): Promise<any> {
    const { db } = connection;
    const { store, keys } = operation;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      const keysArray = Array.isArray(keys) ? keys : [keys];
      let deleted = 0;
      
      keysArray.forEach(key => {
        const request = objectStore.delete(key);
        
        request.onsuccess = () => {
          deleted++;
          if (deleted === keysArray.length) {
            resolve(deleted);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Parse query to determine operation type
   */
  private parseQueryOperation(query: string): any {
    // Simple query parser for IndexedDB operations
    // In production, this would be more sophisticated
    
    const normalized = query.trim().toUpperCase();
    
    if (normalized.startsWith('SELECT')) {
      return {
        type: 'SELECT',
        store: 'reviews', // Default store
        index: null,
        range: null,
        limit: 100
      };
    } else if (normalized.startsWith('INSERT')) {
      return {
        type: 'INSERT',
        store: 'reviews',
        data: {}
      };
    } else if (normalized.startsWith('UPDATE')) {
      return {
        type: 'UPDATE',
        store: 'reviews',
        key: null,
        data: {}
      };
    } else if (normalized.startsWith('DELETE')) {
      return {
        type: 'DELETE',
        store: 'reviews',
        keys: []
      };
    }
    
    return { type: 'UNKNOWN' };
  }

  /**
   * Create optimal indexes based on query patterns
   */
  private async createOptimalIndexes(): Promise<void> {
    const recommendedIndexes: IndexStrategy[] = [
      // Composite indexes for common query patterns
      {
        table: 'reviews',
        columns: ['userId', 'dueDate', 'contentType'],
        type: 'btree'
      },
      {
        table: 'reviews',
        columns: ['sourceType', 'lastReviewedAt'],
        type: 'btree'
      },
      {
        table: 'reviews',
        columns: ['userId', 'scheduling.state'],
        type: 'hash'
      },
      // Partial index for active items only
      {
        table: 'reviews',
        columns: ['dueDate'],
        type: 'btree',
        partial: "scheduling.state != 'suspended'"
      }
    ];
    
    console.log(`[DatabaseOptimizer] Recommended ${recommendedIndexes.length} indexes`);
    
    // In production, these would be created in the database
    // For IndexedDB, they're created in createObjectStores
  }

  /**
   * Start monitoring and optimization
   */
  private startMonitoring(): void {
    // Monitor connection pool health
    setInterval(() => {
      this.checkConnectionPoolHealth();
    }, 30000); // Every 30 seconds
    
    // Clean up idle connections
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Every minute
    
    // Analyze query patterns
    setInterval(() => {
      this.analyzeQueryPatterns();
    }, 300000); // Every 5 minutes
  }

  /**
   * Check connection pool health
   */
  private checkConnectionPoolHealth(): void {
    const totalConnections = this.availableConnections.length + this.activeConnections.size;
    const utilization = this.activeConnections.size / this.poolConfig.maxConnections;
    
    if (utilization > 0.8) {
      console.warn('[DatabaseOptimizer] High connection pool utilization:', utilization);
      
      // Consider scaling up
      if (totalConnections < this.poolConfig.maxConnections) {
        this.scaleConnectionPool(2);
      }
    } else if (utilization < 0.2 && totalConnections > this.poolConfig.minConnections) {
      // Scale down if underutilized
      this.scaleConnectionPool(-1);
    }
  }

  /**
   * Scale connection pool
   */
  private async scaleConnectionPool(delta: number): Promise<void> {
    if (delta > 0) {
      // Scale up
      for (let i = 0; i < delta; i++) {
        const connection = await this.createConnection();
        this.availableConnections.push(connection);
      }
      console.log(`[DatabaseOptimizer] Scaled up pool by ${delta} connections`);
    } else {
      // Scale down
      const toRemove = Math.min(Math.abs(delta), this.availableConnections.length);
      for (let i = 0; i < toRemove; i++) {
        const connection = this.availableConnections.pop();
        if (connection && connection.db) {
          connection.db.close();
        }
      }
      console.log(`[DatabaseOptimizer] Scaled down pool by ${toRemove} connections`);
    }
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const idleConnections = this.availableConnections.filter(
      conn => now - conn.lastUsed > this.poolConfig.idleTimeout
    );
    
    idleConnections.forEach(conn => {
      const index = this.availableConnections.indexOf(conn);
      if (index > -1) {
        this.availableConnections.splice(index, 1);
        if (conn.db) {
          conn.db.close();
        }
      }
    });
    
    if (idleConnections.length > 0) {
      console.log(`[DatabaseOptimizer] Cleaned up ${idleConnections.length} idle connections`);
    }
  }

  /**
   * Analyze query patterns for optimization
   */
  private async analyzeQueryPatterns(): Promise<void> {
    // Analyze slow queries
    if (this.queryStats.slowQueries > 10) {
      console.warn('[DatabaseOptimizer] High number of slow queries detected');
      
      // Emit event for monitoring
      await this.eventBus.emit({
        type: ReviewEventType.PERFORMANCE_WARNING,
        source: ReviewSource.REVIEW_HUB,
        userId: 'system',
        data: {
          itemId: 'database-performance',
          itemType: 'monitoring',
          metadata: {
            slowQueries: this.queryStats.slowQueries,
            averageExecutionTime: this.queryStats.averageExecutionTime,
            cacheHitRate: this.queryStats.cacheHitRate
          }
        },
        priority: EventPriority.HIGH
      });
    }
    
    // Reset counters
    this.queryStats.slowQueries = 0;
  }

  /**
   * Utility methods
   */
  private getQueryCacheKey(query: string, params?: any[]): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `query:${this.hashString(query + paramStr)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private updateQueryStats(executionTime: number): void {
    const n = this.queryStats.totalQueries;
    this.queryStats.averageExecutionTime = 
      ((n - 1) * this.queryStats.averageExecutionTime + executionTime) / n;
    
    if (executionTime > this.slowQueryThreshold) {
      this.queryStats.slowQueries++;
    }
  }

  private updateCacheHitRate(): void {
    this.queryStats.cacheHitRate = 
      this.queryStats.cachedQueries / this.queryStats.totalQueries;
  }

  private logSlowQuery(query: string, params: any[] | undefined, executionTime: number): void {
    console.warn('[DatabaseOptimizer] Slow query detected:', {
      query: query.substring(0, 100),
      executionTime: `${executionTime.toFixed(2)}ms`,
      params: params?.length || 0
    });
  }

  /**
   * Get optimizer statistics
   */
  getStats(): {
    pool: {
      active: number;
      available: number;
      waiting: number;
      total: number;
    };
    queries: QueryStats;
  } {
    return {
      pool: {
        active: this.activeConnections.size,
        available: this.availableConnections.length,
        waiting: this.connectionQueue.length,
        total: this.activeConnections.size + this.availableConnections.length
      },
      queries: { ...this.queryStats }
    };
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<void> {
    // Close all connections
    [...this.activeConnections, ...this.availableConnections].forEach(conn => {
      if (conn && conn.db) {
        conn.db.close();
      }
    });
    
    this.connectionPool.clear();
    this.activeConnections.clear();
    this.availableConnections = [];
    this.connectionQueue = [];
    
    console.log('[DatabaseOptimizer] Destroyed');
  }
}

// Export singleton instance
export const databaseOptimizer = DatabaseOptimizer.getInstance();

// Export for type usage
export type { DatabaseOptimizer };