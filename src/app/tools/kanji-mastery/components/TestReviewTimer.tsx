'use client';

import { useState } from 'react';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';

export default function TestReviewTimer() {
  const [adjusting, setAdjusting] = useState(false);
  const [message, setMessage] = useState('');

  const adjustReviewTimes = async (hoursToSubtract: number) => {
    setAdjusting(true);
    setMessage('');
    
    try {
      await kanjiMasteryStorage.init();
      const allProgress = await kanjiMasteryStorage.getAllProgress();
      
      if (allProgress.length === 0) {
        setMessage('No kanji to adjust. Study some kanji first!');
        return;
      }
      
      let updated = 0;
      for (const progress of allProgress) {
        const newNextReview = new Date(progress.nextReview);
        newNextReview.setHours(newNextReview.getHours() - hoursToSubtract);
        
        await kanjiMasteryStorage.updateNextReviewForTesting(progress.id, newNextReview);
        updated++;
      }
      
      setMessage(`Updated ${updated} kanji. Refreshing...`);
      
      // Reload the page after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error adjusting review times:', error);
      setMessage('Error adjusting review times');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <span>⚡</span>
        Test Review System
      </h3>
      
      <p className="text-xs text-muted-foreground mb-3">
        For testing: Move review times backward to simulate time passing
      </p>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => adjustReviewTimes(1)}
          disabled={adjusting}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:opacity-50"
        >
          -1 hour
        </button>
        <button
          onClick={() => adjustReviewTimes(4)}
          disabled={adjusting}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:opacity-50"
        >
          -4 hours
        </button>
        <button
          onClick={() => adjustReviewTimes(24)}
          disabled={adjusting}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:opacity-50"
        >
          -1 day
        </button>
        <button
          onClick={() => adjustReviewTimes(48)}
          disabled={adjusting}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:opacity-50"
        >
          -2 days
        </button>
      </div>
      
      {message && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
          {message}
        </p>
      )}
    </div>
  );
}