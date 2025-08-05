'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { TTSManager } from '@/utils/tts';
import { useErrorNotification, ERROR_MESSAGES } from '@/hooks/useErrorNotification';
// Import generalized types
import type { LearningItem, VocabularyItem, KanjiItem, CharacterItem } from '@/types/learning';

interface InteractiveCardProps {
  // Use the generalized LearningItem type
  item: LearningItem;
  onComplete: (quality: number) => void;
  // Mode might need to be more generic or inferred from itemType
  mode: 'learn' | 'review' | 'test';
}

export function InteractiveCard({ item, onComplete, mode }: InteractiveCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { settings } = useSettings();
  const { showError, ErrorNotificationDialog } = useErrorNotification();

  // Reset card state when item changes (moving to next card)
  useEffect(() => {
    setRevealed(false);
    setShowHint(false);
  }, [item.id]); // Depend on item.id to reset when a new item is loaded

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleQualitySelect = (quality: number) => {
    onComplete(quality);
    // State will reset when the item prop changes
  };

  const handlePlayAudio = async () => {
    if (isPlaying) return;

    try {
      setIsPlaying(true);

      // Determine text to speak based on item type and settings
      let textToSpeak = '';
      if (item.itemType === 'vocabulary' || item.itemType === 'kanji') {
        textToSpeak = item.reading || item.text; // Use reading (kana/onyomi/kunyomi) or the text itself
      } else if (item.itemType === 'hiragana' || item.itemType === 'katakana') {
        textToSpeak = item.reading || item.text; // Use romaji or the character itself
      } else {
        textToSpeak = item.text; // Fallback to primary text
      }

      // TTSManager automatically uses the best source in this order:
      // 1. Local files for kana characters
      // 2. Local files for JLPT kanji
      // 3. Google TTS for single words
      // 4. ElevenLabs for sentences (if Google fails)
      await TTSManager.speak(textToSpeak, {
        voice: 'female',
        context: 'learning_item' // More generic context
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      showError(ERROR_MESSAGES.AUDIO_FAILED.title, ERROR_MESSAGES.AUDIO_FAILED.message);
    } finally {
      setIsPlaying(false);
    }
  };

  // Helper to render quality buttons
  const QualityButton = ({ quality, label, color }: { quality: number; label: string; color: string }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => handleQualitySelect(quality)}
      className={`px-4 py-2 rounded-lg font-medium text-white ${color} hover:opacity-90 transition-opacity`}
    >
      {label}
    </motion.button>
  );

  // Memoize the display of different item types to avoid re-renders
  const renderItemContent = useMemo(() => {
    // Determine if furigana should be shown
    const showFurigana = settings.showFurigana && item.reading && item.reading !== item.text;

    return (
      <>
        {/* JLPT Level Badge - Top Left (only for applicable item types) */}
        {item.itemType === 'vocabulary' && 'jlptLevel' in item && item.jlptLevel && (
          <div className="absolute top-4 left-4">
            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {item.jlptLevel}
            </span>
          </div>
        )}

        <div className="text-center space-y-6">
          {/* Primary Display: Japanese Word/Kanji/Character */}
          <div className="space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-foreground">
              {showFurigana ? (
                <ruby>
                  {item.text}
                  <rt className="text-lg text-muted-foreground">{item.reading}</rt>
                </ruby>
              ) : (
                item.text
              )}
            </div>

            {/* Show reading separately if not showing furigana */}
            {!showFurigana && item.reading && (
              <div className="text-xl text-muted-foreground">{item.reading}</div>
            )}
          </div>

          {/* Part of Speech (conditionally shown) */}
          {mode === 'learn' && item.itemType === 'vocabulary' && 'partOfSpeech' in item && Array.isArray(item.partOfSpeech) && item.partOfSpeech.length > 0 && (
            <div className="flex gap-2 justify-center">
              {item.partOfSpeech.map((pos, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                >
                  {pos}
                </span>
              ))}
            </div>
          )}

          {/* Hint Button (conditionally shown) */}
          {mode === 'learn' && !showHint && item.meaning && (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Show hint
            </button>
          )}

          {/* Hint Display */}
          {showHint && item.meaning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-muted-foreground italic"
            >
              Hint: {item.meaning.substring(0, Math.min(3, item.meaning.length))}...
            </motion.div>
          )}

          {/* Reveal Button */}
          <button
            onClick={handleReveal}
            className="px-8 py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-medium rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 md:px-12 dark:from-primary/90 dark:to-primary-dark/90 dark:ring-1 dark:ring-primary/50"
          >
            Show Answer
          </button>
        </div>
      </>
    );
  }, [item, revealed, showHint, mode, settings, isPlaying, handlePlayAudio]); // Dependencies for memoization

  const renderAnswerContent = useMemo(() => {
    return (
      <div className="space-y-6">
        {/* Meaning */}
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground mb-2">
            {item.meaning}
          </div>

          {/* Audio Button */}
          <button
            onClick={handlePlayAudio}
            disabled={isPlaying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? "Playing..." : "Play pronunciation"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            {isPlaying ? 'Playing...' : 'Play Audio'}
          </button>
        </div>

        {/* Example Sentences (conditionally shown) */}
        {'examples' in item && Array.isArray(item.examples) && item.examples.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground text-center">
              Example{item.examples.length > 1 ? 's' : ''}:
            </h4>
            {item.examples.map((ex, idx) => (
              <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="text-foreground font-medium">
                  {/* Furigana for examples */}
                  {settings.showFurigana && ex.reading ? (
                    <ruby>
                      {ex.japanese}
                      <rt className="text-xs text-muted-foreground">{ex.reading}</rt>
                    </ruby>
                  ) : (
                    ex.japanese
                  )}
                </div>
                {!settings.showFurigana && ex.reading && (
                  <div className="text-sm text-muted-foreground">{ex.reading}</div>
                )}
                <div className="text-foreground/90">{ex.english}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notes (conditionally shown) */}
        {item.notes && (
          <div className="text-sm text-muted-foreground bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-700/30 rounded-lg p-3">
            <strong>Note:</strong> {item.notes}
          </div>
        )}

        {/* Quality Selection */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center mb-4">
            How well did you know this?
          </p>
          <div className="flex justify-center gap-3">
            <QualityButton quality={1} label="Again" color="bg-red-500" />
            <QualityButton quality={3} label="Good" color="bg-yellow-500" />
            <QualityButton quality={5} label="Easy" color="bg-green-500" />
          </div>
        </div>
      </div>
    );
  }, [item, revealed, isPlaying, handlePlayAudio, handleQualitySelect]); // Dependencies for memoization

  return (
    <motion.div
      className="relative w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-card rounded-2xl shadow-lg overflow-hidden relative border border-border/50 dark:border-border dark:bg-card/95">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              className="p-6 md:p-8"
            >
              {renderItemContent}
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              className="p-6 md:p-8"
            >
              {renderAnswerContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card decoration */}
      <div className="absolute -z-10 inset-0 bg-gradient-to-r from-primary/20 to-primary-dark/20 dark:from-primary/30 dark:to-primary-dark/30 blur-2xl" />

      {/* Error Notification Dialog */}
      <ErrorNotificationDialog />
    </motion.div>
  );
}