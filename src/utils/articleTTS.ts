// Article TTS Manager with Firebase Storage caching
// Handles full article audio generation and caching

import FirebaseTTSCache from './ttsFirebaseCache';
import { AudioCache, AudioResource } from '@/lib/cache/audioCache';
import { auth } from '@/lib/firebase';
import { subscriptionManager } from '@/lib/subscriptions/manager';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';

export interface ArticleAudioOptions {
  voice?: 'male' | 'female';
  provider?: 'elevenlabs' | 'google';
  onProgress?: (status: string) => void;
}

export class ArticleTTSManager {
  private static cache = FirebaseTTSCache.getInstance();
  private static currentAudio: HTMLAudioElement | null = null;
  private static isInitialized = false;

  /**
   * Initialize the TTS manager
   */
  static initialize(): void {
    if (this.isInitialized) return;
    
    // Check for API keys
    const hasElevenLabs = !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    const hasGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
    
    if (!hasElevenLabs && !hasGoogle) {
      console.warn('⚠️ No TTS API keys found. Article audio generation will not be available.');
    } else {
      console.log('✅ Article TTS Manager initialized');
      if (hasElevenLabs) console.log('  - ElevenLabs: Available');
      if (hasGoogle) console.log('  - Google TTS: Available');
    }
    
    this.isInitialized = true;
  }

  /**
   * Get or generate audio for an article
   */
  static async getArticleAudio(
    articleId: string,
    content: string,
    options: ArticleAudioOptions = {}
  ): Promise<string> {
    const { 
      voice = 'male', 
      provider = 'elevenlabs',
      onProgress 
    } = options;

    try {
      // Update progress
      onProgress?.('Preparing audio...');
      console.log(`🎤 Requesting audio for article ${articleId}`);

      // Generate a unique cache key for this audio
      const cacheKey = `article-${articleId}-${voice}-${provider}`;
      
      // Check client-side cache first
      try {
        const cachedAudio = await AudioCache.getAudio(
          cacheKey,
          undefined, // No fetch function yet
          undefined  // No user type needed for retrieval
        );

        if (cachedAudio && cachedAudio.audioUrl) {
          console.log(`✅ Serving article audio from client-side cache: ${articleId}`);
          onProgress?.('Loading cached audio...');
          
          // If we have a blob URL from cache, return it
          if (cachedAudio.audioUrl.startsWith('blob:')) {
            return cachedAudio.audioUrl;
          }
          
          // Otherwise try to get the cached blob
          const cached = await EnhancedStorageManager2.getCachedResource('audio', cacheKey);
          if (cached && cached.assets?.audio?.get('main')) {
            const blob = cached.assets.audio.get('main');
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              return blobUrl;
            }
          }
        }
      } catch (cacheError) {
        console.log(`⚠️ Cache check failed: ${cacheError}`);
        // Continue without cache
      }

      // Add timeout for long requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const requestBody = {
        articleId,
        content,
        voice,
        provider
      };
      
      console.log('[ArticleTTSManager] Sending request:', {
        articleId: requestBody.articleId,
        hasContent: !!requestBody.content,
        contentLength: requestBody.content?.length || 0,
        contentPreview: requestBody.content ? requestBody.content.substring(0, 100) + '...' : 'NO CONTENT',
        voice: requestBody.voice,
        provider: requestBody.provider
      });
      
      const response = await fetch('/api/tts/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audio');
      }

      if (data.cached) {
        onProgress?.('Loading cached audio...');
      }

      if (data.audioUrl) {
        onProgress?.('Audio ready!');
        
        // Don't cache Firebase Storage URLs directly since AudioCache needs to download the blob
        // The URL will work fine for playback, and Firebase Storage acts as our cache
        console.log(`📦 Using Firebase Storage cached audio: ${data.audioUrl}`);
        
        return data.audioUrl;
      } else if (data.audioContent) {
        // Fallback: convert base64 to blob URL
        onProgress?.('Processing audio...');
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        
        onProgress?.('Audio ready!');
        
        // Cache the actual audio blob for future use
        await this.cacheArticleAudioBlob(cacheKey, blob, content, voice, provider);
        
        return blobUrl;
      } else {
        throw new Error('No audio data received');
      }
    } catch (error) {
      console.error('❌ Article TTS error:', error);
      onProgress?.('Error generating audio');
      throw error;
    }
  }

  /**
   * Play article audio
   */
  static async playArticle(
    articleId: string,
    content: string,
    options: ArticleAudioOptions = {}
  ): Promise<HTMLAudioElement> {
    try {
      // Stop any currently playing audio
      this.stop();

      // Get audio URL
      const audioUrl = await this.getArticleAudio(articleId, content, options);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      // Play the audio
      await audio.play();
      
      return audio;
    } catch (error) {
      console.error('❌ Failed to play article audio:', error);
      throw error;
    }
  }

  /**
   * Stop any currently playing audio
   */
  static stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      
      // Clean up blob URL if it exists
      if (this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      
      this.currentAudio = null;
    }
  }

  /**
   * Pause current audio
   */
  static pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  /**
   * Resume current audio
   */
  static resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play();
    }
  }

  /**
   * Check if audio is currently playing
   */
  static isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  /**
   * Get current audio element
   */
  static getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  /**
   * Preload audio for an article (generates and caches without playing)
   */
  static async preloadArticleAudio(
    articleId: string,
    content: string,
    options: ArticleAudioOptions = {}
  ): Promise<void> {
    try {
      await this.getArticleAudio(articleId, content, options);
      console.log(`✅ Preloaded audio for article ${articleId}`);
    } catch (error) {
      console.error(`❌ Failed to preload audio for article ${articleId}:`, error);
    }
  }

  /**
   * Clear cached audio for an article
   */
  static async clearArticleCache(
    articleId: string,
    content: string,
    voice: 'male' | 'female' = 'male',
    provider: 'elevenlabs' | 'google' = 'elevenlabs'
  ): Promise<void> {
    try {
      await this.cache.deleteCachedAudio(articleId, content, voice, provider);
      console.log(`✅ Cleared cache for article ${articleId}`);
    } catch (error) {
      console.error(`❌ Failed to clear cache for article ${articleId}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    return await this.cache.getCacheStats();
  }

  /**
   * Clear old cache files
   */
  static async clearOldCache(daysOld: number = 30): Promise<void> {
    await this.cache.clearOldCache(daysOld);
  }

  /**
   * Cache article audio blob directly to client-side storage
   */
  private static async cacheArticleAudioBlob(
    cacheKey: string,
    audioBlob: Blob,
    content: string,
    voice: 'male' | 'female',
    provider: 'elevenlabs' | 'google'
  ): Promise<void> {
    try {
      // Get current user type for storage limits
      const user = auth.currentUser;
      const userType = user ? 'free' : 'guest';
      
      // Create a temporary blob URL for the AudioResource
      const blobUrl = URL.createObjectURL(audioBlob);
      
      // Create cached resource directly with the blob
      const cachedResource = {
        id: cacheKey,
        type: 'audio' as const,
        data: {
          id: cacheKey,
          type: 'sentence' as const,
          audioUrl: blobUrl,
          text: content.substring(0, 100),
          meaning: `Article audio - ${voice} voice, ${provider}`,
          version: '1.0'
        },
        metadata: {
          size: audioBlob.size,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          version: '1.0',
          checksum: await EnhancedStorageManager2.generateChecksum({
            id: cacheKey,
            content: content.substring(0, 100)
          }),
          expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000) // 60 days
        },
        assets: {
          images: new Map(),
          audio: new Map([['main', audioBlob]])
        }
      };
      
      // Store in cache
      await EnhancedStorageManager2.cacheResource(cachedResource, userType);
      
      // Clean up the temporary blob URL
      URL.revokeObjectURL(blobUrl);
      
      console.log(`✅ Cached article audio blob to client storage: ${cacheKey} (${(audioBlob.size / 1024 / 1024).toFixed(2)}MB)`);
    } catch (error) {
      // Don't throw, just log - caching failure shouldn't break playback
      console.error(`⚠️ Failed to cache article audio blob: ${cacheKey}`, error);
    }
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  ArticleTTSManager.initialize();
}

export default ArticleTTSManager;