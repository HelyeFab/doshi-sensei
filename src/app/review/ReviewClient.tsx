'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReviewSession } from '@/components/unified-review';
import { SessionSummary } from '@/lib/unified-review';
import UnifiedReviewHub from './UnifiedReviewHub';
import { ErrorBoundary } from 'react-error-boundary';

interface ReviewClientProps {
  autoStart?: boolean;
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 text-sm mb-4">
            {error.message || 'An unexpected error occurred while loading the review system.'}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={resetErrorBoundary}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component
function ReviewLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading review system...</p>
      </div>
    </div>
  );
}

// Main review client component
function ReviewClientInner({ autoStart = false }: ReviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSession, setShowSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for autoStart parameter from URL or props
  const shouldAutoStart = autoStart || searchParams.get('autoStart') === 'true';

  // Handle session lifecycle
  const handleStartReview = useCallback(() => {
    setShowSession(true);
    
    // Update URL to reflect session state without triggering navigation
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('session', 'active');
    window.history.replaceState({}, '', newUrl.toString());
  }, []);

  const handleSessionComplete = useCallback((summary: SessionSummary) => {
    setShowSession(false);
    
    // Clean up URL parameters
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('session');
    newUrl.searchParams.delete('autoStart');
    window.history.replaceState({}, '', newUrl.toString());
    
    console.log('Review session completed:', summary);
    // Could show completion toast here if needed
  }, []);

  const handleSessionCancel = useCallback(() => {
    setShowSession(false);
    
    // Clean up URL parameters
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('session');
    newUrl.searchParams.delete('autoStart');
    window.history.replaceState({}, '', newUrl.toString());
  }, []);

  const handleReturnToHub = useCallback(() => {
    // Handle return navigation from review session
    const returnPath = sessionStorage.getItem('reviewReturnPath');
    if (returnPath && returnPath !== '/review') {
      sessionStorage.removeItem('reviewReturnPath');
      router.push(returnPath);
    }
    // If no specific return path, just stay on review page
  }, [router]);

  // Handle initial loading and auto-start
  useEffect(() => {
    // Simulate initialization loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Auto-start session if requested
      if (shouldAutoStart) {
        setShowSession(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldAutoStart]);

  // Handle browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const sessionActive = url.searchParams.get('session') === 'active';
      setShowSession(sessionActive);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Show loading state
  if (isLoading) {
    return <ReviewLoading />;
  }

  // Show review session
  if (showSession) {
    return (
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          setShowSession(false);
          handleReturnToHub();
        }}
      >
        <div className="min-h-screen bg-gray-50">
          <ReviewSession
            onSessionComplete={handleSessionComplete}
            onSessionCancel={handleSessionCancel}
            showDetailedProgress={true}
            className="min-h-screen"
            sessionPreferences={{
              maxItems: 20,
              maxDuration: 30 * 60 * 1000, // 30 minutes
              includeNew: true,
              newItemsLimit: 5
            }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // Show unified review hub
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <UnifiedReviewHub className="min-h-screen" />
    </ErrorBoundary>
  );
}

// Main exported component with Suspense wrapper
export default function ReviewClient({ autoStart }: ReviewClientProps = {}) {
  return (
    <Suspense fallback={<ReviewLoading />}>
      <ReviewClientInner autoStart={autoStart} />
    </Suspense>
  );
}