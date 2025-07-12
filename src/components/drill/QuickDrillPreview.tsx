'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord } from '@/types';
import { PracticeCache } from '@/utils/practiceCache';
import { VocabularyTTSButton } from '@/components/ui/TTSButton';
import { SaveWordModal } from './SaveWordModal';
import { useAuth } from '@/contexts/AuthContext';

interface QuickDrillPreviewProps {
  onSelectWord: (word: JapaneseWord) => void;
  onLoadComplete?: () => void;
}

export function QuickDrillPreview({ onSelectWord, onLoadComplete }: QuickDrillPreviewProps) {
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);
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
        console.log('No cache found, preloading from JMDict...');
        await PracticeCache.preloadCache();
        cachedVerbs = PracticeCache.get<JapaneseWord[]>('verbs');
        cachedAdjectives = PracticeCache.get<JapaneseWord[]>('adjectives');
        console.log('After preload - verbs:', cachedVerbs?.length, 'adjectives:', cachedAdjectives?.length);
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
      console.log('Quick Drill Preview - Loaded words from JMDict cache:', {
        totalWords: allWords.length,
        displayingWords: shuffledAll.length,
        sampleWord: shuffledAll[0] ? {
          kanji: shuffledAll[0].kanji,
          kana: shuffledAll[0].kana,
          type: shuffledAll[0].type,
          meaning: shuffledAll[0].meaning || shuffledAll[0].english
        } : null
      });
      
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
    console.log('QuickDrillPreview: Word clicked:', word);
    // Store the word in session storage and trigger the drill
    sessionStorage.setItem('drillWord', JSON.stringify(word));
    console.log('QuickDrillPreview: Stored word in sessionStorage');
    onSelectWord(word);
    console.log('QuickDrillPreview: Called onSelectWord');
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
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
          verb
        </span>
      );
    } else if (word.type === 'i-adjective' || word.type === 'na-adjective') {
      return (
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
          adjective
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading common words...</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 -mx-4 md:-mx-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-center">
            <h3 className="text-lg font-semibold text-foreground">Quick Start</h3>
            <p className="text-sm text-muted-foreground">
              Select a word below to practice its conjugations instantly
            </p>
          </div>
          <button
            onClick={refreshWords}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted ml-4"
            title="Refresh words"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {words.map((word) => {
          // Debug log to check word content
          if (!word.kanji && !word.kana) {
            console.warn('Word missing kanji/kana:', word);
          }
          return (
          <div
            key={word.id}
            className="flex flex-col p-5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-border hover:border-primary rounded-lg transition-all group min-h-[100px] cursor-pointer"
            onClick={() => handleWordClick(word)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-semibold text-xl text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                    {word.kanji || word.word || 'Loading...'}
                  </span>
                  {word.kana && word.kana !== word.kanji && (
                    <span className="text-base text-slate-600 dark:text-slate-400">
                      ({word.kana})
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {word.english || word.meaning || word.meanings?.join('; ') || ''}
                </p>
              </div>
              <div className="ml-3 flex-shrink-0">
                {getWordTypePill(word)}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
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
                className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
              >
                Practice
              </button>
            </div>
          </div>
          );
        })}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Cached from JMDict for blazing fast performance
          </p>
        </div>
      </div>
      
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
    </div>
  );
}