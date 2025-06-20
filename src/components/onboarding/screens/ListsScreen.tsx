'use client';

import { useState } from 'react';
import { TutorialButton } from '../components/TutorialButton';

export interface ListsScreenProps {
  onNext: () => void;
}

export function ListsScreen({ onNext }: ListsScreenProps) {
  const [demoPhase, setDemoPhase] = useState<'intro' | 'search' | 'save' | 'list' | 'complete'>('intro');
  const [mockSearchTerm, setMockSearchTerm] = useState('');
  const [savedWords, setSavedWords] = useState<string[]>([]);

  const demoWords = [
    { kanji: '読む', kana: 'よむ', meaning: 'to read' },
    { kanji: '書く', kana: 'かく', meaning: 'to write' },
    { kanji: '話す', kana: 'はなす', meaning: 'to speak' }
  ];

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runListDemo = async () => {
    // Search simulation
    setDemoPhase('search');
    setMockSearchTerm('読');
    await sleep(800);
    setMockSearchTerm('読む');
    await sleep(1000);

    // Save simulation
    setDemoPhase('save');
    await sleep(1000);
    setSavedWords(['読む']);

    // Continue saving
    await sleep(800);
    setSavedWords(['読む', '書く']);
    await sleep(800);
    setSavedWords(['読む', '書く', '話す']);

    setDemoPhase('list');
    await sleep(1000);
    setDemoPhase('complete');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Become a Word Collector! 📚
        </h2>
        <p className="text-muted-foreground">
          Think of this as Pokémon, but instead of catching creatures, you're catching Japanese words.
          <span className="font-semibold text-primary"> Gotta learn 'em all! </span>
        </p>
      </div>

      {/* Mock App Interface */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Mock Navigation */}
        <div className="bg-primary/10 border-b border-border px-4 py-2">
          <div className="text-sm font-medium text-primary">Vocabulary Browser</div>
        </div>

        <div className="p-4 space-y-4">
          {/* Mock Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={mockSearchTerm}
                readOnly
                placeholder="Search Japanese words..."
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground"
              />
              {demoPhase === 'search' && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full"></div>
                </div>
              )}
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded">
              Search
            </button>
          </div>

          {/* Mock Search Results */}
          {(demoPhase === 'save' || demoPhase === 'list' || demoPhase === 'complete') && (
            <div className="space-y-2">
              {demoWords.slice(0, demoPhase === 'save' ? 1 : 3).map((word, index) => (
                <div
                  key={word.kanji}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded border animate-slideIn"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div>
                    <div className="font-medium japanese-text">{word.kanji}</div>
                    <div className="text-sm text-muted-foreground">
                      {word.kana} - {word.meaning}
                    </div>
                  </div>
                  <button
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      savedWords.includes(word.kanji)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                        : 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
                    }`}
                  >
                    {savedWords.includes(word.kanji) ? '✓ Saved!' : 'Save to List'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mock List Pill */}
          {(demoPhase === 'list' || demoPhase === 'complete') && (
            <div className="pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground mb-2">Your Lists:</div>
              <div
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-full animate-slideIn"
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-400">
                  Reading Verbs
                </span>
                <span className="text-xs text-muted-foreground">
                  ({savedWords.length})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {demoPhase === 'intro' && (
        <div className="text-center">
          <TutorialButton
            onClick={runListDemo}
            variant="secondary"
          >
            🔍 Show Me How Lists Work!
          </TutorialButton>
        </div>
      )}

      {demoPhase === 'complete' && (
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">
            🎯 Perfect! You're now a certified word wrangler!
          </p>
          <p className="text-sm text-muted-foreground">
            Pro tip: Words in lists can be used for focused drill sessions
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            Ready for Practice Mode! 💪
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
