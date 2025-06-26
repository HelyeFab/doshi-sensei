// Text-to-Speech utility using Google Cloud Text-to-Speech API with caching
import TTSCache from './ttsCache';
export class TTSManager {
  private static apiKey: string | null = null;
  private static isInitialized = false;
  private static cache = TTSCache.getInstance();
  private static currentAudio: HTMLAudioElement | null = null;

  /**
   * Initialize TTS with Google Cloud API key
   */
  static initialize(apiKey?: string): void {
    if (apiKey) {
      this.apiKey = apiKey;
    } else {
      // Safely try to get from environment or local storage
      let envKey: string | undefined;
      try {
        envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY : undefined;
      } catch (e) {
        envKey = undefined;
      }

      this.apiKey = envKey ||
                   (typeof window !== 'undefined' ? localStorage.getItem('google_tts_api_key') : null);
    }
    this.isInitialized = true;
    if (this.apiKey) {
    } else {
    }
  }

  /**
   * Set API key and store in localStorage for persistence
   */
  static setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_tts_api_key', apiKey);
    }
    this.isInitialized = true;
  }

  /**
   * Check if TTS is available
   */
  static isAvailable(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  /**
   * Test if the API key is valid by making a simple request
   */
  static async testApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      console.error('❌ No API key found');
      return false;
    }

    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: 'test' },
          voice: { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B', ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3' }
        })
      });

      if (response.ok) {
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ API key test failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ API key test error:', error);
      return false;
    }
  }

  /**
   * Speak Japanese text using Google Cloud TTS via server-side API with caching
   */
  static async speak(text: string, voice: 'male' | 'female' = 'female', speed: number = 1.0): Promise<void> {
    try {
      const voiceName = voice === 'male' ? 'ja-JP-Neural2-C' : 'ja-JP-Neural2-B';
      
      // Try to get cached audio first
      const cachedAudio = await this.cache.getAudio(
        text, 
        voiceName, 
        speed,
        undefined,
        undefined,
        () => this.generateAudio(text, voice)
      );

      if (cachedAudio) {
        // Stop any currently playing audio
        this.stop();
        
        // Play cached audio
        const audio = new Audio(URL.createObjectURL(cachedAudio));
        audio.playbackRate = speed;
        
        // Store reference to current audio
        this.currentAudio = audio;

        return new Promise<void>((resolve, reject) => {
          audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audio.src); // Clean up blob URL
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            resolve();
          });

          audio.addEventListener('error', (e) => {
            console.error('❌ Audio playback error:', e);
            URL.revokeObjectURL(audio.src);
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            reject(new Error('Audio playback failed'));
          });

          // Small delay to prevent syllable cutoff
          setTimeout(() => {
            audio.play().catch(reject);
          }, 100);
        });
      } else {
        throw new Error('Failed to generate or retrieve audio');
      }
    } catch (error) {
      console.error('❌ TTS speak error:', error);
      // Fallback to browser TTS if available
      await this.fallbackToWebSpeech(text, speed);
    }
  }

  /**
   * Generate audio via API (used by cache system)
   */
  private static async generateAudio(text: string, voice: 'male' | 'female' = 'female'): Promise<Blob> {
    const startTime = performance.now();

    // Use server-side API route to avoid CORS issues
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice
      })
    });

    const data = await response.json();
    const apiTime = performance.now() - startTime;

    if (response.ok && data.success && data.audioContent) {
      // Convert base64 to blob
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`🎤 Audio generated in ${apiTime.toFixed(2)}ms for: ${text.substring(0, 30)}...`);
      return new Blob([bytes], { type: 'audio/mp3' });
    } else {
      // Server indicated we should fallback or there was an error
      const errorMsg = data.error || 'Unknown error';
      console.warn(`⚠️ Google TTS failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  /**
   * Fallback to Web Speech API (browser built-in TTS)
   */
  private static fallbackToWebSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a Japanese voice
        const voices = speechSynthesis.getVoices();
        const japaneseVoice = voices.find(voice =>
          voice.lang.startsWith('ja') || voice.lang.includes('JP')
        );

        if (japaneseVoice) {
          utterance.voice = japaneseVoice;
        }

        // Handle speech events
        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ Web Speech TTS error:', event.error);
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };

        speechSynthesis.speak(utterance);
      } else {
        console.warn('Speech synthesis not supported in this browser');
        reject(new Error('Speech synthesis not supported'));
      }
    });
  }

  /**
   * Check if audio is currently playing
   */
  static isPlaying(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) {
      return true;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return speechSynthesis.speaking;
    }
    return false;
  }

  /**
   * Stop any ongoing speech
   */
  static stop(): void {
    // Stop HTML audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      // Clean up blob URL if exists
      if (this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }
      this.currentAudio = null;
    }
    
    // Also stop Web Speech API if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Get available voices for Japanese
   */
  static getJapaneseVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      return voices.filter(voice =>
        voice.lang.startsWith('ja') || voice.lang.includes('JP')
      );
    }
    return [];
  }

  /**
   * Preload audio for an entire article (for better UX)
   */
  static async preloadArticleAudio(
    articleId: string,
    sentences: string[],
    voice: 'male' | 'female' = 'female',
    speed: number = 1.0,
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const voiceName = voice === 'male' ? 'ja-JP-Neural2-C' : 'ja-JP-Neural2-B';
    
    await this.cache.preloadArticleAudio(
      articleId,
      sentences,
      voiceName,
      speed,
      (text) => this.generateAudio(text, voice),
      onProgress
    );
  }

  /**
   * Get cached audio for an article
   */
  static async getArticleAudio(articleId: string) {
    return await this.cache.getArticleAudio(articleId);
  }

  /**
   * Remove cached audio for an article
   */
  static async removeArticleAudio(articleId: string): Promise<void> {
    await this.cache.removeArticleAudio(articleId);
  }

  /**
   * Get TTS cache statistics
   */
  static async getCacheStats() {
    return await this.cache.getStats();
  }

  /**
   * Clear TTS cache
   */
  static async clearCache(): Promise<void> {
    await this.cache.clearCache();
  }

  /**
   * Add fallback method for Web Speech API
   */
  private static async fallbackToWebSpeech(text: string, speed: number = 1.0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = speed * 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a Japanese voice
        const voices = speechSynthesis.getVoices();
        const japaneseVoice = voices.find(voice =>
          voice.lang.startsWith('ja') || voice.lang.includes('JP')
        );

        if (japaneseVoice) {
          utterance.voice = japaneseVoice;
        }

        // Handle speech events
        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ Web Speech TTS error:', event.error);
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };

        // Start speaking
        speechSynthesis.speak(utterance);
      } else {
        reject(new Error('Speech synthesis not supported'));
      }
    });
  }
}

// Initialize on import
if (typeof window !== 'undefined') {
  // Initialize when voices are loaded
  speechSynthesis.addEventListener('voiceschanged', () => {
    TTSManager.initialize();
  });

  // Initialize immediately if voices are already available
  TTSManager.initialize();
}

export default TTSManager;
