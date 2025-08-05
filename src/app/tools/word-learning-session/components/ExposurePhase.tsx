'use client';

import { useState, useEffect } from 'react';
import { WordItem } from '../types';
import { learnedWordsStorage } from '../services/learnedWordsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { TTSManager } from '@/utils/tts';
import { GrammarHighlightedText, GrammarLegend } from '@/components/reading/GrammarHighlightedText';

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
  const [showReading, setShowReading] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isMarkedDifficult, setIsMarkedDifficult] = useState(false);
  const [isMarkedLearned, setIsMarkedLearned] = useState(isLearned);
  const [highlightMode, setHighlightMode] = useState<'none' | 'grammar'>('grammar');
  const [showGrammarLegend, setShowGrammarLegend] = useState(false);

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
    
    // Auto-play audio on load
    if (word.audio) {
      playWordAudio();
    }
  }, [word.id, isLearned]);

  const playWordAudio = async () => {
    try {
      // Use the proper TTS system
      // For vocabulary words, use Google TTS (short audio)
      await TTSManager.speak(
        word.kana || word.kanji || '', 
        {
          voice: 'female',
          provider: 'google',
          context: 'vocabulary'
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
          Grammar Color Guide
        </button>
        
        {/* Grammar Legend */}
        {showGrammarLegend && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <GrammarLegend />
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
            <p className="text-sm text-muted-foreground mt-1">({word.partOfSpeech})</p>
          )}
        </div>

        {/* Example Sentence */}
        {word.example && isValidExample(word.example) && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Example:</p>
                {!word.example.reading && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    From Tatoeba
                  </span>
                )}
              </div>
              <button
                onClick={async () => {
                  try {
                    // Use ElevenLabs for sentences
                    await TTSManager.speak(
                      word.example.japanese,
                      {
                        voice: 'female',
                        provider: 'elevenlabs',
                        context: 'vocabulary'
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
                text={word.example.japanese}
                highlightMode="grammar"
                showFurigana={true}
                className="text-lg"
                onWordClick={(clickedWord) => {
                  // Optional: Add word lookup functionality here
                  console.log('Word clicked:', clickedWord);
                }}
              />
            </div>
            <p className="text-sm text-foreground/80">{word.example.english}</p>
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
              ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/30'
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
              ? 'bg-green-500/10 text-green-700 border border-green-500/30'
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