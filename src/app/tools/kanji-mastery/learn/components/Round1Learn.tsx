'use client';

import { useState, useEffect } from 'react';
import { KanjiWithExamples } from '../types';
import Image from 'next/image';
import { KanjiTTSButton, VocabularyTTSButton } from '@/components/ui/TTSButton';
import StrokeOrderModal from '@/components/kanji/StrokeOrderModal';

interface Round1LearnProps {
  kanji: KanjiWithExamples;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onStartTesting: () => void;
}

export default function Round1Learn({
  kanji,
  currentIndex,
  totalCount,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  onStartTesting
}: Round1LearnProps) {
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [strokeCount, setStrokeCount] = useState<number | null>(null);

  // Fetch stroke count from KanjiVG data
  useEffect(() => {
    const fetchStrokeCount = async () => {
      if (!kanji.kanji) return;
      
      try {
        // Get Unicode code point
        const codePoint = kanji.kanji.charCodeAt(0).toString(16).padStart(5, '0');
        const svgUrl = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${codePoint}.svg`;
        
        const response = await fetch(svgUrl);
        if (!response.ok) {
          console.error('Failed to fetch SVG for stroke count');
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

    fetchStrokeCount();
  }, [kanji.kanji]);

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-16 md:pt-24 pb-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Round 1: Learn
            </h2>
            <span className="text-sm text-muted-foreground">
              ({currentIndex + 1}/{totalCount})
            </span>
          </div>
        </div>
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content with mobile padding */}
      <div className="flex-1 overflow-y-auto mobile-nav-padding">
        <div className="px-4 py-6 max-w-2xl mx-auto">
          {/* Single unified card */}
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Kanji Header Section */}
            <div className="relative bg-gradient-to-b from-primary/5 to-transparent px-6 pt-6 pb-8">
              {/* Top badges row */}
              <div className="flex justify-between items-start mb-6">
                {/* JLPT Badge */}
                {kanji.jlpt && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    JLPT {kanji.jlpt}
                  </span>
                )}
                
                {/* Stroke Order Button */}
                <button
                  onClick={() => setShowStrokeOrder(true)}
                  className="p-2.5 rounded-xl bg-background hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
                  title="View stroke order animation"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                    />
                  </svg>
                </button>
              </div>
              
              {/* Kanji Character */}
              <div className="text-center">
                <div className="text-8xl font-bold text-foreground mb-3 leading-none">
                  {kanji.kanji}
                </div>
                
                {/* Stroke Count */}
                {(kanji.strokes || strokeCount) && (
                  <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                      />
                    </svg>
                    <span>{kanji.strokes || strokeCount} strokes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Sections */}
            <div className="px-6 py-6 space-y-6">
              {/* Meaning Section */}
              <div className="text-center pb-6 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Meaning
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {kanji.meaning}
                </p>
              </div>

              {/* Readings Section */}
              <div className="space-y-4">
                {/* Kun-yomi */}
                {kanji.kunyomi && kanji.kunyomi.length > 0 && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Kun-yomi (訓読み)
                      </p>
                      <KanjiTTSButton 
                        kanji={kanji.kanji}
                        reading={kanji.kunyomi.join('、')}
                        readingType="kun"
                        size="sm"
                        variant="minimal"
                      />
                    </div>
                    <p className="text-xl text-foreground font-medium japanese-text">
                      {kanji.kunyomi.join('、')}
                    </p>
                  </div>
                )}

                {/* On-yomi */}
                {kanji.onyomi && kanji.onyomi.length > 0 && (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        On-yomi (音読み)
                      </p>
                      <KanjiTTSButton 
                        kanji={kanji.kanji}
                        reading={kanji.onyomi.join('、')}
                        readingType="on"
                        size="sm"
                        variant="minimal"
                      />
                    </div>
                    <p className="text-xl text-foreground font-medium japanese-text">
                      {kanji.onyomi.join('、')}
                    </p>
                  </div>
                )}
              </div>

              {/* Example Words */}
              {kanji.examples && kanji.examples.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Example Words
                  </p>
                  <div className="space-y-3">
                    {kanji.examples.slice(0, 3).map((example, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <VocabularyTTSButton 
                            word={example.word}
                            kana={example.reading}
                            size="sm"
                            variant="minimal"
                          />
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-semibold text-foreground japanese-text">
                                {example.word}
                              </span>
                              <span className="text-sm text-muted-foreground japanese-text">
                                ({example.reading})
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground text-right">
                          {example.meaning}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {kanji.grade && (
                <div className="pt-4 flex justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    Grade {kanji.grade}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation with bottom padding for virtual companion */}
      <div className="border-t border-border bg-card p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          {currentIndex === totalCount - 1 ? (
            <button
              onClick={onStartTesting}
              className="w-full py-3 px-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Start Testing Round
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="flex-1 py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={onNext}
                disabled={!canGoNext}
                className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Stroke Order Modal */}
      <StrokeOrderModal
        isOpen={showStrokeOrder}
        onClose={() => setShowStrokeOrder(false)}
        kanji={kanji.kanji}
      />
    </>
  );
}