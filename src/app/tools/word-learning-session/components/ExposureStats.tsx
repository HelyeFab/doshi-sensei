'use client';

import React, { useState, useEffect } from 'react';
import { exposedWordsStorage } from '../services/exposedWordsStorage';
import { RefreshCw, TrendingUp, Eye, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExposureStatsProps {
  lessonId: string;
  totalWords: number;
  userId: string;
  onReset?: () => void;
}

export default function ExposureStats({ 
  lessonId, 
  totalWords, 
  userId,
  onReset 
}: ExposureStatsProps) {
  const [stats, setStats] = useState<{
    exposedCount: number;
    unexposedCount: number;
    percentageComplete: number;
    cyclesCompleted: number;
    averageExposureCount: number;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadStats();
  }, [lessonId, userId]);

  const loadStats = async () => {
    try {
      const exposureStats = await exposedWordsStorage.getExposureStats(
        userId,
        lessonId,
        totalWords
      );
      setStats(exposureStats);
    } catch (error) {
      console.error('Failed to load exposure stats:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the exposure tracking for this lesson? This will allow all words to be selected again as "new".')) {
      return;
    }

    setIsResetting(true);
    try {
      await exposedWordsStorage.resetLessonExposure(userId, lessonId);
      await loadStats();
      if (onReset) {
        onReset();
      }
    } catch (error) {
      console.error('Failed to reset exposure:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!stats) {
    return null;
  }

  const isComplete = stats.exposedCount >= totalWords;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Lesson Progress
        </h3>
        {stats.cyclesCompleted > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Cycle {stats.cyclesCompleted}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{stats.exposedCount} / {totalWords} words seen</span>
          <span>{Math.round(stats.percentageComplete)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div 
            className={`h-full rounded-full ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentageComplete}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500">New words left</div>
          <div className="font-semibold text-gray-700">
            {stats.unexposedCount}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500">Avg. exposures</div>
          <div className="font-semibold text-gray-700">
            {stats.averageExposureCount.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Completion Message or Reset Button */}
      {isComplete && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-green-600 mb-2">
            🎉 All words have been shown at least once!
          </div>
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Resetting...' : 'Reset Progress'}
          </button>
        </div>
      )}
    </motion.div>
  );
}