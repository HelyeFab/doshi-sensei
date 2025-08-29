'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ReviewRating, 
  StudyMode, 
  ContentType, 
  ReviewResponse,
  SessionSummary,
  ReviewItem,
  ReviewProgress,
  SessionState 
} from '@/lib/unified-review';
import { useReviewSession } from '@/hooks/useReviewSession';

interface ReviewSessionProps {
  /**
   * Session preferences for items to include
   */
  sessionPreferences?: {
    maxItems?: number;
    maxDuration?: number;
    contentTypes?: ContentType[];
    studyModes?: StudyMode[];
    includeNew?: boolean;
    newItemsLimit?: number;
  };
  
  /**
   * Callback when session is completed
   */
  onSessionComplete?: (summary: SessionSummary) => void;
  
  /**
   * Callback when session is cancelled
   */
  onSessionCancel?: () => void;
  
  /**
   * Whether to show detailed progress information
   */
  showDetailedProgress?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Rating button configurations
const RATING_CONFIGS = {
  [ReviewRating.AGAIN]: {
    label: 'Again',
    description: 'Complete failure',
    color: 'bg-red-600 hover:bg-red-700 text-white',
    shortcut: '1'
  },
  [ReviewRating.HARD]: {
    label: 'Hard',
    description: 'Incorrect but some knowledge',
    color: 'bg-orange-600 hover:bg-orange-700 text-white',
    shortcut: '2'
  },
  [ReviewRating.GOOD]: {
    label: 'Good',
    description: 'Correct with effort',
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    shortcut: '3'
  },
  [ReviewRating.EASY]: {
    label: 'Easy',
    description: 'Correct with ease',
    color: 'bg-green-600 hover:bg-green-700 text-white',
    shortcut: '4'
  }
};

// Content type renderers
const ContentRenderers = {
  [ContentType.KANJI]: ({ content }: { content: any }) => (
    <div className="text-center">
      <div className="text-8xl font-bold text-foreground mb-4">
        {content.character}
      </div>
      <div className="text-sm text-muted-foreground">
        What does this kanji mean?
      </div>
    </div>
  ),
  
  [ContentType.VOCABULARY]: ({ content }: { content: any }) => (
    <div className="text-center">
      <div className="text-4xl font-bold text-foreground mb-2">
        {content.word}
      </div>
      <div className="text-xl text-muted-foreground mb-4">
        {content.reading}
      </div>
      <div className="text-sm text-muted-foreground">
        What does this word mean?
      </div>
    </div>
  ),
  
  [ContentType.FLASHCARD]: ({ content }: { content: any }) => (
    <div className="text-center">
      <div className="text-2xl text-foreground mb-4">
        {content.front.text}
      </div>
      <div className="text-sm text-muted-foreground">
        What's on the back of this card?
      </div>
    </div>
  )
};

export default function ReviewSession({
  sessionPreferences = {},
  onSessionComplete,
  onSessionCancel,
  showDetailedProgress = true,
  className = ''
}: ReviewSessionProps) {
  const {
    sessionState,
    currentItem,
    isLoading,
    isSessionActive,
    startSession,
    submitReview,
    endSession,
    error
  } = useReviewSession();

  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedRating, setSelectedRating] = useState<ReviewRating | null>(null);

  // Start session on component mount
  useEffect(() => {
    if (!isSessionActive && !isLoading) {
      handleStartSession();
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!showAnswer) {
        if (event.code === 'Space') {
          event.preventDefault();
          setShowAnswer(true);
          setStartTime(new Date());
        }
        return;
      }

      const rating = Object.values(ReviewRating).find(r => 
        RATING_CONFIGS[r].shortcut === event.key
      );
      
      if (rating) {
        event.preventDefault();
        handleRatingSelect(rating);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer]);

  const handleStartSession = async () => {
    try {
      await startSession(sessionPreferences);
    } catch (error) {
      console.error('Failed to start review session:', error);
    }
  };

  const handleRatingSelect = async (rating: ReviewRating) => {
    if (!currentItem || !startTime) return;

    setSelectedRating(rating);

    const responseTime = (new Date().getTime() - startTime.getTime()) / 1000;
    
    const response: ReviewResponse = {
      rating,
      responseTime,
      studyMode: StudyMode.RECOGNITION, // Default for now
      hintsUsed: false,
      context: {}
    };

    try {
      await submitReview(response);
      
      // Reset for next item
      setShowAnswer(false);
      setStartTime(null);
      setSelectedRating(null);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      const summary = await endSession();
      if (onSessionComplete && summary) {
        onSessionComplete(summary);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleCancel = () => {
    endSession();
    if (onSessionCancel) {
      onSessionCancel();
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (!sessionState) return 0;
    return (sessionState.currentIndex / sessionState.items.length) * 100;
  };

  // Render current item content
  const renderItemContent = () => {
    if (!currentItem) return null;

    const ContentRenderer = ContentRenderers[currentItem.type] || ContentRenderers[ContentType.FLASHCARD];
    
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <ContentRenderer content={currentItem.content} />
      </div>
    );
  };

  // Render item answer/explanation
  const renderItemAnswer = () => {
    if (!currentItem) return null;

    const { content } = currentItem;

    switch (currentItem.type) {
      case ContentType.KANJI:
        return (
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold text-foreground">
              {content.meanings?.join(', ') || 'No meanings available'}
            </div>
            {content.onyomi?.length > 0 && (
              <div className="text-sm text-muted-foreground">
                On-yomi: {content.onyomi.join(', ')}
              </div>
            )}
            {content.kunyomi?.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Kun-yomi: {content.kunyomi.join(', ')}
              </div>
            )}
          </div>
        );
        
      case ContentType.VOCABULARY:
        return (
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold text-foreground">
              {content.meanings?.join(', ') || 'No meanings available'}
            </div>
            <div className="text-sm text-muted-foreground">
              Part of speech: {content.partOfSpeech?.join(', ') || 'Unknown'}
            </div>
          </div>
        );
        
      case ContentType.FLASHCARD:
        return (
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {content.back?.text || 'No answer available'}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-center text-muted-foreground">
            Answer content not available
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="flex space-x-2">
              <div className="h-10 bg-muted rounded flex-1"></div>
              <div className="h-10 bg-muted rounded flex-1"></div>
              <div className="h-10 bg-muted rounded flex-1"></div>
              <div className="h-10 bg-muted rounded flex-1"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">
            Error: {error}
          </div>
          <Button onClick={handleStartSession}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isSessionActive || !sessionState || !currentItem) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-4">
            No active review session
          </div>
          <Button onClick={handleStartSession}>
            Start Review Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Review Session
          </CardTitle>
          <Button
            onClick={handleCancel}
            variant="outline"
            size="sm"
          >
            End Session
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Item {sessionState.currentIndex + 1} of {sessionState.items.length}
            </span>
            <span>
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>
        
        {showDetailedProgress && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Correct: {sessionState.stats.correctAnswers}</span>
            <span>Total: {sessionState.stats.totalReviewed}</span>
            <span>
              Accuracy: {
                sessionState.stats.totalReviewed > 0 
                  ? Math.round((sessionState.stats.correctAnswers / sessionState.stats.totalReviewed) * 100)
                  : 0
              }%
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Item Content */}
        <div className="mb-6">
          {renderItemContent()}
        </div>

        {/* Show Answer Button */}
        {!showAnswer && (
          <div className="text-center mb-6">
            <Button
              onClick={() => {
                setShowAnswer(true);
                setStartTime(new Date());
              }}
              size="lg"
              className="w-full max-w-xs"
            >
              Show Answer (Space)
            </Button>
          </div>
        )}

        {/* Answer and Rating Buttons */}
        {showAnswer && (
          <>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              {renderItemAnswer()}
            </div>

            <div className="space-y-3">
              <div className="text-sm text-muted-foreground text-center">
                How well did you know this?
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.values(ReviewRating).map(rating => {
                  const config = RATING_CONFIGS[rating];
                  return (
                    <Button
                      key={rating}
                      onClick={() => handleRatingSelect(rating)}
                      disabled={selectedRating !== null}
                      className={`${config.color} text-xs p-2 h-auto flex flex-col`}
                      variant="default"
                    >
                      <span className="font-semibold">
                        {config.label} ({config.shortcut})
                      </span>
                      <span className="text-xs opacity-90 mt-1">
                        {config.description}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}