'use client';

import type { VocabularyItem } from '../types';

interface ProgressTrackerProps {
  vocabulary: VocabularyItem[];
  textbook: string;
}

export function ProgressTracker({ vocabulary, textbook }: ProgressTrackerProps) {
  // Mock progress data
  const totalWords = vocabulary.length;
  const masteredWords = 0;
  const learningWords = 0;
  const newWords = totalWords;

  const progressPercentage = totalWords > 0 ? (masteredWords / totalWords) * 100 : 0;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Progress Bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <div className="text-center">
          <div className="font-bold text-green-600">{masteredWords}</div>
          <div className="text-gray-500">Mastered</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-yellow-600">{learningWords}</div>
          <div className="text-gray-500">Learning</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-gray-600">{newWords}</div>
          <div className="text-gray-500">New</div>
        </div>
      </div>
    </div>
  );
}