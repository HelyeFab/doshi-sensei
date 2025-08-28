/**
 * Enterprise-grade pagination manager with cursor-based pagination and virtual scrolling
 * Optimized for large datasets with predictive preloading and memory efficiency
 */

import { ActivityEvent, DailyActivity } from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';

// Pagination configuration
export interface PaginationConfig {
  pageSize: number;
  maxCachedPages: number;
  preloadPages: number;
  virtualScrollThreshold: number;
  bufferSize: number;
  lazyLoadDelay: number;
  intersectionThreshold: number;
}

// Cursor-based pagination info
export interface PaginationCursor {
  id: string;
  timestamp: number;
  direction: 'forward' | 'backward';
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Page metadata
export interface PageInfo {
  pageNumber: number;
  cursor: PaginationCursor | null;
  nextCursor: PaginationCursor | null;
  prevCursor: PaginationCursor | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalCount?: number;
  loadedAt: number;
  accessCount: number;
  isLoading: boolean;
  error?: string;
}

// Page data container
export interface Page<T> {
  data: T[];
  pageInfo: PageInfo;
  estimatedTotalPages?: number;
}

// Virtual scroll viewport
export interface VirtualViewport {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  containerHeight: number;
  itemHeight: number;
  totalItems: number;
  visibleItems: number;
  overscan: number;
}

// Pagination metrics
export interface PaginationMetrics {
  totalPages: number;
  cachedPages: number;
  hitRate: number;
  averageLoadTime: number;
  preloadHitRate: number;
  memoryUsage: number;
  scrollPerformance: {
    averageFrameTime: number;
    droppedFrames: number;
    scrollDistance: number;
  };
}

export class PaginationManager<T = ActivityEvent | DailyActivity> {
  private config: PaginationConfig;
  private logger: (message: string) => void;
  
  // Page cache with LRU eviction
  private pageCache: Map<string, Page<T>> = new Map();
  private pageAccessOrder: Map<string, number> = new Map();
  private currentAccessIndex: number = 0;
  
  // Loading state
  private loadingPages: Set<string> = new Set();
  private preloadQueue: Set<string> = new Set();
  
  // Virtual scrolling
  private virtualViewport: VirtualViewport = {
    startIndex: 0,
    endIndex: 0,
    scrollTop: 0,
    containerHeight: 0,
    itemHeight: 50, // Default item height
    totalItems: 0,
    visibleItems: 0,
    overscan: 5
  };
  
  // Intersection Observer for lazy loading
  private intersectionObserver: IntersectionObserver | null = null;
  private observedElements: Set<Element> = new Set();
  
  // Performance tracking
  private metrics: PaginationMetrics = {
    totalPages: 0,
    cachedPages: 0,
    hitRate: 0,
    averageLoadTime: 0,
    preloadHitRate: 0,
    memoryUsage: 0,
    scrollPerformance: {
      averageFrameTime: 0,
      droppedFrames: 0,
      scrollDistance: 0
    }
  };
  
  // Performance monitoring
  private frameTimeHistory: number[] = [];
  private lastScrollTime: number = 0;
  private totalScrollDistance: number = 0;
  
  // Data loader function
  private dataLoader: (cursor: PaginationCursor | null, pageSize: number) => Promise<Page<T>>;
  
  // Cleanup timers
  private preloadTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    dataLoader: (cursor: PaginationCursor | null, pageSize: number) => Promise<Page<T>>,
    config: Partial<PaginationConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.dataLoader = dataLoader;
    this.logger = logger;
    
    this.config = {
      pageSize: config.pageSize || 20,
      maxCachedPages: config.maxCachedPages || 50,
      preloadPages: config.preloadPages || 2,
      virtualScrollThreshold: config.virtualScrollThreshold || 100,
      bufferSize: config.bufferSize || 10,
      lazyLoadDelay: config.lazyLoadDelay || 100,
      intersectionThreshold: config.intersectionThreshold || 0.1,
      ...config
    };
    
    this.initializeIntersectionObserver();
    this.startPeriodicTasks();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} PaginationManager initialized with config: ${JSON.stringify(this.config)}`);
  }

  /**
   * Load a specific page with caching and preloading
   */
  async loadPage(cursor: PaginationCursor | null = null, forceRefresh: boolean = false): Promise<Page<T>> {
    const pageKey = this.generatePageKey(cursor);
    const startTime = performance.now();
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && this.pageCache.has(pageKey)) {
      const cachedPage = this.pageCache.get(pageKey)!;
      this.updateAccessOrder(pageKey);
      this.updateMetrics('hit', performance.now() - startTime);
      
      // Trigger preloading of adjacent pages
      this.schedulePreload(cachedPage.pageInfo.nextCursor);
      this.schedulePreload(cachedPage.pageInfo.prevCursor);
      
      return cachedPage;
    }
    
    // Prevent duplicate loading
    if (this.loadingPages.has(pageKey)) {
      return this.waitForPageLoad(pageKey);
    }
    
    this.loadingPages.add(pageKey);
    
    try {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Loading page: ${pageKey}`);
      
      const page = await this.dataLoader(cursor, this.config.pageSize);
      page.pageInfo.loadedAt = Date.now();
      page.pageInfo.accessCount = 1;
      page.pageInfo.isLoading = false;
      
      // Cache the page
      this.cachePage(pageKey, page);
      
      // Schedule preloading of adjacent pages
      this.schedulePreload(page.pageInfo.nextCursor);
      this.schedulePreload(page.pageInfo.prevCursor);
      
      // Update metrics
      this.updateMetrics('miss', performance.now() - startTime);
      
      return page;
      
    } catch (error) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Failed to load page ${pageKey}: ${error}`);
      
      const errorPage: Page<T> = {
        data: [],
        pageInfo: {
          pageNumber: 0,
          cursor,
          nextCursor: null,
          prevCursor: null,
          hasNextPage: false,
          hasPrevPage: false,
          loadedAt: Date.now(),
          accessCount: 0,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error)
        }
      };
      
      return errorPage;
      
    } finally {
      this.loadingPages.delete(pageKey);
    }
  }

  /**
   * Get items for virtual scrolling viewport
   */
  async getVirtualItems(startIndex: number, endIndex: number): Promise<T[]> {
    const items: T[] = [];
    const pageSize = this.config.pageSize;
    
    // Calculate which pages we need
    const startPage = Math.floor(startIndex / pageSize);
    const endPage = Math.floor(endIndex / pageSize);
    
    // Load required pages
    const pagePromises: Promise<Page<T>>[] = [];
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const cursor = await this.getCursorForPage(pageNum);
      pagePromises.push(this.loadPage(cursor));
    }
    
    const pages = await Promise.all(pagePromises);
    
    // Extract items for the virtual viewport
    for (let i = startIndex; i <= Math.min(endIndex, this.getTotalItemsEstimate() - 1); i++) {
      const pageIndex = Math.floor(i / pageSize);
      const itemIndex = i % pageSize;
      const page = pages[pageIndex - startPage];
      
      if (page && page.data[itemIndex]) {
        items.push(page.data[itemIndex]);
      }
    }
    
    return items;
  }

  /**
   * Update virtual scroll viewport
   */
  updateViewport(viewport: Partial<VirtualViewport>): VirtualViewport {
    this.virtualViewport = { ...this.virtualViewport, ...viewport };
    
    // Calculate visible range with overscan
    const visibleStart = Math.floor(this.virtualViewport.scrollTop / this.virtualViewport.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.virtualViewport.containerHeight / this.virtualViewport.itemHeight),
      this.virtualViewport.totalItems - 1
    );
    
    // Apply overscan
    this.virtualViewport.startIndex = Math.max(0, visibleStart - this.virtualViewport.overscan);
    this.virtualViewport.endIndex = Math.min(
      this.virtualViewport.totalItems - 1,
      visibleEnd + this.virtualViewport.overscan
    );
    
    this.virtualViewport.visibleItems = this.virtualViewport.endIndex - this.virtualViewport.startIndex + 1;
    
    // Preload pages for visible items
    this.preloadVisiblePages();
    
    return this.virtualViewport;
  }

  /**
   * Handle scroll events with performance optimization
   */
  handleScroll(scrollTop: number): void {
    const now = performance.now();
    const deltaTime = now - this.lastScrollTime;
    const deltaScroll = Math.abs(scrollTop - this.virtualViewport.scrollTop);
    
    // Track scroll performance
    if (deltaTime > 0) {
      this.frameTimeHistory.push(deltaTime);
      if (this.frameTimeHistory.length > 100) {
        this.frameTimeHistory.shift();
      }
      
      // Detect dropped frames (> 16.67ms for 60fps)
      if (deltaTime > 16.67) {
        this.metrics.scrollPerformance.droppedFrames++;
      }
    }
    
    this.totalScrollDistance += deltaScroll;
    this.lastScrollTime = now;
    
    // Update viewport
    this.updateViewport({ scrollTop });
    
    // Throttle expensive operations during fast scrolling
    if (deltaScroll > 100) {
      this.throttleOperations();
    }
  }

  /**
   * Get next page cursor-based
   */
  async getNextPage(currentPage: Page<T>): Promise<Page<T> | null> {
    if (!currentPage.pageInfo.hasNextPage || !currentPage.pageInfo.nextCursor) {
      return null;
    }
    
    return this.loadPage(currentPage.pageInfo.nextCursor);
  }

  /**
   * Get previous page cursor-based
   */
  async getPrevPage(currentPage: Page<T>): Promise<Page<T> | null> {
    if (!currentPage.pageInfo.hasPrevPage || !currentPage.pageInfo.prevCursor) {
      return null;
    }
    
    return this.loadPage(currentPage.pageInfo.prevCursor);
  }

  /**
   * Search with pagination
   */
  async search(query: string, filters?: Record<string, any>): Promise<Page<T>> {
    const searchCursor: PaginationCursor = {
      id: `search_${query}`,
      timestamp: Date.now(),
      direction: 'forward',
      filters: { ...filters, query }
    };
    
    // Clear cache for search results
    this.clearSearchCache();
    
    return this.loadPage(searchCursor, true);
  }

  /**
   * Infinite scroll - load more items
   */
  async loadMore(): Promise<T[]> {
    const lastPage = this.getLastCachedPage();
    if (!lastPage || !lastPage.pageInfo.hasNextPage) {
      return [];
    }
    
    const nextPage = await this.getNextPage(lastPage);
    return nextPage ? nextPage.data : [];
  }

  /**
   * Setup intersection observer for lazy loading
   */
  observeElement(element: Element, callback?: () => void): void {
    if (this.intersectionObserver && !this.observedElements.has(element)) {
      this.intersectionObserver.observe(element);
      this.observedElements.add(element);
      
      if (callback) {
        element.addEventListener('intersect', callback as EventListener);
      }
    }
  }

  /**
   * Stop observing element
   */
  unobserveElement(element: Element): void {
    if (this.intersectionObserver && this.observedElements.has(element)) {
      this.intersectionObserver.unobserve(element);
      this.observedElements.delete(element);
    }
  }

  /**
   * Get current pagination metrics
   */
  getMetrics(): PaginationMetrics {
    const averageFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
      : 0;
    
    return {
      ...this.metrics,
      cachedPages: this.pageCache.size,
      memoryUsage: this.estimateMemoryUsage(),
      scrollPerformance: {
        ...this.metrics.scrollPerformance,
        averageFrameTime,
        scrollDistance: this.totalScrollDistance
      }
    };
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    totalPages: number;
    cachedPages: number;
    loadingPages: number;
    preloadQueue: number;
    memoryUsage: string;
    hitRate: string;
  } {
    const metrics = this.getMetrics();
    
    return {
      totalPages: metrics.totalPages,
      cachedPages: this.pageCache.size,
      loadingPages: this.loadingPages.size,
      preloadQueue: this.preloadQueue.size,
      memoryUsage: this.formatBytes(metrics.memoryUsage),
      hitRate: `${metrics.hitRate.toFixed(1)}%`
    };
  }

  /**
   * Clear all cached pages
   */
  clearCache(): void {
    const cacheSize = this.pageCache.size;
    this.pageCache.clear();
    this.pageAccessOrder.clear();
    this.preloadQueue.clear();
    this.loadingPages.clear();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleared pagination cache (${cacheSize} pages)`);
  }

  /**
   * Prefetch pages for better UX
   */
  async prefetch(cursors: PaginationCursor[]): Promise<void> {
    const prefetchPromises = cursors.map(cursor => 
      this.loadPage(cursor).catch(error => 
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Prefetch failed: ${error}`)
      )
    );
    
    await Promise.allSettled(prefetchPromises);
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Prefetched ${cursors.length} pages`);
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Clear timers
    if (this.preloadTimer) clearTimeout(this.preloadTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    
    // Cleanup intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    // Clear observed elements
    this.observedElements.clear();
    
    // Clear cache
    this.clearCache();
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} PaginationManager destroyed`);
  }

  // Private methods

  private generatePageKey(cursor: PaginationCursor | null): string {
    if (!cursor) return 'page_0';
    
    const filterStr = cursor.filters ? JSON.stringify(cursor.filters) : '';
    return `page_${cursor.id}_${cursor.timestamp}_${filterStr}`;
  }

  private cachePage(key: string, page: Page<T>): void {
    // Evict LRU pages if cache is full
    if (this.pageCache.size >= this.config.maxCachedPages) {
      this.evictLRUPage();
    }
    
    this.pageCache.set(key, page);
    this.updateAccessOrder(key);
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Cached page: ${key} (${page.data.length} items)`);
  }

  private updateAccessOrder(key: string): void {
    this.pageAccessOrder.set(key, this.currentAccessIndex++);
  }

  private evictLRUPage(): void {
    let lruKey: string | null = null;
    let lruAccessIndex = Infinity;
    
    for (const [key, accessIndex] of this.pageAccessOrder) {
      if (accessIndex < lruAccessIndex) {
        lruAccessIndex = accessIndex;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.pageCache.delete(lruKey);
      this.pageAccessOrder.delete(lruKey);
      this.metrics.totalPages--;
      
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Evicted LRU page: ${lruKey}`);
    }
  }

  private schedulePreload(cursor: PaginationCursor | null): void {
    if (!cursor) return;
    
    const pageKey = this.generatePageKey(cursor);
    if (!this.pageCache.has(pageKey) && !this.loadingPages.has(pageKey)) {
      this.preloadQueue.add(pageKey);
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.size === 0) return;
    
    const keys = Array.from(this.preloadQueue).slice(0, this.config.preloadPages);
    this.preloadQueue.clear();
    
    const preloadPromises = keys.map(async key => {
      try {
        const cursor = this.parseCursorFromKey(key);
        await this.loadPage(cursor);
        this.metrics.preloadHitRate++;
      } catch (error) {
        this.logger(`${LOG_PREFIXES.PERFORMANCE} Preload failed for ${key}: ${error}`);
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }

  private parseCursorFromKey(key: string): PaginationCursor | null {
    // This would parse the cursor from the cache key
    // Simplified implementation
    if (key === 'page_0') return null;
    
    const parts = key.split('_');
    return {
      id: parts[1] || '',
      timestamp: parseInt(parts[2]) || Date.now(),
      direction: 'forward'
    };
  }

  private preloadVisiblePages(): void {
    const pageSize = this.config.pageSize;
    const startPage = Math.floor(this.virtualViewport.startIndex / pageSize);
    const endPage = Math.floor(this.virtualViewport.endIndex / pageSize);
    
    // Preload pages for visible range plus buffer
    for (let i = startPage - 1; i <= endPage + 1; i++) {
      if (i >= 0) {
        this.schedulePreloadByPageNumber(i);
      }
    }
  }

  private async schedulePreloadByPageNumber(pageNumber: number): Promise<void> {
    const cursor = await this.getCursorForPage(pageNumber);
    this.schedulePreload(cursor);
  }

  private async getCursorForPage(pageNumber: number): Promise<PaginationCursor | null> {
    if (pageNumber === 0) return null;
    
    // This would calculate cursor based on page number
    // Simplified implementation
    return {
      id: `page_${pageNumber}`,
      timestamp: Date.now(),
      direction: 'forward'
    };
  }

  private getLastCachedPage(): Page<T> | null {
    let lastPage: Page<T> | null = null;
    let lastTimestamp = 0;
    
    for (const page of this.pageCache.values()) {
      if (page.pageInfo.loadedAt > lastTimestamp) {
        lastTimestamp = page.pageInfo.loadedAt;
        lastPage = page;
      }
    }
    
    return lastPage;
  }

  private clearSearchCache(): void {
    const searchKeys = Array.from(this.pageCache.keys())
      .filter(key => key.includes('search_'));
    
    searchKeys.forEach(key => {
      this.pageCache.delete(key);
      this.pageAccessOrder.delete(key);
    });
    
    this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleared search cache (${searchKeys.length} pages)`);
  }

  private async waitForPageLoad(pageKey: string): Promise<Page<T>> {
    // Wait for ongoing page load
    return new Promise((resolve, reject) => {
      const checkLoading = () => {
        if (!this.loadingPages.has(pageKey)) {
          const page = this.pageCache.get(pageKey);
          if (page) {
            resolve(page);
          } else {
            reject(new Error(`Page ${pageKey} not found after loading`));
          }
        } else {
          setTimeout(checkLoading, 50);
        }
      };
      checkLoading();
    });
  }

  private throttleOperations(): void {
    // Reduce preload queue processing during fast scrolling
    if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
    }
    
    this.preloadTimer = setTimeout(() => {
      this.processPreloadQueue();
    }, this.config.lazyLoadDelay * 2);
  }

  private getTotalItemsEstimate(): number {
    // Estimate total items based on cached pages
    let totalItems = 0;
    let hasMorePages = false;
    
    for (const page of this.pageCache.values()) {
      totalItems += page.data.length;
      if (page.pageInfo.hasNextPage) {
        hasMorePages = true;
      }
    }
    
    // If there are more pages, estimate based on average page size
    if (hasMorePages && this.pageCache.size > 0) {
      const avgPageSize = totalItems / this.pageCache.size;
      const estimatedTotalPages = Math.max(this.config.maxCachedPages, this.pageCache.size * 2);
      totalItems = avgPageSize * estimatedTotalPages;
    }
    
    return totalItems;
  }

  private updateMetrics(type: 'hit' | 'miss', loadTime: number): void {
    if (type === 'hit') {
      this.metrics.hitRate = (this.metrics.hitRate + 1) / 2;
    } else {
      this.metrics.averageLoadTime = (this.metrics.averageLoadTime + loadTime) / 2;
    }
    
    this.metrics.totalPages = Math.max(this.metrics.totalPages, this.pageCache.size);
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const page of this.pageCache.values()) {
      // Rough estimate of page memory usage
      totalSize += JSON.stringify(page.data).length * 2; // UTF-16
      totalSize += 500; // Metadata overhead
    }
    
    return totalSize;
  }

  private initializeIntersectionObserver(): void {
    if (typeof window === 'undefined') return;
    
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const event = new CustomEvent('intersect');
            entry.target.dispatchEvent(event);
          }
        });
      },
      {
        threshold: this.config.intersectionThreshold,
        rootMargin: '100px'
      }
    );
  }

  private startPeriodicTasks(): void {
    // Process preload queue regularly
    this.preloadTimer = setInterval(() => {
      this.processPreloadQueue();
    }, 2000);
    
    // Update metrics
    this.metricsTimer = setInterval(() => {
      this.updateMetricsSnapshot();
    }, 10000);
    
    // Cleanup expired pages
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredPages();
    }, 60000);
  }

  private updateMetricsSnapshot(): void {
    const metrics = this.getMetrics();
    this.logger(
      `${LOG_PREFIXES.PERFORMANCE} Pagination metrics - ` +
      `Pages: ${metrics.cachedPages}/${metrics.totalPages}, ` +
      `Hit Rate: ${metrics.hitRate.toFixed(1)}%, ` +
      `Memory: ${this.formatBytes(metrics.memoryUsage)}`
    );
  }

  private cleanupExpiredPages(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    let cleaned = 0;
    
    for (const [key, page] of this.pageCache) {
      if (now - page.pageInfo.loadedAt > maxAge && page.pageInfo.accessCount < 2) {
        this.pageCache.delete(key);
        this.pageAccessOrder.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger(`${LOG_PREFIXES.PERFORMANCE} Cleaned ${cleaned} expired pages`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}