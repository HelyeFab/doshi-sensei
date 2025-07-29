'use client';

import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { NavigationBar } from './components/NavigationBar';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ConjugationScreen } from './screens/ConjugationScreen';
import { YouTubeShadowingScreen } from './screens/YouTubeShadowingScreen';
import { TextbookVocabularyScreen } from './screens/TextbookVocabularyScreen';
import { SuccessScreen } from './screens/SuccessScreen';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const totalScreens = 5;

  const screens = [
    <WelcomeScreen key="welcome" onNext={() => goToScreen(1)} />,
    <ConjugationScreen key="conjugation" onNext={() => goToScreen(2)} />,
    <YouTubeShadowingScreen key="youtube" onNext={() => goToScreen(3)} />,
    <TextbookVocabularyScreen key="textbook" onNext={() => goToScreen(4)} />,
    <SuccessScreen key="success" onComplete={onComplete} onBack={() => goToScreen(3)} />,
  ];

  const goToScreen = (screenIndex: number) => {
    setDirection(screenIndex > currentScreen ? 1 : -1);
    setCurrentScreen(screenIndex);
  };

  const handleNext = () => {
    if (currentScreen < totalScreens - 1) {
      goToScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentScreen > 0) {
      goToScreen(currentScreen - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Swipe left (next screen)
    if (offset < -threshold || velocity < -500) {
      if (currentScreen < totalScreens - 1) {
        handleNext();
      }
    }
    // Swipe right (previous screen)
    else if (offset > threshold || velocity > 500) {
      if (currentScreen > 0) {
        handlePrevious();
      }
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary/30 via-primary/15 to-background">
        <div className="min-h-full flex flex-col px-6 py-8 items-center justify-center text-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentScreen}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="w-full cursor-grab active:cursor-grabbing"
            >
              {screens[currentScreen]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation Bar - This is fixed at the very bottom */}
      <NavigationBar
        onSkip={handleSkip}
        onNext={handleNext}
        currentScreen={currentScreen}
        totalScreens={totalScreens}
      />
    </div>
  );
}