'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useOnboardingState } from './hooks/useOnboardingState';
import { cn } from '@/lib/utils';
import { NavigationBar } from './components/NavigationBar';

// Import all screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { ConjugationScreen } from './screens/ConjugationScreen';
import { YouTubeShadowingScreen } from './screens/YouTubeShadowingScreen';
import { TextbookVocabularyScreen } from './screens/TextbookVocabularyScreen';
import { SuccessScreen } from './screens/SuccessScreen';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const {
    state,
    nextScreen,
    previousScreen,
    skipToScreen,
    completeOnboarding,
    markAsSeen,
    trackDropOff,
  } = useOnboardingState();

  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track initial screen view
  useEffect(() => {
    if (state.isActive) {
      // Track screen view
    }
  }, [state.isActive, state.currentScreen]);

  const handleComplete = () => {
    completeOnboarding();
    onComplete();
  };

  const handleSkip = () => {
    // Skip to the last screen (success screen)
    setDirection(1);
    skipToScreen(5); // Index of the last screen (SuccessScreen)
  };

  const handleNext = () => {
    if (state.currentScreen < screens.length - 1) {
      setDirection(1);
      nextScreen();
    }
  };

  const handlePrevious = () => {
    if (state.currentScreen > 0) {
      setDirection(-1);
      previousScreen();
    }
  };

  // Handle swipe gestures
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    
    if (info.offset.x > threshold && state.currentScreen > 0) {
      handlePrevious();
    } else if (info.offset.x < -threshold && state.currentScreen < screens.length - 1) {
      handleNext();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!state.isActive) return;

      switch (event.key) {
        case 'ArrowLeft':
          if (state.currentScreen > 0) {
            event.preventDefault();
            handlePrevious();
          }
          break;
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          if (state.currentScreen < screens.length - 1) {
            event.preventDefault();
            handleNext();
          } else if (state.currentScreen === screens.length - 1 && event.key === 'Enter') {
            handleComplete();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [state.isActive, state.currentScreen]);

  if (!state.isActive) {
    return null;
  }


  const screens = [
    <WelcomeScreen key="welcome" onNext={handleNext} />,
    <OverviewScreen key="overview" onNext={handleNext} />,
    <ConjugationScreen key="conjugation" onNext={handleNext} />,
    <YouTubeShadowingScreen key="youtube" onNext={handleNext} />,
    <TextbookVocabularyScreen key="textbook" onNext={handleNext} />,
    <SuccessScreen key="success" onComplete={handleComplete} onBack={handlePrevious} />,
  ];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(109, 40, 217) 50%, rgb(91, 33, 182) 100%)',
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>


      {/* Main Content - Full Screen */}
      <div className="relative h-full w-full flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={state.currentScreen}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Content Area - Centered on desktop */}
            <div className="w-full h-full flex flex-col justify-center items-center px-4 md:px-12 overflow-y-auto">
              <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center">
                <div className="py-4">
                  {screens[state.currentScreen]}
                </div>
              </div>
              
              {/* Navigation Bar */}
              <div className="w-full max-w-3xl mx-auto pb-4">
                <NavigationBar
                  currentScreen={state.currentScreen}
                  totalScreens={screens.length}
                  onSkip={handleSkip}
                  onNext={handleNext}
                  onBack={state.currentScreen > 0 ? handlePrevious : undefined}
                  isLastScreen={state.currentScreen === screens.length - 1}
                  showSkip={state.currentScreen < screens.length - 1}
                  showNext={state.currentScreen < screens.length - 1} // Show Next button on all screens except the last one
                  showBack={state.currentScreen > 0}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}