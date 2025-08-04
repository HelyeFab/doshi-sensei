'use client';

import { useState, useEffect } from 'react';
import { spacedRepetition, vocabStorage } from '@/services/textbook-vocabulary/client';
import type { VocabularyItem } from '../types';

interface ProgressTrackerProps {
  vocabulary: VocabularyItem[];
  textbook: string;
  refreshKey?: number; // Optional prop to trigger refresh after study sessions
}

export function ProgressTracker({ vocabulary, textbook, refreshKey }: ProgressTrackerProps) {
  const [stats, setStats] = useState({
    totalWords: vocabulary.length,
    masteredWords: 0,
    learningWords: 0,
    newWords: vocabulary.length,
    averageMastery: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);
        
        // Get all progress for this textbook
        const progress = await vocabStorage.getProgressByTextbook(textbook);
        
        // Create a map of progress by vocabulary ID
        const progressMap = new Map(progress.map(p => [p.id, p]));
        
        // Calculate statistics
        let mastered = 0;
        let learning = 0;
        let newCards = 0;
        let totalMastery = 0;
        
        vocabulary.forEach(word => {
          const wordProgress = progressMap.get(word.id);
          
          if (!wordProgress) {
            newCards++;
          } else if (wordProgress.masteryLevel >= 80) {
            mastered++;
            totalMastery += wordProgress.masteryLevel;
          } else {
            learning++;
            totalMastery += wordProgress.masteryLevel;
          }
        });
        
        setStats({
          totalWords: vocabulary.length,
          masteredWords: mastered,
          learningWords: learning,
          newWords: newCards,
          averageMastery: progress.length > 0 
            ? Math.round(totalMastery / (mastered + learning))
            : 0,
        });
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (vocabulary.length > 0) {
      loadProgress();
    }
  }, [vocabulary, textbook, refreshKey]);

  const progressPercentage = stats.totalWords > 0 
    ? ((stats.masteredWords + stats.learningWords * 0.5) / stats.totalWords) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-10">
        <div className="animate-pulse bg-muted rounded h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Progress Bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <div className="text-center">
          <div className="font-bold text-green-600 dark:text-green-400">{stats.masteredWords}</div>
          <div className="text-muted-foreground">Mastered</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-yellow-600 dark:text-yellow-400">{stats.learningWords}</div>
          <div className="text-muted-foreground">Learning</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-foreground">{stats.newWords}</div>
          <div className="text-muted-foreground">New</div>
        </div>
      </div>
    </div>
  );
}