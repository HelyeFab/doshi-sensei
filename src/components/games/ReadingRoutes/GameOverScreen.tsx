'use client';

import { motion } from 'framer-motion';
import { Trophy, Star, RotateCcw, Home } from 'lucide-react';

interface GameOverScreenProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  onPlayAgain: () => void;
  onExit: () => void;
  remainingPlays?: number | null;
}

export default function GameOverScreen({
  score,
  totalQuestions,
  correctAnswers,
  onPlayAgain,
  onExit,
  remainingPlays
}: GameOverScreenProps) {
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const performance = accuracy >= 80 ? 'excellent' : accuracy >= 60 ? 'good' : 'needsWork';

  const getMessage = () => {
    if (performance === 'excellent') return { title: 'Outstanding!', subtitle: 'You\'re a kanji reading master!' };
    if (performance === 'good') return { title: 'Well Done!', subtitle: 'You\'re getting the hang of it!' };
    return { title: 'Keep Practicing!', subtitle: 'Every master was once a student.' };
  };

  const { title, subtitle } = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8 max-w-2xl"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="bg-card border-2 border-border rounded-3xl p-8 md:p-12 text-center shadow-2xl"
      >
        {/* Trophy/Icon */}
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          {performance === 'excellent' ? (
            <Trophy className="w-24 h-24 mx-auto text-yellow-500" />
          ) : (
            <Star className="w-24 h-24 mx-auto text-primary" />
          )}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl md:text-4xl font-bold mb-2 text-foreground"
        >
          {title}
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg text-muted-foreground mb-8"
        >
          {subtitle}
        </motion.p>

        {/* Stats Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-muted/50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-primary">{score}</p>
            <p className="text-xs text-muted-foreground mt-1">Score</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{correctAnswers}/{totalQuestions}</p>
            <p className="text-xs text-muted-foreground mt-1">Correct</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{accuracy}%</p>
            <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${accuracy}%` }}
              transition={{ delay: 1, duration: 1, ease: "easeOut" }}
              className={`h-full ${
                performance === 'excellent'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                  : performance === 'good'
                  ? 'bg-gradient-to-r from-green-400 to-green-600'
                  : 'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
            />
          </div>
        </motion.div>

        {/* Remaining plays indicator */}
        {remainingPlays !== null && remainingPlays !== undefined && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-sm text-muted-foreground mb-6"
          >
            {remainingPlays > 0
              ? `${remainingPlays} plays remaining today`
              : 'No plays remaining today - upgrade for unlimited access!'}
          </motion.p>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          {remainingPlays === null || remainingPlays === undefined || remainingPlays > 0 ? (
            <button
              onClick={onPlayAgain}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all hover:scale-105 font-medium"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
          ) : null}

          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-all hover:scale-105 font-medium"
          >
            <Home className="w-5 h-5" />
            Back to Selection
          </button>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          className="absolute -top-8 -left-8 w-16 h-16 border-2 border-primary/20 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-8 -right-8 w-12 h-12 border-2 border-secondary/20 rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        />
      </motion.div>
    </motion.div>
  );
}