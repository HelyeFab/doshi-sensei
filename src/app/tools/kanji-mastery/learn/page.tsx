'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccess } from '@/hooks/useAccess';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import KanjiLearningCard from '../components/KanjiLearningCard';
import KanjiProgressBar from '../components/KanjiProgressBar';
import SessionCompleteModal from '../components/SessionCompleteModal';
import MobileLearningWrapper from './MobileLearningWrapper';
import { enrichKanjiList, type EnrichedKanji } from '@/services/kanji-mastery/kanji-enrichment';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';
import { kanjiSpacedRepetition } from '@/services/kanji-mastery/spaced-repetition-service';
import { statsTracker } from '@/lib/stats/statsTracker';
import { trackKanjiStudied } from '@/lib/achievements/integration';

// Extended Kanji interface for learning
interface KanjiWithExamples {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt?: string;
  grade?: number;
  strokes?: number;
  examples?: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
  sentences?: Array<{
    japanese: string;
    english: string;
  }>;
}

function LearnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAndTrack } = useAccess();
  
  const [kanjiList, setKanjiList] = useState<KanjiWithExamples[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [markedAsEasy, setMarkedAsEasy] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(new Date());
  const [reviewedKanji, setReviewedKanji] = useState<Map<string, number>>(new Map());
  
  // Parse query parameters
  const sessionSize = parseInt(searchParams.get('size') || '5');
  const mode = searchParams.get('mode') as 'jlpt' | 'grade' | 'mixed';
  const level = searchParams.get('level') || 'N5';

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Initialize storage
      await kanjiMasteryStorage.init();
      
      // Start a new study session if user is authenticated
      const { user } = await checkAndTrack('kanji_mastery');
      if (user) {
        const id = await kanjiMasteryStorage.startStudySession(level);
        setSessionId(id);
      }
      
      await loadKanjiData();
    } catch (error) {
      console.error('Failed to initialize session:', error);
      await loadKanjiData(); // Continue without session
    }
  };

  const loadKanjiData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let kanjiData: KanjiWithExamples[] = [];
      
      if (mode === 'jlpt') {
        // Load JLPT kanji
        const response = await fetch(`/api/kanji/jlpt_${level.toLowerCase().replace('n', '')}`);
        if (!response.ok) throw new Error('Failed to load kanji data');
        const data = await response.json();
        
        // Add JLPT level to each kanji
        kanjiData = data.map((k: any) => ({
          ...k,
          jlpt: level
        }));
      } else if (mode === 'grade') {
        // Load grade kanji (to be implemented)
        // For now, use a placeholder
        kanjiData = [];
        setError('Grade-based learning coming soon!');
        return;
      } else {
        // Mixed mode - load from multiple sources
        // For now, just load N5
        const response = await fetch('/api/kanji/jlpt_5');
        if (!response.ok) throw new Error('Failed to load kanji data');
        kanjiData = await response.json();
      }
      
      // Shuffle and take requested amount
      const shuffled = kanjiData.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, sessionSize);
      
      // Enrich with real examples and sentences from Tatoeba and JMDict
      setLoading(true);
      const enrichedKanji = await enrichKanjiList(selected as EnrichedKanji[], {
        onProgress: (completed, total) => {
          console.log(`Enriching kanji: ${completed}/${total}`);
        }
      });
      
      setKanjiList(enrichedKanji);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load kanji');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    // Save progress for current kanji if marked as easy (rating 5)
    const currentKanji = kanjiList[currentIndex];
    if (currentKanji && markedAsEasy.has(currentKanji.kanji)) {
      try {
        await kanjiSpacedRepetition.processReview(
          currentKanji.kanji,
          5, // Perfect rating for marked as easy
          currentKanji as EnrichedKanji,
          'recognition'
        );
        reviewedKanji.set(currentKanji.kanji, 5);
        
        // Track the kanji as learned in stats system
        await statsTracker.trackActivity('kanji', {
          itemId: currentKanji.kanji,
          correct: 1,
          total: 1
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
    
    if (currentIndex < kanjiList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await completeSession();
      setSessionComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMarkAsEasy = (kanji: string) => {
    const newSet = new Set(markedAsEasy);
    if (newSet.has(kanji)) {
      newSet.delete(kanji);
    } else {
      newSet.add(kanji);
    }
    setMarkedAsEasy(newSet);
  };

  const completeSession = async () => {
    if (!sessionId) return;
    
    try {
      const endTime = new Date();
      const timeSpent = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000);
      const kanjiStudied = kanjiList.length;
      const kanjiCorrect = markedAsEasy.size;
      const avgQuality = kanjiCorrect > 0 ? 5.0 : 3.0; // Simple average
      
      await kanjiMasteryStorage.updateStudySession(sessionId, {
        endTime,
        timeSpent,
        kanjiStudied,
        kanjiCorrect,
        newKanji: kanjiStudied, // All are new in learning mode
        avgQuality
      });
      
      // Track stats for user stats system
      await statsTracker.trackActivity('kanji', {
        correct: kanjiCorrect,
        total: kanjiStudied,
        duration: timeSpent
      });
      
      // Track achievements
      for (let i = 0; i < kanjiStudied; i++) {
        await trackKanjiStudied();
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };
  
  const handleSessionComplete = () => {
    router.push('/tools/kanji-mastery');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading kanji...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link 
            href="/tools/kanji-mastery"
            className="text-primary hover:underline"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentKanji = kanjiList[currentIndex];

  const handleExit = async () => {
    // Complete session before exiting
    await completeSession();
    // Navigate back without showing completion modal
    router.push('/tools/kanji-mastery');
  };

  return (
    <MobileLearningWrapper onClose={handleExit}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Smart Page Header */}
        <SmartPageHeader 
          title={`Learning Session (${currentIndex + 1}/${kanjiList.length})`}
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
            <KanjiProgressBar 
              current={currentIndex + 1}
              total={kanjiList.length}
            />
          </div>

          {/* Learning Card */}
          {currentKanji && (
            <div className="px-4 pb-6">
              <KanjiLearningCard
                kanji={currentKanji}
                isMarkedEasy={markedAsEasy.has(currentKanji.kanji)}
                onMarkEasy={() => handleMarkAsEasy(currentKanji.kanji)}
              />
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="bg-background border-t border-border p-4 safe-area-pb z-10">
          <div className="flex gap-4 max-w-lg mx-auto">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-1 py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {currentIndex === kanjiList.length - 1 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>

      </div>
      
      {/* Session Complete Modal */}
      <SessionCompleteModal
        isOpen={sessionComplete}
        onClose={handleSessionComplete}
        totalKanji={kanjiList.length}
        markedAsEasy={markedAsEasy.size}
      />
    </MobileLearningWrapper>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LearnContent />
    </Suspense>
  );
}