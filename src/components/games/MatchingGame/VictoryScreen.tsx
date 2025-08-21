'use client';

import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useEffect, useState } from 'react';
import { GameStats } from './types';
import { getPerformanceMessage } from './gameUtils';
import { useStrings } from '@/contexts/LanguageContext';

interface VictoryScreenProps {
  stats: GameStats;
  onPlayAgain: () => void;
  onClose: () => void;
}

export default function VictoryScreen({ stats, onPlayAgain, onClose }: VictoryScreenProps) {
  const strings = useStrings();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);
  
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Confetti Effect */}
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.1}
        colors={['#FDE047', '#FB923C', '#F87171', '#A78BFA', '#60A5FA', '#34D399']}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-card rounded-lg shadow-2xl p-8 max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebration animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>

        <h2 className="text-3xl font-bold text-foreground mb-4">
          {strings.games.victory?.title || 'Congratulations!'}
        </h2>

        <p className="text-lg text-muted-foreground mb-6">
          {getPerformanceMessage(stats.totalMoves, stats.totalMoves / 2)}
        </p>

        {/* Stats - Only show moves */}
        <div className="flex justify-center mb-6">
          <div className="bg-muted rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-primary">{stats.totalMoves}</div>
            <div className="text-sm text-muted-foreground">Moves to Complete</div>
          </div>
        </div>

        {stats.perfectGame && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg p-3 mb-6"
          >
            <span className="text-2xl mr-2">⭐</span>
            Perfect Game! No mistakes!
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
          >
            Back to Games
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Play Again
          </button>
        </div>
      </motion.div>
    </motion.div>
    </>
  );
}