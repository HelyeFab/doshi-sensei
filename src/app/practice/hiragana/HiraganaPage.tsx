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
  const [showInstructions, setShowInstructions] = useState(false);

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
          
          {/* How to Use Section */}
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>How to use Hiragana Chart</span>
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
                <h3 className="text-lg font-semibold text-foreground mb-4">🎌 Master Hiragana - The Foundation of Japanese Writing</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">📖 What is Hiragana?</h4>
                    <p className="text-muted-foreground text-sm">
                      Hiragana (ひらがな) is the fundamental Japanese syllabary consisting of 46 basic characters plus variations. 
                      It's used for native Japanese words, grammatical particles (は, を, に), verb endings, and words without kanji. 
                      Every Japanese sentence contains hiragana, making it essential for reading. Unlike English letters that represent 
                      sounds, each hiragana represents a complete syllable (ka, ki, ku, ke, ko).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">🎯 Interactive Chart Features</h4>
                    <p className="text-muted-foreground text-sm">
                      <strong>Audio Pronunciation:</strong> Tap any character to hear native pronunciation<br/>
                      <strong>Selection Mode:</strong> Click the purple corner checkbox to select characters for practice<br/>
                      <strong>Row Selection:</strong> Select entire rows (a-row, ka-row, etc.) for systematic learning<br/>
                      <strong>Romaji Toggle:</strong> Show/hide romanization to test your memory<br/>
                      <strong>Visual Memory:</strong> Characters are color-coded by row for pattern recognition
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">📚 Study Modes</h4>
                      <p className="text-muted-foreground text-sm">
                        <strong>Flashcard Study:</strong> Practice selected characters with flip cards<br/>
                        <strong>Kana Drop Game:</strong> Catch falling characters in this fun arcade game<br/>
                        <strong>Writing Practice:</strong> Learn stroke order for proper character formation<br/>
                        <strong>Recognition Quiz:</strong> Test your ability to identify characters
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🎓 Learning Path</h4>
                      <p className="text-muted-foreground text-sm">
                        <strong>Week 1:</strong> Master the vowels (あいうえお) and k-row<br/>
                        <strong>Week 2:</strong> Add s-row and t-row (さしすせそ, たちつてと)<br/>
                        <strong>Week 3:</strong> Learn n-row and h-row<br/>
                        <strong>Week 4:</strong> Complete remaining rows and dakuten marks
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">✨ Special Characters</h4>
                    <p className="text-muted-foreground text-sm">
                      <strong>Dakuten (゛):</strong> Adds voice to consonants (か→が, し→じ)<br/>
                      <strong>Handakuten (゜):</strong> Changes h-sounds to p-sounds (は→ぱ)<br/>
                      <strong>Small characters:</strong> ゃ, ゅ, ょ combine with i-column for blended sounds (きゃ, きゅ, きょ)<br/>
                      <strong>Small つ:</strong> Indicates a pause or doubles the following consonant<br/>
                      <strong>Particles:</strong> は (wa), を (wo), へ (e) have special pronunciations when used as particles
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">💡 Memory Techniques</h4>
                    <p className="text-muted-foreground text-sm">
                      Use visual mnemonics - あ looks like an "a"pple with a leaf, き resembles a "key". Group similar 
                      shapes together (は, ほ, ま share curves). Practice writing to reinforce muscle memory. Create word 
                      associations - learn ありがとう (thank you) to remember あ, り, が, と, う at once. Use the row 
                      pattern - each row follows the same vowel order (a, i, u, e, o).
                    </p>
                  </div>

                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span>
                        <strong>Common Mistakes:</strong> Don't confuse similar shapes: ね/れ/わ, る/ろ, は/ほ/ま, ぬ/め. 
                        Watch for は (ha) pronounced "wa" as a particle. Small ゃゅょ change pronunciation completely 
                        (きや kiya vs きゃ kya). The character を is only used as a particle, pronounced "o" not "wo".
                      </span>
                    </p>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      💡 <strong>Pro Tips:</strong>
                    </p>
                    <ul className="mt-1 ml-5 text-sm text-primary list-disc">
                      <li>Master 5 characters daily - you'll know all hiragana in 2 weeks</li>
                      <li>Practice writing while saying the sound aloud</li>
                      <li>Read children's books or manga with furigana for practice</li>
                      <li>Use the Kana Drop game for fun reinforcement</li>
                      <li>Test yourself by turning off romaji after each row</li>
                      <li>Free users: Unlimited chart access, Premium: Advanced games and tracking</li>
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
              onClick={() => router.push('/practice/katakana')}
              className="text-primary hover:text-primary/80 transition-colors underline"
            >
              Switch to Katakana →
            </button>
          </div>

          {/* Selection Action Bar */}
          <SelectionActionBar
            onSelectBasic={() => {
              const basicKana = getBasicKana().filter(k => k.type === 'hiragana');
              setSelectedHiragana(new Set(basicKana.map(k => k.id)));
            }}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            showToggle={true}
            toggleLabel="Romaji"
            toggleValue={showRomaji}
            onToggleChange={setShowRomaji}
            actionLabel="Study"
            actionDisabled={selectedHiragana.size === 0}
            onAction={handleStudyClick}
            selectionCount={selectedHiragana.size}
          />

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