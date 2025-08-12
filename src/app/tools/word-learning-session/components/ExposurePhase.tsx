'use client';

import { useState, useEffect } from 'react';
import { WordItem } from '../types';
import { learnedWordsStorage } from '../services/learnedWordsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { TTSManager } from '@/utils/tts';
import { GrammarHighlightedText, GrammarLegend } from '@/components/reading/GrammarHighlightedText';
import { scheduleWordReview } from '@/services/notifications/spacedRepetitionNotifications';
import { translationService } from '@/services/translationService';
import { useNetworkStatus } from '@/hooks/useUnifiedNotifications';

interface ExposurePhaseProps {
  word: WordItem;
  lessonId: string;
  onComplete: () => void;
  onStruggle: () => void;
  onBack?: () => void;
  isLearned?: boolean;
  currentIndex?: number;
  totalWords?: number;
}

// Validate if an example object contains proper sentence data
function isValidExample(example: any): boolean {
  if (!example || typeof example !== 'object') return false;
  
  // Check if it has the required structure
  if (!example.japanese || !example.english) return false;
  
  // Check if values are strings
  if (typeof example.japanese !== 'string' || typeof example.english !== 'string') return false;
  
  // Check if Japanese text contains actual Japanese characters (not just numbers or single digits)
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/; // Hiragana, Katakana, or Kanji
  if (!japanesePattern.test(example.japanese)) return false;
  
  // Check if it's not just a single number or very short non-Japanese text
  if (/^\d+$/.test(example.japanese)) return false;
  
  return true;
}

export default function ExposurePhase({ word, lessonId, onComplete, onStruggle, onBack, isLearned = false, currentIndex = 0, totalWords = 0 }: ExposurePhaseProps) {
  const { user } = useAuth();
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showReading, setShowReading] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isMarkedDifficult, setIsMarkedDifficult] = useState(false);
  const [isMarkedLearned, setIsMarkedLearned] = useState(isLearned);
  const [highlightMode, setHighlightMode] = useState<'none' | 'grammar'>('grammar');
  const [showGrammarLegend, setShowGrammarLegend] = useState(false);
  const [grammarHighlightEnabled, setGrammarHighlightEnabled] = useState(true);
  const [translatedExample, setTranslatedExample] = useState(word.example);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCancelled, setTranslationCancelled] = useState(false);
  const [translationTimeout, setTranslationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize TTS on mount
  useEffect(() => {
    TTSManager.initialize();
  }, []);

  useEffect(() => {
    // Reset state for new word
    setShowReading(false);
    setHasPlayedAudio(false);
    setIsMarkedDifficult(false);
    setIsMarkedLearned(isLearned);
    setTranslationCancelled(false);
    
    // Clear any existing timeout
    if (translationTimeout) {
      clearTimeout(translationTimeout);
      setTranslationTimeout(null);
    }
    
    // Auto-play audio on load
    if (word.audio) {
      playWordAudio();
    }
    
    // Translate example if it's missing English translation
    if (word.example?.japanese && !word.example.english && !translationCancelled) {
      translateExample();
    } else {
      setTranslatedExample(word.example);
    }
  }, [word.id, isLearned]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (translationTimeout) {
        clearTimeout(translationTimeout);
      }
    };
  }, [translationTimeout]);

  const translateExample = async () => {
    if (!word.example?.japanese || translationCancelled) return;
    
    setIsTranslating(true);
    
    // Set timeout for slow connections (10 seconds, or 5 seconds if already slow)
    const timeout = setTimeout(() => {
      setIsTranslating(false);
      setTranslationCancelled(true);
      setTranslatedExample(word.example);
    }, isSlowConnection ? 5000 : 10000);
    
    setTranslationTimeout(timeout);
    
    try {
      const translation = await translationService.translateText(word.example.japanese, 'en');
      
      // Only update if not cancelled
      if (!translationCancelled) {
        setTranslatedExample({
          ...word.example,
          english: translation
        });
      }
    } catch (error) {
      console.error('Failed to translate example:', error);
      // Fallback to showing without translation
      setTranslatedExample(word.example);
    } finally {
      clearTimeout(timeout);
      setTranslationTimeout(null);
      setIsTranslating(false);
    }
  };

  const cancelTranslation = () => {
    if (translationTimeout) {
      clearTimeout(translationTimeout);
      setTranslationTimeout(null);
    }
    setIsTranslating(false);
    setTranslationCancelled(true);
    setTranslatedExample(word.example);
  };

  const playWordAudio = async () => {
    try {
      // Use the proper TTS system based on content type
      // For single kanji/words, use Google TTS (short audio)
      // Check if this is a kanji (partOfSpeech === 'kanji')
      const isKanji = word.partOfSpeech === 'kanji';
      const textToSpeak = word.kana || word.kanji || '';
      
      await TTSManager.speak(
        textToSpeak, 
        {
          voice: 'female',
          provider: isKanji || textToSpeak.length <= 10 ? 'google' : 'elevenlabs',
          context: isKanji ? 'kanji' : 'vocabulary'
        }
      );
      setHasPlayedAudio(true);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const handleMarkDifficult = () => {
    setIsMarkedDifficult(true);
    onStruggle();
  };

  const handleMarkLearned = async () => {
    const userId = user?.uid || 'guest';
    if (isMarkedLearned) {
      // Unmark as learned
      await learnedWordsStorage.unmarkWordAsLearned(userId, word.id, lessonId);
      setIsMarkedLearned(false);
    } else {
      // Mark as learned
      await learnedWordsStorage.markWordAsLearned(userId, word.id, lessonId);
      setIsMarkedLearned(true);
      
      // Schedule spaced repetition notification (1 day from now)
      try {
        await scheduleWordReview(word.id, lessonId, {
          interval: 1, // Start with 1 day interval
          ease: 2.5    // Default ease factor
        }, user?.uid);
      } catch (error) {
        // Silently fail if notifications aren't enabled
        console.log('Could not schedule notification:', error);
      }
    }
  };

  const handleNext = () => {
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      {totalWords > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Learning Progress</span>
            <span className="text-muted-foreground">{currentIndex + 1} / {totalWords}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Grammar Legend Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowGrammarLegend(!showGrammarLegend)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showGrammarLegend ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Grammar Color Guide (for sentences)
          </button>
          
          {/* On/Off Toggle */}
          <button
            onClick={() => setGrammarHighlightEnabled(!grammarHighlightEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              grammarHighlightEnabled ? 'bg-primary' : 'bg-muted'
            }`}
            aria-label="Toggle grammar highlighting"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                grammarHighlightEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {/* Grammar Legend */}
        {showGrammarLegend && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <GrammarLegend />
            <p className="text-xs text-muted-foreground mt-2">
              {grammarHighlightEnabled ? 'Grammar highlighting is ON' : 'Grammar highlighting is OFF'}
            </p>
          </div>
        )}
      </div>

      {/* Audio Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={playWordAudio}
          className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors shadow-lg"
          aria-label="Play audio"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>

      {/* Word Card */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-4">
        <div className="text-center mb-4">
          {word.kanji && (
            <div className="mb-2">
              <p className="text-3xl font-bold">{word.kanji}</p>
            </div>
          )}
          {!word.kanji && (
            <p className="text-xl text-foreground/80 mb-1">
              {showReading ? word.kana : (
                <button
                  onClick={() => setShowReading(true)}
                  className="text-primary hover:text-primary/80 underline"
                >
                  Show reading
                </button>
              )}
            </p>
          )}
          {word.kanji && showReading && (
            <p className="text-xl text-foreground/80 mb-1">{word.kana}</p>
          )}
          {!showReading && word.kanji && (
            <button
              onClick={() => setShowReading(true)}
              className="text-primary hover:text-primary/80 underline mb-1"
            >
              Show reading
            </button>
          )}
          <p className="text-lg text-muted-foreground">{word.meaning}</p>
          {word.partOfSpeech && (
            <p className="text-sm text-muted-foreground mt-1">
              ({word.partOfSpeech})
              {word.partOfSpeech === 'kanji' && (
                <a 
                  href={`/kanji-details?kanji=${encodeURIComponent(word.kanji || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary hover:text-primary/80 underline text-xs"
                >
                  View stroke order →
                </a>
              )}
            </p>
          )}
        </div>

        {/* Example Sentence */}
        {isTranslating && !translationCancelled && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Loading example from Tatoeba...</p>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <button
                onClick={cancelTranslation}
                className="text-xs px-3 py-1 bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Skip
              </button>
            </div>
            {isSlowConnection && (
              <p className="text-xs text-warning">
                Slow connection detected - this may take a moment
              </p>
            )}
          </div>
        )}
        
        {translatedExample && isValidExample(translatedExample) && !isTranslating && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Example:</p>
                {!translatedExample.reading && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    From Tatoeba
                  </span>
                )}
              </div>
              <button
                onClick={async () => {
                  try {
                    // Use ElevenLabs for sentences (longer text)
                    await TTSManager.speak(
                      translatedExample.japanese,
                      {
                        voice: 'female',
                        provider: 'elevenlabs',
                        context: 'example'
                      }
                    );
                  } catch (error) {
                    console.error('Failed to play example audio:', error);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Play example audio"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            </div>
            <div className="mb-1">
              <GrammarHighlightedText
                text={translatedExample.japanese}
                highlightMode={grammarHighlightEnabled ? "grammar" : "none"}
                showFurigana={true}
                className="text-lg"
                onWordClick={(clickedWord) => {
                  // Optional: Add word lookup functionality here
                  console.log('Word clicked:', clickedWord);
                }}
              />
            </div>
            <p className="text-sm text-foreground/80">{translatedExample.english}</p>
          </div>
        )}

        {/* Skipped loading message */}
        {translationCancelled && !translatedExample?.english && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground italic">
              Example loading skipped. You can continue without it.
            </p>
          </div>
        )}

        {/* Visual Aid (if available) */}
        {word.image && (
          <div className="mt-4">
            <img 
              src={word.image} 
              alt={word.meaning}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Action Prompts */}
      <div className="bg-primary/10 rounded-lg p-4 mb-4">
        <p className="text-sm text-foreground font-medium mb-2">Try these:</p>
        <ul className="text-sm text-foreground/80 space-y-1">
          <li>• Say the word aloud</li>
          <li>• Shadow the example sentence</li>
          <li>• Visualize using this word in context</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={handleMarkDifficult}
          className={`py-3 px-4 rounded-lg transition-colors ${
            isMarkedDifficult
              ? 'bg-warning/10 text-warning border border-warning/30'
              : 'bg-card text-foreground border border-border hover:bg-muted'
          }`}
          disabled={isMarkedDifficult}
        >
          {isMarkedDifficult ? '🔥 Marked difficult' : '🔥 Mark difficult'}
        </button>
        
        <button
          onClick={handleMarkLearned}
          className={`py-3 px-4 rounded-lg transition-colors ${
            isMarkedLearned
              ? 'bg-success/10 text-success border border-success/30'
              : 'bg-card text-foreground border border-border hover:bg-muted'
          }`}
        >
          {isMarkedLearned ? '✅ Learned' : '○ Mark as learned'}
        </button>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {currentIndex > 0 && onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-3 px-4 rounded-lg bg-card text-foreground border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}