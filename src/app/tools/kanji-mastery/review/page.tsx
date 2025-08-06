'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccess } from '@/hooks/useAccess';
import Link from 'next/link';
import { kanjiMasteryStorage, KanjiProgress } from '@/services/kanji-mastery/indexdb-storage';
import { kanjiSpacedRepetition } from '@/services/kanji-mastery/spaced-repetition-service';
import { enrichKanji, type EnrichedKanji } from '@/services/kanji-mastery/kanji-enrichment';
import { statsTracker } from '@/lib/stats/statsTracker';
import { trackKanjiStudied } from '@/lib/achievements/integration';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import KanjiReviewCard from '../components/KanjiReviewCard';
import ReviewCompleteModal from '../components/ReviewCompleteModal';
import MobileLearningWrapper from '../learn/MobileLearningWrapper';

interface KanjiWithProgress extends EnrichedKanji {
  progress: KanjiProgress;
}

export default function ReviewPage() {
  const router = useRouter();
  const { checkAndTrack } = useAccess();
  
  const [dueKanji, setDueKanji] = useState<KanjiWithProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(new Date());
  const [reviewResults, setReviewResults] = useState<Array<{
    kanji: string;
    rating: number;
    nextReview: Date;
  }>>([]);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Initialize storage
      await kanjiMasteryStorage.init();
      
      await loadDueKanji();
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setLoading(false);
    }
  };

  const loadDueKanji = async () => {
    try {
      setLoading(true);
      
      // Check access
      const { allowed, user } = await checkAndTrack('kanji_mastery');
      if (!allowed) {
        router.replace('/tools/kanji-mastery');
        return;
      }
      
      // Start a study session if user is authenticated
      if (user) {
        const id = await kanjiMasteryStorage.startStudySession();
        setSessionId(id);
      }
      
      // Get due kanji
      const dueProgress = await kanjiSpacedRepetition.getDueKanji(); // Get all due kanji
      
      if (dueProgress.length === 0) {
        setSessionComplete(true);
        setLoading(false);
        return;
      }
      
      // Load kanji data for each due item
      const kanjiWithData: KanjiWithProgress[] = [];
      
      for (const progress of dueProgress.slice(0, 20)) { // Limit to 20 per session
        try {
          // Try to load from all JLPT levels (simplified approach)
          for (let level = 5; level >= 1; level--) {
            const response = await fetch(`/api/kanji/jlpt_${level}`);
            if (response.ok) {
              const kanjiList = await response.json();
              const kanjiData = kanjiList.find((k: any) => k.kanji === progress.id);
              
              if (kanjiData) {
                // Enrich the kanji data
                const enrichedKanji = await enrichKanji({
                  ...kanjiData,
                  jlpt: progress.jlptLevel || `N${level}`
                } as EnrichedKanji);
                
                kanjiWithData.push({
                  ...enrichedKanji,
                  progress
                });
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error loading kanji data:', error);
        }
      }
      
      setDueKanji(kanjiWithData);
    } catch (error) {
      console.error('Error loading due kanji:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (rating: number) => {
    const currentKanji = dueKanji[currentIndex];
    
    try {
      // Process the review
      const result = await kanjiSpacedRepetition.processReview(
        currentKanji.kanji,
        rating,
        currentKanji,
        'recognition'
      );
      
      // Store result
      setReviewResults([...reviewResults, {
        kanji: currentKanji.kanji,
        rating,
        nextReview: result.nextReview
      }]);
      
      // Track stats - only count as correct if rating >= 3
      await statsTracker.trackActivity('kanji', {
        itemId: currentKanji.kanji,
        correct: rating >= 3 ? 1 : 0,
        total: 1
      });
      
      // Track achievement
      await trackKanjiStudied();
    } catch (error) {
      console.error('Failed to process review:', error);
    }
    
    // Move to next kanji or complete session
    if (currentIndex < dueKanji.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await completeSession();
      setSessionComplete(true);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;
    
    try {
      const endTime = new Date();
      const timeSpent = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000);
      const kanjiStudied = reviewResults.length;
      const kanjiCorrect = reviewResults.filter(r => r.rating >= 3).length;
      const avgQuality = kanjiStudied > 0 
        ? reviewResults.reduce((sum, r) => sum + r.rating, 0) / kanjiStudied 
        : 0;
      
      await kanjiMasteryStorage.updateStudySession(sessionId, {
        endTime,
        timeSpent,
        kanjiStudied,
        kanjiCorrect,
        newKanji: 0, // These are all reviews, not new kanji
        avgQuality
      });
      
      // Track overall session stats
      await statsTracker.trackActivity('kanji', {
        correct: kanjiCorrect,
        total: kanjiStudied,
        duration: timeSpent
      });
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };
  
  const handleSessionComplete = () => {
    router.replace('/tools/kanji-mastery');
  };
  
  const handleExit = async () => {
    await completeSession();
    router.replace('/tools/kanji-mastery');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (dueKanji.length === 0 && !sessionComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            All caught up! 🎉
          </h2>
          <p className="text-muted-foreground mb-6">
            No kanji due for review right now.
          </p>
          <Link 
            href="/tools/kanji-mastery"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentKanji = dueKanji[currentIndex];
  const progress = (currentIndex / dueKanji.length) * 100;

  return (
    <MobileLearningWrapper onClose={handleExit}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Smart Page Header */}
        <SmartPageHeader 
          title={`Review Session (${currentIndex + 1}/${dueKanji.length})`}
          customBackUrl="/tools/kanji-mastery"
          className=""
          actions={
            <button 
              onClick={handleExit}
              className="p-2 rounded-lg hover:bg-muted transition-colors md:block hidden"
              aria-label="End session"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Progress Bar */}
          <div className="px-4 mb-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Review Card */}
          {currentKanji && (
            <div className="px-4 pb-6">
              <KanjiReviewCard
                kanji={currentKanji}
                onRate={handleReview}
                progress={currentKanji.progress}
              />
            </div>
          )}
        </div>
      </div>

      {/* Session Complete Modal */}
      <ReviewCompleteModal
        isOpen={sessionComplete}
        onClose={handleSessionComplete}
        results={reviewResults}
        totalReviewed={dueKanji.length}
      />
    </MobileLearningWrapper>
  );
}