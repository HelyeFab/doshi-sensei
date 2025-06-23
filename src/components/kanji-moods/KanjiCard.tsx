'use client';

import { useState } from 'react';
import { KanjiCardProps } from '@/types/moodBoard';

export default function KanjiCard({
  kanji,
  isLearned,
  onToggleLearned,
  showBack = false
}: KanjiCardProps) {
  const [isFlipped, setIsFlipped] = useState(showBack);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleToggleLearned = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLearned(kanji.char);
  };

  return (
    <div className="kanji-card-container">
      <div
        className={`kanji-card ${isFlipped ? 'flipped' : ''}`}
        onClick={handleFlip}
      >
        {/* Front Side */}
        <div className="kanji-card-face kanji-card-front">
          <div className="flex flex-col h-full">
            {/* Learned Status Indicator */}
            <div className="flex justify-end mb-2">
              <button
                onClick={handleToggleLearned}
                className={`w-6 h-6 rounded-full transition-all duration-200 ${
                  isLearned
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}
                aria-label={isLearned ? 'Mark as not learned' : 'Mark as learned'}
              >
                {isLearned ? '✓' : '○'}
              </button>
            </div>

            {/* Kanji Character */}
            <div className="flex-1 flex items-center justify-center">
              <span className="text-6xl md:text-7xl font-bold text-foreground">
                {kanji.char}
              </span>
            </div>

            {/* Meaning */}
            <div className="text-center pb-4">
              <p className="text-lg font-medium text-muted-foreground">
                {kanji.meaning}
              </p>
            </div>

            {/* Flip Hint */}
            <div className="text-center text-xs text-muted-foreground opacity-60">
              Tap to flip
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="kanji-card-face kanji-card-back">
          <div className="flex flex-col h-full p-4">
            {/* Header with kanji and learned status */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-foreground">
                {kanji.char}
              </span>
              <button
                onClick={handleToggleLearned}
                className={`w-6 h-6 rounded-full transition-all duration-200 ${
                  isLearned
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}
                aria-label={isLearned ? 'Mark as not learned' : 'Mark as learned'}
              >
                {isLearned ? '✓' : '○'}
              </button>
            </div>

            {/* Readings */}
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  On'yomi
                </h4>
                <div className="flex flex-wrap gap-1">
                  {kanji.readings.on.map((reading, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm"
                    >
                      {reading}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Kun'yomi
                </h4>
                <div className="flex flex-wrap gap-1">
                  {kanji.readings.kun.map((reading, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-sm"
                    >
                      {reading}
                    </span>
                  ))}
                </div>
              </div>

              {/* Examples */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Examples
                </h4>
                <div className="space-y-1">
                  {kanji.examples.slice(0, 3).map((example, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-sm mr-1 mb-1"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Flip Hint */}
            <div className="text-center text-xs text-muted-foreground opacity-60 mt-2">
              Tap to flip back
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .kanji-card-container {
          perspective: 1000px;
          height: 280px;
        }

        .kanji-card {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          cursor: pointer;
        }

        .kanji-card.flipped {
          transform: rotateY(180deg);
        }

        .kanji-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 12px;
          border: 2px solid var(--border);
          background: var(--card);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.2s ease-in-out;
          padding: 16px;
        }

        .kanji-card-face:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .kanji-card-back {
          transform: rotateY(180deg);
        }

        @media (max-width: 768px) {
          .kanji-card-container {
            height: 240px;
          }
        }
      `}</style>
    </div>
  );
}
