'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccess } from '@/hooks/useAccess';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { enrichKanji, type EnrichedKanji } from '@/services/kanji-mastery/kanji-enrichment';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';
import { kanjiSpacedRepetition } from '@/services/kanji-mastery/spaced-repetition-service';
import { statsTracker } from '@/lib/stats/statsTracker';
import { trackKanjiStudied } from '@/lib/achievements/integration';
import KanjiLearningCard from '../components/KanjiLearningCard';
import Link from 'next/link';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Kanji Browser - Doshi Sensei",
  "description": "Browse and study kanji at your own pace",
  "url": "https://doshisensei.com/tools/kanji-mastery/browse"
};

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAndTrack } = useAccess();
  
  const [kanjiList, setKanjiList] = useState<EnrichedKanji[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'N5');
  const [markedAsEasy, setMarkedAsEasy] = useState<Set<string>>(new Set());
  const [showJLPTSelector, setShowJLPTSelector] = useState(true);

  useEffect(() => {
    if (!showJLPTSelector) {
      loadKanjiData();
    }
  }, [selectedLevel, showJLPTSelector]);

  const loadKanjiData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load JLPT kanji
      const jlptNumber = selectedLevel.toLowerCase().replace('n', '');
      const response = await fetch(`/api/kanji/jlpt_${jlptNumber}`);
      
      if (!response.ok) {
        throw new Error('Failed to load kanji data');
      }
      
      const data = await response.json();
      
      // Add JLPT level to each kanji
      const kanjiData = data.map((k: any) => ({
        ...k,
        jlpt: selectedLevel
      }));
      
      setKanjiList(kanjiData);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load kanji');
    } finally {
      setLoading(false);
    }
  };

  const loadEnrichedKanji = async (index: number) => {
    if (kanjiList[index] && !kanjiList[index].sentences) {
      try {
        const enriched = await enrichKanji(kanjiList[index]);
        const newList = [...kanjiList];
        newList[index] = enriched;
        setKanjiList(newList);
      } catch (error) {
        console.error('Failed to enrich kanji:', error);
      }
    }
  };

  useEffect(() => {
    // Load enriched data for current kanji
    if (currentIndex < kanjiList.length) {
      loadEnrichedKanji(currentIndex);
      
      // Pre-load next kanji
      if (currentIndex + 1 < kanjiList.length) {
        loadEnrichedKanji(currentIndex + 1);
      }
    }
  }, [currentIndex, kanjiList.length]);

  const handleNext = () => {
    if (currentIndex < kanjiList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMarkAsEasy = async (kanji: string) => {
    const newSet = new Set(markedAsEasy);
    if (newSet.has(kanji)) {
      newSet.delete(kanji);
    } else {
      newSet.add(kanji);
      
      // Save as learned in free study mode
      try {
        const currentKanji = kanjiList[currentIndex];
        await kanjiSpacedRepetition.processReview(
          kanji,
          5, // Perfect rating
          currentKanji,
          'recognition'
        );
        
        // Track stats
        await statsTracker.trackActivity('kanji', {
          itemId: kanji,
          correct: 1,
          total: 1
        });
        
        // Track achievement
        await trackKanjiStudied();
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
    setMarkedAsEasy(newSet);
  };

  const handleSelectLevel = (level: string) => {
    setSelectedLevel(level);
    setShowJLPTSelector(false);
  };

  if (showJLPTSelector) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader 
          title="Choose JLPT Level"
          customBackUrl="/tools/kanji-mastery"
        />
        
        <div className="px-4 py-6">
          <p className="text-muted-foreground mb-6">
            Select a JLPT level to browse kanji
          </p>
          
          <div className="space-y-3">
            {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
              <button
                key={level}
                onClick={() => handleSelectLevel(level)}
                className="w-full p-4 bg-card rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{level}</h3>
                    <p className="text-sm text-muted-foreground">
                      {level === 'N5' && 'Beginner - ~80 kanji'}
                      {level === 'N4' && 'Elementary - ~170 kanji'}
                      {level === 'N3' && 'Intermediate - ~370 kanji'}
                      {level === 'N2' && 'Advanced - ~380 kanji'}
                      {level === 'N1' && 'Expert - ~1200 kanji'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      {/* Smart Page Header */}
      <SmartPageHeader 
        title={`Browse ${selectedLevel} (${currentIndex + 1}/${kanjiList.length})`}
        customBackUrl="/tools/kanji-mastery"
        actions={
          <button 
            onClick={() => setShowJLPTSelector(true)}
            className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Change Level
          </button>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Progress Indicator */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round((currentIndex / kanjiList.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(currentIndex / kanjiList.length) * 100}%` }}
            />
          </div>
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
      <div className="bg-background border-t border-border p-4 safe-area-pb">
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
            disabled={currentIndex === kanjiList.length - 1}
            className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            Next
          </button>
        </div>
        
        {/* Quick Jump */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              const jumpTo = prompt(`Jump to kanji (1-${kanjiList.length}):`);
              if (jumpTo) {
                const index = parseInt(jumpTo) - 1;
                if (index >= 0 && index < kanjiList.length) {
                  setCurrentIndex(index);
                }
              }
            }}
            className="text-sm text-primary hover:underline"
          >
            Jump to kanji #{currentIndex + 1}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}