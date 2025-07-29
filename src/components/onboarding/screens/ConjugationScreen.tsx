'use client';

import { useState } from 'react';
import { AnimatedWord } from '../components/AnimatedWord';
import { TutorialButton } from '../components/TutorialButton';
import { JapaneseWord } from '@/types';
import { useStrings } from '@/contexts/LanguageContext';

export interface ConjugationScreenProps {
  onNext: () => void;
}

export function ConjugationScreen({ onNext }: ConjugationScreenProps) {
  const strings = useStrings();
  const tutorial = strings?.tutorial;
  const [animationComplete, setAnimationComplete] = useState(false);

  if (!tutorial || !tutorial.conjugation) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const demoWord: JapaneseWord = {
    id: 'demo-taberu',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: tutorial.conjugation.demoWord,
    type: 'Ichidan',
    jlpt: 'N5',
    tags: ['verb', 'daily']
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      {/* Conjugation Section */}
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {tutorial.conjugation.title}
          </h2>
          <p className="text-lg text-foreground/80 leading-relaxed">
            {tutorial.conjugation.description}
            <span className="font-semibold text-primary"> {tutorial.conjugation.emphasis} </span>
            {tutorial.conjugation.continuation}
          </p>
        </div>

        {/* Demo Area */}
        <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-6 space-y-4 shadow-lg">
          <AnimatedWord
            word={demoWord}
            onAnimationComplete={() => setAnimationComplete(true)}
          />
        </div>
      </div>

      {/* Continue Button */}
      {animationComplete && (
        <div className="text-center space-y-2">
          <p className="text-foreground font-medium">
            {tutorial.conjugation.successMessage}
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            {tutorial.conjugation.nextButton}
          </TutorialButton>
        </div>
      )}
    </div>
  );
}