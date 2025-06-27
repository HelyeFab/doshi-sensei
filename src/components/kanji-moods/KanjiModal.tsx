'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { KanjiItem } from '@/types/moodBoard';
import { useKanjiTTS } from '@/hooks/useTTS';
import { generateFuriganaWithCache } from '@/utils/furigana';

interface KanjiModalProps {
  kanji: KanjiItem | null;
  isOpen: boolean;
  onClose: () => void;
  isLearned: boolean;
  onToggleLearned: (char: string) => void;
}

export default function KanjiModal({
  kanji,
  isOpen,
  onClose,
  isLearned,
  onToggleLearned,
}: KanjiModalProps) {
  const [showFurigana, setShowFurigana] = useState(false);
  const [processedExamples, setProcessedExamples] = useState<string[]>([]);
  const { speak, isLoading: isTTSLoading, isPlaying } = useKanjiTTS();

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  // Process examples with furigana when needed
  useEffect(() => {
    if (!kanji || !showFurigana) {
      setProcessedExamples([]);
      return;
    }

    const processExamples = async () => {
      const processed = await Promise.all(
        kanji.examples.map(example => generateFuriganaWithCache(stripRubyTags(example)))
      );
      setProcessedExamples(processed);
    };

    processExamples();
  }, [kanji, showFurigana]);

  if (!isOpen || !kanji) return null;

  // Strip ruby tags from examples
  const stripRubyTags = (text: string): string => {
    return text
      .replace(/<ruby>/g, '')
      .replace(/<\/ruby>/g, '')
      .replace(/<rt>.*?<\/rt>/g, '')
      .replace(/<rb>/g, '')
      .replace(/<\/rb>/g, '');
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleToggleLearned = () => {
    onToggleLearned(kanji.char);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      {/* Backdrop with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-600/30 via-gray-700/40 to-gray-800/50 dark:from-black/50 dark:via-black/60 dark:to-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl animate-slideUp">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5 text-muted-foreground"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div className="p-8">
          {/* Kanji Character with TTS */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="text-8xl font-bold text-foreground mb-4">
                {kanji.char}
              </div>
              {/* TTS Button */}
              <button
                onClick={() => speak(kanji.char, kanji.readings.kun[0] || kanji.readings.on[0] || kanji.char)}
                disabled={isTTSLoading || isPlaying}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                aria-label="Play pronunciation"
              >
                {isTTSLoading ? (
                  <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isPlaying ? (
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-2xl font-medium text-foreground">
              {kanji.meaning}
            </div>
          </div>

          {/* Readings */}
          <div className="space-y-6 mb-8">
            {/* On'yomi */}
            {kanji.readings.on.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  On'yomi (音読み)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {kanji.readings.on.map((reading, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-lg font-medium"
                    >
                      {reading}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Kun'yomi */}
            {kanji.readings.kun.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Kun'yomi (訓読み)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {kanji.readings.kun.map((reading, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-lg font-medium"
                    >
                      {reading}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Examples with Furigana Toggle */}
          {kanji.examples.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Examples
                </h3>
                {/* Furigana Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-muted-foreground">ふりがな</span>
                  <button
                    onClick={() => setShowFurigana(!showFurigana)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      showFurigana ? 'bg-primary' : 'bg-muted'
                    }`}
                    aria-label="Toggle furigana"
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        showFurigana ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>
              <div className="space-y-3">
                {kanji.examples.map((example, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/50 rounded-lg"
                  >
                    <p 
                      className="text-foreground text-lg"
                      dangerouslySetInnerHTML={{
                        __html: showFurigana && processedExamples[index] 
                          ? processedExamples[index] 
                          : stripRubyTags(example)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty indicator */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Difficulty
            </h3>
            <div className="flex gap-1">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-8 rounded-full transition-colors ${
                    index < kanji.difficulty
                      ? 'bg-gradient-to-t from-orange-400 to-yellow-400'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Mark as learned button */}
          <button
            onClick={handleToggleLearned}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
              isLearned
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300 hover:from-green-500/30 hover:to-emerald-500/30'
                : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-purple-700 dark:text-purple-300 hover:from-pink-500/30 hover:to-purple-500/30'
            }`}
          >
            {isLearned ? '✓ Learned' : 'Mark as Learned'}
          </button>
        </div>
      </div>
    </div>
  );
}