'use client';

import { Clock, CheckCircle2, XCircle, SkipForward, TrendingUp } from 'lucide-react';

interface SessionStatsProps {
  stats: {
    reviewed: number;
    correct: number;
    incorrect: number;
    skipped: number;
  };
  currentCard: number;
  totalCards: number;
  progress: number;
  timeSpent: number;
}

export function SessionStats({
  stats,
  currentCard,
  totalCards,
  progress,
  timeSpent
}: SessionStatsProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const accuracy = stats.reviewed > 0 
    ? Math.round((stats.correct / stats.reviewed) * 100) 
    : 0;
  
  return (
    <div className="mb-6 space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Card {currentCard} of {totalCards}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            {/* Segmented progress bar showing correct/incorrect */}
            <div className="absolute inset-0 flex h-full">
              {Array.from({ length: stats.reviewed }).map((_, idx) => {
                const isCorrect = idx < stats.correct;
                const segmentWidth = 100 / totalCards;
                return (
                  <div
                    key={idx}
                    className={`h-full ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${segmentWidth}%` }}
                  />
                );
              })}
              {/* Current progress */}
              <div 
                className="h-full bg-primary"
                style={{ width: `${(100 / totalCards) * (stats.reviewed === currentCard - 1 ? 1 : 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-2">
        {/* Time */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-semibold">{formatTime(timeSpent)}</div>
          <div className="text-xs text-muted-foreground">Time</div>
        </div>
        
        {/* Correct */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-500" />
          <div className="text-lg font-semibold text-green-600">{stats.correct}</div>
          <div className="text-xs text-muted-foreground">Correct</div>
        </div>
        
        {/* Incorrect */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <XCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
          <div className="text-lg font-semibold text-red-600">{stats.incorrect}</div>
          <div className="text-xs text-muted-foreground">Incorrect</div>
        </div>
        
        {/* Skipped */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <SkipForward className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
          <div className="text-lg font-semibold text-yellow-600">{stats.skipped}</div>
          <div className="text-xs text-muted-foreground">Skipped</div>
        </div>
        
        {/* Accuracy */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-500" />
          <div className="text-lg font-semibold text-blue-600">{accuracy}%</div>
          <div className="text-xs text-muted-foreground">Accuracy</div>
        </div>
      </div>
    </div>
  );
}