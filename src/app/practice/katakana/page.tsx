'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { StandardPageHeader } from '@/components/StandardPageHeader';
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

// Structured Data for Katakana Page
const katakanaStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Katakana Chart - Learn Katakana Characters",
  "description": "Interactive Japanese katakana chart with pronunciation. Study katakana characters with audio support and practice tools.",
  "url": "https://doshisensei.com/practice/katakana",
  "educationalLevel": ["Beginner"],
  "learningResourceType": "Interactive Chart",
  "about": {
    "@type": "Thing",
    "name": "Japanese Katakana",
    "description": "Katakana characters with pronunciation"
  },
  "teaches": [
    "Katakana characters",
    "Japanese syllabary",
    "Japanese pronunciation",
    "Basic Japanese writing",
    "Katakana stroke order"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "katakana chart",
    "Japanese katakana",
    "katakana practice",
    "learn katakana",
    "Japanese syllabary",
    "Japanese pronunciation",
    "Japanese learning"
  ]
};

export default function KatakanaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const strings = useStrings();
  const { showNotification } = useNotification();

  // Katakana states
  const [selectedKatakana, setSelectedKatakana] = useState<Set<string>>(new Set());
  const [showKanaStudyModal, setShowKanaStudyModal] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);
  const [showKanaDropModal, setShowKanaDropModal] = useState(false);

  // Load saved katakana selection and set initial romaji state based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKatakana = localStorage.getItem('kana-study-selection-katakana');
      if (savedKatakana) {
        setSelectedKatakana(new Set(JSON.parse(savedKatakana)));
      }
      // Set romaji visibility based on screen size
      setShowRomaji(window.innerWidth >= 768);
    }
  }, []);

  // Save katakana selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kana-study-selection-katakana', JSON.stringify([...selectedKatakana]));
    }
  }, [selectedKatakana]);

  const handleToggleKana = (kanaId: string) => {
    setSelectedKatakana(prev => {
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
    setSelectedKatakana(prev => {
      const newSet = new Set(prev);
      rowIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allKatakanaIds = Object.keys(kanaData.katakana.basic)
      .concat(Object.keys(kanaData.katakana.dakuten))
      .concat(Object.keys(kanaData.katakana.handakuten))
      .concat(Object.keys(kanaData.katakana.combo));
    setSelectedKatakana(new Set(allKatakanaIds));
  };

  const handleClearSelection = () => {
    setSelectedKatakana(new Set());
  };

  const handleStudyClick = async () => {
    if (selectedKatakana.size === 0) {
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

  const getSelectedKanaForStudy = () => {
    const selectedKatakanaChars = Array.from(selectedKatakana).map(id => {
      const allKana = {
        ...kanaData.katakana.basic,
        ...kanaData.katakana.dakuten,
        ...kanaData.katakana.handakuten,
        ...kanaData.katakana.combo
      };
      const kana = allKana[id];
      return kana ? { id, char: kana.char, romaji: kana.romaji, type: 'katakana' as const } : null;
    }).filter(Boolean) as { id: string; char: string; romaji: string; type: 'katakana' }[];

    return selectedKatakanaChars;
  };

  // Prepare kana for game
  const selectedKanaForGame = useMemo(() => {
    const katakanaChars = selectedKatakana.size > 0 
      ? Object.entries(kanaData.katakana.basic)
          .concat(Object.entries(kanaData.katakana.dakuten))
          .concat(Object.entries(kanaData.katakana.handakuten))
          .concat(Object.entries(kanaData.katakana.combo))
          .filter(([id]) => selectedKatakana.has(id))
          .map(([id, kana]) => ({
            char: kana.char,
            romaji: kana.romaji.split('(')[0].trim(),
            type: 'katakana' as const
          }))
      : getBasicKana('katakana');

    return katakanaChars as KanaChar[];
  }, [selectedKatakana]);

  const handleKanaDropClick = async () => {
    const canProceed = await checkAndTrack('kana_drop');
    if (canProceed) {
      setShowKanaDropModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(katakanaStructuredData),
        }}
      />

      <StandardPageHeader 
        title="Katakana Charts" 
        backHref="/practice" 
      />

      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">

          {/* Target Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold japanese-text">ア</span>
            </div>
          </div>

          <p className="text-muted-foreground mb-4 text-center max-w-2xl mx-auto">
            {strings.practice?.kanaIntro || "Learn the Japanese writing system used for foreign words and loanwords. Katakana gives Japanese its modern international vocabulary."}
          </p>
          <p className="text-muted-foreground mb-8 text-center">
            Tap any character to hear its pronunciation. Click the purple corner to select for practice.
          </p>

          {/* Practice Button */}
          <div className="mb-6 text-center">
            <button
              onClick={() => router.push('/practice/hiragana')}
              className="text-primary hover:text-primary/80 transition-colors underline"
            >
              ← Switch to Hiragana
            </button>
          </div>

          {/* Show Romaji Toggle */}
          <div className="mb-8 flex justify-center">
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

          {/* Katakana Chart */}
          <KanaChart
            type="katakana"
            selectedKana={selectedKatakana}
            onToggleKana={handleToggleKana}
            onSelectRow={handleSelectRow}
            showRomaji={showRomaji}
          />

          {/* Selection Controls */}
          <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-center">
            <button
              onClick={handleSelectAll}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90 transition-colors font-medium"
            >
              Clear Selection
            </button>
            <span className="text-sm text-muted-foreground">
              {selectedKatakana.size} selected
            </span>
          </div>

          {/* Study Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleStudyClick}
              disabled={selectedKatakana.size === 0}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Study Selected ({selectedKatakana.size})
            </button>
          </div>

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
                  Catch falling katakana by typing the correct romaji. Perfect for practicing recognition speed!
                </p>
              </div>
            </div>
          </div>
        </main>
      </MobileAwareContainer>

      {/* Study Modal */}
      {showKanaStudyModal && (
        <KanaStudyModal
          kanaList={getSelectedKanaForStudy()}
          onClose={() => setShowKanaStudyModal(false)}
        />
      )}

      {/* Kana Drop Game Modal */}
      {showKanaDropModal && (
        <KanaDropModal
          isOpen={showKanaDropModal}
          onClose={() => setShowKanaDropModal(false)}
          kanaType="katakana"
          selectedKana={selectedKanaForGame}
        />
      )}
    </div>
  );
}