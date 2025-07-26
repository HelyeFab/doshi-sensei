'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

interface ListeningQuizEmptyStateProps {
  onBack?: () => void;
}

export default function ListeningQuizEmptyState({ onBack }: ListeningQuizEmptyStateProps) {
  const router = useRouter();
  const strings = useStrings();

  const handleCreateLists = () => {
    router.push('/vocabulary');
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/games');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-10" style={{ 
        borderColor: 'hsl(var(--border))', 
        backgroundColor: 'hsl(var(--card) / 0.5)',
        backdropFilter: 'blur(8px)'
      }}>
        <MobileAwareContainer className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg transition-colors hover:bg-muted"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label={strings.common.back}
            >
              <svg 
                className="w-5 h-5" 
                style={{ color: 'hsl(var(--muted-foreground))' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <img
                  src="/flat-icons/root-icons/listening.svg"
                  alt="Listening Quiz"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {strings.games.modes.listening.title}
              </h1>
            </div>
          </div>
        </MobileAwareContainer>
      </div>

      {/* Main Content */}
      <MobileAwareContainer className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            {/* Animated Headphones Icon */}
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))'
              }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{
                  background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234))'
                }}>
                  <svg 
                    className="w-12 h-12 text-white animate-pulse" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
                  </svg>
                </div>
              </div>
              {/* Sound waves animation */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-40 h-40 border-2 rounded-full animate-ping" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}></div>
                <div className="absolute top-2 left-2 w-36 h-36 border-2 rounded-full animate-ping" style={{ 
                  borderColor: 'rgba(147, 51, 234, 0.2)',
                  animationDelay: '0.5s'
                }}></div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
              {strings.games.emptyState.title}
            </h2>
            <p className="text-lg mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {strings.games.emptyState.subtitle}
            </p>
            <p className="max-w-lg mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {strings.games.emptyState.description}
            </p>
          </div>

          {/* How It Works Steps */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-center mb-8" style={{ color: 'hsl(var(--foreground))' }}>
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{
                  background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))'
                }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                  {strings.games.emptyState.steps.step1.title}
                </h4>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {strings.games.emptyState.steps.step1.description}
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{
                  background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(6, 182, 212))'
                }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                  {strings.games.emptyState.steps.step2.title}
                </h4>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {strings.games.emptyState.steps.step2.description}
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{
                  background: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(236, 72, 153))'
                }}>
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                  {strings.games.emptyState.steps.step3.title}
                </h4>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {strings.games.emptyState.steps.step3.description}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-12">
            <div className="rounded-2xl p-6 border" style={{ 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
              borderColor: 'rgba(59, 130, 246, 0.2)'
            }}>
              <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: 'hsl(var(--foreground))' }}>
                Why You'll Love It
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    {strings.games.emptyState.benefits.personalized}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    {strings.games.emptyState.benefits.adaptive}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 110 5H9V10z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    {strings.games.emptyState.benefits.engaging}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleCreateLists}
              className="w-full px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234))',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgb(37, 99, 235), rgb(126, 34, 206))';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234))';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}
            >
              {strings.games.emptyState.createListsButton}
            </button>
            
            <button
              onClick={handleCreateLists}
              className="w-full px-8 py-3 rounded-xl font-medium transition-colors"
              style={{ 
                backgroundColor: 'hsl(var(--muted))',
                color: 'hsl(var(--muted-foreground))'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'}
            >
              {strings.games.emptyState.browseVocabulary}
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              💡 Tip: Start with 10-20 words for the best quiz experience
            </p>
          </div>
        </div>
      </MobileAwareContainer>
    </div>
  );
}