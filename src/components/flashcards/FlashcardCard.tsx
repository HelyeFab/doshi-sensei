'use client';

import { useState, useEffect } from 'react';
import { FlashcardQuality } from '@/types';
import { FlashcardQuestion } from '@/utils/flashcards';
import { qualityDescriptions } from '@/utils/spacedRepetition';

interface FlashcardCardProps {
  question: FlashcardQuestion;
  onAnswer: (quality: FlashcardQuality, responseTime: number) => void;
  showHint?: boolean;
}

export default function FlashcardCard({ question, onAnswer, showHint = false }: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showQualityRating, setShowQualityRating] = useState(false);

  // Reset card state when question changes
  useEffect(() => {
    setIsFlipped(false);
    setShowQualityRating(false);
    setStartTime(Date.now());
  }, [question.word.id]);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      // Show the answer first, then quality rating after a delay
      setTimeout(() => {
        setShowQualityRating(true);
      }, 2000); // 2 second delay to let users see the answer
    }
  };

  const handleQualitySelect = (quality: FlashcardQuality) => {
    const responseTime = Date.now() - startTime;
    onAnswer(quality, responseTime);
  };

  const getCardTypeIcon = () => {
    switch (question.cardType) {
      case 'kanji-to-meaning':
        return '漢 → EN';
      case 'meaning-to-kanji':
        return 'EN → 漢';
      case 'reading-recognition':
        return '漢 → あ';
      default:
        return '?';
    }
  };

  const getCardTypeDescription = () => {
    switch (question.cardType) {
      case 'kanji-to-meaning':
        return 'Kanji to Meaning';
      case 'meaning-to-kanji':
        return 'Meaning to Kanji';
      case 'reading-recognition':
        return 'Kanji to Reading';
      default:
        return 'Unknown';
    }
  };

  // Helper to render content that may contain HTML (for Anki cards)
  const renderContent = (content: string) => {
    // Check if content contains HTML tags (common in Anki cards)
    if (content.includes('<') && content.includes('>')) {
      return (
        <div 
          className="anki-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    return content;
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Custom CSS for 3D flip animation and Anki content */}
      <style jsx>{`
        .flip-container {
          perspective: 1000px;
        }
        .flip-card {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.8s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        .anki-content img {
          max-width: 100%;
          height: auto;
          margin: 0.5rem auto;
        }
        .anki-content audio {
          margin: 0.5rem auto;
          display: block;
        }
      `}</style>

      {/* Card Type Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
          {getCardTypeIcon()} • {getCardTypeDescription()}
        </div>
      </div>

      {/* Main Card with Flip Animation */}
      <div
        className="w-full h-80 cursor-pointer flip-container"
        onClick={!showQualityRating ? handleFlip : undefined}
      >
        <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
          {/* Front of Card */}
          <div className="flip-card-front bg-card border border-border rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
            <div className="text-center mb-6">
              <div className="text-4xl japanese-text font-medium text-card-foreground mb-4">
                {renderContent(question.question)}
              </div>
              {showHint && question.hint && (
                <div className="text-lg japanese-text text-muted-foreground">
                  Hint: {question.hint}
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">
                Think of the answer, then tap to reveal
              </div>
              <div className="flex items-center justify-center gap-2 text-primary">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
                <span className="text-sm font-medium">Tap to flip</span>
              </div>
            </div>
          </div>

          {/* Back of Card */}
          <div className="flip-card-back bg-card border border-border rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
            <div className="text-center">
              {/* Show question in smaller text */}
              <div className="text-lg text-muted-foreground mb-2">
                {question.question}
              </div>

              {/* Main answer */}
              <div className="text-4xl japanese-text font-medium text-card-foreground mb-4">
                {renderContent(question.answer)}
              </div>

              {/* Show additional info only if it's different from what's already shown */}
              {question.cardType === 'reading-recognition' && (
                <div className="text-xl text-card-foreground mb-3 font-medium">
                  {question.word.meaning}
                </div>
              )}

              {question.cardType === 'kanji-to-meaning' && question.hint && (
                <div className="text-lg japanese-text text-muted-foreground mb-3">
                  {question.hint}
                </div>
              )}

              {showHint && question.hint && question.cardType !== 'kanji-to-meaning' && (
                <div className="text-sm japanese-text text-muted-foreground">
                  Reading: {question.hint}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quality Rating */}
      {showQualityRating && (
        <div className="mt-6 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              How well did you know this?
            </h3>
            <p className="text-sm text-muted-foreground">
              Rate your recall to optimize future reviews
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Again', quality: 0 as FlashcardQuality, description: 'Could not recall at all', color: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' },
              { label: 'Good', quality: 2 as FlashcardQuality, description: 'But it felt familiar when revealed', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20' },
              { label: 'Perfect', quality: 4 as FlashcardQuality, description: 'After some thought or slight hesitation', color: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' }
            ].map((option) => (
              <button
                key={option.quality}
                onClick={() => handleQualitySelect(option.quality)}
                className={`p-4 rounded-lg border text-left transition-all hover:scale-105 ${option.color}`}
              >
                <div className="font-medium mb-2">
                  {option.label}
                </div>
                <div className="text-sm opacity-80">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}