'use client';

import { useState, useEffect } from 'react';
import { ReviewSession } from '@/components/unified-review';
import ReviewHub from './ReviewHub';

export default function ReviewClient() {
  const [showSession, setShowSession] = useState(false);

  const handleSessionComplete = (summary: any) => {
    setShowSession(false);
    // Could show a completion toast here
    console.log('Review session completed:', summary);
  };

  const handleSessionCancel = () => {
    setShowSession(false);
  };

  // Check for autoStart parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoStart') === 'true') {
      setShowSession(true);
    }
  }, []);

  if (showSession) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
          <ReviewSession
            onSessionComplete={handleSessionComplete}
            onSessionCancel={handleSessionCancel}
            showDetailedProgress={true}
            className="min-h-screen"
          />
        </div>
      </div>
    );
  }

  return <ReviewHub />;
}