'use client';

import { useState, useEffect } from 'react';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';
import { useRouter } from 'next/navigation';

export default function ReviewDueAlert() {
  const [dueCount, setDueCount] = useState(0);
  const [dueByLevel, setDueByLevel] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkDueReviews();
    // Check every 30 seconds for updates (more frequent to catch review completions)
    const interval = setInterval(checkDueReviews, 30000);
    
    // Also check when window regains focus (user returns from review)
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
  }, []);

  const checkDueReviews = async () => {
    try {
      await kanjiMasteryStorage.init();
      const allProgress = await kanjiMasteryStorage.getAllProgress();
      const now = new Date();
      
      // Filter for reviews that are actually due (not future reviews)
      // This ensures we only show reviews when they're truly ready
      const due = allProgress.filter(p => {
        const reviewDate = new Date(p.nextReview);
        // Only show reviews that are due now or overdue
        // Don't show future reviews to maintain spaced repetition effectiveness
        return reviewDate <= now;
      });
      
      // Group by level to determine the most appropriate level to review
      const byLevel: Record<string, number> = {};
      due.forEach(p => {
        const level = p.jlptLevel || 'N5';
        byLevel[level] = (byLevel[level] || 0) + 1;
      });
      
      setDueCount(due.length);
      setDueByLevel(byLevel);
      
      // Log for debugging (remove in production)
      if (due.length > 0) {
        console.log(`[Kanji Review] ${due.length} reviews due as of ${now.toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error('Error checking due reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dueCount === 0) {
    return null;
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🔔</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {dueCount} Kanji Ready for Review!
            </p>
            <p className="text-sm text-muted-foreground">
              These kanji are due for spaced repetition review
            </p>
          </div>
        </div>
        <button 
          className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          onClick={() => {
            // Get saved settings or use defaults
            const savedSettings = localStorage.getItem('kanjiMasterySettings');
            let level = 'N5';
            let mode = 'jlpt';
            
            if (savedSettings) {
              try {
                const settings = JSON.parse(savedSettings);
                level = settings.jlptLevel || 'N5';
                mode = settings.studyMode || 'jlpt';
              } catch {}
            }
            
            // If we have due kanji grouped by level, pick the level with most due
            if (Object.keys(dueByLevel).length > 0) {
              const mostDueLevel = Object.entries(dueByLevel)
                .sort(([, a], [, b]) => b - a)[0][0];
              level = mostDueLevel;
            }
            
            // Start a review session with smart approach for spaced repetition
            const sessionSize = Math.min(dueCount, 20);
            router.push(`/tools/kanji-mastery/learn?size=${sessionSize}&mode=${mode}&level=${level}&approach=smart`);
          }}
        >
          Review Now
        </button>
      </div>
    </div>
  );
}