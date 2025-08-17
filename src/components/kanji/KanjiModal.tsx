'use client';

import { useEffect, useState } from 'react';
import { Kanji } from '@/types';
import { KanjiTTSButton } from '@/components/ui/TTSButton';
import StrokeOrderModal from './StrokeOrderModal';
import SlideUpModal from '@/components/SlideUpModal';
import { useKanjiReviews } from '@/hooks/useKanjiReviews';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [showStudyDropdown, setShowStudyDropdown] = useState(false);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [showLoginModalForSave, setShowLoginModalForSave] = useState(false);
  const { 
    isInReviews, 
    addToReviews, 
    removeFromReviews, 
    loading: reviewsLoading,
    showLoginModal: showLoginModalForReviews,
    setShowLoginModal: setShowLoginModalForReviews
  } = useKanjiReviews();
  const kanjiIsInReviews = isInReviews(kanji.kanji);
  // TTS functionality now handled by KanjiTTSButton component

  return (
    <>
      <SlideUpModal
        isOpen={isOpen}
        onClose={onClose}
        height="90%"
        showHandle={false}
      >
        <div className="p-6 relative rounded-t-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-card-foreground">
            Kanji Details
          </h2>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Large Kanji Display */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="text-8xl font-medium text-card-foreground mb-2">
                {kanji.kanji}
              </div>
              {/* Stroke Order Button */}
              <button
                onClick={() => setShowStrokeOrder(true)}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group shadow-sm"
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
              <span className="px-2 py-1 text-xs rounded border bg-primary/10 text-primary border-primary/20">
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
                      className="flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent-foreground border border-accent/20 rounded-md text-sm japanese-text"
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
              className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-all shadow-sm"
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
              <div className="mt-2 p-3 bg-muted/30 rounded-lg backdrop-blur-sm space-y-2">
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
                          : 'border-primary/60 bg-background'
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
                
                {/* Daily Reviews Option */}
                <button
                  onClick={async () => {
                    if (kanjiIsInReviews) {
                      await removeFromReviews(kanji.kanji);
                    } else {
                      await addToReviews(kanji);
                    }
                  }}
                  disabled={reviewsLoading}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    kanjiIsInReviews
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50'
                  } ${reviewsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      kanjiIsInReviews
                        ? 'bg-primary border-primary'
                        : 'border-primary/60 bg-background'
                    }`}>
                      {kanjiIsInReviews && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        {kanjiIsInReviews ? 'In Daily Reviews' : 'Add to Daily Reviews'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {kanjiIsInReviews 
                          ? 'This kanji is in your review queue' 
                          : 'Practice with spaced repetition'}
                      </div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {kanjiIsInReviews ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    )}
                  </svg>
                </button>
                
                {/* Save to Lists Option */}
                <button
                  onClick={() => {
                    if (!user) {
                      setShowLoginModalForSave(true);
                    } else {
                      onSave();
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-primary/60 bg-background flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>
    </SlideUpModal>

    {/* Stroke Order Modal */}
    <StrokeOrderModal
      isOpen={showStrokeOrder}
      onClose={() => setShowStrokeOrder(false)}
      kanji={kanji.kanji}
      meaning={kanji.meaning}
    />

    {/* Login Modal for Daily Reviews */}
    <LoginPromptModal
      isOpen={showLoginModalForReviews}
      onClose={() => setShowLoginModalForReviews(false)}
      message="Please log in to add kanji to Daily Reviews"
      feature="daily_reviews"
    />

    {/* Login Modal for Save to Lists */}
    <LoginPromptModal
      isOpen={showLoginModalForSave}
      onClose={() => setShowLoginModalForSave(false)}
      message="Please log in to save kanji to your lists"
      feature="save_kanji"
    />
    </>
  );
}
