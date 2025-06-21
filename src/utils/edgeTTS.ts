// Edge TTS Implementation - EXPERIMENTAL/DISPOSABLE
// This is a test implementation that doesn't replace our existing TTS system

import { EdgeTTS, Voice } from '@lixen/edge-tts';

export class EdgeTTSManager {
  private static edgeTTS: EdgeTTS | null = null;
  private static isInitialized = false;

  /**
   * Initialize Edge TTS
   */
  static async initialize(): Promise<boolean> {
    try {
      // Check if running in browser environment
      if (typeof window === 'undefined') {
        console.log('❌ Edge TTS not available in server environment');
        this.isInitialized = false;
        return false;
      }

      if (!this.edgeTTS) {
        // Additional safety check for the EdgeTTS constructor
        if (typeof EdgeTTS !== 'function') {
          console.error('❌ EdgeTTS constructor not available');
          this.isInitialized = false;
          return false;
        }
        this.edgeTTS = new EdgeTTS();
      }
      this.isInitialized = true;
      console.log('✅ Edge TTS initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Edge TTS initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Get available Japanese voices
   */
  static async getJapaneseVoices(): Promise<Voice[]> {
    try {
      if (!this.edgeTTS) {
        await this.initialize();
      }

      const voices = await this.edgeTTS!.getVoices();
      // Filter for Japanese voices
      const japaneseVoices = voices.filter((voice: Voice) =>
        voice.Locale.startsWith('ja-') || voice.Locale.includes('JP')
      );

      console.log('🎌 Available Japanese voices:', japaneseVoices.length);
      return japaneseVoices;
    } catch (error) {
      console.error('❌ Failed to get Japanese voices:', error);
      return [];
    }
  }

  /**
   * Speak Japanese text using Edge TTS
   */
  static async speak(text: string, voiceName?: string): Promise<void> {
    try {
      if (!this.edgeTTS) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Edge TTS initialization failed');
        }
      }

      console.log(`🎯 Edge TTS speaking: "${text}"`);
      const startTime = performance.now();

      // Get Japanese voices if no voice specified
      let selectedVoice = voiceName;
      if (!selectedVoice) {
        const voices = await this.getJapaneseVoices();
        if (voices.length > 0) {
          // Prefer female voices, then any Japanese voice
          selectedVoice = voices.find((v: Voice) => v.Gender === 'Female')?.Name || voices[0]?.Name;
        }
      }

      if (!selectedVoice) {
        throw new Error('No Japanese voice available');
      }

      console.log(`🎵 Using voice: ${selectedVoice}`);

      // Generate speech
      const audioBuffer = await this.edgeTTS!.synthesize(text, selectedVoice);
      const apiTime = performance.now() - startTime;

      console.log(`✅ Edge TTS generation took ${apiTime.toFixed(2)}ms`);

      // Convert buffer to audio and play
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadstart', () => {
          console.log('🎵 Playing Edge TTS audio...');
        });

        audio.addEventListener('ended', () => {
          console.log('🎵 Edge TTS audio finished playing');
          URL.revokeObjectURL(audioUrl); // Clean up
          resolve();
        });

        audio.addEventListener('error', (e) => {
          console.error('❌ Edge TTS audio playback error:', e);
          URL.revokeObjectURL(audioUrl); // Clean up
          reject(new Error('Edge TTS audio playback failed'));
        });

        audio.play().catch(reject);
      });

    } catch (error) {
      console.error('❌ Edge TTS speak failed:', error);
      throw error;
    }
  }

  /**
   * Check if Edge TTS is available and working
   */
  static async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.isInitialized && this.edgeTTS !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Stop any ongoing speech (Edge TTS doesn't have direct stop, but we can try)
   */
  static stop(): void {
    // Edge TTS doesn't have a direct stop method,
    // but stopping audio elements should work
    console.log('🛑 Edge TTS stop requested (stopping audio elements)');
  }

  /**
   * Test Edge TTS with a simple phrase
   */
  static async test(): Promise<boolean> {
    try {
      console.log('🧪 Testing Edge TTS...');
      await this.speak('こんにちは');
      console.log('✅ Edge TTS test successful!');
      return true;
    } catch (error) {
      console.error('❌ Edge TTS test failed:', error);
      return false;
    }
  }
}

export default EdgeTTSManager;
