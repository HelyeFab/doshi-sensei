'use client';

import { useState, useEffect } from 'react';
import { TranscriptLine } from '../page';
import { GrammarHighlightedText, GrammarLegend } from '@/components/reading/GrammarHighlightedText';
import { generateFuriganaWithCache } from '@/utils/furigana';
import { searchWords } from '@/utils/api';
import { JapaneseWord } from '@/types';
import WordLookupModal from '@/components/vocabulary/WordLookupModal';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';

interface TranscriptReaderProps {
  transcript: TranscriptLine[];
  currentLineIndex: number;
  onLineClick: (index: number) => void;
  showFurigana: boolean;
  showGrammar: boolean;
  onWordClick?: (word: string) => void;
}

export default function TranscriptReader({
  transcript,
  currentLineIndex,
  onLineClick,
  showFurigana,
  showGrammar,
  onWordClick
}: TranscriptReaderProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const [processedTranscript, setProcessedTranscript] = useState<Array<{
    original: TranscriptLine;
    withFurigana: string;
  }>>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDefinitions, setWordDefinitions] = useState<JapaneseWord[]>([]);
  const [showWordModal, setShowWordModal] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);

  // Process transcript with furigana
  useEffect(() => {
    const processTranscript = async () => {
      if (!showFurigana || transcript.length === 0) {
        setProcessedTranscript(transcript.map(line => ({ original: line, withFurigana: line.text })));
        return;
      }

      const processed = await Promise.all(
        transcript.map(async (line) => {
          try {
            const withFurigana = await generateFuriganaWithCache(line.text);
            return { original: line, withFurigana };
          } catch (error) {
            console.error('Failed to generate furigana:', error);
            return { original: line, withFurigana: line.text };
          }
        })
      );

      setProcessedTranscript(processed);
    };

    processTranscript();
  }, [transcript, showFurigana]);

  const handleWordClick = async (word: string) => {
    // Clean the word of any HTML tags
    const cleanWord = word.replace(/<[^>]*>/g, '');
    if (!cleanWord || cleanWord.length === 0) return;

    setSelectedWord(cleanWord);
    setLoadingWord(true);
    setShowWordModal(true);

    try {
      const results = await searchWords(cleanWord);
      setWordDefinitions(results);
    } catch (error) {
      console.error('Failed to look up word:', error);
      setWordDefinitions([]);
    } finally {
      setLoadingWord(false);
    }

    if (onWordClick) {
      onWordClick(cleanWord);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Grammar Legend */}
      {showGrammar && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-4">
          <GrammarLegend />
        </div>
      )}

      {/* Transcript Lines */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="divide-y divide-border">
          {processedTranscript.map((item, index) => (
            <div
              key={item.original.id}
              onClick={() => onLineClick(index)}
              className={`p-4 cursor-pointer transition-all ${
                index === currentLineIndex
                  ? 'bg-primary/10 border-l-4 border-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Timestamp */}
                <span className="text-sm text-muted-foreground font-mono flex-shrink-0">
                  {formatTimestamp(item.original.startTime)}
                </span>

                {/* Text Content */}
                <div className="flex-1">
                  {showGrammar ? (
                    <GrammarHighlightedText
                      text={showFurigana ? item.withFurigana : item.original.text}
                      onWordClick={handleWordClick}
                    />
                  ) : (
                    <p 
                      className="text-foreground japanese-text text-lg leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: showFurigana ? item.withFurigana : item.original.text 
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const target = e.target as HTMLElement;
                        if (target.tagName !== 'RT' && target.tagName !== 'RP') {
                          const selection = window.getSelection();
                          const word = selection?.toString().trim();
                          if (word) {
                            handleWordClick(word);
                          }
                        }
                      }}
                    />
                  )}
                </div>

                {/* Play indicator */}
                {index === currentLineIndex && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Word Lookup Modal */}
      {showWordModal && selectedWord && (
        <WordLookupModal
          word={selectedWord}
          definitions={wordDefinitions}
          loading={loadingWord}
          onClose={() => {
            setShowWordModal(false);
            setSelectedWord(null);
            setWordDefinitions([]);
          }}
        />
      )}
    </div>
  );
}