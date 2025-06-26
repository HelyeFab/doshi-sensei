// Text-to-Speech utility using Google Cloud Text-to-Speech API
export class TTSManager {
  private static apiKey: string | null = null;
  private static isInitialized = false;

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
   * Speak Japanese text using Google Cloud TTS via server-side API
   */
  static async speak(text: string, voice: 'male' | 'female' = 'female'): Promise<void> {

    try {
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

        // Convert base64 to audio and play
        const audioData = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioData);

        // Return a promise that resolves when audio finishes playing
        return new Promise<void>((resolve, reject) => {
          audio.addEventListener('loadstart', () => {
          });

          audio.addEventListener('ended', () => {
            resolve();
          });

          audio.addEventListener('error', (e) => {
            console.error('❌ Audio playback error:', e);
            reject(new Error('Audio playback failed'));
          });

          audio.play().catch(reject);
        });
      } else {
        // Server indicated we should fallback or there was an error
        const errorMsg = data.error || 'Unknown error';
        console.warn(`⚠️ Google TTS failed: ${errorMsg}`);

        if (data.fallback) {
          await this.fallbackToWebSpeech(text);
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ TTS API call failed:', error);
      // Fallback to browser TTS
      await this.fallbackToWebSpeech(text);
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
   * Stop any ongoing speech
   */
  static stop(): void {
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
