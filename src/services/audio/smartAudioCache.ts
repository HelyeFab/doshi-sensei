// Smart Audio Cache Service with Fallback Chain
// Implements: Cached Audio → Local TTS (Web Speech API) → Network TTS (Google/ElevenLabs)

import { TTSManager } from '@/utils/tts';

interface AudioCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  accessCount: number;
  size: number;
}

interface UserProgress {
  currentLesson: number;
  completedLessons: number[];
  textbook: string;
}

class SmartAudioCacheService {
  private readonly CACHE_NAME = 'audio-cache-v1';
  private readonly DB_NAME = 'AudioCacheDB';
  private readonly STORE_NAME = 'audioBlobs';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit
  private readonly LESSONS_TO_PREFETCH = 3; // Next 2-3 lessons
  private db: IDBDatabase | null = null;
  private memoryCache = new Map<string, AudioCacheEntry>();
  private prefetchQueue = new Set<string>();
  private isPrefetching = false;

  constructor() {
    this.initDB();
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
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('accessCount', 'accessCount', { unique: false });
        }
      };
    });
  }

  // Generate cache key for audio
  private getCacheKey(text: string, voice: string = 'default'): string {
    // Create a consistent key for caching
    return `audio_${voice}_${this.hashCode(text)}`;
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Main audio playback method with fallback chain
  async playAudio(
    text: string,
    options: {
      voice?: string;
      provider?: 'google' | 'elevenlabs' | 'local';
      context?: 'vocabulary' | 'sentence';
      forceNetwork?: boolean;
    } = {}
  ): Promise<void> {
    const cacheKey = this.getCacheKey(text, options.voice);
    
    // Step 1: Try cached audio (unless forceNetwork)
    if (!options.forceNetwork) {
      const cachedAudio = await this.getCachedAudio(cacheKey);
      if (cachedAudio) {
        await this.playCachedAudio(cachedAudio);
        this.updateAccessCount(cacheKey);
        return;
      }
    }

    // Step 2: Try local TTS (Web Speech API) for short text
    if (text.length < 50 && this.supportsWebSpeechAPI()) {
      try {
        await this.playLocalTTS(text);
        return;
      } catch (error) {

      }
    }

    // Step 3: Use network TTS with caching
    try {
      const audioBlob = await this.fetchAndCacheAudio(text, options);
      if (audioBlob) {
        await this.playBlob(audioBlob);
      }
    } catch (error) {
      console.error('All audio playback methods failed:', error);
      // Final fallback: use TTSManager directly
      await TTSManager.speak(text, options);
    }
  }

  // Get cached audio from IndexedDB or memory
  private async getCachedAudio(cacheKey: string): Promise<AudioCacheEntry | null> {
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    // Check IndexedDB
    await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          // Add to memory cache for faster access
          this.memoryCache.set(cacheKey, entry);
        }
        resolve(entry || null);
      };

      request.onerror = () => resolve(null);
    });
  }

  // Play cached audio blob
  private async playCachedAudio(entry: AudioCacheEntry): Promise<void> {
    await this.playBlob(entry.blob);
  }

  // Play audio blob
  private async playBlob(blob: Blob): Promise<void> {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      audio.play().catch(reject);
    });
  }

  // Check if Web Speech API is supported
  private supportsWebSpeechAPI(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  // Play using local TTS (Web Speech API)
  private async playLocalTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.supportsWebSpeechAPI()) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      
      // Find Japanese voice
      const voices = speechSynthesis.getVoices();
      const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
      if (japaneseVoice) {
        utterance.voice = japaneseVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);
      
      speechSynthesis.speak(utterance);
    });
  }

  // Fetch audio from network and cache it
  private async fetchAndCacheAudio(
    text: string,
    options: any
  ): Promise<Blob | null> {
    try {
      // Use TTSManager to get audio URL
      const audioUrl = await this.getAudioUrl(text, options);
      if (!audioUrl) return null;

      // Fetch audio blob
      const response = await fetch(audioUrl);
      const blob = await response.blob();

      // Cache the audio
      const cacheKey = this.getCacheKey(text, options.voice);
      await this.cacheAudio(cacheKey, blob);

      return blob;
    } catch (error) {
      console.error('Failed to fetch and cache audio:', error);
      return null;
    }
  }

  // Get audio URL from TTS service
  private async getAudioUrl(text: string, options: any): Promise<string | null> {
    // This would integrate with your existing TTS system
    // For now, returning null to use TTSManager fallback
    return null;
  }

  // Cache audio blob
  private async cacheAudio(url: string, blob: Blob): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const entry: AudioCacheEntry = {
      url,
      blob,
      timestamp: Date.now(),
      accessCount: 1,
      size: blob.size
    };

    // Check cache size before adding
    await this.evictIfNeeded(blob.size);

    // Add to both memory and IndexedDB
    this.memoryCache.set(url, entry);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Update access count for cache entry
  private async updateAccessCount(url: string): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          entry.accessCount++;
          entry.timestamp = Date.now();
          store.put(entry);
        }
        resolve();
      };

      request.onerror = () => resolve();
    });
  }

  // Evict old entries if cache is too large
  private async evictIfNeeded(newSize: number): Promise<void> {
    const currentSize = await this.getCacheSize();
    
    if (currentSize + newSize > this.MAX_CACHE_SIZE) {
      await this.evictLRU(newSize);
    }
  }

  // Get total cache size
  private async getCacheSize(): Promise<number> {
    await this.initDB();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      let totalSize = 0;
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          totalSize += cursor.value.size;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };

      request.onerror = () => resolve(0);
    });
  }

  // Evict least recently used entries
  private async evictLRU(neededSpace: number): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();
      let freedSpace = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && freedSpace < neededSpace) {
          const entry = cursor.value;
          freedSpace += entry.size;
          
          // Remove from memory cache
          this.memoryCache.delete(entry.url);
          
          // Remove from IndexedDB
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => resolve();
    });
  }

  // Prefetch audio for upcoming lessons
  async prefetchLessonAudio(
    userProgress: UserProgress,
    vocabulary: any[]
  ): Promise<void> {
    if (this.isPrefetching) return;
    this.isPrefetching = true;

    const lessonsToFetch = this.getLessonsToFetch(userProgress);
    
    // Filter vocabulary for target lessons
    const targetVocabulary = vocabulary.filter(item => 
      lessonsToFetch.includes(item.lesson)
    );

    // Queue audio for prefetching
    for (const item of targetVocabulary) {
      if (item.kana) {
        this.prefetchQueue.add(item.kana);
      }
      if (item.kanji) {
        this.prefetchQueue.add(item.kanji);
      }
    }

    // Process queue in background
    this.processPrefetchQueue();
    this.isPrefetching = false;
  }

  // Get lessons to prefetch based on user progress
  private getLessonsToFetch(progress: UserProgress): number[] {
    const lessons: number[] = [];
    const currentLesson = progress.currentLesson;
    
    for (let i = 0; i < this.LESSONS_TO_PREFETCH; i++) {
      const lessonNum = currentLesson + i;
      if (!progress.completedLessons.includes(lessonNum)) {
        lessons.push(lessonNum);
      }
    }
    
    return lessons;
  }

  // Process prefetch queue in background
  private async processPrefetchQueue(): Promise<void> {
    const queue = Array.from(this.prefetchQueue);
    this.prefetchQueue.clear();

    // Process in batches to avoid blocking
    const batchSize = 5;
    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(text => 
          this.fetchAndCacheAudio(text, { 
            voice: 'female', 
            provider: 'google',
            context: 'vocabulary'
          }).catch(err => console.warn('Prefetch failed:', err))
        )
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Clear all cached audio
  async clearCache(): Promise<void> {
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
  async getCacheStats(): Promise<{
    totalSize: number;
    entryCount: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    const size = await this.getCacheSize();
    const count = this.memoryCache.size;
    
    let oldest = Date.now();
    let newest = 0;
    
    this.memoryCache.forEach(entry => {
      if (entry.timestamp < oldest) oldest = entry.timestamp;
      if (entry.timestamp > newest) newest = entry.timestamp;
    });
    
    return {
      totalSize: size,
      entryCount: count,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }
}

// Export singleton instance
export const smartAudioCache = new SmartAudioCacheService();

// Export convenience function
export async function playSmartAudio(
  text: string,
  options?: any
): Promise<void> {
  return smartAudioCache.playAudio(text, options);
}