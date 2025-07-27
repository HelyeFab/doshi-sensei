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
    <div className="px-4 pt-8 pb-8 md:pb-12" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="max-w-6xl mx-auto">
        {/* Progression Dots */}
        <div className="flex justify-center mb-6">
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
                className="text-white/70 hover:text-white transition-colors text-base font-medium px-4 py-2"
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
                className="text-white/50 hover:text-white/70 transition-colors text-base"
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
                className="text-white hover:text-white/80 transition-colors text-base font-medium px-4 py-2"
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