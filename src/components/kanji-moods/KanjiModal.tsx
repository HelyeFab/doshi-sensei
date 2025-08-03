'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { KanjiItem } from '@/types/moodBoard';
import { useKanjiTTS, useTTS } from '@/hooks/useTTS';
import { generateFuriganaWithCache } from '@/utils/furigana';
import { Volume2, Bookmark } from 'lucide-react';
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import { JapaneseWord } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import SlideUpModal from '@/components/SlideUpModal';

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
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sentenceToSave, setSentenceToSave] = useState<{ text: string; index: number } | null>(null);
  const [savedSentences, setSavedSentences] = useState<Set<number>>(new Set());
  const { speak: speakKanji, isLoading: isKanjiTTSLoading, isPlaying: isKanjiPlaying } = useKanjiTTS();
  const { speak: speakSentence, state: { isLoading: isSentenceTTSLoading, isPlaying: isSentencePlaying } } = useTTS();
  const { user } = useAuth();

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

  if (!kanji) return null;

  // Strip ruby tags from examples
  const stripRubyTags = (text: string): string => {
    return text
      .replace(/<ruby>/g, '')
      .replace(/<\/ruby>/g, '')
      .replace(/<rt>.*?<\/rt>/g, '')
      .replace(/<rb>/g, '')
      .replace(/<\/rb>/g, '');
  };

  const handleToggleLearned = () => {
    onToggleLearned(kanji.char);
  };

  return (
    <>
      <SlideUpModal
        isOpen={isOpen}
        onClose={onClose}
        title="Kanji Details"
        height="full"
        showHandle={true}
      >
        <div className="p-6">
          {/* Kanji Character with TTS */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="text-8xl font-bold text-foreground mb-4">
                {kanji.char}
              </div>
              {/* TTS Button */}
              <button
                onClick={() => {
                  setPlayingAudioId('kanji');
                  speakKanji(kanji.char, kanji.readings.kun[0] || kanji.readings.on[0] || kanji.char)
                    .finally(() => setPlayingAudioId(null));
                }}
                disabled={isKanjiTTSLoading || playingAudioId === 'kanji'}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                aria-label="Play pronunciation"
              >
                {isKanjiTTSLoading && playingAudioId === 'kanji' ? (
                  <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : playingAudioId === 'kanji' ? (
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    On'yomi (音読み)
                  </h3>
                  <button
                    onClick={() => {
                      const readings = kanji.readings.on.join('、');
                      setPlayingAudioId('onyomi');
                      speakKanji(readings, readings, { provider: 'google' })
                        .finally(() => setPlayingAudioId(null));
                    }}
                    disabled={isKanjiTTSLoading || playingAudioId === 'onyomi'}
                    className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                    aria-label="Play on'yomi readings"
                  >
                    <Volume2 className={`w-4 h-4 ${playingAudioId === 'onyomi' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Kun'yomi (訓読み)
                  </h3>
                  <button
                    onClick={() => {
                      const readings = kanji.readings.kun.join('、');
                      setPlayingAudioId('kunyomi');
                      speakKanji(readings, readings, { provider: 'google' })
                        .finally(() => setPlayingAudioId(null));
                    }}
                    disabled={isKanjiTTSLoading || playingAudioId === 'kunyomi'}
                    className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                    aria-label="Play kun'yomi readings"
                  >
                    <Volume2 className={`w-4 h-4 ${playingAudioId === 'kunyomi' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
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
                    className={`relative inline-flex h-4 sm:h-6 w-14 items-center rounded-full transition-colors px-1 ${
                      showFurigana ? 'bg-primary' : 'bg-muted'
                    }`}
                    aria-label="Toggle furigana"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
                        showFurigana ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>
              <div className="space-y-3">
                {kanji.examples.map((example, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/50 rounded-lg relative group"
                  >
                    <p 
                      className="text-foreground text-lg pr-20"
                      dangerouslySetInnerHTML={{
                        __html: showFurigana && processedExamples[index] 
                          ? processedExamples[index] 
                          : stripRubyTags(example)
                      }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {/* Bookmark Button */}
                      <button
                        onClick={() => {
                          if (!user) {
                            alert('Please sign in to save sentences');
                            return;
                          }
                          setSentenceToSave({ text: stripRubyTags(example), index });
                          setShowSaveModal(true);
                        }}
                        className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Save sentence to lists"
                      >
                        <Bookmark className={`w-4 h-4 transition-colors duration-300 ${savedSentences.has(index) ? 'fill-current text-purple-400' : 'text-muted-foreground'}`} />
                      </button>
                      {/* TTS Button */}
                      <button
                        onClick={() => {
                          const cleanText = stripRubyTags(example);
                          setPlayingAudioId(`example-${index}`);
                          speakSentence(cleanText, { provider: 'elevenlabs', voice: 'female' })
                            .finally(() => setPlayingAudioId(null));
                        }}
                        disabled={isSentenceTTSLoading || playingAudioId === `example-${index}`}
                        className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                        aria-label="Play example sentence"
                      >
                        <Volume2 className={`w-4 h-4 ${playingAudioId === `example-${index}` ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </div>
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
      </SlideUpModal>

      {/* Save Sentence Modal */}
      {showSaveModal && sentenceToSave && (
        <SaveWordModal
          word={{
            id: `sentence_${kanji.char}_${sentenceToSave.index}`,
            kanji: sentenceToSave.text,
            kana: '',
            romaji: '',
            meaning: '',
            english: '',
            type: 'other' as any,
            jlpt: 5,
            tags: ['sentence', 'example'],
            word: sentenceToSave.text,
            reading: '',
            meanings: [],
            jlptLevel: 5,
            frequency: 0,
            kanaReading: ''
          }}
          onClose={() => {
            setShowSaveModal(false);
            setSentenceToSave(null);
          }}
          onSaveComplete={() => {
            if (sentenceToSave) {
              setSavedSentences(prev => new Set(prev).add(sentenceToSave.index));
            }
          }}
          itemType="sentence"
        />
      )}
    </>
  );
}