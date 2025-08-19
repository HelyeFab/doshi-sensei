'use client';

import { KanjiWithExamples, KanjiProgress, UserRating } from '../types';

interface Round3EvaluateProps {
  kanji: KanjiWithExamples;
  progress: KanjiProgress;
  currentIndex: number;
  totalCount: number;
  onRate: (rating: UserRating) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onComplete: () => void;
}

export default function Round3Evaluate({
  kanji,
  progress,
  currentIndex,
  totalCount,
  onRate,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  onComplete
}: Round3EvaluateProps) {
  const hasRating = progress.round3Rating !== undefined;

  const handleRating = (rating: UserRating) => {
    onRate(rating);
  };

  // Calculate test performance
  const correctAnswers = progress.round2Results.filter(r => r.wasCorrect).length;
  const totalQuestions = progress.round2Results.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  // Get rating button styles with gradient
  const getRatingButtonClass = (rating: UserRating, isSelected: boolean) => {
    const baseClass = "flex-1 py-3 px-4 rounded-lg font-medium transition-all ";
    
    if (isSelected) {
      switch (rating) {
        case 1: return baseClass + "bg-red-500 text-white";
        case 3: return baseClass + "bg-orange-500 text-white";
        case 4: return baseClass + "bg-green-500 text-white";
        case 5: return baseClass + "bg-blue-500 text-white";
      }
    }
    
    switch (rating) {
      case 1: return baseClass + "bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30 border-2 border-red-500/50";
      case 3: return baseClass + "bg-orange-500/20 text-orange-700 dark:text-orange-400 hover:bg-orange-500/30 border-2 border-orange-500/50";
      case 4: return baseClass + "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30 border-2 border-green-500/50";
      case 5: return baseClass + "bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30 border-2 border-blue-500/50";
      default: return baseClass;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-24 pb-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Round 3: Evaluate ({currentIndex + 1}/{totalCount})
            </h2>
          </div>
        </div>
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content with mobile padding */}
      <div className="flex-1 overflow-y-auto mobile-nav-padding">
        <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
          {/* Kanji Display */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <div className="text-8xl font-bold text-foreground mb-4">
              {kanji.kanji}
            </div>
            <div className="space-y-2">
              {kanji.kunyomi && kanji.kunyomi.length > 0 && (
                <p className="text-lg text-muted-foreground">
                  {kanji.kunyomi.join('、')}
                </p>
              )}
              {kanji.onyomi && kanji.onyomi.length > 0 && (
                <p className="text-lg text-muted-foreground">
                  {kanji.onyomi.join('、')}
                </p>
              )}
              <p className="text-xl font-medium text-foreground mt-2">
                {kanji.meaning}
              </p>
            </div>
          </div>

          {/* Test Performance */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              YOUR TEST PERFORMANCE
            </h3>
            
            <div className="space-y-3">
              {progress.round2Results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">
                    {result.questionType === 'kun' ? 'Kun-yomi' : 
                     result.questionType === 'on' ? 'On-yomi' : 'Meaning'}:
                  </span>
                  <span className={`font-medium ${result.wasCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {result.wasCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Overall Accuracy:</span>
                <span className={`text-lg font-bold ${
                  accuracy >= 100 ? 'text-green-600' :
                  accuracy >= 66 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {accuracy}%
                </span>
              </div>
            </div>
          </div>

          {/* Rating Question */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-4 text-center">
              How well do you know this kanji?
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRating(1)}
                className={getRatingButtonClass(1, progress.round3Rating === 1)}
              >
                Again
              </button>
              <button
                onClick={() => handleRating(3)}
                className={getRatingButtonClass(3, progress.round3Rating === 3)}
              >
                Hard
              </button>
              <button
                onClick={() => handleRating(4)}
                className={getRatingButtonClass(4, progress.round3Rating === 4)}
              >
                Good
              </button>
              <button
                onClick={() => handleRating(5)}
                className={getRatingButtonClass(5, progress.round3Rating === 5)}
              >
                Easy
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              {!hasRating && "Select how confident you feel about this kanji"}
              {hasRating && "You can change your rating before moving on"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation with bottom padding for virtual companion */}
      <div className="border-t border-border bg-card p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          {currentIndex === totalCount - 1 ? (
            <div className="space-y-3">
              <button
                onClick={onComplete}
                disabled={!hasRating}
                className="w-full py-3 px-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Session
              </button>
              {canGoPrevious && (
                <button
                  onClick={onPrevious}
                  className="w-full py-2 px-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  Review Previous
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="flex-1 py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={onNext}
                disabled={!hasRating || !canGoNext}
                className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}