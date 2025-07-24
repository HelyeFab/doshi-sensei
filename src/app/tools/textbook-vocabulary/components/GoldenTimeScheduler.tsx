'use client';

import { motion } from 'framer-motion';
import type { VocabularyItem } from '../types';

interface GoldenTimeSchedulerProps {
  vocabulary: VocabularyItem[];
  textbook: string;
  onStartReview: (cards: VocabularyItem[]) => void;
}

export function GoldenTimeScheduler({ vocabulary, textbook, onStartReview }: GoldenTimeSchedulerProps) {
  // For now, just show a placeholder
  // In production, this would calculate which words are due for review
  const dueWords = vocabulary.slice(0, 5); // Mock: first 5 words are due

  const handleStartReview = () => {
    onStartReview(dueWords);
  };

  return (
    <div className="space-y-6">
      {/* Golden Time Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="text-5xl">⏰</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Golden Time Review</h2>
            <p className="opacity-90">
              {dueWords.length} words are ready for optimal review. 
              Study them now for maximum retention!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Review Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{dueWords.length}</div>
          <div className="text-sm text-gray-600">Due Today</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-600">New Cards</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-900">15</div>
          <div className="text-sm text-gray-600">Min. Time</div>
        </div>
      </div>

      {/* Preview of Due Words */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Words to Review:</h3>
        <div className="space-y-2">
          {dueWords.map((word) => (
            <div
              key={word.id}
              className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-gray-900">{word.japanese}</span>
                <span className="text-gray-600 ml-2">({word.reading})</span>
              </div>
              <div className="text-sm text-gray-500">{word.meaning}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStartReview}
        className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
      >
        Start Golden Time Review
      </button>
    </div>
  );
}