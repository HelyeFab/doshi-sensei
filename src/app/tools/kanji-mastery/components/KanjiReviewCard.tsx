'use client';

import { useState } from 'react';
import { KanjiProgress } from '@/services/kanji-mastery/storage';
import { KanjiTTSButton } from '@/components/ui/TTSButton';

interface KanjiWithProgress {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  progress: KanjiProgress;
}

interface KanjiReviewCardProps {
  kanji: KanjiWithProgress;
  onRate: (rating: number) => void;
  progress: KanjiProgress;
}

export default function KanjiReviewCard({ kanji, onRate, progress }: KanjiReviewCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedReading, setSelectedReading] = useState<'on' | 'kun' | null>(null);

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleRate = (rating: number) => {
    onRate(rating);
    // Reset for next card
    setShowAnswer(false);
    setSelectedReading(null);
  };

  const formatLastReview = () => {
    const days = Math.floor((new Date().getTime() - progress.lastReviewed.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Review Info Bar */}
      <div className="bg-muted/30 px-4 py-2 border-b border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Last reviewed: {formatLastReview()}
          </span>
          <span className="text-muted-foreground">
            Reviews: {progress.reviewCount}
          </span>
        </div>
      </div>

      {/* Question Side */}
      <div className="p-8 text-center">
        <div className="text-8xl font-bold text-foreground mb-6 japanese-text">
          {kanji.kanji}
        </div>

        {!showAnswer ? (
          <>
            <p className="text-lg text-muted-foreground mb-8">
              What does this kanji mean?
            </p>
            <button
              onClick={handleReveal}
              className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Show Answer
            </button>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Meaning */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Meaning</h3>
              <p className="text-2xl font-semibold text-foreground">{kanji.meaning}</p>
            </div>

            {/* Readings */}
            <div className="space-y-4">
              {/* On'yomi */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  音読み (On&apos;yomi)
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {kanji.onyomi.map((reading, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedReading('on')}
                      className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md japanese-text hover:bg-primary/20 transition-colors"
                    >
                      {reading}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kun'yomi */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  訓読み (Kun&apos;yomi)
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {kanji.kunyomi.map((reading, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedReading('kun')}
                      className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-md japanese-text hover:bg-accent/20 transition-colors"
                    >
                      {reading}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TTS Button */}
            <div className="flex justify-center">
              <KanjiTTSButton 
                kanji={kanji.kanji}
                reading={selectedReading === 'on' ? kanji.onyomi[0] : kanji.kunyomi[0]}
                readingType={selectedReading || 'kun'}
                size="md"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rating Buttons */}
      {showAnswer && (
        <div className="border-t border-border p-4 bg-muted/10">
          <p className="text-sm text-muted-foreground text-center mb-3">
            How well did you remember?
          </p>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => handleRate(1)}
              className="py-3 px-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium"
            >
              Forgot
            </button>
            <button
              onClick={() => handleRate(2)}
              className="py-3 px-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors text-sm font-medium"
            >
              Hard
            </button>
            <button
              onClick={() => handleRate(3)}
              className="py-3 px-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors text-sm font-medium"
            >
              Good
            </button>
            <button
              onClick={() => handleRate(4)}
              className="py-3 px-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-sm font-medium"
            >
              Easy
            </button>
            <button
              onClick={() => handleRate(5)}
              className="py-3 px-2 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            >
              Perfect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}