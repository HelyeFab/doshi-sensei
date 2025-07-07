// Enhanced Audio Caching System
// Provides in-memory and localStorage caching for TTS audio

interface CachedAudio {
  audioUrl: string;
  timestamp: number;
  voice: 'male' | 'female';
  provider: 'elevenlabs' | 'google';
  size: number;
  contentHash: string;
}

interface CacheMetrics {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  oldestItem: number;
  newestItem: number;
}

class AudioCacheManager {
  private memoryCache = new Map<string, CachedAudio>();
  private readonly STORAGE_KEY = 'doshi_audio_cache';
  private readonly MAX_MEMORY_CACHE_SIZE = 50; // Maximum items in memory
  private readonly MAX_STORAGE_SIZE = 100 * 1024 * 1024; // 100MB max storage
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private hits = 0;
  private misses = 0;

  constructor() {
    this.loadFromStorage();
    this.setupCleanupInterval();
  }

  /**
   * Generate cache key from article and audio settings
   */
  private generateKey(
    articleId: string, 
    voice: 'male' | 'female', 
    provider: 'elevenlabs' | 'google',
    contentHash?: string
  ): string {
    const hash = contentHash || this.hashContent(articleId);
    return `${articleId}-${voice}-${provider}-${hash}`;
  }

  /**
   * Simple hash function for content
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Estimate blob URL size (approximation)
   */
  private async estimateAudioSize(audioUrl: string): Promise<number> {
    try {
      if (audioUrl.startsWith('blob:')) {
        // For blob URLs, we'll estimate based on typical TTS audio sizes
        return 50000; // ~50KB average estimate
      } else {
        // For regular URLs, try to get actual size
        const response = await fetch(audioUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength) : 50000;
      }
    } catch {
      return 50000; // Default estimate
    }
  }

  /**
   * Get cached audio
   */
  async get(
    articleId: string,
    voice: 'male' | 'female',
    provider: 'elevenlabs' | 'google',
    contentHash?: string
  ): Promise<string | null> {
    const key = this.generateKey(articleId, voice, provider, contentHash);
    
    // Check memory cache first
    let cached = this.memoryCache.get(key);
    
    // If not in memory, check localStorage
    if (!cached) {
      cached = this.loadFromStorageByKey(key);
      if (cached) {
        // Move to memory cache
        this.memoryCache.set(key, cached);
      }
    }

    if (cached) {
      // Check if expired
      if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
        this.delete(key);
        this.misses++;
        return null;
      }

      // Verify audio URL is still valid
      try {
        const audio = new Audio(cached.audioUrl);
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timeout')), 3000);
          audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeoutId);
            resolve();
          });
          audio.addEventListener('error', () => {
            clearTimeout(timeoutId);
            reject(new Error('Audio invalid'));
          });
        });

        this.hits++;
        console.log(`✅ Audio cache hit for ${articleId} (${voice}, ${provider})`);
        return cached.audioUrl;
      } catch {
        // Audio URL is invalid, remove from cache
        this.delete(key);
        this.misses++;
        return null;
      }
    }

    this.misses++;
    return null;
  }

  /**
   * Set cached audio
   */
  async set(
    articleId: string,
    audioUrl: string,
    voice: 'male' | 'female',
    provider: 'elevenlabs' | 'google',
    content?: string
  ): Promise<void> {
    const contentHash = content ? this.hashContent(content) : undefined;
    const key = this.generateKey(articleId, voice, provider, contentHash);
    const size = await this.estimateAudioSize(audioUrl);

    const cached: CachedAudio = {
      audioUrl,
      timestamp: Date.now(),
      voice,
      provider,
      size,
      contentHash: contentHash || this.hashContent(articleId)
    };

    // Add to memory cache
    this.memoryCache.set(key, cached);

    // Cleanup memory if needed
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      this.cleanupMemoryCache();
    }

    // Save to localStorage
    this.saveToStorage();

    console.log(`💾 Cached audio for ${articleId} (${voice}, ${provider})`);
  }

  /**
   * Delete cached audio
   */
  private delete(key: string): void {
    const cached = this.memoryCache.get(key);
    
    if (cached && cached.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cached.audioUrl);
    }
    
    this.memoryCache.delete(key);
    this.saveToStorage();
  }

  /**
   * Clear all cached audio for an article
   */
  clearArticle(articleId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, cached] of this.memoryCache.entries()) {
      if (key.startsWith(articleId)) {
        if (cached.audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(cached.audioUrl);
        }
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
    this.saveToStorage();
    
    console.log(`🗑️ Cleared cache for article ${articleId}`);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    // Revoke all blob URLs
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cached.audioUrl);
      }
    }

    this.memoryCache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    this.hits = 0;
    this.misses = 0;
    
    console.log('🗑️ Cleared all audio cache');
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const timestamps = Array.from(this.memoryCache.values()).map(c => c.timestamp);
    const totalSize = Array.from(this.memoryCache.values()).reduce((sum, c) => sum + c.size, 0);
    
    return {
      totalItems: this.memoryCache.size,
      totalSize,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Preload audio for an article
   */
  async preload(
    articleId: string,
    content: string,
    voice: 'male' | 'female' = 'male',
    provider: 'elevenlabs' | 'google' = 'elevenlabs'
  ): Promise<void> {
    // Check if already cached
    const cached = await this.get(articleId, voice, provider, this.hashContent(content));
    if (cached) {
      console.log(`✅ Audio already cached for ${articleId}`);
      return;
    }

    try {
      // Make API request to generate and cache audio
      const response = await fetch('/api/tts/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          content,
          voice,
          provider,
          preload: true
        })
      });

      const data = await response.json();
      
      if (response.ok && data.audioUrl) {
        await this.set(articleId, data.audioUrl, voice, provider, content);
        console.log(`✅ Preloaded audio for ${articleId}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to preload audio for ${articleId}:`, error);
    }
  }

  /**
   * Cleanup memory cache by removing oldest items
   */
  private cleanupMemoryCache(): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const removeCount = entries.length - this.MAX_MEMORY_CACHE_SIZE + 10; // Remove extra for buffer
    
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      const [key, cached] = entries[i];
      if (cached.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cached.audioUrl);
      }
      this.memoryCache.delete(key);
    }
    
    console.log(`🧹 Cleaned up ${removeCount} items from memory cache`);
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        
        for (const [key, cached] of Object.entries(data)) {
          if (now - (cached as CachedAudio).timestamp < this.CACHE_EXPIRY) {
            this.memoryCache.set(key, cached as CachedAudio);
          }
        }
        
        console.log(`📱 Loaded ${this.memoryCache.size} items from storage cache`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load audio cache from storage:', error);
    }
  }

  /**
   * Load specific item from localStorage
   */
  private loadFromStorageByKey(key: string): CachedAudio | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data[key] || null;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.memoryCache.entries());
      const serialized = JSON.stringify(data);
      
      // Check size limit
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        // Remove oldest items and try again
        this.cleanupMemoryCache();
        const newData = Object.fromEntries(this.memoryCache.entries());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newData));
      } else {
        localStorage.setItem(this.STORAGE_KEY, serialized);
      }
    } catch (error) {
      console.warn('⚠️ Failed to save audio cache to storage:', error);
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanupInterval(): void {
    // Cleanup every 30 minutes
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      for (const [key, cached] of this.memoryCache.entries()) {
        if (now - cached.timestamp > this.CACHE_EXPIRY) {
          if (cached.audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(cached.audioUrl);
          }
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.memoryCache.delete(key));
      
      if (keysToDelete.length > 0) {
        this.saveToStorage();
        console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache items`);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
}

// Create singleton instance
const audioCacheManager = new AudioCacheManager();

export default audioCacheManager;