'use client';

import { useState, useEffect } from 'react';
import { WordItem, RecallQuestion } from '../types';

interface ActiveRecallDrillProps {
  words: WordItem[];
  currentIndex: number;
  onComplete: () => void;
  onCorrect: () => void;
  onStruggle: (wordId: string) => void;
}

export default function ActiveRecallDrill({ 
  words, 
  currentIndex, 
  onComplete,
  onCorrect,
  onStruggle 
}: ActiveRecallDrillProps) {
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [question, setQuestion] = useState<RecallQuestion | null>(null);
  
  const currentWord = words[currentIndex];

  useEffect(() => {
    generateQuestion();
    setUserInput('');
    setShowAnswer(false);
    setConfidence(null);
  }, [currentIndex]);

  const generateQuestion = () => {
    if (!currentWord) return;
    
    // Randomly select question type
    const useGapFill = currentWord.example && Math.random() > 0.5;
    
    if (useGapFill && currentWord.example) {
      // Fill the gap question
      const sentence = currentWord.example.japanese.replace(
        currentWord.kanji || currentWord.kana,
        '＿＿＿＿'
      );
      
      setQuestion({
        type: 'fill-gap',
        prompt: `Fill in the blank:\n${sentence}\n(${currentWord.example.english})`,
        correctAnswer: currentWord.kanji || currentWord.kana,
        sentence
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

  const handleReveal = () => {
    setShowAnswer(true);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <div className="text-center">
          {question.type === 'show-english' ? (
            <>
              <p className="text-lg text-gray-700 mb-2">How do you say this in Japanese?</p>
              <p className="text-2xl font-bold text-gray-900">{question.prompt}</p>
              {currentWord.partOfSpeech && (
                <p className="text-sm text-gray-500 mt-1">({currentWord.partOfSpeech})</p>
              )}
            </>
          ) : (
            <div className="text-left">
              <p className="text-lg text-gray-700 mb-3">Fill in the blank:</p>
              <p className="text-xl text-gray-900 whitespace-pre-line">{question.prompt}</p>
            </div>
          )}
        </div>
      </div>

      {/* User Input Area */}
      {!showAnswer && (
        <div className="space-y-4">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your answer here (optional)..."
            className="w-full p-4 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={handleReveal}
            className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Reveal Answer
          </button>
        </div>
      )}

      {/* Answer Reveal */}
      {showAnswer && !confidence && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Correct answer:</p>
            <p className="text-2xl font-bold text-gray-900">
              {currentWord.kanji || currentWord.kana}
            </p>
            <p className="text-lg text-gray-700">{currentWord.kana}</p>
            {userInput && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Your answer:</p>
                <p className="text-lg text-gray-800">{userInput}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-700 mb-3 text-center">
              How confident were you with this word?
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => handleConfidenceSubmit(level)}
                  className={`py-3 rounded-lg border-2 transition-all ${
                    level <= 2
                      ? 'border-red-300 hover:bg-red-50 hover:border-red-400'
                      : level === 3
                      ? 'border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400'
                      : 'border-green-300 hover:bg-green-50 hover:border-green-400'
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
            className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {currentIndex < words.length - 1 ? 'Next Word →' : 'Complete Session →'}
          </button>
        </div>
      )}
    </div>
  );
}