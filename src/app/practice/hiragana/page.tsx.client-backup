'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import KanaChart from '@/components/kana/KanaChart';
import KanaStudyModal from '@/components/kana/KanaStudyModal';
import KanaDropModal from '@/components/games/KanaDropGame/KanaDropModal';
import { useNotification } from '@/contexts/NotificationContext';
import { kanaData, getBasicKana } from '@/data/kanaData';
import { KanaChar } from '@/components/games/KanaDropGame/types';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

// Structured Data for Hiragana Page
const hiraganaStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Hiragana Chart - Learn Hiragana Characters",
  "description": "Interactive Japanese hiragana chart with pronunciation. Study hiragana characters with audio support and practice tools.",
  "url": "https://doshisensei.com/practice/hiragana",
  "educationalLevel": ["Beginner"],
  "learningResourceType": "Interactive Chart",
  "about": {
    "@type": "Thing",
    "name": "Japanese Hiragana",
    "description": "Hiragana characters with pronunciation"
  },
  "teaches": [
    "Hiragana characters",
    "Japanese syllabary",
    "Japanese pronunciation",
    "Basic Japanese writing",
    "Hiragana stroke order"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "hiragana chart",
    "Japanese hiragana",
    "hiragana practice",
    "learn hiragana",
    "Japanese syllabary",
    "Japanese pronunciation",
    "Japanese learning"
  ]
};

export default function HiraganaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const strings = useStrings();
  const { showNotification } = useNotification();

  // Hiragana states
  const [selectedHiragana, setSelectedHiragana] = useState<Set<string>>(new Set());
  const [showKanaStudyModal, setShowKanaStudyModal] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);
  const [showKanaDropModal, setShowKanaDropModal] = useState(false);

  // Load saved hiragana selection and set initial romaji state based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHiragana = localStorage.getItem('kana-study-selection-hiragana');
      if (savedHiragana) {
        setSelectedHiragana(new Set(JSON.parse(savedHiragana)));
      }
      // Set romaji visibility based on screen size
      setShowRomaji(window.innerWidth >= 768);
    }
  }, []);

  // Save hiragana selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kana-study-selection-hiragana', JSON.stringify([...selectedHiragana]));
    }
  }, [selectedHiragana]);

  const handleToggleKana = (kanaId: string) => {
    setSelectedHiragana(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kanaId)) {
        newSet.delete(kanaId);
      } else {
        newSet.add(kanaId);
      }
      return newSet;
    });
  };

  const handleSelectRow = (rowIds: string[]) => {
    setSelectedHiragana(prev => {
      const newSet = new Set(prev);
      rowIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allHiraganaIds = kanaData.map(k => k.id);
    setSelectedHiragana(new Set(allHiraganaIds));
  };

  const handleClearSelection = () => {
    setSelectedHiragana(new Set());
  };

  const handleStudyClick = async () => {
    if (selectedHiragana.size === 0) {
      showNotification({
        message: strings.messages?.selectKanaToStudy || 'Please select at least one character to study',
        type: 'error'
      });
      return;
    }

    const canProceed = await checkAndTrack('kana_study');
    if (canProceed) {
      setShowKanaStudyModal(true);
    }
  };

  // Function removed - no longer needed with updated KanaStudyModal props

  // Prepare kana for game
  const selectedKanaForGame = useMemo(() => {
    const hiraganaChars = selectedHiragana.size > 0 
      ? kanaData
          .filter(k => selectedHiragana.has(k.id))
          .map(k => ({
            id: k.id + '-hiragana',
            kana: k.hiragana,
            romaji: k.romaji,
            type: 'hiragana' as const
          }))
      : getBasicKana().filter(k => k.type !== 'digraph').slice(0, 10).map(k => ({
          id: k.id + '-hiragana',
          kana: k.hiragana,
          romaji: k.romaji,
          type: 'hiragana' as const
        }));

    return hiraganaChars as KanaChar[];
  }, [selectedHiragana]);

  const handleKanaDropClick = async () => {
    const canProceed = await checkAndTrack('kana_drop');
    if (canProceed) {
      setShowKanaDropModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(hiraganaStructuredData),
        }}
      />

      <SmartPageHeader 
        title="Hiragana Charts" 
      />

      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">

          {/* Target Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold japanese-text text-primary">あ</span>
            </div>
          </div>

          <p className="text-muted-foreground mb-4 text-center max-w-2xl mx-auto">
            {strings.practice?.kanaIntro || "Learn the foundational Japanese writing system. Hiragana is used for native Japanese words and grammar particles."}
          </p>
          <p className="text-muted-foreground mb-8 text-center">
            Tap any character to hear its pronunciation. Click the purple corner to select for practice.
          </p>

          {/* Practice Button */}
          <div className="mb-6 text-center">
            <button
              onClick={() => router.push('/practice/katakana')}
              className="text-primary hover:text-primary/80 transition-colors underline"
            >
              Switch to Katakana →
            </button>
          </div>

          {/* Selection Controls */}
          <div className="mb-6 bg-card rounded-lg border border-border p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90 transition-colors font-medium text-sm"
                >
                  Clear Selection
                </button>
              </div>
              <button
                onClick={handleStudyClick}
                disabled={selectedHiragana.size === 0}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Study Selected ({selectedHiragana.size})
              </button>
            </div>
          </div>

          {/* Show Romaji Toggle */}
          <div className="mb-6 flex justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRomaji}
                onChange={(e) => setShowRomaji(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Show Romaji</span>
            </label>
          </div>

          {/* Hiragana Chart */}
          <KanaChart
            chartType="hiragana"
            selectedKana={selectedHiragana}
            onToggleKana={handleToggleKana}
            showRomaji={showRomaji}
          />

          {/* Game Section */}
          <div className="mt-12 border-t border-border pt-12">
            <h2 className="text-2xl font-semibold text-center mb-6">Practice Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div
                onClick={handleKanaDropClick}
                className="bg-card border border-border rounded-lg p-6 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <h3 className="text-lg font-semibold">Kana Drop</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Catch falling hiragana by typing the correct romaji. Perfect for practicing recognition speed!
                </p>
              </div>
            </div>
          </div>
        </main>
      </MobileAwareContainer>

      {/* Study Modal */}
      {showKanaStudyModal && (
        <KanaStudyModal
          isOpen={showKanaStudyModal}
          selectedKanaIds={Array.from(selectedHiragana)}
          studyType="hiragana"
          onClose={(completed) => setShowKanaStudyModal(false)}
        />
      )}

      {/* Kana Drop Game Modal */}
      {showKanaDropModal && (
        <KanaDropModal
          isOpen={showKanaDropModal}
          onClose={() => setShowKanaDropModal(false)}
          kanaType="hiragana"
          selectedKana={selectedKanaForGame}
        />
      )}
    </div>
  );
}