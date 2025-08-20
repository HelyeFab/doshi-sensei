'use client';

import { useState, useEffect } from 'react';
import { kanaData, KanaCharacter, playKanaAudio } from '@/data/kanaData';

interface KanaStudyModalProps {
  isOpen: boolean;
  selectedKanaIds: string[];
  studyType: 'hiragana' | 'katakana';
  onClose: (completed: boolean) => void;
}

export default function KanaStudyModal({
  isOpen,
  selectedKanaIds,
  studyType,
  onClose
}: KanaStudyModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyKana, setStudyKana] = useState<KanaCharacter[]>([]);
  const [mode, setMode] = useState<'recognition' | 'recall'>('recognition');

  useEffect(() => {
    if (isOpen && selectedKanaIds.length > 0) {
      const selected = kanaData.filter(k => selectedKanaIds.includes(k.id));
      // Shuffle the kana for study
      const shuffled = [...selected].sort(() => Math.random() - 0.5);
      setStudyKana(shuffled);
      setCurrentIndex(0);
      setShowAnswer(false);
    }
  }, [isOpen, selectedKanaIds]);

  const currentKana = studyKana[currentIndex];
  const displayKana = currentKana && (studyType === 'hiragana' ? currentKana.hiragana : currentKana.katakana);
  const progress = studyKana.length > 0 ? ((currentIndex + 1) / studyKana.length) * 100 : 0;

  const handleNext = () => {
    if (currentIndex < studyKana.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      // Study session complete
      onClose(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const handlePlayAudio = async () => {
    if (currentKana) {
      await playKanaAudio(currentKana.id, studyType);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      setShowAnswer(!showAnswer);
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, currentIndex, studyKana.length]);

  if (!isOpen || studyKana.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {studyType === 'hiragana' ? 'Hiragana' : 'Katakana'} Study
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{currentIndex + 1} / {studyKana.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Study Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('recognition')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              mode === 'recognition' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Recognition
          </button>
          <button
            onClick={() => setMode('recall')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              mode === 'recall' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Recall
          </button>
        </div>

        {/* Study Card */}
        <div className="bg-card rounded-lg border border-border p-8 mb-6">
          <div className="text-center">
            {mode === 'recognition' ? (
              <>
                <div className="text-6xl font-bold text-foreground mb-4">
                  {displayKana}
                </div>
                <button
                  onClick={handlePlayAudio}
                  className="p-2 rounded-lg hover:bg-muted transition-colors mb-4"
                  aria-label="Play audio"
                >
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
                {showAnswer && currentKana && (
                  <div className="text-2xl font-medium text-primary animate-fade-in">
                    {currentKana.romaji}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-3xl font-medium text-foreground mb-6">
                  {currentKana?.romaji}
                </div>
                {showAnswer && (
                  <div className="text-6xl font-bold text-primary animate-fade-in">
                    {displayKana}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            {showAnswer ? 'Hide' : 'Show'} Answer
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {currentIndex === studyKana.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>

        {/* Keyboard Hints */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded">Space</kbd> to show/hide • 
          <kbd className="px-1.5 py-0.5 bg-muted rounded ml-2">←</kbd> 
          <kbd className="px-1.5 py-0.5 bg-muted rounded ml-1">→</kbd> to navigate
        </div>
      </div>
    </div>
  );
}