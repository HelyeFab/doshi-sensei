/**
 * Global TTS hook with caching for use throughout the app
 * Provides consistent TTS functionality with automatic caching
 */

import { useState, useCallback } from 'react';
import TTSManager from '@/utils/tts';

export interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentText?: string;
}

export interface TTSHookReturn {
  state: TTSState;
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  clearError: () => void;
  getCacheStats: () => Promise<any>;
  clearCache: () => Promise<void>;
  // Convenience properties for backwards compatibility
  isPlaying: boolean;
  isCacheLoading: boolean;
  speakSentence: (text: string, options?: TTSOptions) => Promise<void>;
}

export interface TTSOptions {
  voice?: 'male' | 'female';
  speed?: number;
  priority?: 'low' | 'normal' | 'high';
  context?: string; // For analytics/logging (e.g., 'vocabulary', 'kanji', 'article', 'game')
}

/**
 * Global TTS hook with intelligent caching
 */
export function useTTS(): TTSHookReturn {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    currentText: undefined
  });

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text?.trim()) {
      console.warn('Empty text provided to TTS');
      return;
    }

    // Clear any previous errors
    setState(prev => ({ ...prev, error: null }));

    try {
      // Set loading state
      setState(prev => ({
        ...prev,
        isLoading: true,
        currentText: text
      }));

      const {
        voice = 'female',
        speed = 1.0,
        priority = 'normal',
        context = 'general'
      } = options;

      // Log TTS usage for analytics
      console.log(`🔊 TTS: ${context} - "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);

      // Set playing state just before speaking
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: true
      }));

      // Use TTSManager with caching and context
      await TTSManager.speak(text, { voice, speed, context }, speed);

      // Speech completed successfully
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentText: undefined
      }));

    } catch (error) {
      console.error('TTS Error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to play audio';

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: errorMessage,
        currentText: undefined
      }));
    }
  }, []);

  const stop = useCallback(() => {
    try {
      // Use TTSManager's stop method which handles all providers
      TTSManager.stop();
      
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        currentText: undefined
      }));
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getCacheStats = useCallback(async () => {
    try {
      return await TTSManager.getCacheStats();
    } catch (error) {
      console.error('Error getting TTS cache stats:', error);
      return null;
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await TTSManager.clearCache();
      console.log('🧹 TTS cache cleared');
    } catch (error) {
      console.error('Error clearing TTS cache:', error);
      throw error;
    }
  }, []);

  return {
    state,
    speak,
    stop,
    clearError,
    getCacheStats,
    clearCache,
    // Convenience properties for backwards compatibility
    isPlaying: state.isPlaying,
    isCacheLoading: state.isLoading,
    speakSentence: speak // Alias for speak
  };
}

/**
 * Specialized hook for vocabulary TTS with context
 */
export function useVocabularyTTS() {
  const tts = useTTS();
  
  const speakWord = useCallback(async (word: string, reading?: string, options?: Omit<TTSOptions, 'context'>) => {
    // Prefer kana reading if available, fallback to kanji
    const textToSpeak = reading || word;
    await tts.speak(textToSpeak, { ...options, context: 'vocabulary' });
  }, [tts]);

  return {
    ...tts,
    speakWord
  };
}

/**
 * Specialized hook for kanji TTS with context
 */
export function useKanjiTTS() {
  const tts = useTTS();
  
  const speakKanji = useCallback(async (kanji: string, reading?: string, options?: Omit<TTSOptions, 'context'>) => {
    // Use reading if available, otherwise just the kanji character
    const textToSpeak = reading || kanji;
    await tts.speak(textToSpeak, { ...options, context: 'kanji' });
  }, [tts]);

  const speakReading = useCallback(async (reading: string, type: 'kun' | 'on' = 'kun', options?: Omit<TTSOptions, 'context'>) => {
    await tts.speak(reading, { 
      ...options, 
      context: `kanji-${type}-reading`
    });
  }, [tts]);

  return {
    ...tts,
    speakKanji,
    speakReading
  };
}

/**
 * Specialized hook for game TTS with context
 */
export function useGameTTS() {
  const tts = useTTS();
  
  const speakGameText = useCallback(async (text: string, gameType: string, options?: Omit<TTSOptions, 'context'>) => {
    await tts.speak(text, { ...options, context: `game-${gameType}` });
  }, [tts]);

  return {
    ...tts,
    speakGameText
  };
}

/**
 * Specialized hook for article TTS with context and preloading
 */
export function useArticleTTS() {
  const tts = useTTS();
  
  const speakSentence = useCallback(async (sentence: string, articleId?: string, options?: Omit<TTSOptions, 'context'>) => {
    await tts.speak(sentence, { ...options, context: 'article-reading' });
  }, [tts]);

  const preloadArticle = useCallback(async (
    articleId: string, 
    sentences: string[], 
    options?: TTSOptions,
    onProgress?: (completed: number, total: number) => void
  ) => {
    const { voice = 'female', speed = 1.0 } = options || {};
    
    try {
      await TTSManager.preloadArticleAudio(
        articleId,
        sentences,
        voice,
        speed,
        onProgress
      );
    } catch (error) {
      console.error('Error preloading article audio:', error);
      throw error;
    }
  }, []);

  return {
    ...tts,
    speakSentence,
    preloadArticle
  };
}

/**
 * Specialized hook for story TTS with context
 */
export function useStoryTTS() {
  const tts = useTTS();
  
  const speakStory = useCallback(async (text: string, options?: Omit<TTSOptions, 'context'>) => {
    await tts.speak(text, { ...options, context: 'story' });
  }, [tts]);

  return {
    ...tts,
    speakStory,
    speakSentence: speakStory // Alias for compatibility
  };
}

export default useTTS;