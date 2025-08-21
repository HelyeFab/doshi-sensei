'use client';

import { useEffect, useState } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      // Play a success sound or animation
      // Could add confetti effect here
    }
  }, [isOpen]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  // Mobile full-screen version
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="w-9" /> {/* Spacer */}
          <span className="text-sm font-medium text-muted-foreground">Session Complete</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
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
        </div>
      </div>
    );
  }

  // Desktop modal version
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
      </div>
    </div>
  );
}