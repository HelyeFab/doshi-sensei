'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

interface ProgressHUDProps {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  streak: number;
  timeLeft: number;
  isPaused: boolean;
  onPause: () => void;
}

export default function ProgressHUD({
  currentQuestion,
  totalQuestions,
  score,
  streak,
  timeLeft,
  isPaused,
  onPause
}: ProgressHUDProps) {
  const [isMuted, setIsMuted] = useState(false);
  const progressPercentage = (currentQuestion / totalQuestions) * 100;
  const timePercentage = (timeLeft / 30) * 100;
  
  // Color based on time remaining
  const getTimeColor = () => {
    if (timeLeft > 20) return 'text-green-600 dark:text-green-400';
    if (timeLeft > 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="relative">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg">
          {/* Top row: Question progress and controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Q{currentQuestion}/{totalQuestions}
              </span>
              <button
                onClick={onPause}
                className="p-1.5 rounded-lg bg-background hover:bg-muted transition-colors"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
            <div className={`text-lg font-bold ${getTimeColor()}`}>
              {timeLeft}s
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Score and streak */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">Score: {score}</span>
              {streak > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-orange-600 dark:text-orange-400 font-bold"
                >
                  🔥 {streak}
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Question Progress */}
          <motion.div
            className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-6 py-4 shadow-lg"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentQuestion}/{totalQuestions}
                </p>
              </div>
              <div className="w-32">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Center: Timer */}
          <motion.div
            className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-8 py-4 shadow-lg"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Time</p>
              <div className="relative">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 36}
                    className={getTimeColor()}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - timePercentage / 100) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${getTimeColor()}`}>
                  {timeLeft}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Score & Controls */}
          <motion.div
            className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-6 py-4 shadow-lg"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Score</p>
                <p className="text-2xl font-bold text-foreground">{score}</p>
              </div>
              
              {/* Streak indicator */}
              <AnimatePresence>
                {streak > 0 && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    className="flex flex-col items-center"
                  >
                    <p className="text-xs text-muted-foreground mb-1">Streak</p>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl">🔥</span>
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {streak}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Control buttons */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={onPause}
                  className="p-2 rounded-lg bg-background hover:bg-muted transition-colors"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg bg-background hover:bg-muted transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card border-2 border-border rounded-2xl p-8 text-center"
            >
              <Pause className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-2xl font-bold mb-2">Game Paused</h3>
              <p className="text-muted-foreground mb-6">Take your time! Click resume when ready.</p>
              <button
                onClick={onPause}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                Resume Game
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}