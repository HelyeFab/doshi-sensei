'use client';

import { TutorialButton } from './TutorialButton';

export interface NavigationBarProps {
  currentScreen: number;
  totalScreens: number;
  onSkip: () => void;
  onNext: () => void;
  onBack?: () => void;
  isLastScreen?: boolean;
  showSkip?: boolean;
  showNext?: boolean;
  showBack?: boolean;
}

export function NavigationBar({
  currentScreen,
  totalScreens,
  onSkip,
  onNext,
  onBack,
  isLastScreen = false,
  showSkip = true,
  showNext = true,
  showBack = false,
}: NavigationBarProps) {
  return (
    <div className="px-4 pb-4 pt-0 md:pt-2">
      <div className="max-w-6xl mx-auto">
        {/* Progression Dots */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {Array.from({ length: totalScreens }, (_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentScreen
                    ? 'bg-white scale-125'
                    : index < currentScreen
                    ? 'bg-white/60'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          {/* Left side - Back button */}
          <div className="flex-1">
            {showBack && onBack && (
              <button
                onClick={onBack}
                className="text-white/70 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
          </div>

          {/* Center - Skip button */}
          <div className="flex-1 flex justify-center">
            {showSkip && !isLastScreen && (
              <button
                onClick={onSkip}
                className="text-white/50 hover:text-white/70 transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          {/* Right side - Next button */}
          <div className="flex-1 flex justify-end">
            {showNext && !isLastScreen && (
              <button
                onClick={onNext}
                className="text-white hover:text-white/80 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 