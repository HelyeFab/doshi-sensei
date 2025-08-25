'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SmartHeader from '@/components/SmartHeader';
import KanaChart from '@/components/kana/KanaChart';
import KanaStudyModal from '@/components/kana/KanaStudyModal';
import { SelectionActionBar } from '@/components/ui/SelectionActionBar';
import { kanaData, getBasicKana } from '@/data/kanaData';
import { useToast } from '@/hooks/useToast';
import { DesktopContainer } from '@/components/layout/DesktopContainer';

export default function HiraganaClient() {
  const router = useRouter();
  const { showToast } = useToast();

  // Hiragana states
  const [selectedHiragana, setSelectedHiragana] = useState<Set<string>>(new Set());
  const [showKanaStudyModal, setShowKanaStudyModal] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);

  // Load saved hiragana selection and set initial romaji state based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHiragana = localStorage.getItem('kana-study-selection-hiragana');
      if (savedHiragana) {
        try {
          setSelectedHiragana(new Set(JSON.parse(savedHiragana)));
        } catch (e) {
          console.error('Error loading saved selection:', e);
        }
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

  const handleSelectAll = () => {
    const allHiraganaIds = kanaData.map(k => k.id);
    setSelectedHiragana(new Set(allHiraganaIds));
  };

  const handleSelectBasic = () => {
    const basicKana = getBasicKana();
    setSelectedHiragana(new Set(basicKana.map(k => k.id)));
  };

  const handleClearSelection = () => {
    setSelectedHiragana(new Set());
  };

  const handleStudyClick = () => {
    if (selectedHiragana.size === 0) {
      showToast({
        message: 'Please select at least one character to study',
        type: 'error'
      });
      return;
    }
    setShowKanaStudyModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Smart Header */}
      <SmartHeader 
        title="Hiragana Charts"
      />

      {/* Main Content */}
      <DesktopContainer>
        <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-4xl mx-auto">

          {/* Target Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">あ</span>
            </div>
          </div>

          <p className="text-muted-foreground mb-4 text-center max-w-2xl mx-auto">
            Learn the foundational Japanese writing system. Hiragana is used for native Japanese words and grammar particles.
          </p>
          
          <p className="text-muted-foreground mb-8 text-center">
            Tap any character to hear its pronunciation. Click the purple corner to select for practice.
          </p>

          {/* Switch to Katakana Button */}
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
            onSelectBasic={handleSelectBasic}
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
                className="bg-card border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <h3 className="text-lg font-semibold">Kana Drop</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Catch falling hiragana by typing the correct romaji. Coming soon!
                </p>
              </div>

              <div
                className="bg-card border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✍️</span>
                  </div>
                  <h3 className="text-lg font-semibold">Writing Practice</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Practice writing hiragana with stroke order guides. Coming soon!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      </DesktopContainer>

      {/* Study Modal */}
      {showKanaStudyModal && (
        <KanaStudyModal
          isOpen={showKanaStudyModal}
          selectedKanaIds={Array.from(selectedHiragana)}
          studyType="hiragana"
          onClose={(completed) => {
            setShowKanaStudyModal(false);
            if (completed) {
              showToast({
                message: 'Study session completed! Great job! 🎉',
                type: 'success'
              });
            }
          }}
        />
      )}
    </div>
  );
}