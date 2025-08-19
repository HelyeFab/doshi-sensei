'use client';

import { useState, useEffect } from 'react';
import { KanjiWithExamples, TestType, TestResult, MultipleChoiceQuestion } from '../types';
import { KanjiTTSButton } from '@/components/ui/TTSButton';

interface Round2TestProps {
  kanji: KanjiWithExamples;
  allKanji: KanjiWithExamples[];
  currentIndex: number;
  totalCount: number;
  testType: TestType;
  onAnswer: (result: TestResult) => void;
  onNext: () => void;
}

export default function Round2Test({
  kanji,
  allKanji,
  currentIndex,
  totalCount,
  testType,
  onAnswer,
  onNext
}: Round2TestProps) {
  const [question, setQuestion] = useState<MultipleChoiceQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  useEffect(() => {
    generateQuestion();
    setSelectedAnswer(null);
    setShowResult(false);
  }, [kanji, testType]);

  const generateQuestion = () => {
    let questionText = '';
    let correctAnswer = '';
    let options: string[] = [];

    switch (testType) {
      case 'meaning':
        questionText = 'What is the meaning of this kanji?';
        correctAnswer = kanji.meaning;
        options = generateMeaningOptions(kanji, allKanji);
        break;
      
      case 'kun':
        questionText = 'What is the kun-yomi reading?';
        correctAnswer = kanji.kunyomi.join('、');
        options = generateReadingOptions(kanji.kunyomi, allKanji, 'kun');
        break;
      
      case 'on':
        questionText = 'What is the on-yomi reading?';
        correctAnswer = kanji.onyomi.join('、');
        options = generateReadingOptions(kanji.onyomi, allKanji, 'on');
        break;
    }

    // Shuffle options
    const shuffled = shuffleArray([...options]);
    const correctIndex = shuffled.indexOf(correctAnswer);

    setQuestion({
      kanji: kanji.kanji,
      questionType: testType,
      question: questionText,
      options: shuffled,
      correctAnswer,
      correctIndex
    });
  };

  const generateMeaningOptions = (correct: KanjiWithExamples, all: KanjiWithExamples[]): string[] => {
    const options = [correct.meaning];
    const others = all
      .filter(k => k.kanji !== correct.kanji && k.meaning !== correct.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(k => k.meaning);
    
    return [...options, ...others];
  };

  const generateReadingOptions = (
    correctReadings: string[], 
    all: KanjiWithExamples[], 
    type: 'kun' | 'on'
  ): string[] => {
    const correct = correctReadings.join('、');
    const options = [correct];
    
    const others = all
      .filter(k => k.kanji !== kanji.kanji)
      .map(k => type === 'kun' ? k.kunyomi.join('、') : k.onyomi.join('、'))
      .filter(r => r && r !== correct && r !== '')
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // If we don't have enough options, add some dummy ones
    while (options.length + others.length < 4) {
      if (type === 'kun') {
        others.push(['さむい', 'あたらしい', 'ふるい', 'たかい'][options.length + others.length - 1]);
      } else {
        others.push(['コウ', 'ショウ', 'ダイ', 'チュウ'][options.length + others.length - 1]);
      }
    }
    
    return [...options, ...others.slice(0, 3)];
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAnswerClick = (index: number) => {
    if (showResult) return;
    
    setSelectedAnswer(index);
    setShowResult(true);
    
    const correct = index === question?.correctIndex;
    setWasCorrect(correct);
    
    // Report the result
    onAnswer({
      questionType: testType,
      wasCorrect: correct,
      userAnswer: question?.options[index] || '',
      correctAnswer: question?.correctAnswer || ''
    });
  };

  const handleNext = () => {
    onNext();
  };

  if (!question) return null;

  const getButtonClass = (index: number) => {
    if (!showResult) {
      return 'bg-card hover:bg-muted/50 text-foreground border-border';
    }
    
    if (index === question.correctIndex) {
      return 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400';
    }
    
    if (index === selectedAnswer && !wasCorrect) {
      return 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-400';
    }
    
    return 'bg-card text-muted-foreground border-border opacity-50';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-24 pb-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Round 2: Test ({currentIndex + 1}/{totalCount})
            </h2>
          </div>
        </div>
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content with mobile padding */}
      <div className="flex-1 overflow-y-auto mobile-nav-padding">
        <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
          {/* Kanji Display */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <div className="relative inline-block">
              <div className="text-8xl font-bold text-foreground mb-4">
                {kanji.kanji}
              </div>
              {/* TTS Button for Kanji - only show for reading questions */}
              {(testType === 'kun' || testType === 'on') && (
                <div className="absolute -right-14 top-1/2 -translate-y-1/2">
                  <KanjiTTSButton 
                    kanji={kanji.kanji}
                    reading={testType === 'kun' ? kanji.kunyomi.join('、') : kanji.onyomi.join('、')}
                    readingType={testType}
                    size="md"
                    variant="pill"
                  />
                </div>
              )}
            </div>
            <p className="text-lg text-muted-foreground">
              {question.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                onClick={() => !showResult && handleAnswerClick(index)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${getButtonClass(index)} ${showResult ? 'cursor-default' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{option}</span>
                  <div className="flex items-center gap-2">
                    {/* TTS Button - using div wrapper to prevent event bubbling */}
                    {(testType === 'kun' || testType === 'on') && showResult && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <KanjiTTSButton 
                          kanji={kanji.kanji}
                          reading={option}
                          readingType={testType}
                          size="sm"
                          variant="minimal"
                        />
                      </div>
                    )}
                    {showResult && index === question.correctIndex && (
                      <span className="text-green-600">✓</span>
                    )}
                    {showResult && index === selectedAnswer && !wasCorrect && (
                      <span className="text-red-600">✗</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Result Message */}
          {showResult && (
            <div className={`p-4 rounded-lg ${wasCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <p className={`text-center font-medium ${wasCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {wasCorrect ? 'Correct! 🎉' : `Incorrect. The answer is: ${question.correctAnswer}`}
              </p>
              {!wasCorrect && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  This kanji will be reviewed again
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation with bottom padding for virtual companion */}
      {showResult && (
        <div className="border-t border-border bg-card p-4 safe-area-pb">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {currentIndex === totalCount - 1 ? 'Start Evaluation Round' : 'Next Question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}