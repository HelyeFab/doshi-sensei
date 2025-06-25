'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
import { NewsArticle } from '@/types/news';
import { JapaneseWord, StudyList, StudyListType } from '@/types';
import { JapaneseNewsScraper } from '@/utils/newsScraper';
import { searchWords } from '@/utils/api';
import { StudyListManager } from '@/utils/studyListManager';
import TTSManager from '@/utils/tts';
import TranslationManager from '@/utils/translation';
import { generateFuriganaWithCache } from '@/utils/furigana';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface AudioControls {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentence: number;
  playbackSpeed: number;
  volume: number;
  autoAdvance: boolean;
}

interface VocabularyPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSaveToList: (word: JapaneseWord) => void;
}

function VocabularyPopup({ word, position, onClose, onSaveToList }: VocabularyPopupProps) {
  const [wordData, setWordData] = useState<JapaneseWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  console.log('🎉 VocabularyPopup RENDERED! Word:', word, 'Position:', position);

  useEffect(() => {
    console.log('🔍 VocabularyPopup useEffect triggered for word:', word);
    const fetchWordData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📡 Fetching word data for:', word);
        const results = await searchWords(word, 1);
        if (results.length > 0) {
          console.log('✅ Word data found:', results[0]);
          setWordData(results[0]);
        } else {
          console.log('❌ No word data found');
          setError('Word not found');
        }
      } catch (err) {
        console.log('❌ Error fetching word data:', err);
        setError('Failed to search for word');
      } finally {
        setLoading(false);
      }
    };

    fetchWordData();
  }, [word]);

  const handleSaveToList = () => {
    if (wordData) {
      onSaveToList(wordData);
    }
  };

  const handlePlayPronunciation = async () => {
    if (!wordData) return;

    try {
      setIsPlaying(true);
      // Use the word's kanji for TTS pronunciation
      await TTSManager.speak(wordData.kanji, 'female');
    } catch (error) {
      console.error('TTS Error in vocabulary popup:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-2xl p-6 w-full max-w-sm mx-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-foreground">{word}</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ✕
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <span className="animate-spin">⏳</span>
              <span>Searching...</span>
            </div>
          )}

          {error && (
            <div className="text-destructive text-sm py-4">{error}</div>
          )}

          {wordData && (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Reading</div>
                <div className="flex items-center gap-3">
                  <div className="font-medium text-lg">{wordData.kana}</div>
                  <button
                    onClick={handlePlayPronunciation}
                    disabled={isPlaying}
                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="Play pronunciation"
                  >
                    {isPlaying ? '⏳' : '🔊'}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Meaning</div>
                <div className="text-base">{wordData.meaning}</div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                  {wordData.jlpt}
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
                  {wordData.type}
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={handleSaveToList}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  Save to List
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface SaveWordModalProps {
  word: JapaneseWord;
  onClose: () => void;
  onSaved: () => void;
}

function SaveWordModal({ word, onClose, onSaved }: SaveWordModalProps) {
  const { user } = useAuth();
  const { userSubscription } = useSubscription();
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState<StudyListType>('flashcard');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Load unified study lists
  useEffect(() => {
    const loadStudyLists = async () => {
      try {
        const lists = await StudyListManager.getAllStudyLists();
        setStudyLists(lists);
      } catch (error) {
        console.error('Error loading study lists:', error);
      }
    };
    loadStudyLists();
  }, []);

  const handleToggleList = (listId: string) => {
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const canAddToList = (listType: StudyListType): boolean => {
    return StudyListManager.canAddToList('word', word, listType);
  };

  const getValidationMessage = (listType: StudyListType): string => {
    if (listType === 'drillable') {
      const canAdd = StudyListManager.canAddToList('word', word, listType);
      return canAdd ? 'Compatible: Can be used for conjugation drills' : 'Not compatible: Only verbs and adjectives can be conjugated';
    }
    return 'Compatible: Can be used for flashcard review';
  };

  const handleSave = async () => {
    if (selectedLists.length === 0 && !newListName.trim()) return;

    try {
      setSaving(true);
      setErrors([]);

      let listsToSaveTo = [...selectedLists];

      // Create new list if specified
      if (newListName.trim()) {
        const newList = await StudyListManager.createStudyList(
          newListName,
          newListType,
          `Created for saving ${word.kanji}`,
          user,
          userSubscription?.subscription?.status
        );
        listsToSaveTo.push(newList.id);
      }

      // Save word to selected lists using new unified system
      const result = await StudyListManager.addItemToLists(
        word,
        'word',
        listsToSaveTo,
        user,
        userSubscription?.subscription?.status
      );

      if (result.success) {
        onSaved();
        onClose();
      } else {
        setErrors(result.errors);
      }
    } catch (err) {
      console.error('Error saving word:', err);
      setErrors(['Failed to save word to lists']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Save "{word.kanji}" to Lists
        </h3>

        {/* Error messages */}
        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="text-sm text-red-400">
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}

        {studyLists.length > 0 && (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Select existing lists:</h4>
            {studyLists.map((list) => {
              const canAdd = canAddToList(list.type);
              return (
                <label key={list.id} className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                  canAdd ? 'hover:bg-muted/50' : 'opacity-60'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedLists.includes(list.id)}
                    onChange={() => canAdd && handleToggleList(list.id)}
                    disabled={!canAdd}
                    className="rounded border-border mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color }}
                      ></div>
                      <span className="text-sm text-foreground">{list.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({list.itemIds.length} items)
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        list.type === 'drillable' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {list.type}
                      </span>
                    </div>
                    <div className={`text-xs ${canAdd ? 'text-green-400' : 'text-red-400'}`}>
                      {getValidationMessage(list.type)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={showCreateNew}
              onChange={(e) => setShowCreateNew(e.target.checked)}
              className="rounded border-border"
            />
            <label className="text-sm font-medium text-muted-foreground cursor-pointer">
              Create new list
            </label>
          </div>

          {showCreateNew && (
            <div className="space-y-3">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={50}
              />

              <div>
                <label className="block text-xs text-muted-foreground mb-2">List Type:</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-input">
                    <input
                      type="radio"
                      name="listType"
                      value="flashcard"
                      checked={newListType === 'flashcard'}
                      onChange={(e) => setNewListType(e.target.value as StudyListType)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Flashcard List</div>
                      <div className="text-xs text-muted-foreground">For memorization and review (accepts any content)</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg border transition-colors ${
                    canAddToList('drillable') ? 'border-input' : 'border-input opacity-60'
                  }`}>
                    <input
                      type="radio"
                      name="listType"
                      value="drillable"
                      checked={newListType === 'drillable'}
                      onChange={(e) => setNewListType(e.target.value as StudyListType)}
                      disabled={!canAddToList('drillable')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Drillable List</div>
                      <div className="text-xs text-muted-foreground">For conjugation practice (verbs & adjectives only)</div>
                      {!canAddToList('drillable') && (
                        <div className="text-xs text-red-400 mt-1">⚠️ This word cannot be conjugated</div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={(selectedLists.length === 0 && !newListName.trim()) || saving}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Word'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AudioPlayerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id');
  const source = searchParams.get('source') || 'reading'; // Default to reading for backward compatibility

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [sentences, setSentences] = useState<string[]>([]);
  const [processedSentences, setProcessedSentences] = useState<string[]>([]);
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
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    position: { x: number; y: number };
  } | null>(null);
  const [showSaveWordModal, setShowSaveWordModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);
  const [enhancedSentence, setEnhancedSentence] = useState<string>('');

  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES_PER_SENTENCE = 2;

  // Check Translation availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const translationAvailable = TranslationManager.isAvailable();
        setTranslationAvailable(translationAvailable);
        console.log('🔍 DeepL Translation available:', translationAvailable);
      } catch (error) {
        console.log('❌ Translation availability check failed:', error);
        setTranslationAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        router.push(source === 'news' ? '/news' : '/reading');
        return;
      }

      try {
        setLoadingArticle(true);
        // Get articles and find the one with matching ID
        const articles = await JapaneseNewsScraper.getArticles('nhk-easy', 20);
        const foundArticle = articles.find(a => a.id === articleId);

        if (!foundArticle) {
          router.push(source === 'news' ? '/news' : '/reading');
          return;
        }

        setArticle(foundArticle);

        // Parse article into sentences
        const rawSentences = foundArticle.content
          .split(/[。！？]/)
          .filter(sentence => sentence.trim().length > 0)
          .map(sentence => sentence.trim() + '。');

        setSentences(rawSentences);

        // Process sentences with furigana
        const processedSentencesData = await Promise.all(
          rawSentences.map(sentence => generateFuriganaWithCache(sentence))
        );
        setProcessedSentences(processedSentencesData);

      } catch (err) {
        console.error('Failed to load article:', err);
        setError('Failed to load article');
      } finally {
        setLoadingArticle(false);
      }
    };

    loadArticle();
  }, [articleId, router]);

  // Handle vocabulary word click
  const handleWordClick = (event: React.MouseEvent<HTMLElement>) => {
    console.log('🔍 Click detected on:', event.target);
    const target = event.target as HTMLElement;
    const word = target.textContent?.trim();
    console.log('🔍 Extracted word:', word);
    console.log('🔍 Target classes:', target.className);

    if (word && word.length >= 1) {
      console.log('✅ Word is valid, showing popup for:', word);
      const rect = target.getBoundingClientRect();
      const newSelectedWord = {
        word,
        position: {
          x: rect.left,
          y: rect.top + window.scrollY
        }
      };
      console.log('🔍 Setting selectedWord to:', newSelectedWord);
      setSelectedWord(newSelectedWord);
      console.log('🔍 selectedWord state after setting:', selectedWord);
    } else {
      console.log('❌ Word not valid or too short');
    }
  };

  // Save word to study list
  const handleSaveWordToList = (word: JapaneseWord) => {
    setWordToSave(word);
    setShowSaveWordModal(true);
    setSelectedWord(null); // Close the vocabulary popup
  };

  // Get styling for part of speech
  const getPartOfSpeechStyle = (type: string): string => {
    const styles: Record<string, string> = {
      'Ichidan': 'border-b-2 border-blue-300 hover:border-blue-400', // Verbs - Blue
      'Godan': 'border-b-2 border-blue-300 hover:border-blue-400', // Verbs - Blue
      'Irregular': 'border-b-2 border-purple-300 hover:border-purple-400', // Irregular verbs - Purple
      'i-adjective': 'border-b-2 border-green-300 hover:border-green-400', // Adjectives - Green
      'na-adjective': 'border-b-2 border-green-300 hover:border-green-400', // Adjectives - Green
      'noun': 'border-b-2 border-orange-300 hover:border-orange-400', // Nouns - Orange
      'adverb': 'border-b-2 border-pink-300 hover:border-pink-400', // Adverbs - Pink
      'particle': 'border-b-2 border-gray-300 hover:border-gray-400', // Particles - Gray
      'expression': 'border-b-2 border-teal-300 hover:border-teal-400', // Expressions - Teal
      'default': 'border-b-2 border-slate-300 hover:border-slate-400' // Default - Slate
    };

    return styles[type] || styles.default;
  };

  // Enhanced text rendering with intelligent word highlighting using furigana boundaries
  const renderTextWithHighlighting = async (text: string): Promise<string> => {
    console.log('🔍 Processing text for highlighting:', text);

    if (!text || text.trim() === '') {
      console.log('❌ No text to process');
      return text;
    }

    // Create a working copy
    let processedText = text;

    // Parse ruby tags to find complete words with their readings
    const rubyRegex = /<ruby>([^<]+)<rp>\(<\/rp><rt>([^<]+)<\/rt><rp>\)<\/rp><\/ruby>/g;
    const rubyMatches = [...text.matchAll(rubyRegex)];

    console.log('📝 Found ruby words:', rubyMatches.map(match => ({
      word: match[1],
      reading: match[2]
    })));

    // Use inline styles for colors since Tailwind classes won't be included in build
    const colorRotation = [
      'border-bottom: 2px solid #60a5fa; cursor: pointer; transition: all 0.2s;', // Blue
      'border-bottom: 2px solid #4ade80; cursor: pointer; transition: all 0.2s;', // Green
      'border-bottom: 2px solid #fb923c; cursor: pointer; transition: all 0.2s;', // Orange
      'border-bottom: 2px solid #a78bfa; cursor: pointer; transition: all 0.2s;', // Purple
      'border-bottom: 2px solid #f472b6; cursor: pointer; transition: all 0.2s;', // Pink
      'border-bottom: 2px solid #2dd4bf; cursor: pointer; transition: all 0.2s;', // Teal
    ];

    // Apply highlighting to complete words found in ruby tags
    rubyMatches.forEach((match, index) => {
      const fullMatch = match[0];
      const word = match[1];
      const reading = match[2];
      const colorStyle = colorRotation[index % colorRotation.length];

      // Create enhanced ruby tag with vocabulary highlighting on the word part
      const enhancedRuby = `<ruby><span class="vocabulary-highlight" style="${colorStyle}" data-word="${word}" title="${word} (${reading})">${word}</span><rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;

      // Replace the original ruby tag with the enhanced version
      processedText = processedText.replace(fullMatch, enhancedRuby);

      console.log(`✅ Enhanced word: ${word} (${reading}) with color ${index % colorRotation.length}`);
    });

    console.log('✅ Final processed text with word-based highlighting:', processedText);
    return processedText;
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

      // Play sentence with Google TTS
      await TTSManager.speak(sentence, 'female');

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
      isPaused: false
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

  // Process current sentence for highlighting when it changes
  useEffect(() => {
    const processCurrentSentence = async () => {
      if (processedSentences.length === 0) return;

      const currentProcessedSentence = processedSentences[controls.currentSentence] || sentences[controls.currentSentence] || '';
      if (currentProcessedSentence) {
        try {
          const enhanced = await renderTextWithHighlighting(currentProcessedSentence);
          setEnhancedSentence(enhanced);
        } catch (error) {
          console.error('Error processing sentence for highlighting:', error);
          setEnhancedSentence(currentProcessedSentence);
        }
      }
    };

    processCurrentSentence();
  }, [controls.currentSentence, processedSentences, sentences]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Article not found
          </h3>
          <p className="text-muted-foreground mb-4">
            The requested article could not be loaded.
          </p>
          <button
            onClick={() => router.push(source === 'news' ? '/news' : '/reading')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Back to Reading
          </button>
        </div>
      </div>
    );
  }

  const currentSentence = sentences[controls.currentSentence] || '';
  const currentProcessedSentence = processedSentences[controls.currentSentence] || currentSentence;

  console.log('🔍 Debug - Current sentence:', currentSentence);
  console.log('🔍 Debug - Processed sentence:', currentProcessedSentence);
  console.log('🔍 Debug - Enhanced sentence state:', enhancedSentence);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 pt-20">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">📚 Audio Reader</h1>
            <button
              onClick={() => router.push(source === 'news' ? '/news' : '/reading')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        {/* Article Stats */}
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

        {/* Audio Controls */}
        <div className="bg-card rounded-lg border border-border mb-6 p-6">
          <div className="flex items-center justify-center gap-4 mb-4">
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

          {/* Progress and Controls */}
          <div className="space-y-4">
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

            {/* Speed and Auto-advance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-foreground mb-2">Playback Speed</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={controls.playbackSpeed}
                  onChange={(e) => setControls(prev => ({ ...prev, playbackSpeed: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground mt-1">{controls.playbackSpeed}x</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Auto-advance</span>
                <input
                  type="checkbox"
                  checked={controls.autoAdvance}
                  onChange={(e) => setControls(prev => ({ ...prev, autoAdvance: e.target.checked }))}
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Individual Sentence Card */}
        <div className="bg-card rounded-lg border border-border mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              {controls.currentSentence + 1}
            </div>
            <div className="flex-1 text-foreground">
              {currentSentence}
            </div>
            <button
              onClick={() => playCurrentSentence()}
              disabled={isLoading}
              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              {isLoading ? '⏳' : '▶️'}
            </button>
          </div>
        </div>

        {/* Current Sentence Magnified */}
        <div className="bg-card rounded-lg border border-border mb-6">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-red-500">🎯</span>
              <h3 className="font-medium text-foreground">Current Sentence</h3>
              <span className="text-sm text-muted-foreground">
                {controls.currentSentence + 1} of {sentences.length}
              </span>
            </div>
          </div>
          <div className="p-8">
            <div
              className="text-3xl leading-relaxed text-foreground text-center"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('vocabulary-highlight')) {
                  handleWordClick(e as any);
                }
              }}
              dangerouslySetInnerHTML={{
                __html: enhancedSentence
              }}
            />
          </div>
        </div>

        {/* English Translation */}
        <div className="bg-card rounded-lg border border-border mb-6">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <span className="font-medium text-foreground">English Translation</span>
              {translationLoading && <span className="animate-spin">⏳</span>}
              {translationAvailable && (
                <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                  DeepL
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="text-xl text-foreground text-center">
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

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Vocabulary Popup */}
        {selectedWord && (
          <VocabularyPopup
            word={selectedWord.word}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onSaveToList={handleSaveWordToList}
          />
        )}

        {/* Save Word Modal */}
        {showSaveWordModal && wordToSave && (
          <SaveWordModal
            word={wordToSave}
            onClose={() => {
              setShowSaveWordModal(false);
              setWordToSave(null);
            }}
            onSaved={() => {
              setShowSaveWordModal(false);
              setWordToSave(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
