'use client';

import { useState, useEffect } from 'react';
import { MoodBoard } from '@/types/moodBoard';
import { motion, AnimatePresence } from 'framer-motion';
import KanjiSimonGame from './KanjiSimonGameSimple';
import GameOverScreen from './GameOverScreen';
import { saveKanjiSimonProgress } from './progressTracking';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/kanji-simon.css';

interface KanjiSimonGameWrapperProps {
  board: MoodBoard;
  onComplete: () => void;
  remainingPlays?: number | null;
}

export default function KanjiSimonGameWrapper({ board, onComplete, remainingPlays }: KanjiSimonGameWrapperProps) {
  const { user } = useAuth();
  const [currentKanjiIndex, setCurrentKanjiIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [kanjiScores, setKanjiScores] = useState<Record<string, number>>({});
  const [gameState, setGameState] = useState<'playing' | 'completed'>('playing');
  const [lives, setLives] = useState(3);
  const [roundsPerKanji] = useState(5); // Max rounds per kanji before moving on
  const [currentKanjiRounds, setCurrentKanjiRounds] = useState(0);

  const currentKanji = board.kanji[currentKanjiIndex];

  const saveProgress = async () => {
    const totalQuestions = board.kanji.length;
    const playedKanji = Object.keys(kanjiScores).length;
    const correctAnswers = Object.values(kanjiScores).filter(s => s > 0).length;
    
    await saveKanjiSimonProgress(
      user?.uid || null,
      board.id,
      {
        boardId: board.id,
        score: totalScore,
        totalQuestions: playedKanji, // Only count kanji that were actually played
        correctAnswers,
        longestSequence: Math.max(...Object.values(kanjiScores).map(s => Math.floor(s / 100)), 0),
        timestamp: new Date().toISOString()
      }
    );
  };

  const handleRoundComplete = (roundScore: number) => {
    // Add to this kanji's score
    setKanjiScores(prev => ({
      ...prev,
      [currentKanji.char]: (prev[currentKanji.char] || 0) + roundScore
    }));
    setTotalScore(prev => prev + roundScore);
    
    // Increment rounds for current kanji
    const newRounds = currentKanjiRounds + 1;
    setCurrentKanjiRounds(newRounds);
    
    // Check if we should move to next kanji
    if (newRounds >= roundsPerKanji && currentKanjiIndex < board.kanji.length - 1) {
      setTimeout(() => {
        setCurrentKanjiIndex(prev => prev + 1);
        setCurrentKanjiRounds(0);
      }, 2000); // Give time to see the success before moving on
    } else if (newRounds >= roundsPerKanji && currentKanjiIndex === board.kanji.length - 1) {
      // Completed all kanji
      setTimeout(() => {
        setGameState('completed');
        saveProgress();
      }, 2000);
    }
  };

  const handleGameOver = async (kanjiScore: number) => {
    // Record final score for this kanji
    if (kanjiScore > 0) {
      setKanjiScores(prev => ({
        ...prev,
        [currentKanji.char]: kanjiScore
      }));
      setTotalScore(prev => prev + kanjiScore);
    }

    // Lose a life
    const newLives = lives - 1;
    setLives(newLives);

    if (newLives > 0) {
      // Still have lives, continue with next kanji if available
      if (currentKanjiIndex < board.kanji.length - 1) {
        setTimeout(() => {
          setCurrentKanjiIndex(prev => prev + 1);
          setCurrentKanjiRounds(0);
        }, 1500);
      } else {
        // No more kanji but still have lives
        setGameState('completed');
        await saveProgress();
      }
    } else {
      // No more lives
      setGameState('completed');
      await saveProgress();
    }
  };

  const handlePlayAgain = () => {
    setCurrentKanjiIndex(0);
    setTotalScore(0);
    setKanjiScores({});
    setLives(3);
    setGameState('playing');
    setCurrentKanjiRounds(0);
  };

  if (gameState === 'completed') {
    const totalQuestions = board.kanji.length;
    const correctAnswers = Object.values(kanjiScores).filter(s => s > 0).length;
    
    return (
      <GameOverScreen
        score={totalScore}
        totalQuestions={totalQuestions}
        correctAnswers={correctAnswers}
        onPlayAgain={handlePlayAgain}
        onExit={onComplete}
        remainingPlays={remainingPlays}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Kanji Simon</h1>
        <p className="text-muted-foreground">
          Remember and repeat the sequence!
        </p>
      </div>

      {/* Lives indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`w-8 h-8 rounded-full ${
              i < lives ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}
            initial={{
              scale: 1,
              opacity: 1
            }}
            animate={{
              scale: i < lives ? 1 : 0.8,
              opacity: i < lives ? 1 : 0.5
            }}
          >
            <span className="sr-only">Life {i + 1}</span>
          </motion.div>
        ))}
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Kanji {currentKanjiIndex + 1} of {board.kanji.length}</span>
          <span>Round {currentKanjiRounds + 1}/{roundsPerKanji}</span>
          <span>Total Score: {totalScore}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentKanjiIndex + 1) / board.kanji.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Game */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentKanji.char}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <KanjiSimonGame
            kanji={currentKanji}
            onRoundComplete={handleRoundComplete}
            onGameOver={handleGameOver}
          />
        </motion.div>
      </AnimatePresence>

    </div>
  );
}