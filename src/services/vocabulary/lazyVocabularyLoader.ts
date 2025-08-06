// Lazy Vocabulary Loader Service
// Implements progressive loading with service worker precaching

interface VocabularyChunk {
  lessonId: string;
  textbook: string;
  words: any[];
  totalWords: number;
  chunkIndex: number;
  totalChunks: number;
}

interface LoaderOptions {
  chunkSize: number;
  prefetchNext: boolean;
  cacheStrategy: 'memory' | 'indexeddb' | 'both';
}

class LazyVocabularyLoader {
  private readonly CHUNK_SIZE = 50; // Words per chunk
  private readonly DB_NAME = 'VocabularyCache';
  private readonly STORE_NAME = 'vocabularyChunks';
  private memoryCache = new Map<string, VocabularyChunk>();
  private loadingPromises = new Map<string, Promise<VocabularyChunk>>();
  private db: IDBDatabase | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  constructor() {
    this.initDB();
    this.setupIntersectionObserver();
  }

  private async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('lessonId', 'lessonId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const lessonId = element.dataset.lessonId;
            const chunkIndex = parseInt(element.dataset.chunkIndex || '0', 10);
            
            if (lessonId) {
              this.loadChunk(lessonId, chunkIndex);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0.01
      }
    );
  }

  // Generate chunk ID
  private getChunkId(lessonId: string, chunkIndex: number): string {
    return `${lessonId}_chunk_${chunkIndex}`;
  }

  // Load vocabulary chunk
  async loadChunk(
    lessonId: string,
    chunkIndex: number = 0,
    options: Partial<LoaderOptions> = {}
  ): Promise<VocabularyChunk> {
    const chunkId = this.getChunkId(lessonId, chunkIndex);
    
    // Check if already loading
    if (this.loadingPromises.has(chunkId)) {
      return this.loadingPromises.get(chunkId)!;
    }

    // Check memory cache
    if (this.memoryCache.has(chunkId)) {
      const chunk = this.memoryCache.get(chunkId)!;
      
      // Prefetch next chunk if enabled
      if (options.prefetchNext) {
        this.prefetchNextChunk(lessonId, chunkIndex + 1);
      }
      
      return chunk;
    }

    // Check IndexedDB cache
    const cachedChunk = await this.getFromIndexedDB(chunkId);
    if (cachedChunk) {
      this.memoryCache.set(chunkId, cachedChunk);
      
      if (options.prefetchNext) {
        this.prefetchNextChunk(lessonId, chunkIndex + 1);
      }
      
      return cachedChunk;
    }

    // Load from network
    const loadPromise = this.loadFromNetwork(lessonId, chunkIndex, options);
    this.loadingPromises.set(chunkId, loadPromise);
    
    try {
      const chunk = await loadPromise;
      this.loadingPromises.delete(chunkId);
      return chunk;
    } catch (error) {
      this.loadingPromises.delete(chunkId);
      throw error;
    }
  }

  // Load from network
  private async loadFromNetwork(
    lessonId: string,
    chunkIndex: number,
    options: Partial<LoaderOptions> = {}
  ): Promise<VocabularyChunk> {
    const chunkSize = options.chunkSize || this.CHUNK_SIZE;
    
    try {
      // Determine the data source based on lesson ID format
      let dataUrl: string;
      
      if (lessonId.startsWith('genki')) {
        dataUrl = `/data/textbook-vocabulary/genki/${lessonId}.json`;
      } else if (lessonId.startsWith('minna')) {
        dataUrl = `/data/textbook-vocabulary/minna/${lessonId}.json`;
      } else {
        // Fallback to generic vocabulary data
        dataUrl = `/data/vocabulary/${lessonId}.json`;
      }
      
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load vocabulary: ${response.status}`);
      }
      
      const fullData = await response.json();
      
      // Calculate chunks
      const totalWords = fullData.words?.length || fullData.length || 0;
      const totalChunks = Math.ceil(totalWords / chunkSize);
      const startIndex = chunkIndex * chunkSize;
      const endIndex = Math.min(startIndex + chunkSize, totalWords);
      
      // Extract chunk
      const words = (fullData.words || fullData).slice(startIndex, endIndex);
      
      const chunk: VocabularyChunk = {
        lessonId,
        textbook: this.extractTextbook(lessonId),
        words,
        totalWords,
        chunkIndex,
        totalChunks
      };
      
      // Cache the chunk
      await this.cacheChunk(chunk, options.cacheStrategy || 'both');
      
      // Prefetch next chunk if enabled
      if (options.prefetchNext && chunkIndex < totalChunks - 1) {
        this.prefetchNextChunk(lessonId, chunkIndex + 1);
      }
      
      return chunk;
      
    } catch (error) {
      console.error(`Failed to load vocabulary chunk ${lessonId}:${chunkIndex}`, error);
      
      // Return empty chunk on error
      return {
        lessonId,
        textbook: this.extractTextbook(lessonId),
        words: [],
        totalWords: 0,
        chunkIndex,
        totalChunks: 1
      };
    }
  }

  // Extract textbook from lesson ID
  private extractTextbook(lessonId: string): string {
    if (lessonId.includes('genki1')) return 'genki-1';
    if (lessonId.includes('genki2')) return 'genki-2';
    if (lessonId.includes('minna1')) return 'minna-1';
    if (lessonId.includes('minna2')) return 'minna-2';
    return 'unknown';
  }

  // Cache chunk
  private async cacheChunk(
    chunk: VocabularyChunk,
    strategy: 'memory' | 'indexeddb' | 'both'
  ): Promise<void> {
    const chunkId = this.getChunkId(chunk.lessonId, chunk.chunkIndex);
    
    // Cache in memory
    if (strategy === 'memory' || strategy === 'both') {
      this.memoryCache.set(chunkId, chunk);
      
      // Limit memory cache size
      if (this.memoryCache.size > 20) {
        const firstKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(firstKey);
      }
    }
    
    // Cache in IndexedDB
    if (strategy === 'indexeddb' || strategy === 'both') {
      await this.saveToIndexedDB(chunkId, chunk);
    }
  }

  // Prefetch next chunk in background
  private async prefetchNextChunk(lessonId: string, nextChunkIndex: number): Promise<void> {
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.loadChunk(lessonId, nextChunkIndex, { prefetchNext: false });
      });
    } else {
      // Fallback with setTimeout
      setTimeout(() => {
        this.loadChunk(lessonId, nextChunkIndex, { prefetchNext: false });
      }, 100);
    }
  }

  // Get from IndexedDB
  private async getFromIndexedDB(chunkId: string): Promise<VocabularyChunk | null> {
    await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(chunkId);

      request.onsuccess = () => {
        const data = request.result;
        resolve(data ? data.chunk : null);
      };

      request.onerror = () => resolve(null);
    });
  }

  // Save to IndexedDB
  private async saveToIndexedDB(chunkId: string, chunk: VocabularyChunk): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const data = {
        id: chunkId,
        lessonId: chunk.lessonId,
        chunk,
        timestamp: Date.now()
      };
      
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Observe element for lazy loading
  observeElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  // Unobserve element
  unobserveElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  // Load full lesson (all chunks)
  async loadFullLesson(lessonId: string): Promise<any[]> {
    const allWords: any[] = [];
    let chunkIndex = 0;
    let hasMore = true;
    
    while (hasMore) {
      const chunk = await this.loadChunk(lessonId, chunkIndex);
      allWords.push(...chunk.words);
      
      chunkIndex++;
      hasMore = chunkIndex < chunk.totalChunks;
    }
    
    return allWords;
  }

  // Clear cache for a specific lesson
  async clearLessonCache(lessonId: string): Promise<void> {
    // Clear memory cache
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.startsWith(lessonId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    // Clear IndexedDB cache
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('lessonId');
      const request = index.openCursor(IDBKeyRange.only(lessonId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => resolve();
    });
  }

  // Clear all cache
  async clearAllCache(): Promise<void> {
    this.memoryCache.clear();
    
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cache statistics
  getCacheStats(): {
    memoryCacheSize: number;
    loadingCount: number;
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      loadingCount: this.loadingPromises.size
    };
  }

  // Cleanup
  dispose(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.memoryCache.clear();
    this.loadingPromises.clear();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const lazyVocabularyLoader = new LazyVocabularyLoader();

// Export convenience functions
export async function loadVocabularyChunk(
  lessonId: string,
  chunkIndex: number = 0,
  options?: Partial<LoaderOptions>
): Promise<VocabularyChunk> {
  return lazyVocabularyLoader.loadChunk(lessonId, chunkIndex, options);
}

export async function loadFullVocabularyLesson(lessonId: string): Promise<any[]> {
  return lazyVocabularyLoader.loadFullLesson(lessonId);
}