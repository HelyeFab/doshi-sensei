'use client';

import { useEffect, useState } from 'react';
import { Kanji } from '@/types';
import { KanjiTTSButton } from '@/components/ui/TTSButton';
import StrokeOrderModal from './StrokeOrderModal';
import SlideUpModal from '@/components/SlideUpModal';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { mnemonicService, type KanjiMnemonic } from '@/services/mnemonics/mnemonicService';

interface KanjiDetailsModalProps {
  kanji: Kanji | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  showSaveButton?: boolean;
  className?: string;
}

/**
 * Reusable Kanji Details Modal Component
 * 
 * A beautiful, mobile-optimized modal for displaying kanji details including:
 * - Large kanji character display (50% of viewport on mobile)
 * - JLPT level and stroke count badges
 * - Meanings and readings with audio playback
 * - Stroke order animation (accessible via stroke count badge)
 * - Optional save functionality
 * 
 * @example
 * ```tsx
 * <KanjiDetailsModal
 *   kanji={selectedKanji}
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   onSave={handleSaveKanji}
 *   showSaveButton={true}
 * />
 * ```
 */
export default function KanjiDetailsModal({
  kanji,
  isOpen,
  onClose,
  onSave,
  showSaveButton = true,
  className = ''
}: KanjiDetailsModalProps) {
  const { user } = useAuth();
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [showLoginModalForSave, setShowLoginModalForSave] = useState(false);
  const [strokeCount, setStrokeCount] = useState<number | null>(null);
  const [mnemonic, setMnemonic] = useState<KanjiMnemonic | null>(null);
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(true);

  // Fetch stroke count from KanjiVG data
  useEffect(() => {
    if (isOpen && kanji?.kanji) {
      fetchStrokeCount(kanji.kanji);
      fetchMnemonic(kanji.kanji);
    }
  }, [isOpen, kanji?.kanji]);

  // Fetch mnemonic for the kanji
  const fetchMnemonic = async (kanjiChar: string) => {
    setMnemonicLoading(true);
    setMnemonic(null);
    
    try {
      const result = await mnemonicService.getMnemonic(kanjiChar);
      if (result) {
        setMnemonic(result);
      }
    } catch (error) {
      console.error('Error fetching mnemonic:', error);
    } finally {
      setMnemonicLoading(false);
    }
  };

  const fetchStrokeCount = async (kanjiChar: string) => {
    try {
      // Get Unicode code point
      const codePoint = kanjiChar.charCodeAt(0).toString(16).padStart(5, '0');
      
      // Try to fetch from KanjiVG data
      const response = await fetch(`/data/kanjivg/${codePoint}.svg`);
      
      if (!response.ok) {
        setStrokeCount(null);
        return;
      }
      
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      
      // Count stroke paths
      const strokePaths = svgDoc.querySelectorAll('path[id*="kvg:"]');
      setStrokeCount(strokePaths.length);
    } catch (error) {
      console.error('Error fetching stroke count:', error);
      setStrokeCount(null);
    }
  };

  const handleSaveClick = () => {
    if (!user) {
      setShowLoginModalForSave(true);
    } else if (onSave) {
      onSave();
    }
  };

  if (!kanji) return null;

  return (
    <>
      <SlideUpModal
        isOpen={isOpen}
        onClose={onClose}
        height="100%"
        showHandle={false}
        className={`!rounded-t-none ${className}`}
      >
        <div className="h-full flex flex-col relative">
          {/* Header */}
          <div className="text-center pt-6 pb-2">
            <h2 className="text-2xl font-bold text-card-foreground">
              Kanji Details
            </h2>
          </div>

          {/* Content - scrollable if needed */}
          <div className="flex-1 overflow-y-auto pb-6">
            {/* Large Kanji Display - takes half the viewport */}
            <div className="h-[50vh] flex items-center justify-center relative px-6">
              {/* Save to Lists Button - top right */}
              {showSaveButton && (
                <button
                  onClick={handleSaveClick}
                  className="absolute right-6 top-4 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group shadow-sm z-10"
                  title="Save to lists"
                  aria-label="Save kanji to lists"
                >
                  <Heart className="w-6 h-6 text-muted-foreground group-hover:text-red-500 transition-colors" />
                </button>
              )}
              
              <div className="text-center">
                {/* HUGE Kanji - responsive sizing: massive on mobile, controlled on desktop */}
                <div 
                  className="leading-none font-medium text-card-foreground [&]:!text-[70vw] sm:[&]:!text-[50vw] md:[&]:!text-[40vw] lg:[&]:!text-[200px] xl:[&]:!text-[220px]"
                  aria-label={`Kanji character: ${kanji.kanji}`}
                >
                  {kanji.kanji}
                </div>
                
                {/* JLPT and strokes - directly below kanji */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="px-3 py-1.5 text-sm rounded-md border bg-primary/10 text-primary border-primary/20 font-medium">
                    {kanji.jlpt}
                  </span>
                  {strokeCount !== null && (
                    <button
                      onClick={() => setShowStrokeOrder(true)}
                      className="px-3 py-1.5 text-sm rounded-md border bg-muted/50 text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                      title="View stroke order animation"
                      aria-label={`View stroke order animation for ${kanji.kanji} (${strokeCount} strokes)`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                        />
                      </svg>
                      {strokeCount} strokes
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Meaning */}
            <div className="mb-6 px-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Meaning</h3>
              <p className="text-lg text-card-foreground">{kanji.meaning}</p>
            </div>

            {/* Readings */}
            <div className="space-y-4 mb-6 px-6">
              {/* Onyomi */}
              <div>
                <h3 className="text-xs font-normal text-muted-foreground mb-2">
                  音読み (On'yomi) - Chinese Reading
                </h3>
                <div className="flex flex-wrap gap-2">
                  {kanji.onyomi && kanji.onyomi.length > 0 ? (
                    kanji.onyomi.map((reading, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 bg-muted text-foreground border border-border rounded-md text-sm japanese-text"
                      >
                        <span>{reading}</span>
                        <KanjiTTSButton 
                          kanji={kanji.kanji}
                          reading={reading}
                          readingType="on"
                          size="sm"
                          variant="minimal"
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No on'yomi readings</span>
                  )}
                </div>
              </div>

              {/* Kunyomi */}
              <div>
                <h3 className="text-xs font-normal text-muted-foreground mb-2">
                  訓読み (Kun'yomi) - Japanese Reading
                </h3>
                <div className="flex flex-wrap gap-2">
                  {kanji.kunyomi && kanji.kunyomi.length > 0 ? (
                    kanji.kunyomi.map((reading, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 bg-muted text-foreground border border-border rounded-md text-sm japanese-text"
                      >
                        <span>{reading}</span>
                        <KanjiTTSButton 
                          kanji={kanji.kanji}
                          reading={reading}
                          readingType="kun"
                          size="sm"
                          variant="minimal"
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No kun'yomi readings</span>
                  )}
                </div>
              </div>
            </div>

            {/* Mnemonic Section */}
            <div className="mb-6 px-6">
              <button
                onClick={() => setShowMnemonic(!showMnemonic)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Memory Aid (Mnemonic)</span>
                {showMnemonic ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>
              
              {showMnemonic && (
                <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                  {mnemonicLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span>Loading memory aid...</span>
                    </div>
                  ) : mnemonic ? (
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed text-foreground">
                        {mnemonic.mnemonic}
                      </p>
                      
                      {mnemonic.alike && mnemonic.alike.length > 0 && (
                        <div className="pt-2 border-t border-accent/20">
                          <span className="text-xs text-muted-foreground">Similar kanji: </span>
                          <span className="text-sm japanese-text">
                            {mnemonic.alike.join('、')}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground italic">
                        Source: {mnemonic.source === 'rtega' ? 'rtega.be' : mnemonic.source}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No memory aid available for this kanji yet.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Additional Information (optional - can be extended) */}
            {kanji.examples && kanji.examples.length > 0 && (
              <div className="mb-6 px-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Example Words</h3>
                <div className="space-y-2">
                  {kanji.examples.map((example, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium japanese-text">{example.word}</span>
                      <span className="text-muted-foreground ml-2">({example.reading})</span>
                      <span className="text-muted-foreground ml-2">- {example.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SlideUpModal>

      {/* Stroke Order Modal */}
      <StrokeOrderModal
        isOpen={showStrokeOrder}
        onClose={() => setShowStrokeOrder(false)}
        kanji={kanji.kanji}
        meaning={kanji.meaning}
      />

      {/* Login Modal for Save to Lists */}
      <LoginPromptModal
        isOpen={showLoginModalForSave}
        onClose={() => setShowLoginModalForSave(false)}
        message="Please log in to save kanji to your lists"
        feature="save_kanji"
      />
    </>
  );
}