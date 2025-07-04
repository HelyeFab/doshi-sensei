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
    console.log('🔧 TTS Manager Debugging:');
    console.log('  - process.env available:', typeof process !== 'undefined');
    console.log('  - NEXT_PUBLIC_GOOGLE_TTS_API_KEY:', process?.env?.NEXT_PUBLIC_GOOGLE_TTS_API_KEY ? 'found' : 'not found');
    console.log('  - localStorage key:', typeof window !== 'undefined' ? localStorage.getItem('google_tts_api_key') ? 'found' : 'not found' : 'N/A');
    console.log('  - Final API key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'null');
    console.log('TTS Manager initialized with key:', !!this.apiKey);
    if (this.apiKey) {
      console.log('✅ API key loaded successfully');
    } else {
      console.log('❌ No API key found. Please set NEXT_PUBLIC_GOOGLE_TTS_API_KEY in .env.local');
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
      console.log('🧪 Testing Google TTS API key...');
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
        console.log('✅ API key is valid!');
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
    console.log(`🎯 Attempting Google TTS for: "${text}" with voice: ${voice}`);

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
        console.log(`✅ Google TTS successful! API call took ${apiTime.toFixed(2)}ms`);

        // Convert base64 to audio and play
        const audioData = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioData);

        audio.addEventListener('loadstart', () => {
          console.log('🎵 Playing Google TTS audio...');
        });

        audio.addEventListener('ended', () => {
          console.log('🎵 Google TTS audio finished playing');
        });

        await audio.play();
      } else {
        // Server indicated we should fallback or there was an error
        const errorMsg = data.error || 'Unknown error';
        console.warn(`⚠️ Google TTS failed: ${errorMsg}`);

        if (data.fallback) {
          console.log('🔄 Falling back to browser TTS as requested by server...');
          this.fallbackToWebSpeech(text);
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ TTS API call failed:', error);
      console.log('🔄 Falling back to browser TTS...');
      // Fallback to browser TTS
      this.fallbackToWebSpeech(text);
    }
  }

  /**
   * Fallback to Web Speech API (browser built-in TTS)
   */
  private static fallbackToWebSpeech(text: string): void {
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

      speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
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
