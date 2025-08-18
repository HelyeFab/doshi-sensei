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
import { SelectionActionBar } from '@/components/ui/SelectionActionBar';

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
  const [showInstructions, setShowInstructions] = useState(false);

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
    const allKatakanaIds = kanaData.map(k => k.id);
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
      const kana = kanaData.find(k => k.id === id);
      return kana ? { id, char: kana.katakana, romaji: kana.romaji, type: 'katakana' as const } : null;
    }).filter(Boolean) as { id: string; char: string; romaji: string; type: 'katakana' }[];

    return selectedKatakanaChars;
  };

  // Prepare kana for game
  const selectedKanaForGame = useMemo(() => {
    const katakanaChars = selectedKatakana.size > 0 
      ? kanaData
          .filter(k => selectedKatakana.has(k.id))
          .map(k => ({
            id: k.id + '-katakana',
            kana: k.katakana,
            romaji: k.romaji,
            type: 'katakana' as const
          }))
      : getBasicKana().filter(k => k.type !== 'digraph').slice(0, 10).map(k => ({
          id: k.id + '-katakana',
          kana: k.katakana,
          romaji: k.romaji,
          type: 'katakana' as const
        }));

    return katakanaChars as KanaChar[];
  }, [selectedKatakana]);

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
          __html: JSON.stringify(katakanaStructuredData),
        }}
      />

      <SmartPageHeader 
        title="Katakana Charts" 
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
          
          {/* How to Use Section */}
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>How to use Katakana Chart</span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  showInstructions ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showInstructions && (
              <div className="mt-4 p-5 bg-card border border-border rounded-lg text-left max-w-3xl mx-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">🌐 Master Katakana - Japan's International Script</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">📖 What is Katakana?</h4>
                    <p className="text-muted-foreground text-sm">
                      Katakana (カタカナ) is the Japanese syllabary used primarily for foreign loanwords, company names, 
                      technical terms, and onomatopoeia. It consists of 46 basic characters that mirror hiragana sounds but 
                      with angular, sharp strokes. Modern Japanese uses thousands of katakana words from English (コンピューター 
                      computer), German (アルバイト part-time job), Portuguese (パン bread), and other languages.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">🎯 Interactive Chart Features</h4>
                    <p className="text-muted-foreground text-sm">
                      <strong>Audio Pronunciation:</strong> Tap any character to hear native pronunciation<br/>
                      <strong>Selection Mode:</strong> Click the purple corner checkbox to select characters for practice<br/>
                      <strong>Row Selection:</strong> Select entire rows for systematic learning<br/>
                      <strong>Romaji Toggle:</strong> Show/hide romanization to test your memory<br/>
                      <strong>Visual Distinction:</strong> Angular design contrasts with curved hiragana
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">📚 Study Modes</h4>
                      <p className="text-muted-foreground text-sm">
                        <strong>Flashcard Study:</strong> Practice selected characters with flip cards<br/>
                        <strong>Kana Drop Game:</strong> Catch falling katakana in arcade mode<br/>
                        <strong>Word Recognition:</strong> Practice reading common loanwords<br/>
                        <strong>Writing Practice:</strong> Learn the angular stroke patterns
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🎓 Learning Strategy</h4>
                      <p className="text-muted-foreground text-sm">
                        <strong>After Hiragana:</strong> Learn katakana once you're comfortable with hiragana<br/>
                        <strong>Focus on Common:</strong> Start with frequently used characters in loanwords<br/>
                        <strong>Learn Words:</strong> Study whole words not just individual characters<br/>
                        <strong>Daily Practice:</strong> Read product labels and signs for real-world practice
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">🔤 Common Loanwords</h4>
                    <p className="text-muted-foreground text-sm">
                      <strong>Technology:</strong> コンピューター (computer), インターネット (internet), スマホ (smartphone)<br/>
                      <strong>Food:</strong> コーヒー (coffee), ケーキ (cake), ハンバーガー (hamburger), パン (bread)<br/>
                      <strong>Business:</strong> ビジネス (business), プロジェクト (project), ミーティング (meeting)<br/>
                      <strong>Daily Life:</strong> テレビ (TV), タクシー (taxi), ホテル (hotel), トイレ (toilet)<br/>
                      <strong>Fashion:</strong> シャツ (shirt), ドレス (dress), アクセサリー (accessory)
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">✨ Special Usage</h4>
                    <p className="text-muted-foreground text-sm">
                      <strong>Extended Vowels:</strong> Use ー to lengthen sounds (コーヒー ko-hi-)<br/>
                      <strong>Small Characters:</strong> ァィゥェォ modify sounds (ファ fa, ウィ wi)<br/>
                      <strong>V-sounds:</strong> ヴ represents "v" sound (ヴァイオリン violin)<br/>
                      <strong>Onomatopoeia:</strong> ワンワン (woof woof), ニャー (meow), ドキドキ (heartbeat)<br/>
                      <strong>Emphasis:</strong> Sometimes used stylistically for Japanese words (カワイイ for cute)
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">💡 Memory Techniques</h4>
                    <p className="text-muted-foreground text-sm">
                      Associate shapes with meanings - ア looks like an "A"ntenna, カ resembles a "Ka"tana sword. 
                      Learn katakana through familiar brands - ソニー (Sony), トヨタ (Toyota), ニンテンドー (Nintendo). 
                      Practice with menus at Japanese restaurants. Notice the angular, mechanical appearance compared 
                      to flowing hiragana. Group similar shapes: シ/ツ, ソ/ン, ウ/ワ/ヲ.
                    </p>
                  </div>

                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span>
                        <strong>Common Mistakes:</strong> Don't confuse シ (shi) / ツ (tsu), ソ (so) / ン (n), ウ (u) / ワ (wa). 
                        Remember the dash ー extends the previous vowel sound, not a hyphen. Small ッ doubles consonants 
                        (ベッド beddo). Watch for modified sounds with small kana (ティ ti, not チ chi).
                      </span>
                    </p>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      💡 <strong>Pro Tips:</strong>
                    </p>
                    <ul className="mt-1 ml-5 text-sm text-primary list-disc">
                      <li>Learn katakana after mastering hiragana - they share the same sounds</li>
                      <li>Practice with product packaging and restaurant menus</li>
                      <li>Focus on high-frequency loanwords in your field of interest</li>
                      <li>Use katakana to write your name in Japanese</li>
                      <li>Read manga sound effects (they're mostly katakana)</li>
                      <li>Free users: Full chart access, Premium: Advanced tracking and games</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
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

          {/* Selection Action Bar */}
          <SelectionActionBar
            onSelectBasic={() => {
              const basicKana = getBasicKana().filter(k => k.type === 'katakana');
              setSelectedKatakana(new Set(basicKana.map(k => k.id)));
            }}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            showToggle={true}
            toggleLabel="Romaji"
            toggleValue={showRomaji}
            onToggleChange={setShowRomaji}
            actionLabel="Study"
            actionDisabled={selectedKatakana.size === 0}
            onAction={handleStudyClick}
            selectionCount={selectedKatakana.size}
          />

          {/* Katakana Chart */}
          <KanaChart
            chartType="katakana"
            selectedKana={selectedKatakana}
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