'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { Rating } from '@/services/kanji-mastery/fsrsAlgorithm';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Daily Reviews Page
 * Main interface for SRS-based kanji review sessions
 * Production-ready with animations, progress tracking, and error handling
 */
export default function DailyReviewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const strings = useStrings();
  const {
    session,
    loading,
    error,
    statistics,
    startSession,
    submitAnswer,
    skipItem,
    endSession,
    progress
  } = useReviewQueue();

  // Local state
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showHint, setShowHint] = useState(false);

  // Start session on mount if user is authenticated
  useEffect(() => {
    if (user && !session && !loading) {
      startSession();
    }
  }, [user]);

  // Handle answer selection
  const handleAnswerSelect = (option: string) => {
    if (showAnswer) return;
    setSelectedOption(option);
  };

  // Reveal answer and show rating buttons
  const handleRevealAnswer = () => {
    if (!selectedOption) return;
    setShowAnswer(true);
  };

  // Submit rating and move to next item
  const handleRating = async (rating: Rating) => {
    const responseTime = Date.now() - startTime;
    await submitAnswer(rating, responseTime);
    
    // Reset state for next question
    setShowAnswer(false);
    setSelectedOption(null);
    setShowHint(false);
    setStartTime(Date.now());
  };

  // Handle skip
  const handleSkip = () => {
    skipItem();
    setShowAnswer(false);
    setSelectedOption(null);
    setShowHint(false);
    setStartTime(Date.now());
  };

  // Set start time when new item is shown
  useEffect(() => {
    if (session?.currentItem) {
      setStartTime(Date.now());
    }
  }, [session?.currentItem]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your reviews...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-destructive text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Reviews</h2>
            <p className="text-muted-foreground mb-6">{error.message}</p>
            <button
              onClick={() => startSession()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No reviews state or no session
  if (!session || !session.currentItem) {
    return (
      <div className="min-h-screen bg-background">
        <header className="px-4 pt-20 pb-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Daily Reviews</h1>
          </div>
        </header>

        <div className="flex items-center justify-center px-4 py-12">
          <div className="bg-card rounded-lg shadow-sm p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground mb-6">
              You have no reviews due right now. Great job staying on top of your studies!
            </p>
            <Link
              href="/kanji-browser"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Learn New Kanji
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Session complete state
  if (session?.isComplete) {
    const accuracy = (progress.correct / progress.completed) * 100;
    
    return (
      <div className="min-h-screen bg-background">
        <header className="px-4 pt-20 pb-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Session Complete</h1>
          </div>
        </header>

        <div className="flex items-center justify-center px-4 py-12">
          <div className="bg-card rounded-lg shadow-sm p-8 max-w-md w-full">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Great Work!</h2>
              <p className="text-muted-foreground">You've completed today's review session</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Reviews Completed</span>
                <span className="font-semibold text-foreground">{progress.completed}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-semibold text-foreground">{accuracy.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Correct Answers</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{progress.correct}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => startSession()}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Review More
              </button>
              <Link
                href="/"
                className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-center"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active review session
  const currentItem = session?.currentItem;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - with proper spacing for virtual companion */}
      <header className="px-4 pt-20 pb-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={endSession}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-foreground">Daily Reviews</h1>
          </div>
          
          {/* Progress */}
          <div className="text-sm text-muted-foreground">
            {progress.completed} / {progress.total}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Kanji display */}
            <div className="bg-card rounded-lg shadow-sm p-8 mb-6">
              <div className="text-center">
                <div className="text-8xl font-bold text-foreground mb-4">
                  {currentItem.kanjiChar}
                </div>
                
                {/* Additional info */}
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  {currentItem.jlptLevel && (
                    <span className="px-2 py-1 bg-muted rounded">
                      {currentItem.jlptLevel}
                    </span>
                  )}
                  {currentItem.strokeCount && (
                    <span className="px-2 py-1 bg-muted rounded">
                      {currentItem.strokeCount} strokes
                    </span>
                  )}
                </div>

                {/* Hint button */}
                {!showAnswer && (
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="mt-4 text-sm text-primary hover:text-primary/80"
                  >
                    {showHint ? 'Hide' : 'Show'} Hint
                  </button>
                )}

                {/* Hint display */}
                {showHint && !showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 bg-accent rounded-lg text-sm text-accent-foreground"
                  >
                    Components: {currentItem.components?.join(', ') || 'N/A'}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Question */}
            <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                What is the meaning of this kanji?
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {/* For now, just show the meaning directly since we don't have distractors */}
                <button
                  onClick={() => handleAnswerSelect(currentItem.meaning)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedOption === currentItem.meaning
                      ? showAnswer
                        ? 'border-green-500 bg-green-50'
                        : 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {currentItem.meaning}
                </button>
                
                {/* Placeholder options */}
                {['Option 2', 'Option 3', 'Option 4'].map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showAnswer}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      selectedOption === option
                        ? showAnswer
                          ? 'border-destructive bg-destructive/10'
                          : 'border-primary bg-primary/10'
                        : 'border-border hover:border-accent'
                    } ${showAnswer ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Show/Check button */}
              {!showAnswer && selectedOption && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={handleRevealAnswer}
                  className="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Show Answer
                </motion.button>
              )}

              {/* Rating buttons */}
              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    How well did you know this?
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRating(Rating.AGAIN)}
                      className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm"
                    >
                      Again
                    </button>
                    <button
                      onClick={() => handleRating(Rating.HARD)}
                      className="px-3 py-2 bg-orange-500 dark:bg-orange-600 text-white rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors text-sm"
                    >
                      Hard
                    </button>
                    <button
                      onClick={() => handleRating(Rating.GOOD)}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      Good
                    </button>
                    <button
                      onClick={() => handleRating(Rating.EASY)}
                      className="px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                    >
                      Easy
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Additional info when answer is shown */}
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-lg shadow-sm p-6"
              >
                <h4 className="font-semibold text-foreground mb-3">Additional Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">On'yomi:</span>
                    <span className="text-foreground">{currentItem.onyomi?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kun'yomi:</span>
                    <span className="text-foreground">{currentItem.kunyomi?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue by:</span>
                    <span className="text-foreground">
                      {currentItem.overdueBy > 0 
                        ? `${Math.floor(currentItem.overdueBy)} days`
                        : 'Not overdue'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Skip button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Skip this item
          </button>
        </div>
      </div>

      {/* Mobile navigation padding */}
      <div className="h-20" />
    </div>
  );
}