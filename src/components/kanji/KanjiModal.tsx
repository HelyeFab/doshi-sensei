'use client';

import { useEffect, useState } from 'react';
import { Kanji } from '@/types';
import { KanjiTTSButton } from '@/components/ui/TTSButton';
import StrokeOrderModal from './StrokeOrderModal';

interface KanjiModalProps {
  kanji: Kanji;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaved?: boolean;
  onRemove?: () => Promise<void>;
  isSelectedForStudy?: boolean;
  onToggleStudy?: () => void;
}

export default function KanjiModal({
  kanji,
  isOpen,
  onClose,
  onSave,
  isSelectedForStudy = false,
  onToggleStudy
}: KanjiModalProps) {
  const [showStudyDropdown, setShowStudyDropdown] = useState(false);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
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


  // TTS functionality now handled by KanjiTTSButton component

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
            <div className="relative inline-block">
              <div className="text-8xl font-medium text-card-foreground mb-2">
                {kanji.kanji}
              </div>
              {/* Stroke Order Button */}
              <button
                onClick={() => setShowStrokeOrder(true)}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                title="View stroke order"
              >
                <svg className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                  />
                </svg>
              </button>
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
                      <KanjiTTSButton 
                        kanji={kanji.kanji}
                        reading={reading}
                        readingType="on"
                        size="sm"
                        variant="minimal"
                      />
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
                      <KanjiTTSButton 
                        kanji={kanji.kanji}
                        reading={reading}
                        readingType="kun"
                        size="sm"
                        variant="minimal"
                      />
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No kun'yomi readings</span>
                )}
              </div>
            </div>
          </div>

          {/* Study & Save Options Dropdown */}
          <div className="mb-6">
            <button
              onClick={() => setShowStudyDropdown(!showStudyDropdown)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-all"
            >
              <span className="text-sm font-medium text-muted-foreground">Options</span>
              <svg 
                className={`w-4 h-4 text-muted-foreground transition-transform ${showStudyDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Content */}
            {showStudyDropdown && (
              <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                {/* Study Session Option */}
                {onToggleStudy && (
                  <button
                    onClick={onToggleStudy}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isSelectedForStudy
                        ? 'bg-accent/10 text-accent-foreground'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelectedForStudy
                          ? 'bg-accent border-accent'
                          : 'border-muted-foreground'
                      }`}>
                        {isSelectedForStudy && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">Add to Study Session</div>
                        <div className="text-xs text-muted-foreground">
                          {isSelectedForStudy ? 'Selected for study' : 'Click to add to study session'}
                        </div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                      />
                    </svg>
                  </button>
                )}
                
                {/* Save to Lists Option */}
                <button
                  onClick={onSave}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground flex items-center justify-center">
                      <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Save to Lists</div>
                      <div className="text-xs text-muted-foreground">
                        Save this kanji to your custom lists
                      </div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-muted/50 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            💡 Tip: Use the search bar to find kanji by character, meaning, or reading
          </div>
        </div>
      </div>

      {/* Stroke Order Modal */}
      <StrokeOrderModal
        isOpen={showStrokeOrder}
        onClose={() => setShowStrokeOrder(false)}
        kanji={kanji.kanji}
        meaning={kanji.meaning}
      />
    </div>
  );
}
