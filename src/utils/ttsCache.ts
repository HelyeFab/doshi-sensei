/**
 * TTS Audio caching system for fast playback and reduced API calls
 */

import CacheManager from './cacheManager';

export interface CachedAudio {
  id: string;
  articleId: string;
  sentenceIndex: number;
  text: string;
  audioBlob: Blob;
  voice: string;
  speed: number;
  timestamp: number;
  duration?: number;
  size: number;
}

export interface TTSCacheStats {
  totalAudioFiles: number;
  totalSize: number;
  hitRate: number;
  avgGenerationTime: number;
  storageByArticle: Record<string, number>;
}

export class TTSCache {
  private static instance: TTSCache;
  private cacheManager: CacheManager;
  private generationTimes = new Map<string, number[]>();
  private hitStats = { hits: 0, misses: 0 };
  private activeRequests = new Map<string, Promise<Blob | null>>();

  private constructor() {
    this.cacheManager = CacheManager.getInstance({
      maxSize: 100 * 1024 * 1024, // 100MB for audio
      defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxEntries: 2000
    });
  }

  static getInstance(): TTSCache {
    if (!TTSCache.instance) {
      TTSCache.instance = new TTSCache();
    }
    return TTSCache.instance;
  }

  /**
   * Generate cache key for audio
   */
  private generateCacheKey(text: string, voice: string, speed: number): string {
    // Create a simple hash of the text + voice + speed
    const content = `${text}_${voice}_${speed}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `tts_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get audio from cache or generate new
   */
  async getAudio(
    text: string, 
    voice: string = 'ja-JP-Standard-A', 
    speed: number = 1.0,
    articleId?: string,
    sentenceIndex?: number,
    generateFn?: () => Promise<Blob>
  ): Promise<Blob | null> {
    const cacheKey = this.generateCacheKey(text, voice, speed);
    const startTime = Date.now();

    try {
      // Check if already being generated
      if (this.activeRequests.has(cacheKey)) {
        console.log(`⏳ Audio generation in progress for: ${text.substring(0, 30)}...`);
        return await this.activeRequests.get(cacheKey)!;
      }

      // Try memory cache first
      let audioBlob = this.cacheManager.getMemory<Blob>(cacheKey);
      
      if (audioBlob) {
        this.recordHit(cacheKey, Date.now() - startTime);
        console.log(`🔊 Audio loaded from memory cache: ${text.substring(0, 30)}...`);
        return audioBlob;
      }

      // Try IndexedDB cache
      const cachedAudio = await this.cacheManager.getDB<CachedAudio>('audio', cacheKey);
      
      if (cachedAudio?.audioBlob) {
        // Also store in memory for faster subsequent access
        this.cacheManager.setMemory(cacheKey, cachedAudio.audioBlob);
        this.recordHit(cacheKey, Date.now() - startTime);
        console.log(`🔊 Audio loaded from IndexedDB cache: ${text.substring(0, 30)}...`);
        return cachedAudio.audioBlob;
      }

      // Cache miss - generate new audio if function provided
      if (generateFn) {
        console.log(`🎤 Generating new audio: ${text.substring(0, 30)}...`);
        
        // Add to active requests to prevent duplicate generation
        const generationPromise = this.generateAndCache(
          cacheKey, text, voice, speed, articleId, sentenceIndex, generateFn
        );
        
        this.activeRequests.set(cacheKey, generationPromise);
        
        try {
          const result = await generationPromise;
          this.recordMiss(cacheKey, Date.now() - startTime);
          return result;
        } finally {
          this.activeRequests.delete(cacheKey);
        }
      }

      this.recordMiss(cacheKey, Date.now() - startTime);
      return null;
      
    } catch (error) {
      console.error(`Error getting audio for text: ${text.substring(0, 30)}...`, error);
      this.activeRequests.delete(cacheKey);
      this.recordMiss(cacheKey, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Generate and cache new audio
   */
  private async generateAndCache(
    cacheKey: string,
    text: string,
    voice: string,
    speed: number,
    articleId?: string,
    sentenceIndex?: number,
    generateFn?: () => Promise<Blob>
  ): Promise<Blob | null> {
    try {
      if (!generateFn) return null;
      
      const audioBlob = await generateFn();
      
      if (audioBlob) {
        await this.setAudio(cacheKey, {
          id: cacheKey,
          articleId: articleId || 'unknown',
          sentenceIndex: sentenceIndex || 0,
          text,
          audioBlob,
          voice,
          speed,
          timestamp: Date.now(),
          size: audioBlob.size
        });
        
        console.log(`✅ Audio generated and cached: ${text.substring(0, 30)}...`);
        return audioBlob;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating audio:', error);
      return null;
    }
  }

  /**
   * Store audio in cache
   */
  async setAudio(cacheKey: string, audioData: CachedAudio): Promise<void> {
    try {
      // Store in both memory and IndexedDB
      this.cacheManager.setMemory(cacheKey, audioData.audioBlob);
      await this.cacheManager.setDB('audio', cacheKey, audioData);
      
      console.log(`💾 Audio cached: ${audioData.text.substring(0, 30)}...`);
    } catch (error) {
      console.error(`Error caching audio:`, error);
    }
  }

  /**
   * Preload audio for an entire article
   */
  async preloadArticleAudio(
    articleId: string,
    sentences: string[],
    voice: string = 'ja-JP-Standard-A',
    speed: number = 1.0,
    generateFn: (text: string) => Promise<Blob>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    console.log(`🔄 Preloading audio for article ${articleId} (${sentences.length} sentences)...`);
    
    let completed = 0;
    const total = sentences.length;

    // Process in batches to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      
      const promises = batch.map(async (sentence, batchIndex) => {
        const sentenceIndex = i + batchIndex;
        try {
          await this.getAudio(
            sentence, 
            voice, 
            speed, 
            articleId, 
            sentenceIndex,
            () => generateFn(sentence)
          );
          completed++;
          onProgress?.(completed, total);
        } catch (error) {
          console.error(`Error preloading sentence ${sentenceIndex}:`, error);
          completed++;
          onProgress?.(completed, total);
        }
      });

      await Promise.allSettled(promises);
      
      // Small delay between batches to prevent overwhelming the API
      if (i + batchSize < sentences.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Audio preloading completed for article ${articleId}`);
  }

  /**
   * Get all cached audio for an article
   */
  async getArticleAudio(articleId: string): Promise<CachedAudio[]> {
    try {
      if (!this.cacheManager.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.cacheManager.db!.transaction(['audio'], 'readonly');
        const store = transaction.objectStore('audio');
        const index = store.index('articleId');
        const request = index.getAll(articleId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
      });
    } catch (error) {
      console.error(`Error getting article audio for ${articleId}:`, error);
      return [];
    }
  }

  /**
   * Remove all audio for an article
   */
  async removeArticleAudio(articleId: string): Promise<void> {
    try {
      const cachedAudio = await this.getArticleAudio(articleId);
      
      for (const audio of cachedAudio) {
        const cacheKey = this.generateCacheKey(audio.text, audio.voice, audio.speed);
        this.cacheManager.memoryCache?.delete(cacheKey);
        await this.cacheManager.deleteDB('audio', audio.id);
      }
      
      console.log(`🗑️ Audio removed for article ${articleId}`);
    } catch (error) {
      console.error(`Error removing article audio for ${articleId}:`, error);
    }
  }

  /**
   * Clear all TTS cache
   */
  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      for (const key of this.cacheManager.memoryCache?.keys() || []) {
        if (key.startsWith('tts_')) {
          this.cacheManager.memoryCache?.delete(key);
        }
      }

      // Clear IndexedDB
      if (this.cacheManager.db) {
        const transaction = this.cacheManager.db.transaction(['audio'], 'readwrite');
        const store = transaction.objectStore('audio');
        await store.clear();
      }

      this.generationTimes.clear();
      this.hitStats = { hits: 0, misses: 0 };
      this.activeRequests.clear();
      
      console.log('🧹 TTS cache cleared');
    } catch (error) {
      console.error('Error clearing TTS cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<TTSCacheStats> {
    const stats = await this.cacheManager.getCacheStats();
    const totalRequests = this.hitStats.hits + this.hitStats.misses;
    
    const allGenerationTimes = Array.from(this.generationTimes.values()).flat();
    const avgGenerationTime = allGenerationTimes.length > 0 
      ? allGenerationTimes.reduce((sum, time) => sum + time, 0) / allGenerationTimes.length 
      : 0;

    // Get storage by article
    const storageByArticle: Record<string, number> = {};
    try {
      if (this.cacheManager.db) {
        const transaction = this.cacheManager.db.transaction(['audio'], 'readonly');
        const store = transaction.objectStore('audio');
        const request = store.openCursor();
        
        await new Promise<void>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const audio = cursor.value as CachedAudio;
              storageByArticle[audio.articleId] = (storageByArticle[audio.articleId] || 0) + audio.size;
              cursor.continue();
            } else {
              resolve();
            }
          };
        });
      }
    } catch (error) {
      console.error('Error calculating storage by article:', error);
    }

    return {
      totalAudioFiles: stats.db.entries,
      totalSize: stats.memory.size + stats.db.size,
      hitRate: totalRequests > 0 ? this.hitStats.hits / totalRequests : 0,
      avgGenerationTime,
      storageByArticle
    };
  }

  private recordHit(cacheKey: string, loadTime: number): void {
    this.hitStats.hits++;
    this.recordGenerationTime(cacheKey, loadTime);
  }

  private recordMiss(cacheKey: string, loadTime: number): void {
    this.hitStats.misses++;
    this.recordGenerationTime(cacheKey, loadTime);
  }

  private recordGenerationTime(cacheKey: string, time: number): void {
    if (!this.generationTimes.has(cacheKey)) {
      this.generationTimes.set(cacheKey, []);
    }
    const times = this.generationTimes.get(cacheKey)!;
    times.push(time);
    
    // Keep only last 5 generation times per cache key
    if (times.length > 5) {
      times.shift();
    }
  }
}

export default TTSCache;