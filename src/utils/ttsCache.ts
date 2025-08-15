// TTS Cache Manager
// Caches text-to-speech audio data to reduce API calls and costs

interface CacheEntry {
  text: string;
  voice: string;
  provider: 'elevenlabs' | 'google';
  audioData: ArrayBuffer;
  timestamp: number;
  expiresAt: number;
}

class TTSCacheManager {
  private static instance: TTSCacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;

  private constructor() {
    // Only initialize cache on client side
    if (typeof window !== 'undefined') {
      // Load cache from localStorage if available
      this.loadFromLocalStorage();
      
      // Clean up expired entries on initialization
      this.cleanupExpiredEntries();
    }
  }

  static getInstance(): TTSCacheManager {
    if (!TTSCacheManager.instance) {
      TTSCacheManager.instance = new TTSCacheManager();
    }
    return TTSCacheManager.instance;
  }

  // Generate a unique cache key
  private generateCacheKey(text: string, voice: string, provider: string): string {
    return `${provider}_${voice}_${text}`.toLowerCase();
  }

  // Get cached audio if available
  async getCachedAudio(
    text: string, 
    voice: string, 
    provider: 'elevenlabs' | 'google'
  ): Promise<ArrayBuffer | null> {
    const key = this.generateCacheKey(text, voice, provider);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`[TTS Cache] Miss for: "${text.substring(0, 50)}..."`);
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      console.log(`[TTS Cache] Expired entry for: "${text.substring(0, 50)}..."`);
      this.cache.delete(key);
      this.updateCacheSize();
      return null;
    }

    console.log(`[TTS Cache] Hit for: "${text.substring(0, 50)}..." (${this.formatBytes(entry.audioData.byteLength)})`);
    return entry.audioData;
  }

  // Cache audio data
  async cacheAudio(
    text: string,
    voice: string,
    provider: 'elevenlabs' | 'google',
    audioData: ArrayBuffer
  ): Promise<void> {
    const key = this.generateCacheKey(text, voice, provider);
    const audioSize = audioData.byteLength;

    // Check if adding this would exceed cache size limit
    if (this.currentCacheSize + audioSize > this.MAX_CACHE_SIZE) {

      this.cleanupOldEntries(audioSize);
    }

    const entry: CacheEntry = {
      text,
      voice,
      provider,
      audioData,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    };

    this.cache.set(key, entry);
    this.updateCacheSize();
    
    console.log(`[TTS Cache] Cached: "${text.substring(0, 50)}..." (${this.formatBytes(audioSize)})`);
    
    // Save to localStorage (for persistence)
    this.saveToLocalStorage();
  }

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {

      this.updateCacheSize();
    }
  }

  // Clean up old entries to make space
  private cleanupOldEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    let removedCount = 0;

    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      freedSpace += entry.audioData.byteLength;
      this.cache.delete(key);
      removedCount++;
    }

    console.log(`[TTS Cache] Removed ${removedCount} old entries to free ${this.formatBytes(freedSpace)}`);
    this.updateCacheSize();
  }

  // Update current cache size
  private updateCacheSize(): void {
    this.currentCacheSize = 0;
    for (const entry of this.cache.values()) {
      this.currentCacheSize += entry.audioData.byteLength;
    }
  }

  // Get cache statistics
  getStats(): {
    entries: number;
    size: number;
    sizeFormatted: string;
    maxSize: number;
    maxSizeFormatted: string;
    utilization: number;
  } {
    return {
      entries: this.cache.size,
      size: this.currentCacheSize,
      sizeFormatted: this.formatBytes(this.currentCacheSize),
      maxSize: this.MAX_CACHE_SIZE,
      maxSizeFormatted: this.formatBytes(this.MAX_CACHE_SIZE),
      utilization: (this.currentCacheSize / this.MAX_CACHE_SIZE) * 100
    };
  }

  // Clear entire cache
  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tts_cache_index');
      
      // Clear individual cache entries from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tts_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

  }

  // Format bytes to human readable
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Save cache index to localStorage
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Save index of cache keys
      const index = Array.from(this.cache.keys());
      localStorage.setItem('tts_cache_index', JSON.stringify(index));
      
      // Note: We can't easily store ArrayBuffers in localStorage
      // For a production app, you'd want to use IndexedDB instead

    } catch (error) {
      console.error('[TTS Cache] Failed to save to localStorage:', error);
    }
  }

  // Load cache from localStorage
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const indexStr = localStorage.getItem('tts_cache_index');
      if (!indexStr) return;

      const index = JSON.parse(indexStr);

      // Note: In a real implementation, you'd load the actual audio data
      // from IndexedDB or another persistent storage
    } catch (error) {
      console.error('[TTS Cache] Failed to load from localStorage:', error);
    }
  }
}

export default TTSCacheManager;