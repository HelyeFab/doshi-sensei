'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedReview } from '@/hooks/useUnifiedReview';

/**
 * Smart review widget that appears conditionally on the home page
 * Shows total count of due reviews across all content types
 * Auto-refreshes every 30 seconds to catch new due items
 */
export default function SmartReviewWidget() {
  const router = useRouter();
  const { engine, isReady } = useUnifiedReview();
  const [dueCount, setDueCount] = useState(0);
  const [dueByType, setDueByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !engine) return;

    const checkDueReviews = async () => {
      try {
        // Get due items to count them
        const dueItems = await engine.getDueItems();
        const totalDue = dueItems.length;
        setDueCount(totalDue);

        // Get breakdown by type
        const breakdown: Record<string, number> = {};
        dueItems.forEach(item => {
          const type = item.itemType || 'unknown';
          breakdown[type] = (breakdown[type] || 0) + 1;
        });
        
        setDueByType(breakdown);
      } catch (error) {
        console.error('Error checking due reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    checkDueReviews();

    // Check every 30 seconds for updates
    const interval = setInterval(checkDueReviews, 30000);

    // Also check when window regains focus
    const handleFocus = () => checkDueReviews();
    window.addEventListener('focus', handleFocus);

    // Also check when visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDueReviews();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [engine, isReady]);

  // Don't render if loading or no reviews due
  if (loading || dueCount === 0) {
    return null;
  }

  // Get type labels for display
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      kanji: 'Kanji',
      vocabulary: 'Vocabulary',
      flashcard: 'Flashcards',
      sentence: 'Sentences',
      grammar: 'Grammar'
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Create breakdown text
  const breakdownText = Object.entries(dueByType)
    .map(([type, count]) => `${count} ${getTypeLabel(type)}`)
    .join(', ');

  return (
    <div className="px-4 pb-4">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 animate-in fade-in-50 slide-in-from-top-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🔔</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {dueCount} {dueCount === 1 ? 'Review' : 'Reviews'} Ready!
              </p>
              <p className="text-sm text-muted-foreground">
                {breakdownText || 'Items due for spaced repetition review'}
              </p>
            </div>
          </div>
          <button 
            className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            onClick={() => {
              // Navigate to review page with session auto-start
              router.push('/review?autoStart=true');
            }}
          >
            Review Now
          </button>
        </div>
      </div>
    </div>
  );
}