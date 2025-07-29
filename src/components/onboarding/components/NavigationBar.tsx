'use client';

import { motion } from 'framer-motion';

export interface NavigationBarProps {
  onSkip: () => void;
  onNext: () => void;
  currentScreen: number;
  totalScreens: number;
}

export function NavigationBar({
  onSkip,
  onNext,
  currentScreen,
  totalScreens,
}: NavigationBarProps) {
  return (
    <nav className="bg-primary border-t border-primary-foreground/10">
      <div className="flex justify-between items-center px-6 py-4">
        {/* Skip Button - flex: 1 for equal space */}
        <div className="flex-1">
          <button
            onClick={onSkip}
            className="text-primary-foreground/70 text-sm font-medium hover:text-primary-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Progress Dots - flex: 1 for equal space, centered */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalScreens }, (_, index) => (
              <motion.div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentScreen
                    ? 'bg-primary-foreground'
                    : 'bg-primary-foreground/30'
                }`}
                animate={{
                  y: [0, 0, -8, 0, 0, 0],
                  scale: [1, 1, 1.3, 1, 1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>

        {/* Next Button - flex: 1 for equal space, right aligned */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={onNext}
            className="text-primary-foreground text-sm font-medium hover:text-primary-foreground/80 transition-colors"
          >
            {currentScreen === totalScreens - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </nav>
  );
}