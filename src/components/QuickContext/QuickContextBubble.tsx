'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Japanese regex patterns
const kanjiRegex = /[\u4E00-\u9FAF]/g;
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import AIExplanationModal from '@/components/AIExplanation/AIExplanationModal';
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import { useAccess } from '@/hooks/useAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTTS } from '@/hooks/useTTS';
import { QuickContextSelection } from './QuickContextProvider';

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
  textType?: 'kanji' | 'word' | 'phrase' | 'sentence';
  history?: QuickContextSelection[];
}

export default function QuickContextBubble({
  selectedText,
  position,
  onClose,
  surroundingContext,
  isKanji = false,
  textType = 'word',
  history = []
}: QuickContextBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [wordData, setWordData] = useState<JapaneseWord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { checkAndTrack, getRemainingUsage } = useAccess();
  const { track } = useAnalytics();
  const { speak: speakTTS, stop: stopTTS, state: ttsState } = useTTS();
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Get remaining uses on mount
    getRemainingUsage('quick_context').then(uses => {
      setRemainingUses(uses);
    });
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
    
    // Update remaining uses
    const newUses = await getRemainingUsage('quick_context');
    setRemainingUses(newUses);
  }, [checkAndTrack, track, selectedText, wordData, textType, getRemainingUsage]);

  const handleLookup = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_lookup', { text: selectedText });
    
    // Navigate to our vocabulary page with search term
    const searchUrl = `/vocabulary?search=${encodeURIComponent(selectedText)}`;
    window.location.href = searchUrl;
  }, [checkAndTrack, track, selectedText]);

  const handleListen = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_tts', { text: selectedText });
    
    // Use our app's TTS system with caching
    await speakTTS(selectedText, {
      voice: 'female',
      context: 'quick_context',
      priority: 'high'
    });
    
    // Update remaining uses
    const newUses = await getRemainingUsage('quick_context');
    setRemainingUses(newUses);
  }, [checkAndTrack, track, selectedText, speakTTS, textType, getRemainingUsage]);

  const handleAIExplain = useCallback(async () => {
    const canUse = await checkAndTrack('quick_context');
    if (!canUse) return;

    track('quick_context_ai', { text: selectedText, type: textType });
    setShowAIModal(true);
  }, [checkAndTrack, track, selectedText, textType]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(selectedText);
    setCopiedText(selectedText);
    setTimeout(() => setCopiedText(''), 2000);
    track('quick_context_copy', { text: selectedText, type: textType });
  }, [selectedText, track, textType]);

  // Show history
  const handleShowHistory = useCallback(() => {
    setShowHistory(!showHistory);
    track('quick_context_history', { action: showHistory ? 'close' : 'open' });
  }, [showHistory, track]);

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
          data-quickcontext-bubble="true"
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ 
            duration: 0.2,
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
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
              <motion.img 
                src="/doshi.png" 
                alt="Dōshi" 
                className="w-8 h-8"
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
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
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-primary">QuickContext</span>
                    {remainingUses !== null && remainingUses !== -1 && (
                      <span className="text-xs text-muted-foreground">
                        {remainingUses} uses left today
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleShowHistory}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="History"
                    title="View history"
                  >
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Collapse"
                  >
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Selected text display with type badge */}
              <div className="mb-3 p-2 bg-muted rounded-lg relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-ja font-medium text-foreground">
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
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      textType === 'kanji' ? 'bg-primary/20 text-primary' :
                      textType === 'word' ? 'bg-accent/20 text-accent' :
                      textType === 'phrase' ? 'bg-secondary/20 text-secondary' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {textType}
                    </span>
                    {copiedText === selectedText && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </div>
                </div>
              </div>

              {/* History panel */}
              {showHistory && history.length > 0 && (
                <div className="mb-3 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Recent selections</p>
                  <div className="space-y-1">
                    {history.slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedText(item.text);
                          setShowHistory(false);
                        }}
                        className="w-full text-left p-1 hover:bg-muted rounded text-xs truncate"
                      >
                        <span className="font-ja">{item.text}</span>
                        <span className="text-muted-foreground ml-1">({item.type})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons grid - now 3 columns */}
              <div className="grid grid-cols-3 gap-2">
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
                  disabled={ttsState.isLoading || ttsState.isPlaying}
                >
                  {ttsState.isPlaying ? (
                    <div className="w-5 h-5 text-secondary">
                      <div className="animate-pulse">🔊</div>
                    </div>
                  ) : (
                    <svg className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                  <span className="text-xs text-secondary font-medium">
                    {ttsState.isPlaying ? 'Playing' : 'Listen'}
                  </span>
                </button>

                <button
                  onClick={handleAIExplain}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors group"
                  aria-label="AI explanation"
                >
                  <svg className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-destructive font-medium">AI</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors group"
                  aria-label="Copy to clipboard"
                >
                  <svg className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-foreground font-medium">
                    {copiedText === selectedText ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="mt-3 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close • 
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Q</kbd> for quick save
                </p>
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