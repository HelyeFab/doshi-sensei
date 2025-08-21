'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Target, Flame, RefreshCw, ArrowLeft, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Using localStorage directly for achievements

interface Props {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  time: string;
  accuracy: number;
  maxCombo: number;
  onRestart: () => void;
  onBack: () => void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export default function GameOverModal({
  isOpen,
  onClose,
  score,
  time,
  accuracy,
  maxCombo,
  onRestart,
  onBack,
}: Props) {
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (isOpen) {
      checkAchievements();
    }
  }, [isOpen, score, accuracy, maxCombo]);

  const checkAchievements = async () => {
    const achievements: Achievement[] = [];
    
    // Score achievements
    if (score >= 1000) {
      achievements.push({
        id: 'score_1000',
        name: 'Point Master',
        description: 'Score over 1,000 points',
        icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      });
    }
    
    // Accuracy achievements
    if (accuracy === 100) {
      achievements.push({
        id: 'perfect_accuracy',
        name: 'Perfect Precision',
        description: '100% accuracy',
        icon: <Target className="h-5 w-5 text-green-500" />,
      });
    }
    
    // Combo achievements
    if (maxCombo >= 10) {
      achievements.push({
        id: 'combo_10',
        name: 'Combo King',
        description: '10+ stroke combo',
        icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      });
    }
    
    // Save unlocked achievements
    if (achievements.length > 0) {
      try {
        const savedAchievementsStr = localStorage.getItem('strokeOrderAchievements');
        const savedAchievements = savedAchievementsStr ? JSON.parse(savedAchievementsStr) : [];
        const newUnlocks = achievements.filter(a => !savedAchievements.includes(a.id));
        if (newUnlocks.length > 0) {
          const updatedAchievements = [...savedAchievements, ...newUnlocks.map(a => a.id)];
          localStorage.setItem('strokeOrderAchievements', JSON.stringify(updatedAchievements));
          setNewAchievements(newUnlocks);
        }
      } catch (error) {
        console.error('Failed to save achievements:', error);
      }
    }
  };

  const getRank = () => {
    if (score >= 1000) return { rank: 'S', color: 'text-yellow-500', label: 'Master!' };
    if (score >= 800) return { rank: 'A', color: 'text-green-500', label: 'Excellent!' };
    if (score >= 600) return { rank: 'B', color: 'text-blue-500', label: 'Great!' };
    if (score >= 400) return { rank: 'C', color: 'text-purple-500', label: 'Good!' };
    return { rank: 'D', color: 'text-gray-500', label: 'Keep practicing!' };
  };

  const rankData = getRank();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-background rounded-lg shadow-xl p-6">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Practice Complete!</h2>
                <p className="text-muted-foreground">{rankData.label}</p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-center mb-6"
              >
                <div className={`text-6xl font-bold ${rankData.color}`}>
                  {rankData.rank}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Rank</div>
              </motion.div>

              <div className="space-y-3 mb-6">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-sm">Final Score</span>
                  </div>
                  <span className="font-bold">{score.toLocaleString()}</span>
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Time</span>
                  </div>
                  <span className="font-bold">{time}</span>
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Accuracy</span>
                  </div>
                  <span className="font-bold">{accuracy}%</span>
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Max Combo</span>
                  </div>
                  <span className="font-bold">{maxCombo}x</span>
                </motion.div>
              </div>

              {newAchievements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mb-6 space-y-2"
                >
                  <h3 className="text-sm font-semibold text-center mb-3">New Achievements!</h3>
                  {newAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg"
                    >
                      {achievement.icon}
                      <div>
                        <p className="font-medium text-sm">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={onRestart}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}