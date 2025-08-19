'use client';

import { useEffect } from 'react';
import SlideUpModal from '@/components/SlideUpModal';

interface SessionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalKanji: number;
  markedAsEasy: number;
}

export default function SessionCompleteModal({
  isOpen,
  onClose,
  totalKanji,
  markedAsEasy
}: SessionCompleteModalProps) {
  const difficultKanji = totalKanji - markedAsEasy;
  
  useEffect(() => {
    if (isOpen) {
      // Play a success sound or animation
      // Could add confetti effect here
    }
  }, [isOpen]);

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      height="auto"
      showHandle={false}
    >
      <div className="p-6 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Session Complete! 🎉
        </h2>
        
        {/* Subtitle */}
        <p className="text-muted-foreground mb-6">
          Great job! You&apos;ve completed today&apos;s learning session.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{totalKanji}</div>
            <div className="text-sm text-muted-foreground">Kanji Studied</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{markedAsEasy}</div>
            <div className="text-sm text-muted-foreground">Marked Easy</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{difficultKanji}</div>
            <div className="text-sm text-muted-foreground">Need Review</div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-2">Next Review</h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ll remind you to review these kanji tomorrow for optimal retention.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </SlideUpModal>
  );
}