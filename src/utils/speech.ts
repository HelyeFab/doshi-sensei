import TTSManager from './tts';

/**
 * Speak Japanese text using the TTS system
 * @param text The Japanese text to speak
 * @param voice Voice preference ('male' | 'female')
 * @returns Promise that resolves when speech starts
 */
export async function speakJapanese(
  text: string, 
  voice: 'male' | 'female' = 'female'
): Promise<void> {
  try {
    // Initialize TTS if needed
    if (!TTSManager.isAvailable()) {
      try {
        TTSManager.initialize();
      } catch (initError) {

        return;
      }
    }
    
    // Clean the text (remove HTML tags if any)
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    
    if (!cleanText) {
      return;
    }
    
    // Speak the text with voice option
    await TTSManager.speak(cleanText, { voice, provider: 'elevenlabs' });
  } catch (error) {
    console.error('Error speaking Japanese:', error);
    // Fail silently - TTS is not critical
  }
}

/**
 * Stop any currently playing speech
 */
export function stopSpeech(): void {
  TTSManager.stop();
}