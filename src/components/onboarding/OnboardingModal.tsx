'use client';

import { useEffect } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ConjugationScreen } from './screens/ConjugationScreen';
import { ListsScreen } from './screens/ListsScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { useOnboardingState } from './hooks/useOnboardingState';
import { cn } from '@/lib/utils';

export interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const {
    state,
    nextScreen,
    previousScreen,
    completeOnboarding,
    markAsSeen,
    trackDropOff,
  } = useOnboardingState();

  // Track initial screen view
  useEffect(() => {
    if (state.isActive) {
      // Track welcome screen view on mount
    }
  }, [state.isActive, state.currentScreen]);

  const handleComplete = () => {
    completeOnboarding();
    onComplete();
  };

  const handleClose = () => {
    trackDropOff(state.currentScreen);
    markAsSeen(); // Mark tutorial as seen even if not completed
    onComplete();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!state.isActive) return;

      switch (event.key) {
        case 'Escape':
          if (confirm('Exit tutorial? You can restart it anytime from Settings.')) {
            handleClose();
          }
          break;
        case 'ArrowLeft':
          if (state.currentScreen > 0) {
            event.preventDefault();
            previousScreen();
          }
          break;
        case 'ArrowRight':
        case 'Space':
        case 'Enter':
          if (state.currentScreen < 4) {
            event.preventDefault();
            nextScreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [state.isActive, state.currentScreen, nextScreen, previousScreen, handleClose]);

  if (!state.isActive) {
    return null;
  }

  const screens = [
    <WelcomeScreen key="welcome" onNext={nextScreen} />,
    <ConjugationScreen key="conjugation" onNext={nextScreen} />,
    <ListsScreen key="lists" onNext={nextScreen} />,
    <PracticeScreen key="practice" onNext={nextScreen} />,
    <SuccessScreen key="success" onComplete={handleComplete} />,
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          style={{
            color: 'var(--muted-foreground)',
          }}
          aria-label="Close tutorial"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Progress Bar */}
        <div className="px-6 pt-6 pb-2">
          <ProgressBar currentStep={state.currentScreen} totalSteps={5} />
        </div>

        {/* Screen Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          {screens[state.currentScreen]}
        </div>

        {/* Mobile Navigation Arrows */}
        <div className="md:hidden">
          {state.currentScreen > 0 && (
            <button
              onClick={previousScreen}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--foreground)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
              }}
              aria-label="Previous screen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {state.currentScreen < 4 && (
            <button
              onClick={nextScreen}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.1)',
              }}
              aria-label="Next screen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Desktop Navigation Hints */}
        {state.currentScreen < 4 && (
          <div className="hidden md:block px-6 pb-4">
            <div
              className="text-center text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Use arrow keys to navigate • Press ESC to exit
            </div>
          </div>
        )}

        {/* Mobile Navigation Hints */}
        {state.currentScreen < 4 && (
          <div className="md:hidden px-6 pb-4">
            <div
              className="text-center text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Tap arrows to navigate • Tap ✕ to exit
            </div>
          </div>
        )}
      </div>

      {/* Skip Tutorial Button (for power users) */}
      <button
        className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 px-4 py-2 rounded"
        style={{
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
        onClick={handleClose}
      >
        Skip Tutorial
      </button>
    </div>
  );
}
