'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import KanaChart from '@/components/kana/KanaChart';
import KanaStudyModal from '@/components/kana/KanaStudyModal';
import KanaDropModal from '@/components/games/KanaDropGame/KanaDropModal';
import { useNotification } from '@/contexts/NotificationContext';
import { kanaData, getBasicKana } from '@/data/kanaData';
import { KanaChar } from '@/components/games/KanaDropGame/types';

// Structured Data for Kana Page
const kanaStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Kana Charts - Hiragana & Katakana",
  "description": "Interactive Japanese hiragana and katakana charts with pronunciation. Study Japanese syllabary with audio support and practice tools.",
  "url": "https://doshisensei.com/practice/kana",
  "educationalLevel": ["Beginner"],
  "learningResourceType": "Interactive Chart",
  "about": {
    "@type": "Thing",
    "name": "Japanese Syllabary",
    "description": "Hiragana and katakana characters with pronunciation"
  },
  "teaches": [
    "Hiragana characters",
    "Katakana characters",
    "Japanese syllabary",
    "Japanese pronunciation",
    "Basic Japanese writing"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "hiragana chart",
    "katakana chart",
    "Japanese kana",
    "Japanese syllabary",
    "Japanese pronunciation",
    "kana practice",
    "Japanese learning"
  ]
};

export default function KanaPage() {
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const strings = useStrings();
  const { showNotification } = useNotification();

  // Kana chart states
  const [kanaChartType, setKanaChartType] = useState<'hiragana' | 'katakana'>('hiragana');
  const [selectedHiragana, setSelectedHiragana] = useState<Set<string>>(new Set());
  const [selectedKatakana, setSelectedKatakana] = useState<Set<string>>(new Set());
  const [showKanaStudyModal, setShowKanaStudyModal] = useState(false);
  const [kanaStudyType, setKanaStudyType] = useState<'hiragana' | 'katakana' | 'both'>('both');
  const [showRomaji, setShowRomaji] = useState(true);
  const [showKanaDropModal, setShowKanaDropModal] = useState(false);

  // Load saved kana selection and set initial romaji state based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHiragana = localStorage.getItem('kana-study-selection-hiragana');
      const savedKatakana = localStorage.getItem('kana-study-selection-katakana');
      if (savedHiragana) {
        setSelectedHiragana(new Set(JSON.parse(savedHiragana)));
      }
      if (savedKatakana) {
        setSelectedKatakana(new Set(JSON.parse(savedKatakana)));
      }
      // Set romaji visibility based on screen size
      setShowRomaji(window.innerWidth >= 768);
    }
  }, []);

  // Save kana selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kana-study-selection-hiragana', JSON.stringify([...selectedHiragana]));
    }
  }, [selectedHiragana]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kana-study-selection-katakana', JSON.stringify([...selectedKatakana]));
    }
  }, [selectedKatakana]);

  const handleToggleKana = (kanaId: string) => {
    if (kanaChartType === 'hiragana') {
      const newSelection = new Set(selectedHiragana);
      if (newSelection.has(kanaId)) {
        newSelection.delete(kanaId);
      } else {
        newSelection.add(kanaId);
      }
      setSelectedHiragana(newSelection);
    } else {
      const newSelection = new Set(selectedKatakana);
      if (newSelection.has(kanaId)) {
        newSelection.delete(kanaId);
      } else {
        newSelection.add(kanaId);
      }
      setSelectedKatakana(newSelection);
    }
  };

  const handleStartKanaStudy = () => {
    const totalSelected = selectedHiragana.size + selectedKatakana.size;
    if (totalSelected === 0) {
      showNotification({
        title: 'No Characters Selected',
        message: 'Please select some kana characters to study first!',
        type: 'info'
      });
      return;
    }
    setShowKanaStudyModal(true);
  };

  const handleClearKanaSelection = () => {
    setSelectedHiragana(new Set());
    setSelectedKatakana(new Set());
    localStorage.removeItem('kana-study-selection-hiragana');
    localStorage.removeItem('kana-study-selection-katakana');
  };

  const getSelectedKanaData = useMemo((): KanaChar[] => {
    const selectedData: KanaChar[] = [];

    // Get hiragana selections
    selectedHiragana.forEach(id => {
      const kana = kanaData.find(k => k.id === id);
      if (kana) {
        selectedData.push({
          id: `${id}-hiragana`,
          kana: kana.hiragana,
          romaji: kana.romaji,
          type: 'hiragana'
        });
      }
    });

    // Get katakana selections
    selectedKatakana.forEach(id => {
      const kana = kanaData.find(k => k.id === id);
      if (kana) {
        selectedData.push({
          id: `${id}-katakana`,
          kana: kana.katakana,
          romaji: kana.romaji,
          type: 'katakana'
        });
      }
    });

    return selectedData;
  }, [selectedHiragana, selectedKatakana]);

  const handleStartKanaDrop = async () => {
    if (getSelectedKanaData.length < 5) {
      showNotification({
        title: 'Not Enough Characters',
        message: 'Please select at least 5 kana characters to play Kana Drop!',
        type: 'info'
      });
      return;
    }
    if (getSelectedKanaData.length > 8) {
      showNotification({
        title: 'Too Many Characters',
        message: 'Please select between 5 and 8 characters for Kana Drop.',
        type: 'info'
      });
      return;
    }

    // Check if user can play KanaDrop using new system
    const canPlay = await checkAndTrack('kana_drop');

    if (!canPlay) {
      // The access system will show the appropriate modal
      return;
    }

    setShowKanaDropModal(true);
  };

  const allKanaSelected = selectedHiragana.size + selectedKatakana.size === getBasicKana().length;

  return (
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(kanaStructuredData),
          }}
        />

        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Page Header */}
          <PageHeader title="Kana Charts" helpKey="kana" />

          {/* Target Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <img
                src="/flat-icons/root-icons/target.svg"
                alt="Target Icon"
                className="w-8 h-8"
              />
            </div>
          </div>

          {/* Header with controls */}
          <div className="text-center space-y-4 mb-8">
            <p className="text-muted-foreground">
              Tap any character to hear its pronunciation. Click the purple corner to select for practice.
            </p>

            {/* Chart Type Toggle */}
            <div className="flex flex-row gap-2 items-center justify-center">
              <button
                onClick={() => setKanaChartType('hiragana')}
                className={`px-4 py-2 rounded-lg border transition-colors ${kanaChartType === 'hiragana'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
              >
                <span className="md:hidden">ひらがな</span>
                <span className="hidden md:inline">ひらがな Hiragana</span>
              </button>
              <button
                onClick={() => setKanaChartType('katakana')}
                className={`px-4 py-2 rounded-lg border transition-colors ${kanaChartType === 'katakana'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
              >
                <span className="md:hidden">カタカナ</span>
                <span className="hidden md:inline">カタカナ Katakana</span>
              </button>
            </div>

            {/* Options and Study Button */}
            <div className="flex flex-col gap-4">
              {/* Romaji toggle - hidden on mobile */}
              <div className="hidden md:flex justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRomaji}
                    onChange={(e) => setShowRomaji(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Show Romaji</span>
                </label>
              </div>

              {(selectedHiragana.size > 0 || selectedKatakana.size > 0) && (
                <>
                  {/* Clear selection button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleClearKanaSelection}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear Selection ({selectedHiragana.size + selectedKatakana.size})
                    </button>
                  </div>

                  {/* Study type selector and Start Study button side by side */}
                  <div className="flex justify-center gap-2">
                    <select
                      value={kanaStudyType}
                      onChange={(e) => setKanaStudyType(e.target.value as 'hiragana' | 'katakana' | 'both')}
                      className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                    >
                      <option value="hiragana">Study Hiragana</option>
                      <option value="katakana">Study Katakana</option>
                      <option value="both">Study Both</option>
                    </select>

                    <button
                      onClick={handleStartKanaStudy}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm md:text-base"
                    >
                      Start Study ({selectedHiragana.size + selectedKatakana.size} selected)
                    </button>

                    {/* Kana Drop button for 5-8 selected characters */}
                    {(selectedHiragana.size + selectedKatakana.size) >= 5 &&
                     (selectedHiragana.size + selectedKatakana.size) <= 8 && (
                      <button
                        onClick={handleStartKanaDrop}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-sm md:text-base"
                      >
                        Kana Drop Game
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Kana Chart */}
          <div className="w-full">
            <KanaChart
              chartType={kanaChartType}
              selectedKana={kanaChartType === 'hiragana' ? selectedHiragana : selectedKatakana}
              onToggleKana={handleToggleKana}
              showRomaji={showRomaji}
            />
          </div>

          {/* Kana Study Modal */}
          {showKanaStudyModal && (
            <KanaStudyModal
              isOpen={showKanaStudyModal}
              onClose={(completed) => {
                setShowKanaStudyModal(false);
                if (completed) {
                  showNotification({
                    title: 'Study Session Complete!',
                    message: 'Great job practicing your kana!',
                    type: 'success'
                  });
                }
              }}
              selectedKanaIds={[...selectedHiragana, ...selectedKatakana]}
              studyType={kanaStudyType}
            />
          )}

          {/* Kana Drop Modal */}
          {showKanaDropModal && (
            <KanaDropModal
              isOpen={showKanaDropModal}
              onClose={() => setShowKanaDropModal(false)}
              selectedKana={getSelectedKanaData}
            />
          )}

          {(selectedHiragana.size + selectedKatakana.size) > 8 && (
            <div className="my-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg text-center">
              <strong>Note:</strong> You have selected {selectedHiragana.size + selectedKatakana.size} characters. Kana Drop requires between 5-8 characters.
            </div>
          )}

          {allKanaSelected && (
            <div className="my-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg text-center">
              <strong>Warning:</strong> You have selected all kana. No "wrong kana" will spawn in the game—only distractors and your selected kana will appear.
            </div>
          )}
        </main>
      </div>
    </>
  );
}
