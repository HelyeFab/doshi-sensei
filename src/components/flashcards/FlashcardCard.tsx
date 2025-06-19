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
      setShowQualityRating(true);
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

  return (
    <div className="max-w-md mx-auto">
      {/* Card Type Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
          {getCardTypeIcon()} • {getCardTypeDescription()}
        </div>
      </div>

      {/* Main Card */}
      <div
        className={`relative w-full h-80 perspective-1000 cursor-pointer transition-transform duration-300 ${
          isFlipped ? 'transform-style-preserve-3d rotate-y-180' : ''
        }`}
        onClick={handleFlip}
      >
        {/* Front of Card */}
        <div className={`absolute inset-0 backface-hidden ${isFlipped ? 'rotate-y-180' : ''}`}>
          <div className="w-full h-full bg-card border border-border rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
            <div className="text-center mb-6">
              <div className="text-4xl japanese-text font-medium text-card-foreground mb-4">
                {question.question}
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
        </div>

        {/* Back of Card */}
        <div className={`absolute inset-0 backface-hidden rotate-y-180 ${isFlipped ? 'rotate-y-0' : ''}`}>
          <div className="w-full h-full bg-card border border-border rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
            <div className="text-center mb-6">
              <div className="text-lg japanese-text text-muted-foreground mb-2">
                {question.question}
              </div>
              <div className="text-4xl japanese-text font-medium text-card-foreground mb-4">
                {question.answer}
              </div>
              {/* English Meaning */}
              <div className="text-xl text-card-foreground mb-3 font-medium">
                {question.word.meaning}
              </div>
              {showHint && question.hint && (
                <div className="text-sm japanese-text text-muted-foreground">
                  Additional: {question.hint}
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

          <div className="grid grid-cols-2 gap-2">
            {([0, 1, 2, 3, 4, 5] as FlashcardQuality[]).map((quality) => {
              const getQualityColors = (q: number) => {
                switch (q) {
                  case 0: return 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20';
                  case 1: return 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20';
                  case 2: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20';
                  case 3: return 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20';
                  case 4: return 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20';
                  case 5: return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';
                  default: return 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20';
                }
              };

              return (
                <button
                  key={quality}
                  onClick={() => handleQualitySelect(quality)}
                  className={`p-3 rounded-lg border text-left transition-all hover:scale-105 ${getQualityColors(quality)}`}
                >
                  <div className="font-medium text-sm mb-1">
                    {quality === 0 ? 'Again' :
                     quality === 1 ? 'Hard' :
                     quality === 2 ? 'Good' :
                     quality === 3 ? 'Easy' :
                     quality === 4 ? 'Perfect' : 'Instant'}
                  </div>
                  <div className="text-xs opacity-80">
                    {qualityDescriptions[quality].split(' - ')[1] || qualityDescriptions[quality]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Word Info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Word:</span>
            <span className="japanese-text font-medium text-foreground">
              {question.word.kanji} ({question.word.kana})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded border ${
              question.word.type === 'noun' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              question.word.type === 'Ichidan' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              question.word.type === 'Godan' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              {question.word.type}
            </span>
            <span className="text-xs text-muted-foreground">
              {question.word.jlpt}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
