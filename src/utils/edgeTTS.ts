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

      return japaneseVoices;
    } catch (error) {
      console.error('❌ Failed to get Japanese voices:', error);
      return [];
    }
  }

  /**
   * Speak Japanese text using Edge TTS (Server-Side)
   */
  static async speak(text: string, voiceName?: string): Promise<void> {
    try {
      const startTime = performance.now();

      // Use default high-quality Japanese voice if none specified
      const selectedVoice = voiceName || 'ja-JP-NanamiNeural'; // High-quality female Japanese voice

      // Call our server-side Edge TTS API
      const response = await fetch('/api/edge-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: selectedVoice
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(`Server-side Edge TTS failed: ${errorData.error || 'Unknown error'}`);
      }

      // Get audio blob from server response
      const audioBlob = await response.blob();
      const apiTime = performance.now() - startTime;


      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadstart', () => {
        });

        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl); // Clean up
          resolve();
        });

        audio.addEventListener('error', (e) => {
          console.error('❌ Server-side Edge TTS audio playback error:', e);
          URL.revokeObjectURL(audioUrl); // Clean up
          reject(new Error('Server-side Edge TTS audio playback failed'));
        });

        audio.play().catch(reject);
      });

    } catch (error) {
      console.error('❌ Server-side Edge TTS speak failed:', error);
      throw error;
    }
  }

  /**
   * Check if Edge TTS is available and working (Server-Side)
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // For server-side Edge TTS, we just need to check if our API endpoint is available
      // This is much simpler and more reliable than browser-based checks

      // Quick test call to our API
      const response = await fetch('/api/edge-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'テスト', // Simple test text
          voice: 'ja-JP-NanamiNeural'
        })
      });

      const available = response.ok;
      return available;
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
  }

  /**
   * Test Edge TTS with a simple phrase
   */
  static async test(): Promise<boolean> {
    try {
      await this.speak('こんにちは');
      return true;
    } catch (error) {
      console.error('❌ Edge TTS test failed:', error);
      return false;
    }
  }
}

export default EdgeTTSManager;
