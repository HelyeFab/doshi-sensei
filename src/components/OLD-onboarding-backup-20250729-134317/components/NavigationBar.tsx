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
    <div className="w-full bg-purple-700/20" style={{ paddingBottom: `env(safe-area-inset-bottom, 0px)` }}>
      <div className="pt-4 pb-4">
        <div className="max-w-6xl mx-auto space-y-4 px-4">
          {/* Progression Dots */}
          <div className="flex justify-center">
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
              {showBack && onBack ? (
                <button
                  onClick={onBack}
                  className="text-white/70 hover:text-white active:text-white/50 transition-colors text-base font-medium px-4 py-3 -ml-4 rounded-lg"
                >
                  Back
                </button>
              ) : (
                <div className="w-16" /> 
              )}
            </div>

            {/* Center - Skip button */}
            <div className="flex-1 flex justify-center">
              {showSkip && !isLastScreen && (
                <button
                  onClick={onSkip}
                  className="text-white/50 hover:text-white/70 active:text-white/40 transition-colors text-base px-4 py-3 rounded-lg"
                >
                  Skip
                </button>
              )}
            </div>

            {/* Right side - Next button */}
            <div className="flex-1 flex justify-end">
              {showNext && !isLastScreen ? (
                <button
                  onClick={onNext}
                  className="text-white hover:text-white/80 active:text-white/50 transition-colors text-base font-medium px-6 py-3 rounded-lg"
                >
                  Next
                </button>
              ) : (
                <div className="w-16" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 