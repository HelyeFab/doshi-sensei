'use client';

import { useState, useEffect, useMemo } from 'react';
import { WordItem, RecognitionQuestion } from '../types';
import { TTSManager } from '@/utils/tts';
import { GrammarHighlightedText } from '@/components/reading/GrammarHighlightedText';

interface RecognitionGameProps {
  words: WordItem[];
  currentIndex: number;
  onComplete: () => void;
  onCorrect: () => void;
  onStruggle: (wordId: string) => void;
}

export default function RecognitionGame({ 
  words, 
  currentIndex, 
  onComplete, 
  onCorrect,
  onStruggle 
}: RecognitionGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [question, setQuestion] = useState<RecognitionQuestion | null>(null);
  
  const currentWord = words[currentIndex];

  // Define playQuestionAudio before using it
  const playQuestionAudio = async () => {
    if (question?.type === 'audio' && currentWord) {
      try {

        await TTSManager.speak(
          currentWord.kana,
          {
            voice: 'female',
            provider: 'google',
            context: 'vocabulary'
          }
        );
      } catch (error) {
        console.error('Failed to play question audio:', error);
      }
    }
  };

  useEffect(() => {
    generateQuestion();
    setSelectedAnswer(null);
    setShowResult(false);
  }, [currentIndex]);

  // Auto-play audio for audio questions
  useEffect(() => {
    if (question?.type === 'audio' && currentWord) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        playQuestionAudio();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [question, currentWord]);

  const generateQuestion = () => {
    if (!currentWord) return;
    
    // Randomly select question type (only on client)
    const types: RecognitionQuestion['type'][] = ['audio', 'meaning', 'sentence'];
    const type = typeof window !== 'undefined' 
      ? types[Math.floor(Math.random() * types.length)]
      : types[0]; // Default to 'audio' during SSR
    
    // Generate distractors (only shuffle on client)
    const distractors = words
      .filter(w => w.id !== currentWord.id)
      .sort(() => typeof window !== 'undefined' ? Math.random() - 0.5 : 0)
      .slice(0, 3);
    
    let newQuestion: RecognitionQuestion;
    
    switch (type) {
      case 'audio':
        // Audio matching: play audio, select the written form
        newQuestion = {
          type: 'audio',
          correctAnswer: currentWord.kanji || currentWord.kana,
          options: [
            currentWord.kanji || currentWord.kana,
            ...distractors.map(d => d.kanji || d.kana)
          ].sort(() => typeof window !== 'undefined' ? Math.random() - 0.5 : 0),
          audioUrl: currentWord.audio || `/api/tts?text=${encodeURIComponent(currentWord.kana)}&lang=ja`
        };
        break;
        
      case 'meaning':
        // Meaning matching: show Japanese, select English meaning
        newQuestion = {
          type: 'meaning',
          correctAnswer: currentWord.meaning,
          options: [
            currentWord.meaning,
            ...distractors.map(d => d.meaning)
          ].sort(() => typeof window !== 'undefined' ? Math.random() - 0.5 : 0)
        };
        break;
        
      case 'sentence':
        // Fill in the blank with correct word
        if (currentWord.example) {
          const sentence = currentWord.example.japanese.replace(
            currentWord.kanji || currentWord.kana,
            '＿＿'
          );
          newQuestion = {
            type: 'sentence',
            correctAnswer: currentWord.kanji || currentWord.kana,
            options: [
              currentWord.kanji || currentWord.kana,
              ...distractors.map(d => d.kanji || d.kana)
            ].sort(() => typeof window !== 'undefined' ? Math.random() - 0.5 : 0),
            sentence
          };
        } else {
          // Fallback to meaning if no example
          generateQuestion();
          return;
        }
        break;
    }
    
    setQuestion(newQuestion);
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    
    if (answer === question?.correctAnswer) {
      onCorrect();
    } else {
      onStruggle(currentWord.id);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      // Move to next word
      onComplete();
    } else {
      // Finished all words, move to next phase
      onComplete();
    }
  };

  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Question */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
        {question.type === 'audio' && (
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">Which word did you hear?</p>
            <button
              onClick={playQuestionAudio}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors mx-auto"
              aria-label="Play audio"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        )}
        
        {question.type === 'meaning' && (
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-2">What does this mean?</p>
            <div className="text-2xl font-bold">
              <GrammarHighlightedText
                text={currentWord.kanji || currentWord.kana}
                highlightMode="none"
                showFurigana={true}
                className="text-2xl font-bold"
              />
            </div>
          </div>
        )}
        
        {question.type === 'sentence' && (
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-2">Fill in the blank</p>
            <p className="text-xl text-foreground">{question.sentence}</p>
          </div>
        )}
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {question.options.map((option, index) => {
          const isCorrect = showResult && option === question.correctAnswer;
          const isWrong = showResult && option === selectedAnswer && option !== question.correctAnswer;
          
          return (
            <button
              key={index}
              onClick={() => !showResult && handleAnswer(option)}
              disabled={showResult}
              className={`p-4 rounded-lg border-2 transition-all ${
                isCorrect
                  ? 'bg-green-500/10 border-green-500 text-green-700'
                  : isWrong
                  ? 'bg-destructive/10 border-destructive text-destructive'
                  : showResult
                  ? 'bg-muted border-border text-muted-foreground'
                  : 'bg-card border-border hover:border-primary hover:bg-primary/10'
              }`}
            >
              <GrammarHighlightedText
                text={option}
                highlightMode="none"
                showFurigana={showResult}
                className="w-full"
              />
            </button>
          );
        })}
      </div>

      {/* Result Feedback */}
      {showResult && (
        <div className={`rounded-lg p-4 mb-4 ${
          selectedAnswer === question.correctAnswer
            ? 'bg-green-500/10 text-green-700'
            : 'bg-destructive/10 text-destructive'
        }`}>
          <p className="font-medium">
            {selectedAnswer === question.correctAnswer
              ? '✅ Correct!'
              : `❌ The correct answer is: ${question.correctAnswer}`}
          </p>
        </div>
      )}

      {/* Next Button */}
      {showResult && (
        <button
          onClick={handleNext}
          className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {currentIndex < words.length - 1 ? 'Next Word →' : 'Continue to Active Recall →'}
        </button>
      )}
    </div>
  );
}