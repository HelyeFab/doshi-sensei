// Article TTS Manager with Firebase Storage caching
// Handles full article audio generation and caching

import FirebaseTTSCache from './ttsFirebaseCache';

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

      // Add timeout for long requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const response = await fetch('/api/tts/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          content,
          voice,
          provider
        }),
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
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  ArticleTTSManager.initialize();
}

export default ArticleTTSManager;