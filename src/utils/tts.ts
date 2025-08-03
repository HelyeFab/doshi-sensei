// Text-to-Speech utility with Google Cloud TTS as primary and ElevenLabs as fallback
import TTSCache from './ttsCache';
import { getKanaAudioPath, playKanaAudio, playKanaAudioWithRetry } from './kanaAudioLoader';
import { getKanjiAudioPath, playKanjiAudio, playKanjiAudioWithRetry } from './kanjiAudioLoader';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  description?: string;
  preview_url?: string;
}

interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}
export class TTSManager {
  private static googleApiKey: string | null = null;
  private static elevenLabsApiKey: string | null = null;
  private static isInitialized = false;
  private static _cache: TTSCache | null = null;
  private static currentAudio: HTMLAudioElement | null = null;
  
  private static get cache(): TTSCache {
    if (!this._cache) {
      this._cache = TTSCache.getInstance();
    }
    return this._cache;
  }
  
  // ElevenLabs configuration
  private static elevenLabsBaseUrl = 'https://api.elevenlabs.io/v1';
  private static elevenLabsVoices = {
    female: 'RBnMinrYKeccY3vaUxlZ', // Japanese female voice
    male: 'Mv8AjrYZCBkdsmDHNwcB'     // Japanese male voice
  };

  /**
   * Initialize TTS with API keys for both providers
   */
  static initialize(googleApiKey?: string, elevenLabsApiKey?: string): void {
    // Initialize Google API key
    if (googleApiKey) {
      this.googleApiKey = googleApiKey;
    } else {
      let envKey: string | undefined;
      try {
        envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY : undefined;
      } catch (e) {
        envKey = undefined;
      }
      this.googleApiKey = envKey ||
                         (typeof window !== 'undefined' ? localStorage.getItem('google_tts_api_key') : null);
    }
    
    // Initialize ElevenLabs API key
    if (elevenLabsApiKey) {
      this.elevenLabsApiKey = elevenLabsApiKey;
    } else {
      let envKey: string | undefined;
      try {
        envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY : undefined;
      } catch (e) {
        envKey = undefined;
      }
      this.elevenLabsApiKey = envKey ||
                             (typeof window !== 'undefined' ? localStorage.getItem('elevenlabs_api_key') : null);
    }
    
    this.isInitialized = true;
    
    if (this.googleApiKey) {
      console.log('✅ Google TTS initialized (primary provider)');
    }
    if (this.elevenLabsApiKey) {
      console.log('✅ ElevenLabs TTS initialized (fallback provider)');
    }
    if (!this.elevenLabsApiKey && !this.googleApiKey) {
      console.warn('⚠️ No TTS API keys found');
    }
  }

  /**
   * Set API keys and store in localStorage for persistence
   */
  static setApiKey(apiKey: string, provider: 'google' | 'elevenlabs' = 'google'): void {
    if (provider === 'google') {
      this.googleApiKey = apiKey;
      if (typeof window !== 'undefined') {
        localStorage.setItem('google_tts_api_key', apiKey);
      }
    } else {
      this.elevenLabsApiKey = apiKey;
      if (typeof window !== 'undefined') {
        localStorage.setItem('elevenlabs_api_key', apiKey);
      }
    }
    this.isInitialized = true;
  }

  /**
   * Check if TTS is available
   */
  static isAvailable(): boolean {
    return this.isInitialized && (!!this.elevenLabsApiKey || !!this.googleApiKey);
  }

  /**
   * Test if the API keys are valid
   */
  static async testApiKey(provider: 'google' | 'elevenlabs' | 'all' = 'all'): Promise<boolean> {
    const results: { google?: boolean; elevenlabs?: boolean } = {};
    
    // Test ElevenLabs
    if ((provider === 'elevenlabs' || provider === 'all') && this.elevenLabsApiKey) {
      try {
        const response = await fetch(`${this.elevenLabsBaseUrl}/user`, {
          headers: {
            'xi-api-key': this.elevenLabsApiKey,
          },
        });
        results.elevenlabs = response.ok;
        if (response.ok) {
          console.log('✅ ElevenLabs API key is valid');
        } else {
          console.error('❌ ElevenLabs API key test failed:', response.status);
        }
      } catch (error) {
        console.error('❌ ElevenLabs API key test error:', error);
        results.elevenlabs = false;
      }
    }
    
    // Test Google
    if ((provider === 'google' || provider === 'all') && this.googleApiKey) {
      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.googleApiKey}`, {
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
        results.google = response.ok;
        if (response.ok) {
          console.log('✅ Google TTS API key is valid');
        } else {
          console.error('❌ Google TTS API key test failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Google TTS API key test error:', error);
        results.google = false;
      }
    }
    
    if (provider === 'all') {
      return results.elevenlabs === true || results.google === true;
    }
    return provider === 'elevenlabs' ? results.elevenlabs === true : results.google === true;
  }

  /**
   * Speak text using Google TTS as primary, ElevenLabs as secondary fallback, and Web Speech as final fallback
   */
  static async speak(
    text: string, 
    voiceOrOptions?: 'male' | 'female' | { voice?: 'male' | 'female'; provider?: 'google' | 'elevenlabs'; speed?: number; context?: string },
    speed: number = 1.0
  ): Promise<void> {
    try {
      // Stop any currently playing audio
      this.stop();
      
      // Parse options
      let voice: 'male' | 'female' = 'male'; // Default to male voice
      let forceProvider: 'google' | 'elevenlabs' | undefined;
      let playbackSpeed = speed;
      let context: string | undefined;
      
      if (typeof voiceOrOptions === 'string') {
        voice = voiceOrOptions;
      } else if (voiceOrOptions && typeof voiceOrOptions === 'object') {
        voice = voiceOrOptions.voice || 'male'; // Default to male voice
        forceProvider = voiceOrOptions.provider;
        playbackSpeed = voiceOrOptions.speed || 1.0;
        context = voiceOrOptions.context;
      }
      
      // Check if we have local kana audio for single character
      const kanaAudioPath = await getKanaAudioPath(text);
      if (kanaAudioPath) {
        try {
          console.log(`🎵 [TTS] Found local kana audio for: "${text}"`);
          await playKanaAudioWithRetry(kanaAudioPath, 2); // Allow 2 retries
          console.log(`✅ [TTS] Successfully played local kana audio: "${text}"`);
          return;
        } catch (error) {
          console.warn(`⚠️ [TTS] Local kana audio failed for "${text}", using TTS API:`, error);
          // Continue to TTS API fallback
        }
      }
      
      // Check if we have local kanji audio for single character
      if (text.length === 1) {
        const kanjiAudioPath = await getKanjiAudioPath(text);
        if (kanjiAudioPath) {
          try {
            console.log(`🎌 [TTS] Using LOCAL kanji audio instead of API for: "${text}"`);
            console.log(`📁 [TTS] Audio file path: ${kanjiAudioPath}`);
            await playKanjiAudioWithRetry(kanjiAudioPath, 2); // Use retry mechanism
            console.log(`✅ [TTS] Successfully played local kanji audio: "${text}"`);
            return;
          } catch (error) {
            console.warn(`⚠️ [TTS] Failed to play local kanji audio for "${text}", falling back to TTS API:`, error);
            // Continue to TTS API fallback
          }
        } else {
          console.log(`📡 [TTS] No local kanji audio for "${text}", will use API`);
        }
      }
      
      // Determine provider based on context if not forced
      if (!forceProvider && context) {
        // Use Google TTS for kana, kanji, vocabulary, and games
        if (context.includes('kanji') || context === 'vocabulary' || context.includes('game') || context === 'kana') {
          forceProvider = 'google';
          console.log(`🎯 Using Google TTS for context: ${context}`);
        }
        // Use ElevenLabs for articles, stories, and shadowing
        else if (context === 'article-reading' || context === 'story' || context === 'shadowing') {
          forceProvider = 'elevenlabs';
          console.log(`🎯 Using ElevenLabs TTS for context: ${context}`);
        }
      }
      
      let audioBlob: Blob | null = null;
      let provider: 'elevenlabs' | 'google' | 'webspeech' = 'google';
      
      // If provider is forced to ElevenLabs, skip Google
      if (forceProvider === 'elevenlabs' && this.elevenLabsApiKey) {
        try {
          console.log('🎤 Using forced ElevenLabs TTS...');
          audioBlob = await this.generateElevenLabsAudio(text, voice);
          provider = 'elevenlabs';
        } catch (elevenLabsError) {
          console.warn('⚠️ ElevenLabs TTS failed:', elevenLabsError);
        }
      }
      // Try Google TTS first if available and not forced to ElevenLabs
      else if (this.googleApiKey && forceProvider !== 'elevenlabs') {
        try {
          console.log('🎤 Attempting Google TTS (primary)...');
          audioBlob = await this.generateGoogleAudio(text, voice);
          provider = 'google';
        } catch (googleError) {
          console.warn('⚠️ Google TTS failed, falling back to ElevenLabs:', googleError);
        }
      }
      
      // Fallback to ElevenLabs if Google failed or unavailable
      if (!audioBlob && this.elevenLabsApiKey) {
        try {
          console.log('🎤 Attempting ElevenLabs TTS (fallback)...');
          audioBlob = await this.generateElevenLabsAudio(text, voice);
          provider = 'elevenlabs';
        } catch (elevenLabsError) {
          console.warn('⚠️ ElevenLabs TTS failed, falling back to Web Speech:', elevenLabsError);
        }
      }
      
      // If we have audio from either provider, play it
      if (audioBlob) {
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.playbackRate = playbackSpeed;
        
        // Store reference to current audio
        this.currentAudio = audio;

        return new Promise<void>((resolve, reject) => {
          audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audio.src);
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            console.log(`✅ Successfully played audio via ${provider}`);
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
        // Final fallback to Web Speech API
        console.log('🎤 Using Web Speech API as final fallback...');
        await this.fallbackToWebSpeech(text, playbackSpeed);
      }
    } catch (error) {
      console.error('❌ TTS speak error:', error);
      // Last resort: try Web Speech API
      await this.fallbackToWebSpeech(text, playbackSpeed);
    }
  }

  /**
   * Generate audio using ElevenLabs API
   */
  private static async generateElevenLabsAudio(text: string, voice: 'male' | 'female' = 'male'): Promise<Blob> {
    const startTime = performance.now();
    const voiceId = this.elevenLabsVoices[voice];
    
    // Check cache first
    const cachedAudio = await this.cache.getCachedAudio(text, voiceId, 'elevenlabs');
    if (cachedAudio) {
      console.log(`📦 Using cached ElevenLabs audio for: ${text.substring(0, 30)}...`);
      return new Blob([cachedAudio], { type: 'audio/mpeg' });
    }
    
    // Use server-side API route to avoid CORS issues
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        provider: 'elevenlabs'
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
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      
      // Cache the audio for future use
      await this.cache.cacheAudio(text, voiceId, 'elevenlabs', bytes.buffer);
      
      console.log(`🎤 ElevenLabs audio generated in ${apiTime.toFixed(2)}ms for: ${text.substring(0, 30)}...`);
      return audioBlob;
    } else {
      throw new Error(data.error || 'ElevenLabs TTS failed');
    }
  }

  /**
   * Generate audio using Google TTS API
   */
  private static async generateGoogleAudio(text: string, voice: 'male' | 'female' = 'male'): Promise<Blob> {
    const startTime = performance.now();
    const voiceName = voice === 'male' ? 'ja-JP-Neural2-C' : 'ja-JP-Neural2-B';
    
    // Check cache first
    const cachedAudio = await this.cache.getCachedAudio(text, voiceName, 'google');
    if (cachedAudio) {
      console.log(`📦 Using cached Google TTS audio for: ${text.substring(0, 30)}...`);
      return new Blob([cachedAudio], { type: 'audio/mp3' });
    }

    // Use server-side API route to avoid CORS issues
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        provider: 'google'
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
      
      const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
      
      // Cache the audio for future use
      await this.cache.cacheAudio(text, voiceName, 'google', bytes.buffer);
      
      console.log(`🎤 Google TTS audio generated in ${apiTime.toFixed(2)}ms for: ${text.substring(0, 30)}...`);
      return audioBlob;
    } else {
      throw new Error(data.error || 'Google TTS failed');
    }
  }

  /**
   * Fallback to Web Speech API (browser built-in TTS)
   */
  private static fallbackToWebSpeech(text: string, speed: number = 1.0): Promise<void> {
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
   * Get available ElevenLabs voices
   */
  static async getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.elevenLabsApiKey) {
      console.warn('ElevenLabs API key not found');
      return [];
    }

    try {
      const response = await fetch(`${this.elevenLabsBaseUrl}/voices`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      return [];
    }
  }

  /**
   * Get available voices for Japanese (Web Speech API)
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
   * Get ElevenLabs usage/quota information
   */
  static async getElevenLabsUsage(): Promise<any> {
    if (!this.elevenLabsApiKey) {
      console.warn('ElevenLabs API key not found');
      return null;
    }

    try {
      const response = await fetch(`${this.elevenLabsBaseUrl}/user`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('ElevenLabs Usage:', {
        character_count: data.subscription.character_count,
        character_limit: data.subscription.character_limit,
        remaining: data.subscription.character_limit - data.subscription.character_count,
      });
      return data;
    } catch (error) {
      console.error('Error fetching ElevenLabs usage:', error);
      return null;
    }
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
    // Try to use ElevenLabs first, fallback to Google
    const provider = this.elevenLabsApiKey ? 'elevenlabs' : 'google';
    const voiceName = provider === 'elevenlabs' 
      ? this.elevenLabsVoices[voice]
      : (voice === 'male' ? 'ja-JP-Neural2-C' : 'ja-JP-Neural2-B');
    
    console.log(`📦 Preloading article audio using ${provider}...`);
    
    let completed = 0;
    for (const sentence of sentences) {
      try {
        if (provider === 'elevenlabs') {
          await this.generateElevenLabsAudio(sentence, voice);
        } else {
          await this.generateGoogleAudio(sentence, voice);
        }
      } catch (error) {
        console.warn(`Failed to preload audio for sentence: ${sentence.substring(0, 30)}...`, error);
      }
      completed++;
      if (onProgress) {
        onProgress(completed, sentences.length);
      }
    }
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
}

// Initialize on import
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Initialize when voices are loaded
  speechSynthesis.addEventListener('voiceschanged', () => {
    TTSManager.initialize();
  });

  // Initialize immediately if voices are already available
  TTSManager.initialize();
}

export default TTSManager;
