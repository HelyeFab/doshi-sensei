'use client';

import { useState, useEffect } from 'react';
import { Volume2, Bookmark, Eye, EyeOff } from 'lucide-react';
import { AnkiSRSData, ReviewRating, AnkiSRSImproved } from '@/utils/ankiSRSImproved';
import { useSanitizedHTML } from '@/utils/htmlSanitizer';
import { AnkiMediaStore } from '@/utils/ankiMediaStore';

interface FlashcardDisplayProps {
  card: any;
  showAnswer: boolean;
  cardSettings: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    showFurigana: boolean;
    showCardType: boolean;
  };
  srsData?: AnkiSRSData;
  onShowAnswer: () => void;
  onRate: (rating: ReviewRating) => void;
  onSkip: () => void;
  onSave: () => void;
  onPlayAudio: (card: any, side: 'front' | 'back') => void;
}

const fontSizeMap = {
  'small': 'text-2xl',
  'medium': 'text-4xl',
  'large': 'text-5xl',
  'extra-large': 'text-6xl'
};

const secondaryFontSizeMap = {
  'small': 'text-lg',
  'medium': 'text-xl',
  'large': 'text-2xl',
  'extra-large': 'text-3xl'
};

export function FlashcardDisplay({
  card,
  showAnswer,
  cardSettings,
  srsData,
  onShowAnswer,
  onRate,
  onSkip,
  onSave,
  onPlayAudio
}: FlashcardDisplayProps) {
  const [showFields, setShowFields] = useState(false);
  const [processedContent, setProcessedContent] = useState<{ front: string; back: string } | null>(null);
  const isAnkiCard = card.itemType === 'anki_card' && card.ankiData;
  
  // Get next review times
  const srsAlgorithm = new AnkiSRSImproved();
  const nextReviewTimes = srsData ? srsAlgorithm.getNextReviewTimes(srsData) : null;
  
  // Process media references when card changes
  useEffect(() => {
    const processMediaReferences = async () => {
      if (!isAnkiCard || !card.ankiData.media || card.ankiData.media.length === 0) {
        setProcessedContent(null);
        return;
      }
      
      const mediaStore = AnkiMediaStore.getInstance();
      let front = card.ankiData.front;
      let back = card.ankiData.back;
      
      // Process each media reference
      for (const mediaRef of card.ankiData.media) {
        // Check if this is already a blob URL (from current session)
        if (mediaRef.startsWith('blob:')) {
          continue;
        }
        
        // Try to get the media from IndexedDB
        const mediaUrl = await mediaStore.getMediaUrl(mediaRef);
        if (mediaUrl) {
          // Replace all occurrences of this media reference
          const escapedRef = mediaRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Replace in audio tags
          front = front.replace(new RegExp(`src="${escapedRef}"`, 'g'), `src="${mediaUrl}"`);
          back = back.replace(new RegExp(`src="${escapedRef}"`, 'g'), `src="${mediaUrl}"`);
          
          // Replace [sound:] references if any remain
          front = front.replace(new RegExp(`\\[sound:${escapedRef}\\]`, 'g'), 
            `<audio controls src="${mediaUrl}" class="anki-audio" />`);
          back = back.replace(new RegExp(`\\[sound:${escapedRef}\\]`, 'g'), 
            `<audio controls src="${mediaUrl}" class="anki-audio" />`);
        }
      }
      
      setProcessedContent({ front, back });
    };
    
    processMediaReferences();
    
    // Cleanup blob URLs when component unmounts or card changes
    return () => {
      // Note: We don't revoke URLs here as they might be needed elsewhere
      // The AnkiMediaStore manages URL lifecycle
    };
  }, [card, isAnkiCard]);
  
  // Get card type badge
  const getCardTypeBadge = () => {
    if (!cardSettings.showCardType || !srsData) return null;
    
    const badges = {
      'new': { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'New' },
      'learning': { bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Learning' },
      'review': { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Review' },
      'relearning': { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Relearning' }
    };
    
    const badge = badges[srsData.status];
    if (!badge) return null;
    
    return (
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </div>
    );
  };
  
  // Get display content based on card type
  const getDisplayContent = (side: 'front' | 'back') => {
    if (isAnkiCard) {
      // Use processed content if available (with media URLs), otherwise use original
      const content = processedContent 
        ? (side === 'front' ? processedContent.front : processedContent.back)
        : (side === 'front' ? card.ankiData.front : card.ankiData.back);
      
      // For rich Anki cards, check if we have fields
      if (card.ankiData.fields && card.ankiData.fields.length > 0) {
        return {
          type: 'rich',
          html: content,
          fields: card.ankiData.fields
        };
      }
      
      // Simple HTML content
      return {
        type: 'html',
        content
      };
    }
    
    // Regular vocabulary card
    const isJapanese = side === 'front' 
      ? (card.kanji || card.kana) 
      : card.meaning;
      
    return {
      type: 'simple',
      primary: side === 'front' ? (card.kanji || card.kana) : card.meaning,
      secondary: side === 'front' ? (card.kanji ? card.kana : '') : '',
      isJapanese: side === 'front'
    };
  };

  const frontContent = getDisplayContent('front');
  const backContent = getDisplayContent('back');

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Card Container */}
      <div className="bg-card border-2 border-border rounded-xl shadow-lg overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            {getCardTypeBadge()}
            {srsData && (
              <div className="text-xs text-muted-foreground">
                Interval: {srsData.interval}d | Ease: {(srsData.ease * 100).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlayAudio(card, showAnswer ? 'back' : 'front')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Play audio"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={onSave}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Save to list"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center">
          {!showAnswer ? (
            // Front of card
            <div className="text-center w-full">
              {frontContent.type === 'simple' ? (
                <>
                  <div className={`${fontSizeMap[cardSettings.fontSize]} font-medium mb-4 ${
                    frontContent.isJapanese ? 'japanese-text' : ''
                  }`}>
                    {frontContent.primary}
                  </div>
                  {frontContent.secondary && (
                    <div className={`${secondaryFontSizeMap[cardSettings.fontSize]} text-muted-foreground japanese-text`}>
                      {frontContent.secondary}
                    </div>
                  )}
                </>
              ) : frontContent.type === 'html' ? (
                <div 
                  className={`${fontSizeMap[cardSettings.fontSize]} anki-content`}
                  dangerouslySetInnerHTML={useSanitizedHTML(frontContent.content)}
                />
              ) : (
                // Rich Anki content
                <div className="space-y-4">
                  <div 
                    className={`${fontSizeMap[cardSettings.fontSize]} anki-content`}
                    dangerouslySetInnerHTML={useSanitizedHTML(frontContent.html)}
                  />
                  {showFields && frontContent.fields && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left">
                      <h4 className="font-semibold text-sm mb-2">All Fields:</h4>
                      {frontContent.fields.map((field: string, idx: number) => (
                        <div key={idx} className="text-sm mb-1">
                          <span className="text-muted-foreground">Field {idx + 1}:</span> {field}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Back of card (with answer)
            <div className="text-center w-full space-y-6">
              {/* Front content (smaller) */}
              <div className="opacity-70">
                {frontContent.type === 'simple' ? (
                  <>
                    <div className={`${secondaryFontSizeMap[cardSettings.fontSize]} font-medium ${
                      frontContent.isJapanese ? 'japanese-text' : ''
                    }`}>
                      {frontContent.primary}
                    </div>
                    {frontContent.secondary && (
                      <div className="text-lg text-muted-foreground japanese-text">
                        {frontContent.secondary}
                      </div>
                    )}
                  </>
                ) : (
                  <div 
                    className={`${secondaryFontSizeMap[cardSettings.fontSize]} anki-content`}
                    dangerouslySetInnerHTML={useSanitizedHTML(frontContent.type === 'html' ? frontContent.content : frontContent.html)}
                  />
                )}
              </div>
              
              {/* Divider */}
              <div className="w-32 h-px bg-border mx-auto"></div>
              
              {/* Back content */}
              {backContent.type === 'simple' ? (
                <>
                  <div className={`${fontSizeMap[cardSettings.fontSize]} font-medium ${
                    !backContent.isJapanese ? '' : 'japanese-text'
                  }`}>
                    {backContent.primary}
                  </div>
                </>
              ) : backContent.type === 'html' ? (
                <div 
                  className={`${fontSizeMap[cardSettings.fontSize]} anki-content`}
                  dangerouslySetInnerHTML={useSanitizedHTML(backContent.content)}
                />
              ) : (
                // Rich Anki content
                <div className="space-y-4">
                  <div 
                    className={`${fontSizeMap[cardSettings.fontSize]} anki-content`}
                    dangerouslySetInnerHTML={useSanitizedHTML(backContent.html)}
                  />
                  {showFields && backContent.fields && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left">
                      <h4 className="font-semibold text-sm mb-2">All Fields:</h4>
                      {backContent.fields.map((field: string, idx: number) => (
                        <div key={idx} className="text-sm mb-1">
                          <span className="text-muted-foreground">Field {idx + 1}:</span> {field}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Additional info */}
              {card.type && (
                <div className="text-sm text-muted-foreground">
                  Type: {card.type}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Rich content toggle for Anki cards */}
        {isAnkiCard && card.ankiData.fields && card.ankiData.fields.length > 0 && (
          <div className="px-8 pb-4">
            <button
              onClick={() => setShowFields(!showFields)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {showFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showFields ? 'Hide' : 'Show'} all fields
            </button>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-6">
        {!showAnswer ? (
          <div className="flex justify-center gap-4">
            <button
              onClick={onShowAnswer}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
            >
              Show Answer
            </button>
            <button
              onClick={onSkip}
              className="px-6 py-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Skip
            </button>
          </div>
        ) : (
          <div>
            <p className="text-center text-sm text-muted-foreground mb-4">
              How well did you know this?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => onRate('again')}
                className="px-6 py-3 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
              >
                Again
                <span className="block text-xs opacity-70">{nextReviewTimes?.again || '1'}</span>
              </button>
              <button
                onClick={() => onRate('hard')}
                className="px-6 py-3 bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-500/20 transition-colors font-medium"
              >
                Hard
                <span className="block text-xs opacity-70">{nextReviewTimes?.hard || '2'}</span>
              </button>
              <button
                onClick={() => onRate('good')}
                className="px-6 py-3 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors font-medium"
              >
                Good
                <span className="block text-xs opacity-70">{nextReviewTimes?.good || '3'}</span>
              </button>
              <button
                onClick={() => onRate('easy')}
                className="px-6 py-3 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors font-medium"
              >
                Easy
                <span className="block text-xs opacity-70">{nextReviewTimes?.easy || '4'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}