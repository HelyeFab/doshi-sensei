'use client';

import React, { useState, useEffect } from 'react';
import { Kanji, JLPTLevel } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, BookOpen, TrendingUp, RefreshCw, Play } from 'lucide-react';
import { exposedWordsStorage } from '@/app/tools/word-learning-session/services/exposedWordsStorage';
import { shuffleArray } from '@/utils/shuffle';

interface KanjiLearningSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: JLPTLevel;
  kanjiData: Kanji[];
  userId: string;
}

export default function KanjiLearningSessionModal({
  isOpen,
  onClose,
  level,
  kanjiData,
  userId
}: KanjiLearningSessionModalProps) {
  const router = useRouter();
  const [sessionSize, setSessionSize] = useState(10);
  const [mode, setMode] = useState<'new' | 'review' | 'all'>('new');
  const [exposureStats, setExposureStats] = useState<{
    exposedCount: number;
    unexposedCount: number;
    percentageComplete: number;
    cyclesCompleted: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lessonId = `kanji-jlpt-${level.toLowerCase()}`;
  const totalKanji = kanjiData.length;

  useEffect(() => {
    if (isOpen) {
      loadExposureStats();
    }
  }, [isOpen, level]);

  const loadExposureStats = async () => {
    try {
      const stats = await exposedWordsStorage.getExposureStats(
        userId,
        lessonId,
        totalKanji
      );
      setExposureStats(stats);
      
      // Adjust default mode based on exposure
      if (stats.unexposedCount === 0 && stats.exposedCount > 0) {
        setMode('review'); // All kanji exposed, default to review
      }
    } catch (error) {
      console.error('Failed to load exposure stats:', error);
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    
    try {
      // Convert kanji to word items format
      const wordItems = kanjiData.map(kanji => ({
        id: `kanji-${kanji.kanji}`,
        kanji: kanji.kanji,
        kana: kanji.kunyomi[0] || kanji.onyomi[0] || '',
        meaning: kanji.meaning,
        partOfSpeech: 'kanji' as const,
        jlptLevel: kanji.jlpt,
        textbook: `JLPT ${level}`,
        lesson: level,
        // Add example if available
        example: kanji.kunyomi[0] ? {
          japanese: `${kanji.kanji}（${kanji.kunyomi[0]}）`,
          english: kanji.meaning
        } : undefined
      }));

      // Use smart selection to get words
      const selectedWords = await exposedWordsStorage.getSmartWordSelection(
        userId,
        lessonId,
        wordItems,
        sessionSize,
        mode
      );

      // Mark words as exposed
      await exposedWordsStorage.markWordsAsExposed(
        userId,
        lessonId,
        selectedWords.map(w => w.id),
        totalKanji
      );

      // Store session data in sessionStorage for the word learning page
      const sessionData = {
        lessonId,
        textbook: `JLPT ${level} Kanji`,
        words: selectedWords
      };
      
      window.sessionStorage.setItem('wordLearningSessionWords', JSON.stringify(sessionData));
      
      // Navigate to word learning session
      router.replace('/tools/word-learning-session?session=custom');
    } catch (error) {
      console.error('Failed to start learning session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!confirm(`Are you sure you want to reset your progress for ${level} kanji? This will mark all kanji as "new" again.`)) {
      return;
    }

    try {
      await exposedWordsStorage.resetLessonExposure(userId, lessonId);
      await loadExposureStats();
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card rounded-lg shadow-xl max-w-md w-full p-6 border border-border"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-card-foreground mb-2">
              Start {level} Kanji Learning Session
            </h2>
            <p className="text-muted-foreground text-sm">
              Learn kanji through interactive multimodal sessions
            </p>
          </div>

          {/* Progress Stats */}
          {exposureStats && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Progress
                </span>
                {exposureStats.cyclesCompleted > 0 && (
                  <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                    Cycle {exposureStats.cyclesCompleted}
                  </span>
                )}
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{exposureStats.exposedCount} / {totalKanji} seen</span>
                  <span>{Math.round(exposureStats.percentageComplete)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${exposureStats.percentageComplete}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">
                  <span className="font-medium">{exposureStats.unexposedCount}</span> new kanji left
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium">{exposureStats.exposedCount}</span> already seen
                </div>
              </div>

              {exposureStats.percentageComplete === 100 && (
                <button
                  onClick={handleResetProgress}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Progress
                </button>
              )}
            </div>
          )}

          {/* Study Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Study Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode('new')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'new'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                New
              </button>
              <button
                onClick={() => setMode('review')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'review'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
                disabled={exposureStats?.exposedCount === 0}
              >
                Review
              </button>
              <button
                onClick={() => setMode('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Session Size Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Kanji per Session: <span className="font-bold">{sessionSize}</span>
            </label>
            <input
              type="range"
              min="5"
              max={Math.min(30, totalKanji)}
              value={sessionSize}
              onChange={(e) => setSessionSize(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5</span>
              <span>Recommended: 10-15</span>
              <span>{Math.min(30, totalKanji)}</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-xs text-foreground">
                <p className="font-medium mb-1">What you'll practice:</p>
                <ul className="space-y-0.5 ml-2 text-muted-foreground">
                  <li>• Visual recognition of kanji characters</li>
                  <li>• Meanings and translations</li>
                  <li>• On'yomi and kun'yomi readings</li>
                  <li>• Active recall and matching exercises</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSession}
              disabled={isLoading || sessionSize === 0}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Session</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}