'use client';

import { motion } from 'framer-motion';

interface StudyProgressProps {
  current: number;
  total: number;
  correct: number;
}

export function StudyProgress({ current, total, correct }: StudyProgressProps) {
  const progress = ((current - 1) / total) * 100;
  const accuracy = current > 1 ? Math.round((correct / (current - 1)) * 100) : 0;

  return (
    <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">
          Card {current} of {total}
        </span>
        <span className="text-sm text-muted-foreground">
          Accuracy: {accuracy}%
        </span>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary-dark"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>✅ {correct} correct</span>
        <span>❌ {current - 1 - correct} incorrect</span>
      </div>
    </div>
  );
}