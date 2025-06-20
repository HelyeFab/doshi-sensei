'use client';

import { useState } from 'react';
import { AnimatedWord } from '../components/AnimatedWord';
import { TutorialButton } from '../components/TutorialButton';
import { JapaneseWord } from '@/types';

export interface ConjugationScreenProps {
  onNext: () => void;
}

export function ConjugationScreen({ onNext }: ConjugationScreenProps) {
  const [animationComplete, setAnimationComplete] = useState(false);

  const demoWord: JapaneseWord = {
    id: 'demo-taberu',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: 'to eat',
    type: 'Ichidan',
    jlpt: 'N5',
    tags: ['verb', 'daily']
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Watch the Magic Happen ✨
        </h2>
        <p className="text-muted-foreground">
          Our conjugation engine is like a grammar wizard—it takes one word and
          <span className="font-semibold text-primary"> POOF! </span>
          Transforms it into dozens of forms.
        </p>
      </div>

      {/* Demo Area */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <AnimatedWord
          word={demoWord}
          onAnimationComplete={() => setAnimationComplete(true)}
        />
      </div>

      {/* Continue Button */}
      {animationComplete && (
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">
            🎉 Ta-da! One word became five forms instantly!
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            That's Impressive! What's Next? →
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
