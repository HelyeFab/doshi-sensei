'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFeature } from '@/hooks/useFeature';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import SessionCompleteModal from '../components/SessionCompleteModal';
import MobileLearningWrapper from './MobileLearningWrapper';
import { enrichKanjiList, type EnrichedKanji } from '@/services/kanji-mastery/kanji-enrichment';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';
import { kanjiSpacedRepetition } from '@/services/kanji-mastery/spaced-repetition-service';
import { statsTracker } from '@/lib/stats/statsTracker';
import { trackKanjiStudied } from '@/lib/achievements/integration';

// Import new components
import Round1Learn from './components/Round1Learn';
import Round2Test from './components/Round2Test';
import Round3Evaluate from './components/Round3Evaluate';
import { 
  KanjiWithExamples, 
  SessionState, 
  KanjiProgress, 
  TestType, 
  TestResult,
  UserRating 
} from './types';

export default function LearnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAndTrack } = useFeature('kanji_mastery');
  
  // Session parameters
  const sessionSize = parseInt(searchParams.get('size') || '5');
  const mode = searchParams.get('mode') as 'jlpt' | 'grade' | 'mixed';
  const level = searchParams.get('level') || 'N5';
  const approach = searchParams.get('approach') as 'smart' | 'linear' || 'smart';

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>({
    kanji: [],
    currentRound: 1,
    currentIndex: 0,
    progress: new Map(),
    reviewAgainPile: new Set(),
    sessionId: '',
    startTime: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testQueue, setTestQueue] = useState<Array<{kanji: KanjiWithExamples, type: TestType}>>([]);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      await kanjiMasteryStorage.init();
      
      const hasAccess = await checkAndTrack('kanji_mastery');
      console.log('[initializeSession] User has access:', hasAccess);
      
      let sessionId = '';
      if (hasAccess) {
        try {
          sessionId = await kanjiMasteryStorage.startStudySession(level);
          console.log('[initializeSession] Started session with ID:', sessionId);
        } catch (sessionError) {
          console.error('[initializeSession] Failed to start session:', sessionError);
        }
      }
      
      await loadKanjiData(sessionId);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setError('Failed to initialize session. Please try again.');
      setLoading(false);
    }
  };

  const loadKanjiData = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let kanjiData: KanjiWithExamples[] = [];
      
      if (mode === 'jlpt') {
        const response = await fetch(`/api/kanji/jlpt_${level.toLowerCase().replace('n', '')}`);
        if (!response.ok) throw new Error('Failed to load kanji data');
        const data = await response.json();
        kanjiData = data.map((k: any) => ({
          ...k,
          jlpt: level
        }));
      } else {
        // Handle other modes
        setError('Only JLPT mode is currently supported');
        return;
      }
      
      let selected: KanjiWithExamples[] = [];
      
      if (approach === 'smart') {
        selected = await selectKanjiSmartly(kanjiData, sessionSize);
      } else {
        const storageKey = `kanjiLinearProgress_${level}`;
        const lastIndex = parseInt(localStorage.getItem(storageKey) || '0');
        
        if (lastIndex < kanjiData.length) {
          selected = kanjiData.slice(lastIndex, lastIndex + sessionSize);
        } else {
          selected = kanjiData.slice(0, sessionSize);
        }
      }
      
      if (selected.length === 0) {
        console.warn('No kanji selected');
        setError('No kanji available for this session');
        return;
      }
      
      // Enrich kanji data
      const enrichedKanji = await enrichKanjiList(selected as EnrichedKanji[], {
        onProgress: (completed, total) => {}
      });
      
      // Initialize progress for each kanji
      const progressMap = new Map<string, KanjiProgress>();
      enrichedKanji.forEach(k => {
        progressMap.set(k.kanji, {
          kanjiId: k.kanji,
          round1Completed: false,
          round2Results: [],
          round2Accuracy: 0
        });
      });
      
      setSessionState({
        kanji: enrichedKanji,
        currentRound: 1,
        currentIndex: 0,
        progress: progressMap,
        reviewAgainPile: new Set(),
        sessionId,
        startTime: new Date()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load kanji');
    } finally {
      setLoading(false);
    }
  };

  const selectKanjiSmartly = async (allKanji: KanjiWithExamples[], requestedSize: number): Promise<KanjiWithExamples[]> => {
    const allProgress = await kanjiMasteryStorage.getAllProgress();
    const progressMap = new Map(allProgress.map(p => [p.id, p]));
    
    const newKanji: KanjiWithExamples[] = [];
    const dueForReview: KanjiWithExamples[] = [];
    const struggling: KanjiWithExamples[] = [];
    const now = new Date();
    
    for (const kanji of allKanji) {
      const progress = progressMap.get(kanji.kanji);
      
      if (!progress) {
        newKanji.push(kanji);
      } else if (new Date(progress.nextReview) <= now) {
        dueForReview.push(kanji);
      } else if (progress.lapses > 2 || progress.retentionRate < 60) {
        struggling.push(kanji);
      }
    }
    
    const selected: KanjiWithExamples[] = [];
    
    // Prioritize due reviews
    if (dueForReview.length > 0) {
      const reviewsToAdd = Math.min(dueForReview.length, requestedSize);
      selected.push(...dueForReview.slice(0, reviewsToAdd));
    }
    
    // Add struggling kanji
    if (selected.length < requestedSize && struggling.length > 0) {
      const remainingSlots = requestedSize - selected.length;
      const strugglingToAdd = Math.min(struggling.length, Math.floor(remainingSlots * 0.5));
      selected.push(...struggling.slice(0, strugglingToAdd));
    }
    
    // Fill with new kanji
    if (selected.length < requestedSize && newKanji.length > 0) {
      const remainingSlots = requestedSize - selected.length;
      const newToAdd = Math.min(newKanji.length, remainingSlots);
      selected.push(...newKanji.slice(0, newToAdd));
    }
    
    return selected.sort(() => Math.random() - 0.5);
  };

  // Round 1 handlers
  const handleRound1Next = () => {
    const progress = sessionState.progress.get(sessionState.kanji[sessionState.currentIndex].kanji);
    if (progress) {
      progress.round1Completed = true;
      sessionState.progress.set(sessionState.kanji[sessionState.currentIndex].kanji, progress);
    }
    
    if (sessionState.currentIndex < sessionState.kanji.length - 1) {
      setSessionState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    }
  };

  const handleRound1Previous = () => {
    if (sessionState.currentIndex > 0) {
      setSessionState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    }
  };

  const handleStartTesting = () => {
    // Create test queue with 3 questions per kanji
    const queue: Array<{kanji: KanjiWithExamples, type: TestType}> = [];
    
    sessionState.kanji.forEach(k => {
      queue.push({ kanji: k, type: 'meaning' });
      if (k.kunyomi && k.kunyomi.length > 0) {
        queue.push({ kanji: k, type: 'kun' });
      }
      if (k.onyomi && k.onyomi.length > 0) {
        queue.push({ kanji: k, type: 'on' });
      }
    });
    
    // Shuffle the queue
    const shuffled = queue.sort(() => Math.random() - 0.5);
    
    setTestQueue(shuffled);
    setCurrentTestIndex(0);
    setSessionState(prev => ({ ...prev, currentRound: 2, currentIndex: 0 }));
  };

  // Round 2 handlers
  const handleTestAnswer = (result: TestResult) => {
    const currentTest = testQueue[currentTestIndex];
    const progress = sessionState.progress.get(currentTest.kanji.kanji);
    
    if (progress) {
      progress.round2Results.push(result);
      
      // Add to review pile if wrong
      if (!result.wasCorrect) {
        sessionState.reviewAgainPile.add(currentTest.kanji.kanji);
      }
      
      // Calculate accuracy
      const correct = progress.round2Results.filter(r => r.wasCorrect).length;
      progress.round2Accuracy = Math.round((correct / progress.round2Results.length) * 100);
      
      sessionState.progress.set(currentTest.kanji.kanji, progress);
    }
  };

  const handleTestNext = () => {
    if (currentTestIndex < testQueue.length - 1) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      // Move to round 3
      setSessionState(prev => ({ ...prev, currentRound: 3, currentIndex: 0 }));
    }
  };

  // Round 3 handlers
  const handleRound3Rate = (rating: UserRating) => {
    const progress = sessionState.progress.get(sessionState.kanji[sessionState.currentIndex].kanji);
    if (progress) {
      progress.round3Rating = rating;
      sessionState.progress.set(sessionState.kanji[sessionState.currentIndex].kanji, progress);
      setSessionState(prev => ({ ...prev })); // Force re-render
    }
  };

  const handleRound3Next = () => {
    if (sessionState.currentIndex < sessionState.kanji.length - 1) {
      setSessionState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    }
  };

  const handleRound3Previous = () => {
    if (sessionState.currentIndex > 0) {
      setSessionState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    }
  };

  const handleCompleteSession = async () => {
    // Save all progress to FSRS
    for (const [kanjiId, progress] of sessionState.progress) {
      const kanji = sessionState.kanji.find(k => k.kanji === kanjiId);
      if (kanji && progress.round3Rating) {
        await kanjiSpacedRepetition.processReview(
          kanjiId,
          progress.round3Rating,
          kanji as EnrichedKanji,
          'recognition'
        );
        
        // Track stats
        await statsTracker.trackActivity('kanji', {
          itemId: kanjiId,
          correct: progress.round3Rating >= 4 ? 1 : 0,
          total: 1
        });
        
        // Update linear progress if marked as easy
        if (approach === 'linear' && progress.round3Rating === 5) {
          const storageKey = `kanjiLinearProgress_${level}`;
          const currentLinearProgress = parseInt(localStorage.getItem(storageKey) || '0');
          localStorage.setItem(storageKey, (currentLinearProgress + 1).toString());
        }
      }
    }
    
    // Update session
    if (sessionState.sessionId) {
      const endTime = new Date();
      const timeSpent = Math.round((endTime.getTime() - sessionState.startTime.getTime()) / 1000);
      
      await kanjiMasteryStorage.updateStudySession(sessionState.sessionId, {
        endTime,
        timeSpent,
        kanjiStudied: sessionState.kanji.length,
        kanjiCorrect: Array.from(sessionState.progress.values()).filter(p => p.round3Rating && p.round3Rating >= 4).length,
        newKanji: sessionState.kanji.length,
        avgQuality: Array.from(sessionState.progress.values()).reduce((sum, p) => sum + (p.round3Rating || 3), 0) / sessionState.kanji.length
      });
    }
    
    setSessionComplete(true);
  };

  const handleExit = async () => {
    router.replace('/tools/kanji-mastery');
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
          <Link href="/tools/kanji-mastery" className="text-primary hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Render based on current round
  if (sessionState.currentRound === 1) {
    const currentKanji = sessionState.kanji[sessionState.currentIndex];
    return (
      <MobileLearningWrapper onClose={handleExit}>
        <Round1Learn
          kanji={currentKanji}
          currentIndex={sessionState.currentIndex}
          totalCount={sessionState.kanji.length}
          onNext={handleRound1Next}
          onPrevious={handleRound1Previous}
          canGoNext={sessionState.currentIndex < sessionState.kanji.length - 1}
          canGoPrevious={sessionState.currentIndex > 0}
          onStartTesting={handleStartTesting}
        />
      </MobileLearningWrapper>
    );
  }

  if (sessionState.currentRound === 2) {
    const currentTest = testQueue[currentTestIndex];
    return (
      <MobileLearningWrapper onClose={handleExit}>
        <Round2Test
          kanji={currentTest.kanji}
          allKanji={sessionState.kanji}
          currentIndex={currentTestIndex}
          totalCount={testQueue.length}
          testType={currentTest.type}
          onAnswer={handleTestAnswer}
          onNext={handleTestNext}
        />
      </MobileLearningWrapper>
    );
  }

  if (sessionState.currentRound === 3) {
    const currentKanji = sessionState.kanji[sessionState.currentIndex];
    const progress = sessionState.progress.get(currentKanji.kanji)!;
    
    return (
      <MobileLearningWrapper onClose={handleExit}>
        <Round3Evaluate
          kanji={currentKanji}
          progress={progress}
          currentIndex={sessionState.currentIndex}
          totalCount={sessionState.kanji.length}
          onRate={handleRound3Rate}
          onNext={handleRound3Next}
          onPrevious={handleRound3Previous}
          canGoNext={sessionState.currentIndex < sessionState.kanji.length - 1}
          canGoPrevious={sessionState.currentIndex > 0}
          onComplete={handleCompleteSession}
        />
        
        <SessionCompleteModal
          isOpen={sessionComplete}
          onClose={() => router.replace('/tools/kanji-mastery')}
          totalKanji={sessionState.kanji.length}
          markedAsEasy={Array.from(sessionState.progress.values()).filter(p => p.round3Rating === 5).length}
        />
      </MobileLearningWrapper>
    );
  }

  return null;
}