'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordItem } from '../types';
import { TTSManager } from '@/utils/tts';
import { shuffleArray } from '@/utils/shuffle';

interface AudioMatchingProps {
  words: WordItem[];
  onComplete: () => void;
  onCorrect: () => void;
  onStruggle: (wordId: string) => void;
}

interface MatchOption {
  id: string;
  word: WordItem;
  isMatched: boolean;
}

export default function AudioMatching({ 
  words, 
  onComplete,
  onCorrect,
  onStruggle
}: AudioMatchingProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState<Set<string>>(new Set());
  const [currentOptions, setCurrentOptions] = useState<MatchOption[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Get 4-5 options for current round
  useEffect(() => {
    if (currentWordIndex >= words.length) {
      onComplete();
      return;
    }

    const currentWord = words[currentWordIndex];
    const otherWords = words.filter((_, idx) => idx !== currentWordIndex);
    
    // Shuffle and pick 3-4 other words as distractors
    const shuffled = shuffleArray(otherWords);
    const distractors = shuffled.slice(0, Math.min(3, otherWords.length));
    
    // Combine with current word and shuffle
    const options = [currentWord, ...distractors].map(w => ({
      id: w.id,
      word: w,
      isMatched: false
    }));
    
    setCurrentOptions(shuffleArray(options));
    setSelectedAudio(null);
    setSelectedMeaning(null);
    setIsCorrect(null);
    setWrongAttempts(new Set());
  }, [currentWordIndex, words]);

  const playAudio = async (option: MatchOption) => {
    if (matchedPairs.has(option.id) || isPlayingAudio) return;
    
    setSelectedAudio(option.id);
    setIsPlayingAudio(true);
    
    try {
      // Use TTS to play the Japanese word
      await TTSManager.speak(
        option.word.kana || option.word.kanji || '',
        {
          voice: 'female',
          provider: 'google',
          context: 'vocabulary'
        }
      );
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const selectMeaning = (optionId: string) => {
    if (matchedPairs.has(optionId) || !selectedAudio) return;
    
    setSelectedMeaning(optionId);
    
    // Check if match is correct
    if (selectedAudio === optionId) {
      setIsCorrect(true);
      setMatchedPairs(new Set([...matchedPairs, optionId]));
      onCorrect();
      
      // Move to next word after success animation
      setTimeout(() => {
        if (currentWordIndex < words.length - 1) {
          setCurrentWordIndex(prev => prev + 1);
        } else {
          // All words completed
          onComplete();
        }
      }, 1500);
    } else {
      setIsCorrect(false);
      const wrongWord = currentOptions.find(o => o.id === selectedAudio);
      if (wrongWord) {
        onStruggle(wrongWord.word.id);
      }
      setWrongAttempts(new Set([...wrongAttempts, `${selectedAudio}-${optionId}`]));
      
      // Reset selections after showing error
      setTimeout(() => {
        setSelectedAudio(null);
        setSelectedMeaning(null);
        setIsCorrect(null);
      }, 1000);
    }
  };

  const currentWord = words[currentWordIndex];
  const progress = ((currentWordIndex + 1) / words.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Audio Matching Progress</span>
          <span>{currentWordIndex + 1} / {words.length}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Match the Sound to the Meaning</h2>
        <p className="text-muted-foreground">Click a sound button, then select its English meaning</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Audio Buttons */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Japanese Audio</h3>
          <div className="space-y-3">
            {currentOptions.map((option, index) => (
              <motion.button
                key={`audio-${option.id}`}
                onClick={() => playAudio(option)}
                disabled={matchedPairs.has(option.id) || isPlayingAudio}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all flex items-center
                  ${matchedPairs.has(option.id) 
                    ? 'bg-green-500/10 border-green-500/30 opacity-50 cursor-not-allowed' 
                    : selectedAudio === option.id
                    ? 'bg-primary/10 border-primary shadow-md'
                    : isPlayingAudio
                    ? 'bg-muted border-border cursor-wait'
                    : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                  }
                `}
                whileHover={!matchedPairs.has(option.id) && !isPlayingAudio ? { scale: 1.02 } : {}}
                whileTap={!matchedPairs.has(option.id) && !isPlayingAudio ? { scale: 0.98 } : {}}
              >
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                  />
                </svg>
                <span className="font-medium">Sound {index + 1}</span>
                {isPlayingAudio && selectedAudio === option.id && (
                  <span className="ml-auto text-xs text-muted-foreground animate-pulse">Playing...</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Meaning Options */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">English Meanings</h3>
          <div className="space-y-3">
            {currentOptions.map((option) => {
              const isWrong = selectedAudio && wrongAttempts.has(`${selectedAudio}-${option.id}`);
              
              return (
                <motion.button
                  key={`meaning-${option.id}`}
                  onClick={() => selectMeaning(option.id)}
                  disabled={matchedPairs.has(option.id) || !selectedAudio}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all text-left min-h-[60px] flex items-center
                    ${matchedPairs.has(option.id) 
                      ? 'bg-green-500/10 border-green-500/30 opacity-50 cursor-not-allowed' 
                      : selectedMeaning === option.id
                      ? isCorrect === true
                        ? 'bg-green-500/10 border-green-500 shadow-md'
                        : isCorrect === false
                        ? 'bg-destructive/10 border-destructive shadow-md'
                        : 'bg-primary/10 border-primary shadow-md'
                      : isWrong
                      ? 'bg-destructive/10 border-destructive/30'
                      : !selectedAudio
                      ? 'bg-muted/50 border-border/50 cursor-not-allowed opacity-60'
                      : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                    }
                  `}
                  whileHover={!matchedPairs.has(option.id) && selectedAudio ? { scale: 1.02 } : {}}
                  whileTap={!matchedPairs.has(option.id) && selectedAudio ? { scale: 0.98 } : {}}
                >
                  <span className="font-medium text-foreground">{option.word.meaning}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feedback Message */}
      <AnimatePresence>
        {isCorrect !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`
              mt-6 p-4 rounded-lg text-center font-medium
              ${isCorrect ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'}
            `}
          >
            {isCorrect ? '✓ Correct! Well done!' : '✗ Not quite. Try again!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current word being tested (for debugging/clarity) */}
      {currentWord && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            Testing word {currentWordIndex + 1} of {words.length}: {currentWord.kanji || currentWord.kana}
          </p>
        </div>
      )}
    </div>
  );
}