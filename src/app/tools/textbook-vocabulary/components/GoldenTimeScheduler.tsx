'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { spacedRepetition, vocabStorage } from '@/services/textbook-vocabulary/client';
import type { VocabularyItem, VocabularyProgress } from '../types';
import { useErrorNotification, ERROR_MESSAGES } from '@/hooks/useErrorNotification';

interface GoldenTimeSchedulerProps {
  vocabulary: VocabularyItem[];
  textbook: string;
  onStartReview: (cards: VocabularyItem[]) => void;
}

export function GoldenTimeScheduler({ vocabulary, textbook, onStartReview }: GoldenTimeSchedulerProps) {
  const [loading, setLoading] = useState(true);
  const [dueProgress, setDueProgress] = useState<VocabularyProgress[]>([]);
  const [stats, setStats] = useState({
    dueCards: 0,
    newCards: 0,
    totalTime: 0,
  });
  const { showError, ErrorNotificationDialog } = useErrorNotification();

  // Load due cards and statistics
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get golden time cards (due now or soon)
        const goldenTimeCards = await spacedRepetition.getGoldenTimeCards(textbook, 20);
        setDueProgress(goldenTimeCards);
        
        // Get overall statistics
        const reviewStats = await spacedRepetition.getStats(textbook);
        
        // Calculate new cards (vocabulary items without progress)
        const progressIds = new Set(goldenTimeCards.map(p => p.id));
        const existingProgressIds = await vocabStorage.getProgressIds(textbook);
        const vocabularyIds = new Set(vocabulary.map(v => v.id));
        const newCardCount = Array.from(vocabularyIds).filter(id => !existingProgressIds.has(id)).length;
        
        setStats({
          dueCards: goldenTimeCards.length,
          newCards: Math.min(newCardCount, 5), // Limit new cards per session
          totalTime: Math.ceil((goldenTimeCards.length + Math.min(newCardCount, 5)) * 1.5), // 1.5 min per card estimate
        });
      } catch (error) {
        console.error('Failed to load golden time data:', error);
        showError(ERROR_MESSAGES.LOAD_FAILED.title, ERROR_MESSAGES.LOAD_FAILED.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [textbook, vocabulary, showError]);

  const handleStartReview = () => {
    // Get the actual vocabulary items for due cards
    const dueVocabIds = new Set(dueProgress.map(p => p.id));
    const dueVocabulary = vocabulary.filter(v => dueVocabIds.has(v.id));
    
    // Add some new cards if available
    const newCards = vocabulary
      .filter(v => !dueVocabIds.has(v.id))
      .slice(0, stats.newCards);
    
    const reviewQueue = [...dueVocabulary, ...newCards];
    
    if (reviewQueue.length > 0) {
      onStartReview(reviewQueue);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const totalCards = stats.dueCards + stats.newCards;

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
              {totalCards === 0 
                ? "Great job! No cards are due for review right now." 
                : `${totalCards} cards are ready for optimal review. Study them now for maximum retention!`
              }
            </p>
          </div>
        </div>
      </motion.div>

      {/* Review Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{stats.dueCards}</div>
          <div className="text-sm text-gray-600">Due Today</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{stats.newCards}</div>
          <div className="text-sm text-gray-600">New Cards</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{stats.totalTime}</div>
          <div className="text-sm text-gray-600">Min. Time</div>
        </div>
      </div>

      {/* Preview of Due Words */}
      {totalCards > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Cards to Review:</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Show due cards */}
            {dueProgress.slice(0, 5).map((progress) => {
              const word = vocabulary.find(v => v.id === progress.id);
              if (!word) return null;
              
              const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(progress.nextReview).getTime()) / (1000 * 60 * 60 * 24)));
              
              return (
                <div
                  key={word.id}
                  className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between"
                >
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{word.japanese}</span>
                    <span className="text-gray-600 ml-2">({word.reading})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500">{word.meaning}</div>
                    {overdueDays > 0 && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        {overdueDays}d overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Show preview of new cards */}
            {stats.newCards > 0 && (
              <div className="text-sm text-gray-500 italic pt-2">
                + {stats.newCards} new cards
              </div>
            )}
            
            {totalCards > 5 && (
              <div className="text-sm text-gray-500 text-center pt-2">
                ... and {totalCards - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStartReview}
        disabled={totalCards === 0}
        className={`w-full py-4 font-bold rounded-lg shadow-lg transition-all duration-200 ${
          totalCards === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-xl transform hover:scale-[1.02]'
        }`}
      >
        {totalCards === 0 ? 'No Cards Due' : 'Start Golden Time Review'}
      </button>
      
      {/* Error Notification */}
      <ErrorNotificationDialog />
    </div>
  );
}