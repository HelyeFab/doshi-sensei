'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import AIExplanationModal from '@/components/AIExplanation/AIExplanationModal';
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import { useAccess } from '@/hooks/useAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { speechSynthesis } from '@/utils/speechSynthesis';

interface Position {
  x: number;
  y: number;
}

interface QuickContextBubbleProps {
  selectedText: string;
  position: Position;
  onClose: () => void;
  surroundingContext?: string;
  isKanji?: boolean;
}

export default function QuickContextBubble({
  selectedText,
  position,
  onClose,
  surroundingContext,
  isKanji = false
}: QuickContextBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [wordData, setWordData] = useState<JapaneseWord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { checkAndTrack } = useAccess();
  const { track } = useAnalytics();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Fetch word data when text is selected
  useEffect(() => {
    if (selectedText && !isKanji) {
      fetchWordData();
    }
  }, [selectedText]);

  const fetchWordData = async () => {
    setIsLoading(true);
    try {
      const results = await searchWords(selectedText);
      if (results && results.length > 0) {
        setWordData(results[0]);
      }
    } catch (error) {
      console.error('Error fetching word data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_save', { text: selectedText });
    
    // Create a word object if we don't have one
    const wordToSave = wordData || {
      id: `quick_${Date.now()}`,
      kanji: isKanji ? selectedText : '',
      kana: !isKanji ? selectedText : '',
      romaji: '',
      meaning: '',
      type: 'other' as const,
      jlpt: 'N5' as const,
      tags: []
    };

    setWordData(wordToSave);
    setShowSaveModal(true);
  }, [checkAndTrack, track, selectedText, wordData, isKanji]);

  const handleLookup = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_lookup', { text: selectedText });
    
    // Open dictionary in new tab
    const searchUrl = `https://jisho.org/search/${encodeURIComponent(selectedText)}`;
    window.open(searchUrl, '_blank');
  }, [checkAndTrack, track, selectedText]);

  const handleListen = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_tts', { text: selectedText });
    
    // Use TTS
    await speechSynthesis.speak(selectedText, 'ja-JP');
  }, [checkAndTrack, track, selectedText]);

  const handleAIExplain = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_ai', { text: selectedText });
    setShowAIModal(true);
  }, [checkAndTrack, track, selectedText]);

  // Calculate bubble position to avoid screen edges
  const getBubblePosition = () => {
    const padding = 10;
    const bubbleWidth = isExpanded ? 280 : 48;
    const bubbleHeight = isExpanded ? 200 : 48;
    
    let x = position.x;
    let y = position.y - bubbleHeight - 10; // Position above selection

    // Adjust if too close to edges
    if (x + bubbleWidth > window.innerWidth - padding) {
      x = window.innerWidth - bubbleWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }
    if (y < padding) {
      y = position.y + 30; // Position below if no room above
    }

    return { x, y };
  };

  const bubblePosition = getBubblePosition();

  if (!mounted) return null;

  const content = (
    <>
      <AnimatePresence>
        <motion.div
          ref={bubbleRef}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            left: bubblePosition.x,
            top: bubblePosition.y,
            zIndex: 9999
          }}
          className={`
            ${isExpanded ? 'w-72' : 'w-12'} 
            bg-card border-2 border-primary rounded-2xl shadow-2xl
            transition-all duration-300 ease-in-out
            ${!isExpanded ? 'hover:scale-110' : ''}
          `}
        >
          {!isExpanded ? (
            // Compact bubble - just the Doshi mascot
            <button
              onClick={() => setIsExpanded(true)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors"
              aria-label="Expand QuickContext menu"
            >
              <img 
                src="/doshi.png" 
                alt="Dōshi" 
                className="w-8 h-8 animate-bounce"
              />
            </button>
          ) : (
            // Expanded bubble with actions
            <div className="p-4">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img 
                    src="/doshi.png" 
                    alt="Dōshi" 
                    className="w-6 h-6"
                  />
                  <span className="text-sm font-bold text-primary">QuickContext</span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  aria-label="Collapse"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Selected text display */}
              <div className="mb-3 p-2 bg-muted rounded-lg">
                <p className="text-sm font-ja font-medium text-foreground truncate">
                  {selectedText}
                </p>
                {isLoading && (
                  <p className="text-xs text-muted-foreground mt-1">Loading...</p>
                )}
                {wordData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {wordData.meaning}
                  </p>
                )}
              </div>

              {/* Action buttons grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSave}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group"
                  aria-label="Save to lists"
                >
                  <svg className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="text-xs text-primary font-medium">Save</span>
                </button>

                <button
                  onClick={handleLookup}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors group"
                  aria-label="Look up in dictionary"
                >
                  <svg className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-xs text-accent font-medium">Lookup</span>
                </button>

                <button
                  onClick={handleListen}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors group"
                  aria-label="Listen to pronunciation"
                >
                  <svg className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span className="text-xs text-secondary font-medium">Listen</span>
                </button>

                <button
                  onClick={handleAIExplain}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors group"
                  aria-label="AI explanation"
                >
                  <img 
                    src="/flat-icons/ui/robot.svg"
                    alt="AI"
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs text-destructive font-medium">AI</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {showSaveModal && wordData && (
        <SaveWordModal
          word={wordData}
          onClose={() => setShowSaveModal(false)}
          itemType={isKanji ? 'kanji' : 'word'}
        />
      )}

      {showAIModal && (
        <AIExplanationModal
          text={selectedText}
          contextType={selectedText.length > 20 ? 'sentence' : 'word'}
          surroundingContext={surroundingContext}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </>
  );

  return createPortal(content, document.body);
}