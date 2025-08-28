'use client';

import React, { useState, useEffect } from 'react';
import { WordItem, RecallQuestion } from '../types';
import { GrammarHighlightedText } from '@/components/reading/GrammarHighlightedText';
import { shuffleArray } from '@/utils/shuffle';

interface ActiveRecallDrillProps {
  words: WordItem[];
  currentIndex: number;
  onComplete: () => void;
  onCorrect: () => void;
  onStruggle: (wordId: string) => void;
  allWords?: WordItem[]; // All words in session for generating distractors
}

export default function ActiveRecallDrill({ 
  words, 
  currentIndex, 
  onComplete,
  onCorrect,
  onStruggle,
  allWords = [] 
}: ActiveRecallDrillProps) {
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [question, setQuestion] = useState<RecallQuestion | null>(null);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const currentWord = words[currentIndex];

  useEffect(() => {
    generateQuestion();
    generateMultipleChoiceOptions();
    setUserInput('');
    setShowAnswer(false);
    setConfidence(null);
    setSelectedOption(null);
  }, [currentIndex]);

  const generateQuestion = () => {
    if (!currentWord) return;
    
    // Randomly select question type (only on client side)
    const useGapFill = currentWord.example && (typeof window !== 'undefined' ? Math.random() > 0.5 : false);
    
    if (useGapFill && currentWord.example) {
      // Fill the gap question - don't include the blank in the prompt
      const sentence = currentWord.example.japanese;
      
      setQuestion({
        type: 'fill-gap',
        prompt: currentWord.example.english || '', // Just show the English translation
        correctAnswer: currentWord.kanji || currentWord.kana,
        sentence // Keep original sentence for rendering
      });
    } else {
      // Show English, recall Japanese
      setQuestion({
        type: 'show-english',
        prompt: currentWord.meaning,
        correctAnswer: currentWord.kanji || currentWord.kana
      });
    }
  };

  const generateMultipleChoiceOptions = () => {
    if (!currentWord) return;
    
    const correctAnswer = currentWord.kanji || currentWord.kana || '';
    const distractors: string[] = [];
    
    // Get pool of words for distractors (use allWords if available, otherwise use current words)
    const wordPool = allWords.length > 0 ? allWords : words;
    
    // Filter out the current word and get potential distractors
    const potentialDistractors = wordPool
      .filter(w => w.id !== currentWord.id)
      .map(w => w.kanji || w.kana || '')
      .filter(w => w && w !== correctAnswer);
    
    // Shuffle and pick 3 distractors
    const shuffled = shuffleArray(potentialDistractors);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      distractors.push(shuffled[i]);
    }
    
    // If we don't have enough distractors, add some common wrong answers
    const fallbackDistractors = ['わかりません', 'しりません', 'できません', 'ありません'];
    while (distractors.length < 3) {
      const fallback = fallbackDistractors[distractors.length];
      if (fallback && !distractors.includes(fallback)) {
        distractors.push(fallback);
      } else {
        break;
      }
    }
    
    // Combine correct answer with distractors and shuffle
    const allOptions = [correctAnswer, ...distractors.slice(0, 3)];
    const shuffledOptions = shuffleArray(allOptions);
    
    setMultipleChoiceOptions(shuffledOptions);
  };

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setUserInput(option); // Also set as user input for consistency
    // Auto-reveal after selection
    setTimeout(() => {
      setShowAnswer(true);
    }, 500);
  };

  // Check if input accepts romaji/hiragana/kanji
  const isValidInput = (input: string, answer: string): boolean => {
    const normalizedInput = input.trim().toLowerCase();
    const normalizedAnswer = answer.trim().toLowerCase();
    
    // Direct match
    if (normalizedInput === normalizedAnswer) return true;
    
    // Check if it's the kana version of kanji
    if (currentWord.kana && normalizedInput === currentWord.kana.toLowerCase()) return true;
    
    // Could add romaji conversion here if needed
    // For now, we'll just check exact matches
    
    return false;
  };

  const handleConfidenceSubmit = (level: number) => {
    setConfidence(level);
    
    // Track if user struggled (low confidence)
    if (level <= 2) {
      onStruggle(currentWord.id);
    } else if (level >= 4) {
      onCorrect();
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      onComplete();
    } else {
      // Finished all words
      onComplete();
    }
  };

  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Question */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
        <div className="text-center">
          {question.type === 'show-english' ? (
            <>
              <p className="text-lg text-muted-foreground mb-2">How do you say this in Japanese?</p>
              <div className="text-2xl font-bold">
                <GrammarHighlightedText
                  text={question.prompt}
                  highlightMode="none"
                  showFurigana={false}
                  className="text-2xl font-bold"
                />
              </div>
              {currentWord.partOfSpeech && (
                <p className="text-sm text-muted-foreground mt-1">({currentWord.partOfSpeech})</p>
              )}
            </>
          ) : (
            <div className="text-left">
              <p className="text-lg text-muted-foreground mb-3">Fill in the blank:</p>
              <div className="space-y-4">
                {/* Japanese sentence with blank */}
                <div className="flex flex-wrap items-center gap-2 text-xl">
                  {question.sentence && question.sentence.split(currentWord.kanji || currentWord.kana || '').map((part, idx, arr) => (
                    <React.Fragment key={idx}>
                      {part && <span>{part}</span>}
                      {idx < arr.length - 1 && (
                        <span className={`inline-block min-w-[100px] px-3 py-1 border-b-2 ${
                          showAnswer 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : selectedOption 
                              ? 'border-primary bg-primary/10'
                              : 'border-primary border-dashed'
                        } text-center font-bold`}>
                          {showAnswer ? (currentWord.kanji || currentWord.kana) : selectedOption || '　　　'}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {/* English translation */}
                <p className="text-base text-muted-foreground italic">
                  ({question.prompt})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Input Area */}
      {!showAnswer && (
        <div className="space-y-4">
          {/* Input field with hints */}
          <div>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer here (optional)..."
              className="w-full p-4 border border-border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 You can type in: hiragana (がくせい), kanji (学生), or the exact form shown
            </p>
          </div>

          {/* Multiple choice options */}
          {multipleChoiceOptions.length === 4 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Or tap the correct answer:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {multipleChoiceOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedOption === option
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={handleReveal}
            className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Reveal Answer
          </button>
        </div>
      )}

      {/* Answer Reveal */}
      {showAnswer && !confidence && (
        <div className="space-y-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Correct answer:</p>
            <p className="text-2xl font-bold text-foreground">
              {currentWord.kanji || currentWord.kana}
            </p>
            <p className="text-lg text-muted-foreground">{currentWord.kana}</p>
            {userInput && (
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                <p className="text-lg text-foreground">{userInput}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-3 text-center">
              How confident were you with this word?
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => handleConfidenceSubmit(level)}
                  className={`py-3 rounded-lg border-2 transition-all ${
                    level <= 2
                      ? 'border-destructive/30 hover:bg-destructive/10 hover:border-destructive/40'
                      : level === 3
                      ? 'border-yellow-500/30 hover:bg-yellow-500/10 hover:border-yellow-500/40'
                      : 'border-green-500/30 hover:bg-green-500/10 hover:border-green-500/40'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {level === 1 && '😟'}
                    {level === 2 && '😕'}
                    {level === 3 && '😐'}
                    {level === 4 && '🙂'}
                    {level === 5 && '😊'}
                  </div>
                  <div className="text-xs">
                    {level === 1 && 'Not at all'}
                    {level === 2 && 'Struggled'}
                    {level === 3 && 'Okay'}
                    {level === 4 && 'Good'}
                    {level === 5 && 'Perfect'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      {confidence !== null && (
        <div className="mt-6">
          <button
            onClick={handleNext}
            className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {currentIndex < words.length - 1 ? 'Next Word →' : 'Complete Session →'}
          </button>
        </div>
      )}
    </div>
  );
}