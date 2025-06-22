'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { NewsArticle } from '@/types/news';
import { JapaneseNewsScraper } from '@/utils/newsScraper';
import TTSManager from '@/utils/tts';
// Dynamic import to avoid SSR issues - will be loaded on client side
let EdgeTTSManager: any = null;
if (typeof window !== 'undefined') {
  import('@/utils/edgeTTS').then(module => {
    EdgeTTSManager = module.default;
  });
}
import TranslationManager from '@/utils/translation';
import { PageHeader } from '@/components/PageHeader';

interface AudioControls {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentence: number;
  playbackSpeed: number;
  volume: number;
  autoAdvance: boolean;
}

export default function AudioPlayerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id');

  const [article, setArticle] = useState<NewsArticle | null>(null);
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
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [ttsEngine, setTtsEngine] = useState<'google' | 'edge'>('google');
  const [edgeAvailable, setEdgeAvailable] = useState(false);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  const [mobileControlsCollapsed, setMobileControlsCollapsed] = useState(true);

  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES_PER_SENTENCE = 2;

  // Check Edge TTS and Translation availability
  useEffect(() => {
    const checkAvailability = async () => {
      // Check translation availability (safe)
      try {
        const translationAvailable = TranslationManager.isAvailable();
        setTranslationAvailable(translationAvailable);
        console.log('🔍 DeepL Translation available:', translationAvailable);
      } catch (error) {
        console.log('❌ Translation availability check failed:', error);
        setTranslationAvailable(false);
      }

      // Check Edge TTS availability (potentially unsafe)
      try {
        const edgeAvailable = await EdgeTTSManager.isAvailable();
        setEdgeAvailable(edgeAvailable);
        console.log('🔍 Edge TTS available:', edgeAvailable);
      } catch (error) {
        console.log('❌ Edge TTS availability check failed, disabling Edge TTS:', error);
        setEdgeAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        router.push('/reading');
        return;
      }

      try {
        setLoadingArticle(true);
        // Get articles and find the one with matching ID
        const articles = await JapaneseNewsScraper.getArticles('nhk-easy', 20);
        const foundArticle = articles.find(a => a.id === articleId);

        if (!foundArticle) {
          router.push('/reading');
          return;
        }

        setArticle(foundArticle);

        // Parse article into sentences
        const rawSentences = foundArticle.content
          .split(/[。！？]/)
          .filter(sentence => sentence.trim().length > 0)
          .map(sentence => sentence.trim() + '。');

        setSentences(rawSentences);
      } catch (err) {
        console.error('Failed to load article:', err);
        setError('Failed to load article');
      } finally {
        setLoadingArticle(false);
      }
    };

    loadArticle();
  }, [articleId, router]);

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

      // Play sentence with selected TTS engine
      if (ttsEngine === 'edge' && edgeAvailable) {
        try {
          await EdgeTTSManager.speak(sentence);
        } catch (edgeError) {
          console.log('❌ Edge TTS failed, falling back to Google TTS:', edgeError);
          // Disable Edge TTS and fallback to Google TTS
          setEdgeAvailable(false);
          setTtsEngine('google');
          await TTSManager.speak(sentence, 'female');
        }
      } else {
        await TTSManager.speak(sentence, 'female');
      }

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

  // Translate current sentence when it changes
  useEffect(() => {
    const translateCurrentSentence = async () => {
      if (!translationAvailable || sentences.length === 0) return;

      const currentSentence = sentences[controls.currentSentence];
      if (!currentSentence || translations.has(currentSentence)) return;

      setTranslationLoading(true);
      try {
        const result = await TranslationManager.translateText(currentSentence);
        setTranslations(prev => new Map(prev.set(currentSentence, result.translatedText)));
      } catch (error) {
        console.log('Translation skipped:', error instanceof Error ? error.message : 'Unknown error');
        // Set a fallback message instead of throwing
        setTranslations(prev => new Map(prev.set(currentSentence, 'Translation service not configured')));
      } finally {
        setTranslationLoading(false);
      }
    };

    translateCurrentSentence();
  }, [controls.currentSentence, sentences, translationAvailable, translations]);

  // Get current sentence translation
  const getCurrentTranslation = (): string => {
    if (!translationAvailable) return 'Translation service not available';
    if (sentences.length === 0) return '';

    const currentSentence = sentences[controls.currentSentence];
    return translations.get(currentSentence) || '';
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

  if (loadingArticle) {
    return (
      <div className="container mx-auto px-4 py-6 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-6 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Article not found
            </h3>
            <p className="text-muted-foreground mb-4">
              The requested article could not be loaded.
            </p>
            <button
              onClick={() => router.push('/reading')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Back to Reading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">🎵 Audio Reader</h1>
            <button
              onClick={() => router.push('/reading')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Article Info */}
          <div className="bg-card rounded-lg p-6 mb-6 border border-border">
            <h1 className="text-2xl font-bold text-foreground mb-4">{article.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>📅 {new Date(article.publishDate).toLocaleDateString()}</span>
              <span>📖 {article.estimatedReadingTime} min read</span>
              <span>📊 {article.difficulty}</span>
              <span>🏷️ {article.category}</span>
              <span>📝 {sentences.length} sentences</span>
            </div>
          </div>

          {/* Audio Controls - Moved to top for better accessibility */}
          <div className="bg-card rounded-lg border border-border mb-6">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">🎵 Audio Controls</h3>
                {/* Mobile collapse toggle */}
                <button
                  onClick={() => setMobileControlsCollapsed(!mobileControlsCollapsed)}
                  className="lg:hidden p-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={mobileControlsCollapsed ? "Expand controls" : "Collapse controls"}
                >
                  {mobileControlsCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${
              mobileControlsCollapsed ? 'lg:block hidden' : 'block'
            }`}>
              <div className="p-6">
              {/* Main Controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={previousSentence}
                  disabled={controls.currentSentence === 0}
                  className="p-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⏮️
                </button>

                <button
                  onClick={() => controls.isPlaying ? togglePause() : playCurrentSentence()}
                  disabled={isLoading}
                  className="p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-xl"
                >
                  {isLoading ? '⏳' : controls.isPlaying ? '⏸️' : '▶️'}
                </button>

                <button
                  onClick={nextSentence}
                  disabled={controls.currentSentence === sentences.length - 1}
                  className="p-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⏭️
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={playEntireArticle}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    📖 Play All
                  </button>
                  <button
                    onClick={stopPlayback}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    ⏹️ Stop
                  </button>
                </div>

                {/* TTS Engine Selector - EXPERIMENTAL */}
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                      🧪 TTS Engine (Test)
                    </span>
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      {edgeAvailable ? '✅ Edge Available' : '❌ Edge Unavailable'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTtsEngine('google')}
                      className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                        ttsEngine === 'google'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Google TTS
                    </button>
                    <button
                      onClick={() => setTtsEngine('edge')}
                      disabled={!edgeAvailable}
                      className={`flex-1 px-3 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        ttsEngine === 'edge'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Edge TTS
                    </button>
                  </div>
                  {ttsEngine === 'edge' && (
                    <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                      Using Microsoft Edge TTS (experimental)
                    </div>
                  )}
                </div>

                {/* Auto-advance toggle */}
                <label className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Auto-advance</span>
                  <input
                    type="checkbox"
                    checked={controls.autoAdvance}
                    onChange={(e) => setControls(prev => ({
                      ...prev,
                      autoAdvance: e.target.checked
                    }))}
                    className="rounded"
                  />
                </label>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{controls.currentSentence + 1} / {sentences.length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${((controls.currentSentence + 1) / sentences.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Main Audio Player Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Sentence List */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground mb-2">📝 Sentences</h3>
                  <p className="text-sm text-muted-foreground">
                    {sentences.length} sentences total
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                  {sentences.map((sentence, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        index === controls.currentSentence
                          ? 'bg-primary/10 border-2 border-primary shadow-sm'
                          : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                      }`}
                      onClick={() => goToSentence(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          index === controls.currentSentence
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted-foreground text-background'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">
                            {sentence}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // If this sentence is currently playing, pause it
                            if (index === controls.currentSentence && controls.isPlaying) {
                              togglePause();
                            } else {
                              // Otherwise, play this sentence
                              playCurrentSentence(index);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          disabled={isLoading}
                        >
                          {isLoading && index === controls.currentSentence ? '⏳' :
                           (index === controls.currentSentence && controls.isPlaying) ? '⏸️' : '▶️'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center: Current Sentence Display */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border h-full">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground mb-2">🎯 Current Sentence</h3>
                  <p className="text-sm text-muted-foreground">
                    {controls.currentSentence + 1} of {sentences.length}
                  </p>
                </div>

                <div className="p-6 flex flex-col justify-center min-h-80">
                  {sentences.length > 0 && (
                    <div className="space-y-6">
                      {/* Current Sentence */}
                      <div className="text-center">
                        <div className="text-3xl leading-relaxed text-foreground mb-6 p-6 bg-muted rounded-lg">
                          {sentences[controls.currentSentence]}
                        </div>
                      </div>

                      {/* Real-time Translation */}
                      <div className="text-center p-4 bg-muted rounded-lg border border-border">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>💡 English Translation</span>
                          {translationLoading && <span className="animate-spin">⏳</span>}
                          {translationAvailable && (
                            <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                              DeepL
                            </span>
                          )}
                        </div>
                        <div className="text-foreground font-medium">
                          {translationLoading ? (
                            <span className="italic text-muted-foreground">Translating...</span>
                          ) : (
                            <span className={getCurrentTranslation() ? '' : 'italic text-muted-foreground'}>
                              {getCurrentTranslation() || 'Translation not available'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Vocabulary Analysis */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground mb-2">📚 Key Vocabulary</h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {sentences[controls.currentSentence]
                      ?.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}/g)
                      ?.slice(0, 6)
                      .map((word, i) => (
                        <span
                          key={i}
                          className="px-3 py-2 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-lg text-sm cursor-pointer hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                        >
                          {word}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
