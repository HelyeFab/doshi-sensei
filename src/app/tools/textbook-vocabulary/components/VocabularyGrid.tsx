'use client';

import { motion } from 'framer-motion';
import type { VocabularyItem } from '../types';

interface VocabularyGridProps {
  vocabulary: VocabularyItem[];
  onStartStudy: (cards: VocabularyItem[]) => void;
}

export function VocabularyGrid({ vocabulary, onStartStudy }: VocabularyGridProps) {
  const handleCardClick = (item: VocabularyItem) => {
    // Start study session with just this card for now
    onStartStudy([item]);
  };

  const handleStudyAll = () => {
    onStartStudy(vocabulary);
  };

  if (vocabulary.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No vocabulary items found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Study All Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{vocabulary.length} words</p>
        <button
          onClick={handleStudyAll}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Study All
        </button>
      </div>

      {/* Vocabulary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vocabulary.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleCardClick(item)}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4"
          >
            <div className="space-y-2">
              {/* Japanese & Reading */}
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {item.japanese}
                </div>
                {item.reading !== item.japanese && (
                  <div className="text-sm text-gray-600">{item.reading}</div>
                )}
              </div>

              {/* Meaning */}
              <div className="text-gray-700">{item.meaning}</div>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap">
                {item.jlptLevel && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {item.jlptLevel}
                  </span>
                )}
                {item.partOfSpeech.slice(0, 2).map((pos, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {pos}
                  </span>
                ))}
              </div>

              {/* Progress Indicator (placeholder) */}
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}