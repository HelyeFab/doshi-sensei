// Firebase Storage-based TTS Cache Manager
// Caches full article audio in Firebase Storage to minimize API calls

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import crypto from 'crypto';

interface CachedArticleAudio {
  articleId: string;
  audioUrl: string;
  contentHash: string;
  voice: string;
  provider: 'elevenlabs' | 'google';
  createdAt: number;
  fileSize: number;
}

class FirebaseTTSCache {
  private static instance: FirebaseTTSCache;
  private readonly CACHE_FOLDER = 'tts-cache';
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  private constructor() {}

  static getInstance(): FirebaseTTSCache {
    if (!FirebaseTTSCache.instance) {
      FirebaseTTSCache.instance = new FirebaseTTSCache();
    }
    return FirebaseTTSCache.instance;
  }

  /**
   * Generate a unique cache key for an article
   */
  private generateCacheKey(
    articleId: string,
    content: string,
    voice: string,
    provider: string
  ): string {
    // Create a hash of the content to detect changes
    const contentHash = this.generateContentHash(content);
    return `${articleId}_${contentHash}_${voice}_${provider}`;
  }

  /**
   * Generate a hash of the content
   */
  private generateContentHash(content: string): string {
    if (typeof window !== 'undefined') {
      // Client-side: Use a simple hash function
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    } else {
      // Server-side: Use crypto
      return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    }
  }

  /**
   * Get the storage path for a cached audio file
   */
  private getStoragePath(cacheKey: string): string {
    return `${this.CACHE_FOLDER}/${cacheKey}.mp3`;
  }

  /**
   * Check if audio exists in cache and return URL if available
   */
  async getCachedAudioUrl(
    articleId: string,
    content: string,
    voice: string,
    provider: 'elevenlabs' | 'google'
  ): Promise<string | null> {
    if (!storage) {
      console.warn('[Firebase TTS Cache] Storage not initialized');
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(articleId, content, voice, provider);
      const storagePath = this.getStoragePath(cacheKey);
      const storageRef = ref(storage, storagePath);

      // Try to get metadata first to check if file exists
      const metadata = await getMetadata(storageRef);
      
      // Check if cache has expired
      const createdAt = new Date(metadata.timeCreated).getTime();
      if (Date.now() - createdAt > this.CACHE_DURATION) {
        console.log(`[Firebase TTS Cache] Cache expired for article ${articleId}`);
        await deleteObject(storageRef);
        return null;
      }

      // Get download URL
      const url = await getDownloadURL(storageRef);
      console.log(`[Firebase TTS Cache] Cache hit for article ${articleId}`);
      return url;
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.log(`[Firebase TTS Cache] Cache miss for article ${articleId}`);
      } else {
        console.error('[Firebase TTS Cache] Error checking cache:', error);
      }
      return null;
    }
  }

  /**
   * Cache audio data in Firebase Storage
   */
  async cacheAudio(
    articleId: string,
    content: string,
    voice: string,
    provider: 'elevenlabs' | 'google',
    audioData: Blob
  ): Promise<string> {
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }

    try {
      const cacheKey = this.generateCacheKey(articleId, content, voice, provider);
      const storagePath = this.getStoragePath(cacheKey);
      const storageRef = ref(storage, storagePath);

      // Upload audio file
      const metadata = {
        contentType: 'audio/mpeg',
        customMetadata: {
          articleId,
          voice,
          provider,
          contentHash: this.generateContentHash(content),
          createdAt: Date.now().toString()
        }
      };

      await uploadBytes(storageRef, audioData, metadata);
      
      // Get the download URL
      const url = await getDownloadURL(storageRef);
      
      console.log(`[Firebase TTS Cache] Cached audio for article ${articleId} (${this.formatBytes(audioData.size)})`);
      
      return url;
    } catch (error) {
      console.error('[Firebase TTS Cache] Error caching audio:', error);
      throw error;
    }
  }

  /**
   * Delete cached audio for a specific article
   */
  async deleteCachedAudio(
    articleId: string,
    content: string,
    voice: string,
    provider: 'elevenlabs' | 'google'
  ): Promise<void> {
    if (!storage) {
      console.warn('[Firebase TTS Cache] Storage not initialized');
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(articleId, content, voice, provider);
      const storagePath = this.getStoragePath(cacheKey);
      const storageRef = ref(storage, storagePath);

      await deleteObject(storageRef);
      console.log(`[Firebase TTS Cache] Deleted cache for article ${articleId}`);
    } catch (error: any) {
      if (error.code !== 'storage/object-not-found') {
        console.error('[Firebase TTS Cache] Error deleting cache:', error);
      }
    }
  }

  /**
   * Clear all cached audio files older than specified days
   */
  async clearOldCache(daysOld: number = 30): Promise<void> {
    if (!storage) {
      console.warn('[Firebase TTS Cache] Storage not initialized');
      return;
    }

    try {
      const folderRef = ref(storage, this.CACHE_FOLDER);
      const result = await listAll(folderRef);
      
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const itemRef of result.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const createdAt = new Date(metadata.timeCreated).getTime();
          
          if (createdAt < cutoffTime) {
            await deleteObject(itemRef);
            deletedCount++;
          }
        } catch (error) {
          console.error(`[Firebase TTS Cache] Error processing file ${itemRef.name}:`, error);
        }
      }

      console.log(`[Firebase TTS Cache] Deleted ${deletedCount} old cache files`);
    } catch (error) {
      console.error('[Firebase TTS Cache] Error clearing old cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
  }> {
    if (!storage) {
      return { totalFiles: 0, totalSize: 0, totalSizeFormatted: '0 Bytes' };
    }

    try {
      const folderRef = ref(storage, this.CACHE_FOLDER);
      const result = await listAll(folderRef);
      
      let totalSize = 0;
      
      for (const itemRef of result.items) {
        try {
          const metadata = await getMetadata(itemRef);
          totalSize += metadata.size || 0;
        } catch (error) {
          console.error(`[Firebase TTS Cache] Error getting metadata for ${itemRef.name}:`, error);
        }
      }

      return {
        totalFiles: result.items.length,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize)
      };
    } catch (error) {
      console.error('[Firebase TTS Cache] Error getting cache stats:', error);
      return { totalFiles: 0, totalSize: 0, totalSizeFormatted: '0 Bytes' };
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default FirebaseTTSCache;