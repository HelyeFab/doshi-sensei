'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord } from '@/types';
import { ExtendedConjugationForms } from '@/types/conjugation-extended';
import { ExtendedConjugationEngine } from '@/utils/conjugation-extended';

export interface AnimatedWordProps {
  word: JapaneseWord;
  onAnimationComplete?: () => void;
  className?: string;
}

export function AnimatedWord({ word, onAnimationComplete, className }: AnimatedWordProps) {
  const [phase, setPhase] = useState<'word' | 'processing' | 'results'>('word');
  const [visibleConjugations, setVisibleConjugations] = useState<string[]>([]);
  const [conjugations, setConjugations] = useState<ExtendedConjugationForms | null>(null);

  useEffect(() => {
    const conjugationResult = ExtendedConjugationEngine.conjugate(word);
    setConjugations(conjugationResult);
  }, [word]);

  const startAnimation = async () => {
    setPhase('processing');

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    setPhase('results');

    // Animate conjugations appearing one by one
    if (conjugations) {
      const forms = ['present', 'past', 'polite', 'teForm', 'negative'] as const;
      for (let i = 0; i < forms.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setVisibleConjugations(prev => [...prev, forms[i]]);
      }

      // Wait a bit then call completion callback
      setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 500);
    }
  };

  const resetAnimation = () => {
    setPhase('word');
    setVisibleConjugations([]);
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Input Word */}
      <div className="text-center">
        <div className="inline-block bg-blue-500/20 border border-blue-500/40 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {word.kanji}
          </div>
          <div className="text-sm text-foreground/90">
            {word.kana} - "{word.meaning}"
          </div>
        </div>
      </div>

      {/* Processing Animation */}
      {phase === 'processing' && (
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {phase === 'results' && conjugations && (
        <div className="grid grid-cols-2 gap-3">
          {visibleConjugations.map((form, index) => {
            const formKey = form as keyof ConjugationForms;
            const conjugatedForm = conjugations[formKey];

            return (
              <div
                key={form}
                className="bg-green-500/20 border border-green-500/40 rounded p-3 text-center"
                style={{ 
                  animation: 'slideIn 0.3s ease-out forwards',
                  animationDelay: `${index * 0.1}s` 
                }}
              >
                <div className="text-sm text-green-400 font-medium">
                  {getFormLabel(formKey)}
                </div>
                <div className="text-lg font-bold text-foreground">
                  {conjugatedForm}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {phase === 'word' && (
        <div className="text-center">
          <button
            onClick={startAnimation}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            🪄 Cast Conjugation Spell!
          </button>
        </div>
      )}

      {phase === 'results' && (
        <div className="text-center">
          <button
            onClick={resetAnimation}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            ↺ Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to get form labels
function getFormLabel(form: keyof ConjugationForms): string {
  const labels: Record<string, string> = {
    present: 'Present',
    past: 'Past',
    negative: 'Negative',
    polite: 'Polite',
    teForm: 'Te-form',
  };

  return labels[form] || form;
}