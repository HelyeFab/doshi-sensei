'use client';

import { useState } from 'react';
import { TutorialButton } from '../components/TutorialButton';
import { JapaneseWord } from '@/types';
import { ConjugationEngine } from '@/utils/conjugation';
import { useStrings } from '@/contexts/LanguageContext';

export interface PracticeScreenProps {
  onNext: () => void;
}

export function PracticeScreen({ onNext }: PracticeScreenProps) {
  const strings = useStrings();
  const tutorial = strings.tutorial;
  const [currentMode, setCurrentMode] = useState<'intro' | 'practice' | 'drill' | 'complete'>('intro');
  const [drillQuestion, setDrillQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  // Safety check
  if (!tutorial || !tutorial.practice) {
    return <div>Loading...</div>;
  }

  const demoWord: JapaneseWord = {
    id: 'demo-iku',
    kanji: '行く',
    kana: 'いく',
    romaji: 'iku',
    meaning: tutorial.practice.demoWord,
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
        <h2 className="text-2xl font-bold text-white">
          {tutorial.practice.title}
        </h2>
        <p className="text-white/90">
          {tutorial.practice.description}
          <span className="font-semibold text-blue-400">{tutorial.practice.studyMode.tagline}</span>
          {' '}<span className="text-white/90">or</span>{' '}
          <span className="font-semibold text-red-400">{tutorial.practice.drillMode.tagline}</span>
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 border rounded-lg text-center transition-all ${
          currentMode === 'practice'
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/20 hover:border-blue-500/50'
        }`}>
          <div className="text-3xl mb-2">📚</div>
          <div className="font-medium text-blue-400">{tutorial.practice.studyMode.name}</div>
          <div className="text-xs text-white/70 mt-1">
            {tutorial.practice.studyMode.subtitle}
          </div>
        </div>

        <div className={`p-4 border rounded-lg text-center transition-all ${
          currentMode === 'drill'
            ? 'border-red-500 bg-red-500/10'
            : 'border-white/20 hover:border-red-500/50'
        }`}>
          <div className="text-3xl mb-2">⚡</div>
          <div className="font-medium text-red-400">{tutorial.practice.drillMode.name}</div>
          <div className="text-xs text-white/70 mt-1">
            {tutorial.practice.drillMode.subtitle}
          </div>
        </div>
      </div>

      {/* Demo Area */}
      <div className="bg-purple-100/20 border border-purple-300/30 rounded-lg p-6 min-h-[300px] relative">
        {currentMode === 'intro' && (
          <div className="text-center space-y-4 py-8">
            <div className="text-4xl">🤔</div>
            <p className="text-gray-700">
              {tutorial.practice.demoIntro}
            </p>
            <TutorialButton
              onClick={runPracticeDemo}
              variant="secondary"
            >
              {tutorial.practice.demoButton}
            </TutorialButton>
          </div>
        )}

        {currentMode === 'practice' && (
          <div className="space-y-4 animate-slideIn">
            <div className="text-center">
              <div className="text-2xl japanese-text font-bold text-gray-800 mb-2">
                {demoWord.kanji}
              </div>
              <div className="text-gray-700">
                {demoWord.kana} - "{demoWord.meaning}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                `${tutorial.practice.forms.present} 行く`,
                `${tutorial.practice.forms.past} 行った`,
                `${tutorial.practice.forms.polite} 行きます`,
                `${tutorial.practice.forms.teForm} 行って`
              ].map((form, index) => (
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

            {/* Study note removed */}
          </div>
        )}

        {currentMode === 'drill' && drillQuestion && (
          <div className="space-y-4 animate-slideIn">
            <div className="text-center">
              <div className="text-sm text-gray-700 mb-2">{tutorial.practice.quizHeader}</div>
              <div className="text-lg mb-4">
                <span className="japanese-text font-bold text-gray-800">{drillQuestion.word.kanji}</span>
                <span className="text-gray-600 mx-2">→</span>
                <span className="text-red-500 font-bold">{tutorial.practice.quizQuestion}</span>
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
                    ? tutorial.practice.correctMessage
                    : `${tutorial.practice.incorrectMessage} ${drillQuestion.correctAnswer}`
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
          <p className="text-white font-medium">
            {tutorial.practice.completionTitle}
          </p>
          <p className="text-sm text-white/80">
            {tutorial.practice.modeSummary}
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            {tutorial.practice.readyButton}
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
