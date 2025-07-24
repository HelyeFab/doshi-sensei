'use client';

import { useState } from 'react';
import { AnimatedWord } from '../components/AnimatedWord';
import { TutorialButton } from '../components/TutorialButton';
import { JapaneseWord } from '@/types';
import { useStrings } from '@/contexts/LanguageContext';

export interface ConjugationScreenProps {
  onNext: () => void;
}

export function ConjugationScreen({ onNext }: ConjugationScreenProps) {
  const strings = useStrings();
  const tutorial = strings.tutorial;
  const [animationComplete, setAnimationComplete] = useState(false);
  const [demoPhase, setDemoPhase] = useState<'intro' | 'search' | 'save' | 'list' | 'complete'>('intro');
  const [mockSearchTerm, setMockSearchTerm] = useState('');
  const [savedWords, setSavedWords] = useState<string[]>([]);

  if (!tutorial || !tutorial.conjugation || !tutorial.studyTools) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const demoWord: JapaneseWord = {
    id: 'demo-taberu',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: tutorial.conjugation.demoWord,
    type: 'Ichidan',
    jlpt: 'N5',
    tags: ['verb', 'daily']
  };

  const demoWords = [
    { kanji: '読む', kana: 'よむ', meaning: tutorial.studyTools.demoWords.read },
    { kanji: '書く', kana: 'かく', meaning: tutorial.studyTools.demoWords.write },
    { kanji: '話す', kana: 'はなす', meaning: tutorial.studyTools.demoWords.speak }
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
      {/* Conjugation Section */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">
            {tutorial.conjugation.title}
          </h2>
          <p className="text-sm text-white/90 leading-relaxed">
            {tutorial.conjugation.description}
            <span className="font-semibold text-white"> {tutorial.conjugation.emphasis} </span>
            {tutorial.conjugation.continuation}
          </p>
        </div>

        {/* Demo Area */}
        <div className="bg-white/10 border border-white/20 rounded-lg p-6 space-y-4">
          <AnimatedWord
            word={demoWord}
            onAnimationComplete={() => setAnimationComplete(true)}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 h-px bg-white/20"></div>
        <div className="text-white/50 text-sm">AND</div>
        <div className="flex-1 h-px bg-white/20"></div>
      </div>

      {/* Lists Section */}
      <div className="space-y-4">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-white">
            {tutorial.studyTools.title}
          </h3>
          <p className="text-white/90 leading-relaxed">
            {tutorial.studyTools.description}
            <span className="font-semibold text-white"> {tutorial.studyTools.emphasis} </span>
          </p>
        </div>

        {/* Mock App Interface */}
        <div className="bg-white/10 border border-white/20 rounded-lg overflow-hidden">
          {/* Mock Navigation */}
          <div className="bg-white/20 border-b border-white/20 px-4 py-2">
            <div className="text-sm font-medium text-white">{tutorial.studyTools.vocabularyBrowser}</div>
          </div>

          <div className="p-4 space-y-4">
            {/* Mock Search Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={mockSearchTerm}
                  readOnly
                  placeholder={tutorial.studyTools.searchPlaceholder}
                  className="w-full px-3 py-2 border border-white/20 rounded bg-white/10 text-white placeholder-white/50"
                />
                {demoPhase === 'search' && (
                  <div className="absolute right-2 top-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                  </div>
                )}
              </div>
              <button className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30 transition-colors">
                {tutorial.studyTools.searchButton}
              </button>
            </div>

            {/* Mock Search Results */}
            {(demoPhase === 'save' || demoPhase === 'list' || demoPhase === 'complete') && (
              <div className="space-y-2">
                {demoWords.slice(0, demoPhase === 'save' ? 1 : 3).map((word, index) => (
                  <div
                    key={word.kanji}
                    className="flex items-center justify-between p-3 bg-white/10 rounded border border-white/20 animate-slideIn"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div>
                      <div className="font-medium japanese-text text-white">{word.kanji}</div>
                      <div className="text-sm text-white/70">
                        {word.kana} - {word.meaning}
                      </div>
                    </div>
                    <button
                      className={`px-3 py-1 text-xs rounded transition-all ${
                        savedWords.includes(word.kanji)
                          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                      }`}
                    >
                      {savedWords.includes(word.kanji) ? tutorial.studyTools.savedButton : tutorial.studyTools.saveButton}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Mock List Pill */}
            {(demoPhase === 'list' || demoPhase === 'complete') && (
              <div className="pt-4 border-t border-white/20">
                <div className="text-sm text-white/70 mb-2">{tutorial.studyTools.listsHeader}</div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-full animate-slideIn"
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-blue-400">
                    {tutorial.studyTools.listExample}
                  </span>
                  <span className="text-xs text-white/70">
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
              {tutorial.studyTools.demoButton}
            </TutorialButton>
          </div>
        )}
      </div>

      {/* Continue Button */}
      {animationComplete && demoPhase === 'complete' && (
        <div className="text-center space-y-2 pt-4">
          <p className="text-white font-medium">
            {tutorial.conjugation.successMessage}
          </p>
          <p className="text-sm text-white/70">
            {tutorial.studyTools.tip}
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            {tutorial.studyTools.continueButton}
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
