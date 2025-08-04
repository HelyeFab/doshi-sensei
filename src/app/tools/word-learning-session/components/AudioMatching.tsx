'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionWord } from '../services/learnedWordsStorage';

interface AudioMatchingProps {
  words: SessionWord[];
  currentIndex: number;
  totalWords: number;
  onComplete: () => void;
}

interface MatchOption {
  id: string;
  english: string;
  audioUrl: string;
  isMatched: boolean;
}

export default function AudioMatching({ 
  words, 
  currentIndex, 
  totalWords, 
  onComplete 
}: AudioMatchingProps) {
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState<Set<string>>(new Set());
  const [currentOptions, setCurrentOptions] = useState<MatchOption[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Get 4-5 options for current round
  useEffect(() => {
    const currentWord = words[currentIndex];
    const otherWords = words.filter((_, idx) => idx !== currentIndex);
    
    // Shuffle and pick 3-4 other words
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, Math.min(3 + Math.floor(Math.random() * 2), otherWords.length));
    
    // Combine with current word and shuffle
    const options = [currentWord, ...distractors].map(w => ({
      id: w.id,
      english: w.english,
      audioUrl: w.audioUrl,
      isMatched: false
    }));
    
    setCurrentOptions(options.sort(() => Math.random() - 0.5));
    setSelectedAudio(null);
    setSelectedMeaning(null);
    setIsCorrect(null);
    setWrongAttempts(new Set());
  }, [currentIndex, words]);

  const playAudio = (audioUrl: string, optionId: string) => {
    if (matchedPairs.has(optionId)) return;
    
    setSelectedAudio(optionId);
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  };

  const selectMeaning = (optionId: string) => {
    if (matchedPairs.has(optionId)) return;
    
    setSelectedMeaning(optionId);
    
    if (selectedAudio) {
      // Check if match is correct
      if (selectedAudio === optionId) {
        setIsCorrect(true);
        setMatchedPairs(new Set([...matchedPairs, optionId]));
        
        // Auto-advance after success animation
        setTimeout(() => {
          if (currentIndex < totalWords - 1) {
            onComplete();
          } else {
            // All words completed
            onComplete();
          }
        }, 1500);
      } else {
        setIsCorrect(false);
        setWrongAttempts(new Set([...wrongAttempts, `${selectedAudio}-${optionId}`]));
        
        // Reset selections after showing error
        setTimeout(() => {
          setSelectedAudio(null);
          setSelectedMeaning(null);
          setIsCorrect(null);
        }, 1000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Audio Matching Progress</span>
          <span>{currentIndex + 1} / {totalWords}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Match the Sound to the Meaning</h2>
        <p className="text-gray-600">Click a sound button, then select its English meaning</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Audio Buttons */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Japanese Audio</h3>
          <div className="space-y-3">
            {currentOptions.map((option, index) => (
              <motion.button
                key={`audio-${option.id}`}
                onClick={() => playAudio(option.audioUrl, option.id)}
                disabled={matchedPairs.has(option.id)}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all
                  ${matchedPairs.has(option.id) 
                    ? 'bg-green-50 border-green-300 opacity-50 cursor-not-allowed' 
                    : selectedAudio === option.id
                    ? 'bg-blue-50 border-blue-400 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
                whileHover={!matchedPairs.has(option.id) ? { scale: 1.02 } : {}}
                whileTap={!matchedPairs.has(option.id) ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                    />
                  </svg>
                  <span className="font-medium">Sound {index + 1}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Meaning Options */}
        <div>
          <h3 className="text-lg font-semibold mb-4">English Meanings</h3>
          <div className="space-y-3">
            {currentOptions.map((option) => {
              const isWrong = selectedAudio && wrongAttempts.has(`${selectedAudio}-${option.id}`);
              
              return (
                <motion.button
                  key={`meaning-${option.id}`}
                  onClick={() => selectMeaning(option.id)}
                  disabled={matchedPairs.has(option.id) || !selectedAudio}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all text-left
                    ${matchedPairs.has(option.id) 
                      ? 'bg-green-50 border-green-300 opacity-50 cursor-not-allowed' 
                      : selectedMeaning === option.id
                      ? isCorrect === true
                        ? 'bg-green-50 border-green-400 shadow-md'
                        : isCorrect === false
                        ? 'bg-red-50 border-red-400 shadow-md'
                        : 'bg-purple-50 border-purple-400 shadow-md'
                      : isWrong
                      ? 'bg-red-50 border-red-300'
                      : !selectedAudio
                      ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                  whileHover={!matchedPairs.has(option.id) && selectedAudio ? { scale: 1.02 } : {}}
                  whileTap={!matchedPairs.has(option.id) && selectedAudio ? { scale: 0.98 } : {}}
                >
                  <span className="font-medium">{option.english}</span>
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
              ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            `}
          >
            {isCorrect ? '✓ Correct! Well done!' : '✗ Not quite. Try again!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}