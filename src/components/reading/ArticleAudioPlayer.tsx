'use client';

import { useState, useEffect, useRef } from 'react';
import { NewsArticle } from '@/types/news';
import TTSManager from '@/utils/tts';
import { TranslationCache } from '@/utils/translationCache';
import { useStrings } from '@/contexts/LanguageContext';

interface ArticleAudioPlayerProps {
  article: NewsArticle;
  onClose?: () => void;
}

interface AudioControls {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentence: number;
  playbackSpeed: number;
  volume: number;
  autoAdvance: boolean;
}

export function ArticleAudioPlayer({ article, onClose }: ArticleAudioPlayerProps) {
  const [sentences, setSentences] = useState<string[]>([]);
  const [controls, setControls] = useState<AudioControls>({
    isPlaying: false,
    isPaused: false,
    currentSentence: 0,
    playbackSpeed: 1.0,
    volume: 1.0,
    autoAdvance: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<Record<number, number>>({});
  const [preloadProgress, setPreloadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [currentTranslation, setCurrentTranslation] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  const translationCache = TranslationCache.getInstance();

  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES_PER_SENTENCE = 2;

  // Translate current sentence
  const translateCurrentSentence = async (sentenceIndex: number) => {
    if (sentenceIndex >= sentences.length) return;

    setIsTranslating(true);
    const sentence = sentences[sentenceIndex];

    try {
      const translation = await translationCache.getTranslation(
        sentence,
        'ja',
        'en',
        'deepl',
        async () => {
          // Mock translation for now - integrate with actual DeepL API
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sentence, from: 'ja', to: 'en' })
          });
          const data = await response.json();
          return data.translation || 'Translation not available';
        }
      );

      setCurrentTranslation(translation || 'Translation not available');
    } catch (error) {
      console.error('Translation error:', error);
      setCurrentTranslation('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Update translation when current sentence changes
  useEffect(() => {
    if (sentences.length > 0) {
      translateCurrentSentence(controls.currentSentence);
    }
  }, [controls.currentSentence, sentences]);

  // Parse article into sentences
  useEffect(() => {
    const parseArticle = () => {
      // Split article content into sentences
      const rawSentences = article.content
        .split(/[。！？]/)
        .filter(sentence => sentence.trim().length > 0)
        .map(sentence => sentence.trim() + '。');

      setSentences(rawSentences);
    };

    parseArticle();
  }, [article.content]);

  // Preload audio when sentences are ready
  useEffect(() => {
    if (sentences.length > 0 && !isPreloading) {
      startPreloading();
    }
  }, [sentences]);

  const startPreloading = async () => {
    if (sentences.length === 0) return;

    setIsPreloading(true);
    setPreloadProgress({ completed: 0, total: sentences.length });

    try {
      await TTSManager.preloadArticleAudio(
        article.id,
        sentences,
        'female', // Default voice
        controls.playbackSpeed, // Use current playback speed
        (completed, total) => {
          setPreloadProgress({ completed, total });
        }
      );

      console.log(`✅ Preloaded audio for ${sentences.length} sentences`);
    } catch (error) {
      console.error('Error preloading audio:', error);
    } finally {
      setIsPreloading(false);
      setPreloadProgress(null);
    }
  };

  // Handle audio completion and auto-advance
  const handleAudioComplete = (currentIndex: number) => {
    if (controls.autoAdvance && currentIndex < sentences.length - 1) {
      // Auto-advance to next sentence
      const nextIndex = currentIndex + 1;
      setTimeout(() => {
        setControls(prev => ({
          ...prev,
          currentSentence: nextIndex
        }));
        playCurrentSentence(nextIndex);
      }, 1000); // 1 second pause between sentences
    } else {
      // End of article or auto-advance disabled
      setControls(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false
      }));
    }
  };

  // Play specific sentence
  const playCurrentSentence = async (sentenceIndex?: number) => {
    const index = sentenceIndex ?? controls.currentSentence;
    if (index >= sentences.length) return;

    // Check retry count for this sentence
    const currentRetries = retryCount[index] || 0;
    if (currentRetries >= MAX_RETRIES_PER_SENTENCE) {
      console.warn(`⚠️ Skipping sentence ${index + 1} - max retries (${MAX_RETRIES_PER_SENTENCE}) exceeded`);
      setError(`Skipped sentence ${index + 1} after ${MAX_RETRIES_PER_SENTENCE} failed attempts`);

      // Auto-advance to next sentence if possible
      if (controls.autoAdvance && index < sentences.length - 1) {
        setTimeout(() => {
          playCurrentSentence(index + 1);
        }, 1000);
      } else {
        setControls(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false
        }));
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sentence = sentences[index];

      setControls(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentSentence: index
      }));

      // Play sentence with TTS using current playback speed
      await TTSManager.speak(sentence, { voice: 'female', speed: controls.playbackSpeed, context: 'article-reading' });

      // Reset retry count on success
      setRetryCount(prev => ({
        ...prev,
        [index]: 0
      }));

      // Handle completion only if TTS was successful
      handleAudioComplete(index);
    } catch (err) {
      console.error('TTS Error:', err);

      // Increment retry count
      const newRetryCount = currentRetries + 1;
      setRetryCount(prev => ({
        ...prev,
        [index]: newRetryCount
      }));

      if (newRetryCount >= MAX_RETRIES_PER_SENTENCE) {
        setError(`Failed to play sentence ${index + 1} after ${MAX_RETRIES_PER_SENTENCE} attempts. Skipping to next.`);

        // Auto-advance to next sentence if possible
        if (controls.autoAdvance && index < sentences.length - 1) {
          setTimeout(() => {
            playCurrentSentence(index + 1);
          }, 1000);
        } else {
          setControls(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false
          }));
        }
      } else {
        setError(`Audio playback failed (attempt ${newRetryCount}/${MAX_RETRIES_PER_SENTENCE}). Retrying...`);

        // Retry after a short delay
        setTimeout(() => {
          playCurrentSentence(index);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Play entire article
  const playEntireArticle = async () => {
    setControls(prev => ({
      ...prev,
      currentSentence: 0,
      autoAdvance: true
    }));
    await playCurrentSentence(0);
  };

  // Pause/Resume
  const togglePause = () => {
    if (controls.isPlaying) {
      TTSManager.stop();
      setControls(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: true
      }));
    } else if (controls.isPaused) {
      playCurrentSentence();
    }
  };

  // Stop playback
  const stopPlayback = () => {
    TTSManager.stop();
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    setControls(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentSentence: 0
    }));
  };

  // Navigate sentences
  const goToSentence = (index: number) => {
    if (index >= 0 && index < sentences.length) {
      TTSManager.stop();
      setControls(prev => ({
        ...prev,
        currentSentence: index,
        isPlaying: false,
        isPaused: false
      }));
    }
  };

  const nextSentence = () => {
    goToSentence(controls.currentSentence + 1);
  };

  const previousSentence = () => {
    goToSentence(controls.currentSentence - 1);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      TTSManager.stop();
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 md:items-center">
      <div className="bg-card rounded-lg w-full max-w-2xl h-[70vh] md:h-[60vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="text-lg font-bold text-foreground truncate">📚 Audio Reader</h2>
            <p className="text-sm text-muted-foreground truncate">{article.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sentence List */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-foreground mb-2">📝 Sentences</h3>
              <p className="text-sm text-muted-foreground">
                {sentences.length} sentences
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sentences.map((sentence, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${index === controls.currentSentence
                    ? 'bg-primary/10 border border-primary'
                    : 'bg-muted hover:bg-muted/80'
                    }`}
                  onClick={() => goToSentence(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === controls.currentSentence
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground text-background'
                      }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-relaxed">
                        {sentence}
                      </p>
                    </div>

                    {/* Individual sentence play button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playCurrentSentence(index);
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading && index === controls.currentSentence ? '⏳' : '▶️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Sentence Display */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-foreground mb-2">🎯 {strings.audio.playCurrentSentence}</h3>
              <p className="text-sm text-muted-foreground">
                {controls.currentSentence + 1} / {sentences.length}
              </p>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-center">
              {sentences.length > 0 && (
                <div className="space-y-6">
                  {/* Current Sentence */}
                  <div className="text-center">
                    <div className="text-2xl leading-relaxed text-foreground mb-4 p-4 bg-muted rounded-lg">
                      {sentences[controls.currentSentence]}
                    </div>
                  </div>

                  {/* Translation */}
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                      💡 English Translation {isTranslating && '(Loading...)'}
                    </div>
                    <div className="text-blue-800 dark:text-blue-200 italic">
                      {currentTranslation || 'Loading translation...'}
                    </div>
                  </div>

                  {/* Vocabulary Analysis */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-2">📚 Key Vocabulary</div>
                    <div className="flex flex-wrap gap-2">
                      {/* Mock vocabulary extraction from current sentence */}
                      {sentences[controls.currentSentence]
                        ?.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}/g)
                        ?.slice(0, 4)
                        .map((word, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-sm cursor-pointer hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                          >
                            {word}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="p-4 border-t border-border bg-muted/50">
          <div className="flex items-center justify-center gap-4">
            {/* Previous */}
            <button
              onClick={previousSentence}
              disabled={controls.currentSentence === 0}
              className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏮️
            </button>

            {/* Play/Pause Current Sentence */}
            <button
              onClick={() => controls.isPlaying ? togglePause() : playCurrentSentence()}
              disabled={isLoading}
              className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? '⏳' : controls.isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Next */}
            <button
              onClick={nextSentence}
              disabled={controls.currentSentence === sentences.length - 1}
              className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏭️
            </button>

            {/* Separator */}
            <div className="w-px h-8 bg-border mx-2"></div>

            {/* Play Entire Article */}
            <button
              onClick={playEntireArticle}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              📖 {strings.audio.playAll}
            </button>

            {/* Stop */}
            <button
              onClick={stopPlayback}
              className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              ⏹️
            </button>

            {/* Separator */}
            <div className="w-px h-8 bg-border mx-2"></div>

            {/* Playback Speed Control */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-foreground">{strings.audio.speed}:</span>
              <select
                value={controls.playbackSpeed}
                onChange={(e) => setControls(prev => ({
                  ...prev,
                  playbackSpeed: parseFloat(e.target.value)
                }))}
                className="px-2 py-1 rounded bg-muted text-foreground border border-border"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1.0}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2.0}>2.0x</option>
              </select>
            </div>

            {/* Auto-advance toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={controls.autoAdvance}
                onChange={(e) => setControls(prev => ({
                  ...prev,
                  autoAdvance: e.target.checked
                }))}
                className="rounded"
              />
              <span className="text-foreground">{strings.audio.autoAdvance}</span>
            </label>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{strings.audio.progress}</span>
              <span>{controls.currentSentence + 1} / {sentences.length}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((controls.currentSentence + 1) / sentences.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArticleAudioPlayer;
