'use client';

import { useEffect } from 'react';
import { Kanji } from '@/types';
import { TTSManager } from '@/utils/tts';

interface KanjiModalProps {
  kanji: Kanji;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaved?: boolean;
  onRemove?: () => Promise<void>;
}

export default function KanjiModal({
  kanji,
  isOpen,
  onClose,
  onSave
}: KanjiModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };


  // TTS functions
  const handlePlayTTS = async (text: string) => {
    try {
      await TTSManager.speak(text);
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border border-border rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">
            Kanji Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Large Kanji Display */}
          <div className="text-center mb-6">
            <div className="text-8xl font-medium text-card-foreground mb-2">
              {kanji.kanji}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={`px-2 py-1 text-xs rounded border ${
                kanji.jlpt === 'N5' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                kanji.jlpt === 'N4' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                kanji.jlpt === 'N3' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                kanji.jlpt === 'N2' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {kanji.jlpt}
              </span>
            </div>
          </div>

          {/* Meaning */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Meaning</h3>
            <p className="text-lg text-card-foreground">{kanji.meaning}</p>
          </div>

          {/* Readings */}
          <div className="space-y-4 mb-6">
            {/* Onyomi */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                音読み (On'yomi) - Chinese Reading
              </h3>
              <div className="flex flex-wrap gap-2">
                {kanji.onyomi.length > 0 ? (
                  kanji.onyomi.map((reading, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm japanese-text"
                    >
                      <span>{reading}</span>
                      <button
                        onClick={() => handlePlayTTS(reading)}
                        className="p-1 hover:bg-primary/20 rounded transition-colors"
                        title={`Play pronunciation: ${reading}`}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No on'yomi readings</span>
                )}
              </div>
            </div>

            {/* Kunyomi */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                訓読み (Kun'yomi) - Japanese Reading
              </h3>
              <div className="flex flex-wrap gap-2">
                {kanji.kunyomi.length > 0 ? (
                  kanji.kunyomi.map((reading, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 border border-purple-500/20 rounded-md text-sm japanese-text"
                    >
                      <span>{reading}</span>
                      <button
                        onClick={() => handlePlayTTS(reading)}
                        className="p-1 hover:bg-purple-500/20 rounded transition-colors"
                        title={`Play pronunciation: ${reading}`}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No kun'yomi readings</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onSave}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Save to Lists
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-muted/50 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            💡 Tip: Use the search bar to find kanji by character, meaning, or reading
          </div>
        </div>
      </div>
    </div>
  );
}
