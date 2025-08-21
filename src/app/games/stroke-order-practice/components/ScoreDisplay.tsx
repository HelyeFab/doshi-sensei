'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Brain, Target, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  score: number;
  combo: number;
  completedKanji: number;
  totalKanji: number;
  elapsedTime: string;
}

export default function ScoreDisplay({ score, combo, completedKanji, totalKanji, elapsedTime }: Props) {
  const progress = (completedKanji / totalKanji) * 100;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Score</h3>
        <motion.div
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold text-primary"
        >
          {score.toLocaleString()}
        </motion.div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Time</span>
          </div>
          <span className="text-sm font-medium">{elapsedTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Combo</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={combo}
              initial={{ scale: combo > 0 ? 1.5 : 1 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="font-semibold"
            >
              {combo}x
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-purple-500" />
            <span>Progress</span>
          </div>
          <span className="text-sm font-medium">
            {completedKanji}/{totalKanji}
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-primary/80"
            />
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}% complete
          </div>
        </div>
      </div>

      {combo >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-2 bg-orange-500/10 rounded-lg"
        >
          <p className="text-sm font-medium text-orange-500 dark:text-orange-400">
            {combo >= 20 ? '🔥 ON FIRE!' : combo >= 10 ? '⚡ Great combo!' : '✨ Nice streak!'}
          </p>
        </motion.div>
      )}
    </Card>
  );
}