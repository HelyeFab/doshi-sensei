'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord } from '@/types';
import { PracticeCache } from '@/utils/practiceCache';
import { VocabularyTTSButton } from '@/components/ui/TTSButton';
import { SaveWordModal } from './SaveWordModal';
import { useAuth } from '@/contexts/AuthContext';
import SlideUpModal from '@/components/SlideUpModal';

interface QuickDrillPreviewProps {
  onSelectWord: (word: JapaneseWord) => void;
  onLoadComplete?: () => void;
}

export function QuickDrillPreview({ onSelectWord, onLoadComplete }: QuickDrillPreviewProps) {
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);
  const [showWordsModal, setShowWordsModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadCachedWords();
  }, []);

  const loadCachedWords = async () => {
    try {
      setLoading(true);

      // Try to get from cache first
      let cachedVerbs = PracticeCache.get<JapaneseWord[]>('verbs');
      let cachedAdjectives = PracticeCache.get<JapaneseWord[]>('adjectives');

      // If no cache, preload it
      if (!cachedVerbs || !cachedAdjectives) {

        await PracticeCache.preloadCache();
        cachedVerbs = PracticeCache.get<JapaneseWord[]>('verbs');
        cachedAdjectives = PracticeCache.get<JapaneseWord[]>('adjectives');

      }

      // Combine all verbs and adjectives
      const allWords: JapaneseWord[] = [];
      
      if (cachedVerbs) {
        allWords.push(...cachedVerbs);
      }

      if (cachedAdjectives) {
        allWords.push(...cachedAdjectives);
      }

      // Shuffle and take 21 random words
      const shuffledAll = allWords.sort(() => Math.random() - 0.5).slice(0, 21);
      
      // Log to confirm we're using JMDict data

      setWords(shuffledAll);

      if (onLoadComplete) {
        onLoadComplete();
      }
    } catch (error) {
      console.error('Error loading cached words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = (word: JapaneseWord) => {

    // Store the word in session storage and trigger the drill
    sessionStorage.setItem('drillWord', JSON.stringify(word));

    setShowWordsModal(false); // Close the modal
    onSelectWord(word);

  };

  const refreshWords = () => {
    loadCachedWords();
  };

  const handleSaveWord = (word: JapaneseWord) => {
    setWordToSave(word);
    setShowSaveModal(true);
  };

  const getWordTypePill = (word: JapaneseWord) => {
    if (word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular') {
      return (
        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
          verb
        </span>
      );
    } else if (word.type === 'i-adjective' || word.type === 'na-adjective') {
      return (
        <span className="px-2 py-0.5 bg-secondary/20 text-secondary-foreground text-xs rounded-full">
          adjective
        </span>
      );
    }
    return null;
  };

  useEffect(() => {
    if (loading && onLoadComplete) {
      onLoadComplete();
    }
  }, [loading, onLoadComplete]);

  return (
    <>
      <div className="mb-6 text-center">
        <button
          onClick={() => setShowWordsModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
              <span>Loading...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Quick Start - Practice Example Words</span>
            </>
          )}
        </button>
        <p className="text-sm text-muted-foreground mt-2">
          Select from common Japanese verbs and adjectives
        </p>
      </div>

      {/* Words Modal */}
      <SlideUpModal
        isOpen={showWordsModal}
        onClose={() => setShowWordsModal(false)}
        title="Select a Word to Practice"
        height="90%"
        showHandle={false}
      >
        <div className="pb-safe space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Choose a word to practice its conjugations
            </p>
            <button
              onClick={refreshWords}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              title="Refresh words"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {words.map((word) => {
          // Debug log to check word content
          if (!word.kanji && !word.kana) {

          }
          return (
          <div
            key={word.id}
            className="flex flex-col p-4 sm:p-5 bg-card hover:bg-muted/50 border border-border hover:border-primary rounded-lg transition-all group min-h-[120px] cursor-pointer"
            onClick={() => handleWordClick(word)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-2">
                  <span className="font-semibold text-lg sm:text-xl text-card-foreground group-hover:text-primary transition-colors">
                    {word.kanji || word.word || 'Loading...'}
                  </span>
                  {word.kana && word.kana !== word.kanji && (
                    <span className="text-sm sm:text-base text-muted-foreground">
                      ({word.kana})
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {word.english || word.meaning || word.meanings?.join('; ') || ''}
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                {getWordTypePill(word)}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <VocabularyTTSButton 
                  word={word} 
                  size="sm" 
                  variant="minimal"
                  tooltip="Listen to pronunciation"
                />
                {user && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveWord(word);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    title="Save to list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordClick(word);
                }}
                className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors font-medium"
              >
                Practice
              </button>
            </div>
          </div>
          );
        })}
          </div>

          <div className="mt-6 text-center pb-4">
            <p className="text-xs text-muted-foreground">
              Cached from JMDict for blazing fast performance
            </p>
          </div>
        </div>
      </SlideUpModal>
      
      {/* Save Word Modal */}
      {showSaveModal && wordToSave && (
        <SaveWordModal
          word={wordToSave}
          onClose={() => {
            setShowSaveModal(false);
            setWordToSave(null);
          }}
          onSaveComplete={() => {
            // Optionally refresh or show a success message
          }}
        />
      )}
    </>
  );
}