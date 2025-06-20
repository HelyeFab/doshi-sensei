'use client';

import { useState } from 'react';
import { TutorialButton } from '../components/TutorialButton';
import { JapaneseWord } from '@/types';
import { ConjugationEngine } from '@/utils/conjugation';

export interface PracticeScreenProps {
  onNext: () => void;
}

export function PracticeScreen({ onNext }: PracticeScreenProps) {
  const [currentMode, setCurrentMode] = useState<'intro' | 'practice' | 'drill' | 'complete'>('intro');
  const [drillQuestion, setDrillQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const demoWord: JapaneseWord = {
    id: 'demo-iku',
    kanji: '行く',
    kana: 'いく',
    romaji: 'iku',
    meaning: 'to go',
    type: 'Irregular',
    jlpt: 'N5',
    tags: ['verb', 'movement']
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runPracticeDemo = async () => {
    setCurrentMode('practice');
    await sleep(2000);
    setCurrentMode('drill');

    // Generate drill question with hardcoded reliable options
    const question = {
      word: demoWord,
      targetForm: 'past',
      correctAnswer: '行った',
      options: ['行った', 'いかった', 'いきた', 'いくった']
    };
    setDrillQuestion(question);
  };

  const handleAnswerSelect = async (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    await sleep(1500);
    setCurrentMode('complete');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Two Ways to Master Japanese! 🥋
        </h2>
        <p className="text-muted-foreground">
          Choose your fighter: <span className="font-semibold text-blue-400">Study Mode</span> (the gentle sensei)
          or <span className="font-semibold text-red-400">Drill Mode</span> (the drill sergeant).
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 border rounded-lg text-center transition-all ${
          currentMode === 'practice'
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-border hover:border-blue-500/50'
        }`}>
          <div className="text-3xl mb-2">📚</div>
          <div className="font-medium text-blue-400">Practice Mode</div>
          <div className="text-xs text-muted-foreground mt-1">
            Study all conjugations peacefully
          </div>
        </div>

        <div className={`p-4 border rounded-lg text-center transition-all ${
          currentMode === 'drill'
            ? 'border-red-500 bg-red-500/10'
            : 'border-border hover:border-red-500/50'
        }`}>
          <div className="text-3xl mb-2">⚡</div>
          <div className="font-medium text-red-400">Drill Mode</div>
          <div className="text-xs text-muted-foreground mt-1">
            Test yourself with quizzes
          </div>
        </div>
      </div>

      {/* Demo Area */}
      <div className="bg-card border border-border rounded-lg p-6 min-h-[300px]">
        {currentMode === 'intro' && (
          <div className="text-center space-y-4 py-8">
            <div className="text-4xl">🤔</div>
            <p className="text-muted-foreground">
              Let's see both modes in action with the tricky verb "行く" (to go)
            </p>
            <TutorialButton
              onClick={runPracticeDemo}
              variant="secondary"
            >
              🎬 Start Demo!
            </TutorialButton>
          </div>
        )}

        {currentMode === 'practice' && (
          <div className="space-y-4 animate-slideIn">
            <div className="text-center">
              <div className="text-2xl japanese-text font-bold text-foreground mb-2">
                {demoWord.kanji}
              </div>
              <div className="text-muted-foreground">
                {demoWord.kana} - "{demoWord.meaning}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['Present: 行く', 'Past: 行った', 'Polite: 行きます', 'Te-form: 行って'].map((form, index) => (
                <div
                  key={form}
                  className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-center animate-slideIn"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="text-sm text-blue-400 font-medium">
                    {form.split(': ')[0]}
                  </div>
                  <div className="japanese-text text-lg font-bold">
                    {form.split(': ')[1]}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              📖 Study all forms at your own pace...
            </div>
          </div>
        )}

        {currentMode === 'drill' && drillQuestion && (
          <div className="space-y-4 animate-slideIn">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Quiz Time!</div>
              <div className="text-lg mb-4">
                <span className="japanese-text font-bold">{drillQuestion.word.kanji}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="text-red-400 font-bold">Past form?</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {drillQuestion.options.map((option: string, index: number) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === drillQuestion.correctAnswer;
                const showColors = showResult;

                return (
                  <button
                    key={index}
                    onClick={() => !showResult && handleAnswerSelect(option)}
                    disabled={showResult}
                    className={`p-3 border rounded text-center transition-all ${
                      showColors
                        ? isCorrect
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : isSelected
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-muted border-border text-muted-foreground'
                        : 'bg-background border-border hover:border-primary hover:bg-primary/10'
                    }`}
                  >
                    <div className="japanese-text font-bold">{option}</div>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <div className="text-center">
                <p className={`font-medium ${
                  selectedAnswer === drillQuestion.correctAnswer
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {selectedAnswer === drillQuestion.correctAnswer
                    ? '🎉 Correct! You nailed it!'
                    : '❌ Close! The answer was ' + drillQuestion.correctAnswer
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {currentMode === 'complete' && (
        <div className="text-center space-y-4">
          <div className="text-4xl">🏆</div>
          <p className="text-primary font-medium">
            Now you've seen both learning styles in action!
          </p>
          <p className="text-sm text-muted-foreground">
            Practice Mode = detailed study • Drill Mode = quick testing
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            I'm Ready to Learn! 🚀
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
