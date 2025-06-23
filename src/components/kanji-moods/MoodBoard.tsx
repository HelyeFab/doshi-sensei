'use client';

import { useState, useEffect } from 'react';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';
import { getBoardProgress, toggleKanjiLearned, isKanjiLearned } from '@/utils/moodBoardProgress';
import KanjiCard from './KanjiCard';
import ProgressIndicator from './ProgressIndicator';

interface MoodBoardProps {
  board: MoodBoardType;
  onBack: () => void;
}

export default function MoodBoard({ board, onBack }: MoodBoardProps) {
  const [progress, setProgress] = useState(getBoardProgress(board.id));

  // Update progress when component mounts or board changes
  useEffect(() => {
    setProgress(getBoardProgress(board.id));
  }, [board.id]);

  const handleToggleKanji = (kanjiChar: string) => {
    const newProgress = toggleKanjiLearned(board.id, kanjiChar);
    setProgress(newProgress);
  };

  const learnedCount = progress?.learnedKanji.length || 0;
  const totalCount = board.kanji.length;
  const isCompleted = progress?.progressPercentage === 100;

  return (
    <div className="mood-board-container">
      {/* Header */}
      <div className="mood-board-header">
        <div
          className="mood-board-hero"
          style={{ background: board.background }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Content */}
          <div className="relative flex items-center justify-between text-white p-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <span className="text-xl">←</span>
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="text-center">
              <div className="text-5xl mb-2">{board.emoji}</div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{board.title}</h1>
              <p className="text-sm md:text-base opacity-90">{board.description}</p>
            </div>

            <div className="text-right">
              <div className="text-lg font-semibold">
                {learnedCount}/{totalCount}
              </div>
              <div className="text-sm opacity-90">
                {progress?.progressPercentage || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-card border-b border-border">
          <ProgressIndicator
            current={learnedCount}
            total={totalCount}
            size="md"
            showText={true}
          />

          {isCompleted && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <span className="text-xl">🎉</span>
                <span className="font-semibold">Congratulations! You've completed this mood board!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanji Grid */}
      <div className="mood-board-content">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {board.kanji.map((kanji) => (
              <KanjiCard
                key={kanji.char}
                kanji={kanji}
                isLearned={isKanjiLearned(board.id, kanji.char)}
                onToggleLearned={handleToggleKanji}
              />
            ))}
          </div>

          {/* Study Tips */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>💡</span>
                Study Tips
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Tap any kanji card to see its readings and example words</p>
                <p>• Mark kanji as learned by clicking the circle button</p>
                <p>• Try to find connections between kanji in this theme</p>
                <p>• Practice writing the kanji to improve memorization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mood-board-container {
          min-height: 100vh;
          background: var(--background);
        }

        .mood-board-hero {
          position: relative;
          height: 200px;
          display: flex;
          align-items: center;
        }

        .mood-board-content {
          flex: 1;
        }

        @media (max-width: 640px) {
          .mood-board-hero {
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
}
