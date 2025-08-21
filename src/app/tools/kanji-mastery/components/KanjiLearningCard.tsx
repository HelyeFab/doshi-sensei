'use client';

import { useState } from 'react';
import { KanjiTTSButton, TTSButton } from '@/components/ui/TTSButton';
import StrokeOrderModal from '@/components/kanji/StrokeOrderModal';

interface KanjiWithExamples {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt?: string;
  grade?: number;
  strokes?: number;
  examples?: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
  sentences?: Array<{
    japanese: string;
    english: string;
  }>;
}

interface KanjiLearningCardProps {
  kanji: KanjiWithExamples;
  isMarkedEasy: boolean;
  onMarkEasy: () => void;
}

export default function KanjiLearningCard({ 
  kanji, 
  isMarkedEasy, 
  onMarkEasy 
}: KanjiLearningCardProps) {
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'examples' | 'sentences'>('overview');

  return (
    <>
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {/* Header with Kanji Display */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center">
          <div className="relative inline-block">
            <div className="text-8xl font-bold text-foreground mb-2 japanese-text">
              {kanji.kanji}
            </div>
            
            {/* Stroke Order Button */}
            <button
              onClick={() => setShowStrokeOrder(true)}
              className="absolute -right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-card/50 hover:bg-card/70 transition-colors shadow-sm"
              title="View stroke order"
            >
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                />
              </svg>
            </button>
          </div>
          
          {/* Meaning */}
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            {kanji.meaning}
          </h2>
          
          {/* JLPT Level Badge */}
          {kanji.jlpt && (
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
              kanji.jlpt === 'N5' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
              kanji.jlpt === 'N4' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
              kanji.jlpt === 'N3' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
              kanji.jlpt === 'N2' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
              'bg-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              {kanji.jlpt}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'examples'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Examples
          </button>
          <button
            onClick={() => setActiveTab('sentences')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'sentences'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sentences
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Readings */}
              <div className="space-y-4">
                {/* Onyomi */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    音読み (On&apos;yomi)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {kanji.onyomi.length > 0 ? (
                      kanji.onyomi.map((reading, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md japanese-text"
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
                      <span className="text-muted-foreground text-sm">No on&apos;yomi readings</span>
                    )}
                  </div>
                </div>

                {/* Kunyomi */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    訓読み (Kun&apos;yomi)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {kanji.kunyomi.length > 0 ? (
                      kanji.kunyomi.map((reading, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md japanese-text"
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
                      <span className="text-muted-foreground text-sm">No kun&apos;yomi readings</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4">
                {kanji.strokes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm font-medium text-foreground/70">Strokes</div>
                    <div className="text-lg font-semibold text-foreground">{kanji.strokes}</div>
                  </div>
                )}
                {kanji.grade && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm font-medium text-foreground/70">Grade</div>
                    <div className="text-lg font-semibold text-foreground">{kanji.grade}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-3">
              {kanji.examples && kanji.examples.length > 0 ? (
                kanji.examples.map((example, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-lg font-medium text-foreground japanese-text">
                        {example.word}
                      </div>
                      <TTSButton 
                        text={example.word}
                        size="sm"
                        variant="minimal"
                        options={{ context: 'vocabulary' }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground japanese-text mb-1">
                      {example.reading}
                    </div>
                    <div className="text-sm text-foreground">
                      {example.meaning}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No example words available
                </p>
              )}
            </div>
          )}

          {activeTab === 'sentences' && (
            <div className="space-y-4">
              {kanji.sentences && kanji.sentences.length > 0 ? (
                kanji.sentences.map((sentence, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-base text-foreground japanese-text leading-relaxed">
                        {sentence.japanese}
                      </div>
                      <TTSButton 
                        text={sentence.japanese}
                        size="sm"
                        variant="minimal"
                        options={{ context: 'shadowing' }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {sentence.english}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No example sentences available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mark as Easy Button */}
        <div className="border-t border-border p-4">
          <button
            onClick={onMarkEasy}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              isMarkedEasy
                ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {isMarkedEasy ? '✓ Marked as Easy' : 'Mark as Easy'}
          </button>
        </div>
      </div>

      {/* Stroke Order Modal */}
      <StrokeOrderModal
        isOpen={showStrokeOrder}
        onClose={() => setShowStrokeOrder(false)}
        kanji={kanji.kanji}
        meaning={kanji.meaning}
      />
    </>
  );
}