'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { TTSManager } from '@/utils/tts';
import { useErrorNotification, ERROR_MESSAGES } from '@/hooks/useErrorNotification';
import type { VocabularyItem } from '../types';

interface VocabularyCardModalProps {
  word: VocabularyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStartStudy?: (word: VocabularyItem) => void;
}

export function VocabularyCardModal({ word, isOpen, onClose, onStartStudy }: VocabularyCardModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { settings } = useSettings();
  const { showError, ErrorNotificationDialog } = useErrorNotification();

  if (!word) return null;

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    
    try {
      setIsPlaying(true);
      const textToSpeak = word.reading || word.japanese;
      await TTSManager.speak(textToSpeak, {
        voice: 'female',
        context: 'vocabulary'
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      showError(ERROR_MESSAGES.AUDIO_FAILED.title, ERROR_MESSAGES.AUDIO_FAILED.message);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStartStudy = () => {
    if (onStartStudy) {
      onStartStudy(word);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-[50%] -translate-y-[50%] z-50 max-w-lg mx-auto"
          >
            <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
              {/* Header */}
              <div className="relative p-6 pb-4">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* JLPT Badge */}
                {word.jlptLevel && (
                  <span className="inline-block px-3 py-1.5 bg-blue-500 dark:bg-blue-600 text-white text-sm font-bold rounded-full mb-4 shadow-sm">
                    {word.jlptLevel}
                  </span>
                )}

                {/* Japanese Word */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-foreground mb-2">
                    {settings.showFurigana && word.reading !== word.japanese ? (
                      <ruby>
                        {word.japanese}
                        <rt className="text-lg text-muted-foreground">{word.reading}</rt>
                      </ruby>
                    ) : (
                      word.japanese
                    )}
                  </div>
                  
                  {!settings.showFurigana && word.reading !== word.japanese && (
                    <div className="text-xl text-muted-foreground mb-2">{word.reading}</div>
                  )}

                  {/* Part of Speech */}
                  {word.partOfSpeech.length > 0 && (
                    <div className="flex gap-2 justify-center mb-4">
                      {word.partOfSpeech.map((pos, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                        >
                          {pos}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meaning */}
                  <div className="text-2xl font-semibold text-foreground mb-4">
                    {word.meaning}
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
              </div>

              {/* Content */}
              <div className="px-6 pb-6 space-y-4">
                {/* Example Sentences */}
                {word.examples.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Example{word.examples.length > 1 ? 's' : ''}:
                    </h4>
                    {word.examples.map((ex, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="text-foreground font-medium">
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

                {/* Notes */}
                {word.notes && (
                  <div className="text-sm text-muted-foreground bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-700/30 rounded-lg p-3">
                    <strong>Note:</strong> {word.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                  {onStartStudy && (
                    <button
                      onClick={handleStartStudy}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Practice This
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <ErrorNotificationDialog />
        </>
      )}
    </AnimatePresence>
  );
}