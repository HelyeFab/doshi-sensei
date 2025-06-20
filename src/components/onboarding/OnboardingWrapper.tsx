'use client';

import { useState, useEffect, Suspense } from 'react';
import { OnboardingModal } from './OnboardingModal';
import { TestModal } from './TestModal';

export interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      try {
        const hasCompleted = localStorage.getItem('doshi_onboarding_completed');
        const isFirstVisit = !hasCompleted;
        const isManualTrigger = window.location.search.includes('tutorial=true');

        console.log('🔍 Onboarding check:', {
          hasCompleted,
          isFirstVisit,
          isManualTrigger,
          willShow: isFirstVisit || isManualTrigger
        });

        // Show onboarding for new users or if manually triggered
        if (isFirstVisit || isManualTrigger) {
          console.log('✅ Showing onboarding modal');
          setShowOnboarding(true);
        } else {
          console.log('❌ Not showing onboarding modal');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      checkOnboardingStatus();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);

    // Clean up URL if tutorial was manually triggered
    if (typeof window !== 'undefined' && window.location.search.includes('tutorial=true')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('tutorial');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Don't render anything on server side or while loading
  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onComplete={handleOnboardingComplete} />
        </Suspense>
      )}
    </>
  );
}
