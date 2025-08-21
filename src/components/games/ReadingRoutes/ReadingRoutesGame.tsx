'use client';

import { useState, useEffect, useCallback } from 'react';
import { MoodBoard, KanjiItem } from '@/types/moodBoard';
import { motion, AnimatePresence } from 'framer-motion';
import KanjiCenter from './KanjiCenter';
import ReadingPath from './ReadingPath';
import ContextDisplay from './ContextDisplay';
import ProgressHUD from './ProgressHUD';
import GameOverScreen from './GameOverScreen';
import { generateGameQuestions, GameQuestion, ReadingOption } from './gameLogic';
import { saveReadingRoutesProgress, updateKanjiReadingProgress } from './progressTracking';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';

interface ReadingOptionCardProps {
  option: ReadingOption;
  isCorrect: boolean;
  isSelected: boolean;
  showFeedback: boolean;
  isPaused: boolean;
  onSelect: () => void;
  index: number;
}

function ReadingOptionCard({ option, isCorrect, isSelected, showFeedback, isPaused, onSelect, index }: ReadingOptionCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      disabled={showFeedback || isPaused}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300 w-24 h-24
        ${!showFeedback ? (
          option.type === 'on'
            ? 'hover:scale-105'
            : 'hover:scale-105'
        ) : (
          isSelected && isCorrect ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
          isSelected && !isCorrect ? 'bg-red-100 dark:bg-red-900/30 border-red-500' :
          !isSelected && isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-400' :
          'bg-muted/50 border-muted opacity-50'
        )}
        ${showFeedback || isPaused ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: !showFeedback ? (
          option.type === 'on'
            ? '#D16BA5' // Pink for on'yomi
            : '#86A8E7' // Blue for kun'yomi
        ) : (
          isSelected && isCorrect ? '#10B981' : // Green for correct
          isSelected && !isCorrect ? '#EF4444' : // Red for incorrect
          !isSelected && isCorrect ? '#10B981' : // Green for correct
          '#6B7280' // Gray for muted
        ),
        borderColor: !showFeedback ? (
          option.type === 'on'
            ? '#BE185D' // Darker pink border
            : '#3B82F6' // Darker blue border
        ) : (
          isSelected && isCorrect ? '#059669' :
          isSelected && !isCorrect ? '#DC2626' :
          !isSelected && isCorrect ? '#059669' :
          '#374151'
        ),
        color: !showFeedback ? 'white' : 'white'
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={!showFeedback && !isPaused ? { scale: 1.05 } : {}}
      whileTap={!showFeedback && !isPaused ? { scale: 0.95 } : {}}
    >
      <div className="text-center">
        <div className="text-lg font-bold mb-1">
          {option.reading}
        </div>
        <div className="text-xs opacity-90 mb-1">
          {option.romaji}
        </div>
        <div className="text-xs font-medium opacity-80">
          {option.type === 'on' ? "on'yomi" : "kun'yomi"}
        </div>
      </div>

      {/* Feedback indicator */}
      {showFeedback && isSelected && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background flex items-center justify-center shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        >
          {isCorrect ? '✅' : '❌'}
        </motion.div>
      )}
    </motion.button>
  );
}

interface ReadingRoutesGameProps {
  board: MoodBoard;
  onComplete: () => void;
  remainingPlays?: number | null;
}

export default function ReadingRoutesGame({ board, onComplete, remainingPlays }: ReadingRoutesGameProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'completed'>('loading');
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [isPaused, setIsPaused] = useState(false);

  // Initialize game
  useEffect(() => {
    const initializeGame = async () => {
      setGameState('loading');
      const gameQuestions = await generateGameQuestions(board.kanji);
      setQuestions(gameQuestions);
      setGameState('playing');
    };

    initializeGame();
  }, [board.kanji]);

  // Timer logic
  useEffect(() => {
    if (gameState !== 'playing' || isPaused || showFeedback) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeOut();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isPaused, showFeedback, currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleTimeOut = () => {
    setShowFeedback(true);
    setSelectedPath('timeout');
    setStreak(0);
    setTimeout(() => moveToNextQuestion(), 2000);
  };

  const handlePathSelect = async (readingId: string) => {
    if (showFeedback) return;

    setSelectedPath(readingId);
    setShowFeedback(true);

    const isCorrect = readingId === currentQuestion?.correctReading.id;

    if (isCorrect) {
      setScore(prev => prev + 100 + (streak * 10)); // Bonus for streaks
      setStreak(prev => prev + 1);
      setCorrectCount(prev => prev + 1);
    } else {
      setStreak(0);
    }

    // Track individual kanji progress
    if (currentQuestion) {
      await updateKanjiReadingProgress(
        board.id,
        currentQuestion.kanji.char,
        currentQuestion.correctReading.type,
        isCorrect
      );
    }

    // Show feedback for 2 seconds
    setTimeout(() => moveToNextQuestion(), 2000);
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedPath(null);
      setShowFeedback(false);
      setTimeLeft(30);
    } else {
      completeGame();
    }
  };

  const completeGame = () => {
    setGameState('completed');

    // Save progress
    if (user?.uid) {
      const results = {
        boardId: board.id,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        timestamp: new Date().toISOString()
      };
      saveReadingRoutesProgress(user.uid, board.id, results);
    }
  };

  const handlePlayAgain = () => {
    // Reset game state
    setCurrentQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setSelectedPath(null);
    setShowFeedback(false);
    setTimeLeft(30);
    setGameState('playing');

    // Generate new questions
    const initializeGame = async () => {
      setGameState('loading');
      const newQuestions = await generateGameQuestions(board.kanji);
      setQuestions(newQuestions);
      setGameState('playing');
    };

    initializeGame();
  };

  if (gameState === 'loading' || !currentQuestion) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Preparing game...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'completed') {
    return (
      <GameOverScreen
        score={score}
        totalQuestions={questions.length}
        correctAnswers={correctCount}
        onPlayAgain={handlePlayAgain}
        onExit={onComplete}
        remainingPlays={remainingPlays}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Progress HUD */}
      <ProgressHUD
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        score={score}
        streak={streak}
        timeLeft={timeLeft}
        isPaused={isPaused}
        onPause={() => setIsPaused(!isPaused)}
      />

      {/* Main Game Area */}
      <div className="mt-8 mb-12">
        {/* Context Display */}
        <ContextDisplay
          context={currentQuestion.context}
          contextType={currentQuestion.contextType}
          kanjiChar={currentQuestion.kanji.char}
        />

        {/* Game Board */}
        <div className="relative mt-8 md:mt-12 h-[350px] md:h-[400px]">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-3xl" />

          {/* Kanji Center - positioned in the middle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <KanjiCenter
              kanji={currentQuestion.kanji}
              isAnimating={!showFeedback}
              theme={board.background}
            />
          </div>

          {/* Reading Options - positioned in the four corners */}
          <div className="absolute inset-0">
            {/* Top Left */}
            <div className="absolute top-4 left-4">
              {currentQuestion.options[0] && (
                <ReadingOptionCard
                  option={currentQuestion.options[0]}
                  isCorrect={currentQuestion.options[0].id === currentQuestion.correctReading.id}
                  isSelected={selectedPath === currentQuestion.options[0].id}
                  showFeedback={showFeedback}
                  isPaused={isPaused}
                  onSelect={() => handlePathSelect(currentQuestion.options[0].id)}
                  index={0}
                />
              )}
            </div>

            {/* Top Right */}
            <div className="absolute top-4 right-4">
              {currentQuestion.options[1] && (
                <ReadingOptionCard
                  option={currentQuestion.options[1]}
                  isCorrect={currentQuestion.options[1].id === currentQuestion.correctReading.id}
                  isSelected={selectedPath === currentQuestion.options[1].id}
                  showFeedback={showFeedback}
                  isPaused={isPaused}
                  onSelect={() => handlePathSelect(currentQuestion.options[1].id)}
                  index={1}
                />
              )}
            </div>

            {/* Bottom Left */}
            <div className="absolute bottom-4 left-4">
              {currentQuestion.options[2] && (
                <ReadingOptionCard
                  option={currentQuestion.options[2]}
                  isCorrect={currentQuestion.options[2].id === currentQuestion.correctReading.id}
                  isSelected={selectedPath === currentQuestion.options[2].id}
                  showFeedback={showFeedback}
                  isPaused={isPaused}
                  onSelect={() => handlePathSelect(currentQuestion.options[2].id)}
                  index={2}
                />
              )}
            </div>

            {/* Bottom Right */}
            <div className="absolute bottom-4 right-4">
              {currentQuestion.options[3] && (
                <ReadingOptionCard
                  option={currentQuestion.options[3]}
                  isCorrect={currentQuestion.options[3].id === currentQuestion.correctReading.id}
                  isSelected={selectedPath === currentQuestion.options[3].id}
                  showFeedback={showFeedback}
                  isPaused={isPaused}
                  onSelect={() => handlePathSelect(currentQuestion.options[3].id)}
                  index={3}
                />
              )}
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 text-center"
            >
              <div className={`inline-block px-6 py-3 rounded-full ${
                selectedPath === currentQuestion.correctReading.id
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                <p className="font-semibold mb-1">
                  {selectedPath === currentQuestion.correctReading.id
                    ? '✅ Correct!'
                    : selectedPath === 'timeout'
                    ? '⏰ Time\'s up!'
                    : '❌ Not quite!'}
                </p>
                <p className="text-sm">
                  The correct reading is <strong>{currentQuestion.correctReading.reading}</strong> ({currentQuestion.correctReading.type})
                  {currentQuestion.explanation && (
                    <span className="block mt-1 text-xs opacity-80">
                      {currentQuestion.explanation}
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}