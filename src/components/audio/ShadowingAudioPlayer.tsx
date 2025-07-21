'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewsArticle } from '@/types/news';
import { StudyList, Sentence } from '@/types';
import ArticleTTSManager from '@/utils/articleTTS';
import { StudyListManager } from '@/utils/studyListManager';
import { generateFuriganaWithCache } from '@/utils/furigana';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAccess } from '@/hooks/useAccess';
import { useNotification } from '@/contexts/NotificationContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Settings, Bookmark } from 'lucide-react';
import { translationService } from '@/services/translationService';

interface ShadowingAudioPlayerProps {
  article: NewsArticle;
  onClose?: () => void;
}

interface SentenceData {
  text: string;
  startIndex: number;
  endIndex: number;
  furiganaText?: string;
  translation?: string;
}

export default function ShadowingAudioPlayer({ article, onClose }: ShadowingAudioPlayerProps) {
  // Hooks
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { checkAndTrack } = useAccess();
  const { showNotification } = useNotification();

  // State
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<'male' | 'female'>('male');
  const [provider, setProvider] = useState<'elevenlabs' | 'google'>('elevenlabs');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(5);
  const [pauseBetweenRepeats, setPauseBetweenRepeats] = useState(2000); // ms
  const [showSettings, setShowSettings] = useState(false);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showFurigana, setShowFurigana] = useState(false);
  const [loadingFurigana, setLoadingFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  
  // Sentence saving state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sentenceToSave, setSentenceToSave] = useState<SentenceData | null>(null);
  const [sentenceLists, setSentenceLists] = useState<StudyList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRepeatRef = useRef<number>(0);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Parse sentences on mount
  useEffect(() => {
    if (article?.content) {
      const parsedSentences = parseSentences(article.content);
      setSentences(parsedSentences);
    }
  }, [article]);

  // Load translations when toggled
  useEffect(() => {
    const loadTranslations = async () => {
      if (showTranslation && sentences.length > 0 && !sentences[0].translation) {
        setLoadingTranslations(true);
        try {
          const sentenceTexts = sentences.map(s => s.text);
          const translations = await translationService.translateSentences(sentenceTexts);
          
          // Update sentences with translations
          const updatedSentences = sentences.map((sentence, index) => ({
            ...sentence,
            translation: translations[index]?.translation || 'Translation unavailable'
          }));
          
          setSentences(updatedSentences);
        } catch (error) {
          console.error('Failed to load translations:', error);
          showNotification('Failed to load translations', 'error');
        } finally {
          setLoadingTranslations(false);
        }
      }
    };

    if (showTranslation) {
      loadTranslations();
    }
  }, [showTranslation, sentences.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      // Clean up cached audio
      audioCache.current.forEach(audio => {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      });
      audioCache.current.clear();
    };
  }, []);

  // Parse content into sentences
  const parseSentences = (content: string): SentenceData[] => {
    // Japanese sentence endings: 。！？
    const sentenceRegex = /[^。！？]+[。！？]/g;
    const sentences: SentenceData[] = [];
    let match;
    
    while ((match = sentenceRegex.exec(content)) !== null) {
      sentences.push({
        text: match[0].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    // If no sentences found, treat the whole content as one sentence
    if (sentences.length === 0 && content.trim()) {
      sentences.push({
        text: content.trim(),
        startIndex: 0,
        endIndex: content.length
      });
    }
    
    return sentences;
  };

  // Play current sentence
  const playCurrentSentence = async () => {
    if (currentSentenceIndex >= sentences.length || !sentences[currentSentenceIndex]) {
      setError('No sentence to play');
      return;
    }

    const sentence = sentences[currentSentenceIndex];
    setIsLoading(true);
    setError(null);
    setIsPlaying(true);

    try {
      // Generate cache key
      const cacheKey = `${article.id}_sentence_${currentSentenceIndex}_${voice}_${provider}`;
      console.log('[Shadowing] Requesting audio for:', cacheKey);
      
      let audio: HTMLAudioElement;
      
      // Check local cache first
      const cachedAudio = audioCache.current.get(cacheKey);
      if (cachedAudio) {
        console.log('[Shadowing] Using cached audio!');
        audio = cachedAudio.cloneNode() as HTMLAudioElement;
        // Reset the cloned audio and ensure it's at the beginning
        audio.currentTime = 0;
        // Preload the cloned audio
        audio.preload = 'auto';
        audio.load();
      } else {
        console.log('[Shadowing] Generating new audio...');
        
        // Generate new audio and cache it
        audio = await ArticleTTSManager.playArticle(
          cacheKey,
          sentence.text,
          {
            voice,
            provider,
            onProgress: (status) => {
              console.log('[Shadowing] TTS Progress:', status);
            }
          }
        );
        
        // Cache the audio for future use
        const audioForCache = audio.cloneNode() as HTMLAudioElement;
        audioForCache.currentTime = 0;
        audioForCache.preload = 'auto';
        // Ensure the cached audio is fully loaded
        audioForCache.load();
        audioCache.current.set(cacheKey, audioForCache);
        console.log('[Shadowing] Cached audio for future use');
      }

      if (audio) {
        // Clean up previous audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
        }

        audioRef.current = audio;
        audio.playbackRate = playbackSpeed;
        
        // Handle audio end
        audio.onended = () => {
          const currentRepeatValue = currentRepeatRef.current;
          console.log('[Shadowing] Audio ended. Current repeat:', currentRepeatValue, 'of', repeatCount);
          
          if (currentRepeatValue < repeatCount - 1) {
            // More repeats to go
            const nextRepeat = currentRepeatValue + 1;
            console.log('[Shadowing] Moving to repeat:', nextRepeat);
            currentRepeatRef.current = nextRepeat;
            setCurrentRepeat(nextRepeat);
            
            // Pause before repeating
            repeatTimeoutRef.current = setTimeout(() => {
              console.log('[Shadowing] Starting repeat:', nextRepeat + 1, 'of', repeatCount);
              playCurrentSentence();
            }, pauseBetweenRepeats);
          } else {
            // Done with repeats, reset
            console.log('[Shadowing] All repeats completed, stopping');
            currentRepeatRef.current = 0;
            setCurrentRepeat(0);
            setIsPlaying(false);
          }
        };

        // Handle audio error
        audio.onerror = (e) => {
          console.error('[Shadowing] Audio error:', e);
          setError('Failed to play audio');
          setIsPlaying(false);
          setIsLoading(false);
        };

        // Start playback
        try {
          console.log('[Shadowing] Starting playback');
          await audio.play();
          setIsLoading(false);
        } catch (playError) {
          console.error('[Shadowing] Play error:', playError);
          setError('Failed to start audio playback');
          setIsPlaying(false);
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('[Shadowing] Error playing sentence:', err);
      setError(err instanceof Error ? err.message : 'Failed to play sentence');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };


  // Control functions
  const play = () => {
    if (!isPlaying && !isLoading) {
      console.log('[Shadowing] Starting playback with', repeatCount, 'repeats');
      currentRepeatRef.current = 0;
      setCurrentRepeat(0);
      setError(null);
      playCurrentSentence();
    }
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    currentRepeatRef.current = 0;
    setIsPlaying(false);
    setCurrentRepeat(0);
    setIsLoading(false);
  };

  const nextSentence = () => {
    stop();
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
      currentRepeatRef.current = 0;
      setCurrentRepeat(0);
    }
  };

  const previousSentence = () => {
    stop();
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
      currentRepeatRef.current = 0;
      setCurrentRepeat(0);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Clear cache when voice or provider changes
  useEffect(() => {
    console.log('[Shadowing] Voice/Provider changed, clearing cache');
    audioCache.current.forEach(audio => {
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
    });
    audioCache.current.clear();
  }, [voice, provider]);

  // Load sentence lists
  useEffect(() => {
    if (user) {
      loadSentenceLists();
    }
  }, [user]);

  const loadSentenceLists = async () => {
    try {
      const lists = await StudyListManager.getSentenceLists();
      setSentenceLists(lists);
    } catch (error) {
      console.error('Failed to load sentence lists:', error);
    }
  };

  // Handle sentence bookmark click
  const handleBookmarkSentence = async (sentence: SentenceData) => {
    // Use access control to check if user can create/use lists (same as word lists)
    const hasAccess = await checkAndTrack('word_lists');
    if (!hasAccess) {
      return; // checkAndTrack already shows appropriate notification
    }

    setSentenceToSave(sentence);
    setSelectedLists([]);
    setShowCreateNew(false);
    setNewListName('');
    setErrors([]);
    setShowSaveModal(true);
  };

  // Handle list toggle
  const handleListToggle = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  // Create new list
  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;
    
    try {
      setIsSaving(true);
      setErrors([]);
      
      // Check for duplicate names
      const trimmedName = newListName.trim().toLowerCase();
      const isDuplicate = sentenceLists.some(list => 
        list.name.toLowerCase() === trimmedName
      );
      
      if (isDuplicate) {
        setErrors(['A list with this name already exists. Please choose a different name.']);
        return;
      }
      
      const newList = await StudyListManager.createStudyList(
        newListName.trim(),
        'sentence',
        'Created for saving sentences',
        user,
        subscription?.status
      );
      
      await loadSentenceLists();
      setSelectedLists(prev => [...prev, newList.id]);
      setNewListName('');
      setShowCreateNew(false);
      
      showNotification({
        title: 'List Created',
        message: `"${newListName.trim()}" list created successfully`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error creating sentence list:', error);
      setErrors(['Failed to create list']);
    } finally {
      setIsSaving(false);
    }
  };

  // Save sentence to lists
  const handleSaveToLists = async () => {
    if (!sentenceToSave || (selectedLists.length === 0 && !newListName.trim())) return;

    try {
      setIsSaving(true);
      setErrors([]);
      
      // Create a proper sentence object
      const sentence: Sentence = {
        id: `sentence-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        text: sentenceToSave.text,
        source: {
          type: 'article',
          id: article.id || '',
          title: article.title,
          url: article.url
        }
      };

      let listsToSaveTo = [...selectedLists];

      // Create new list if specified
      if (newListName.trim()) {
        // Check for duplicate names
        const trimmedName = newListName.trim().toLowerCase();
        const isDuplicate = sentenceLists.some(list => 
          list.name.toLowerCase() === trimmedName
        );
        
        if (isDuplicate) {
          setErrors(['A list with this name already exists. Please choose a different name.']);
          return;
        }
        
        const newList = await StudyListManager.createStudyList(
          newListName.trim(),
          'sentence',
          'Created for saving sentences',
          user,
          subscription?.status
        );
        listsToSaveTo.push(newList.id);
      }

      // Save sentence to selected lists using unified system
      const result = await StudyListManager.addItemToLists(
        sentence,
        'sentence',
        listsToSaveTo,
        user,
        subscription?.status
      );

      if (result.success) {
        showNotification({
          title: 'Sentence Saved',
          message: `Sentence saved to ${listsToSaveTo.length} list${listsToSaveTo.length !== 1 ? 's' : ''}`,
          type: 'success'
        });
        
        setShowSaveModal(false);
        setSentenceToSave(null);
        setSelectedLists([]);
        setNewListName('');
        setShowCreateNew(false);
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      console.error('Error saving sentence:', error);
      setErrors(['Failed to save sentence']);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate furigana for current sentence when showFurigana is enabled
  useEffect(() => {
    const generateCurrentSentenceFurigana = async () => {
      if (!showFurigana || !sentences[currentSentenceIndex] || sentences[currentSentenceIndex].furiganaText) {
        return;
      }

      setLoadingFurigana(true);
      try {
        const furiganaText = await generateFuriganaWithCache(sentences[currentSentenceIndex].text);
        
        // Update the specific sentence with furigana
        setSentences(prev => prev.map((sentence, index) => 
          index === currentSentenceIndex 
            ? { ...sentence, furiganaText }
            : sentence
        ));
      } catch (error) {
        console.error('Failed to generate furigana:', error);
      } finally {
        setLoadingFurigana(false);
      }
    };

    if (showFurigana) {
      generateCurrentSentenceFurigana();
    }
  }, [showFurigana, currentSentenceIndex, sentences]);

  // Get current sentence
  const currentSentence = sentences[currentSentenceIndex];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shadowing Practice</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Voice</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVoice('male')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      voice === 'male' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => setVoice('female')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      voice === 'female' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>

              {/* Repeat Count */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Repeat Count: {repeatCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Furigana Toggle */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFurigana}
                    onChange={(e) => setShowFurigana(e.target.checked)}
                    className="rounded border-border"
                  />
                  <div>
                    <span className="text-sm font-medium">Show Furigana</span>
                    <p className="text-xs text-muted-foreground">Display reading assistance above kanji</p>
                  </div>
                  {loadingFurigana && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(e) => setShowTranslation(e.target.checked)}
                    className="rounded border-border"
                  />
                  <div>
                    <span className="text-sm font-medium">Show Translation</span>
                    <p className="text-xs text-muted-foreground">Display English translation below sentences</p>
                  </div>
                  {loadingTranslations && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6">
          {/* Sentence Display */}
          <div className="mb-6">
            <div className="text-sm text-muted-foreground mb-2">
              Sentence {currentSentenceIndex + 1} of {sentences.length}
              {repeatCount > 1 && (isPlaying || currentRepeat > 0) && ` (Repeat ${currentRepeat + 1}/${repeatCount})`}
            </div>
            <div className="bg-muted/50 rounded-lg p-6 min-h-[150px] flex items-center justify-center relative">
              {currentSentence ? (
                <>
                  <div className="text-2xl leading-relaxed text-center japanese-text pr-12">
                    {showFurigana && currentSentence.furiganaText ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: currentSentence.furiganaText }}
                        className="ruby-text"
                      />
                    ) : (
                      <p>{currentSentence.text}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleBookmarkSentence(currentSentence)}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
                    title="Save sentence to list"
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">No sentence available</p>
              )}
            </div>
            
            {/* Translation Display */}
            {showTranslation && currentSentence && (
              <div className="mt-3 p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">English Translation:</div>
                {loadingTranslations ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Loading translation...</span>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90">
                    {currentSentence.translation || 'Translation not available'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="text-xs text-muted-foreground mb-1">
              {repeatCount > 1 ? 'Repeat Progress:' : 'Sentence Progress:'}
            </div>
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ 
                  width: repeatCount > 1 
                    ? `${((currentRepeat + (isPlaying ? 1 : 0)) / repeatCount) * 100}%`
                    : `${((currentSentenceIndex + 1) / sentences.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousSentence}
              disabled={currentSentenceIndex === 0}
              className="p-3 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={isPlaying ? pause : play}
              disabled={isLoading || !currentSentence}
              className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            <button
              onClick={nextSentence}
              disabled={currentSentenceIndex === sentences.length - 1}
              className="p-3 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 text-sm text-muted-foreground text-center">
            <p>Listen to each sentence and repeat it during the pause.</p>
            <p>Adjust settings to match your learning pace.</p>
          </div>
        </div>

        {/* Sentence List */}
        <div className="border-t max-h-[200px] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-2">All Sentences</h3>
            <div className="space-y-1">
              {sentences.map((sentence, index) => (
                <button
                  key={index}
                  onClick={() => {
                    stop();
                    setCurrentSentenceIndex(index);
                  }}
                  className={`w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm ${
                    index === currentSentenceIndex ? 'bg-muted font-medium' : ''
                  }`}
                >
                  <span className="text-muted-foreground mr-2">{index + 1}.</span>
                  {sentence.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Sentence Modal */}
      {showSaveModal && sentenceToSave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Save Sentence to Lists
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

            {/* Sentence Preview */}
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-lg japanese-text font-medium text-foreground mb-1">{sentenceToSave.text}</div>
              <div className="text-sm text-muted-foreground">From: {article.title}</div>
            </div>

            {/* Existing Lists */}
            {sentenceLists.length > 0 && (
              <div className="space-y-3 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Select existing lists:</h4>
                {sentenceLists.map((list) => (
                  <label key={list.id} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedLists.includes(list.id)}
                      onChange={() => handleListToggle(list.id)}
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
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                          sentence
                        </span>
                      </div>
                      <div className="text-xs text-green-400">
                        ✓ Perfect for shadowing practice
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Create New List */}
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
                    onChange={(e) => {
                      setNewListName(e.target.value);
                      if (errors.length > 0) setErrors([]);
                    }}
                    placeholder="New list name..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={50}
                  />
                  <div className="p-2 rounded-lg border border-input bg-muted/30">
                    <div className="text-sm font-medium text-foreground">Sentence List</div>
                    <div className="text-xs text-muted-foreground">For shadowing practice (sentences only)</div>
                    <div className="text-xs text-green-400 mt-1">✓ Perfect for shadowing practice</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSentenceToSave(null);
                  setSelectedLists([]);
                  setNewListName('');
                  setShowCreateNew(false);
                  setErrors([]);
                }}
                className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToLists}
                disabled={(selectedLists.length === 0 && !newListName.trim()) || isSaving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Sentence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}