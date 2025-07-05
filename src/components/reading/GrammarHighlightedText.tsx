'use client';

import React, { useEffect, useState, useMemo } from 'react';
import KuromojiService, { TokenWithHighlight, POS_COLORS } from '@/utils/kuromojiService';

interface GrammarHighlightedTextProps {
  text: string;
  highlightMode: 'none' | 'all' | 'content' | 'grammar';
  onWordClick?: (word: string, event: React.MouseEvent) => void;
  showFurigana?: boolean;
  className?: string;
}

export function GrammarHighlightedText({
  text,
  highlightMode,
  onWordClick,
  showFurigana = false,
  className = ''
}: GrammarHighlightedTextProps) {
  const [tokens, setTokens] = useState<TokenWithHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKuromojiReady, setIsKuromojiReady] = useState(false);

  // Initialize Kuromoji once
  useEffect(() => {
    const initKuromoji = async () => {
      try {
        const kuromojiService = KuromojiService.getInstance();
        await kuromojiService.initialize();
        setIsKuromojiReady(true);
      } catch (err) {
        console.error('Failed to initialize Kuromoji:', err);
        setError('Failed to initialize grammar analyzer');
      }
    };
    
    initKuromoji();
  }, []);

  useEffect(() => {
    const analyzeText = async () => {
      if (!isKuromojiReady || highlightMode === 'none' || !text) {
        setTokens([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const kuromojiService = KuromojiService.getInstance();
        const analyzedTokens = await kuromojiService.tokenize(text);
        setTokens(analyzedTokens);
        setError(null);
      } catch (err) {
        console.error('Failed to analyze text:', err);
        setError('Failed to analyze text');
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    analyzeText();
  }, [text, highlightMode, isKuromojiReady]);

  const shouldHighlight = (token: TokenWithHighlight): boolean => {
    if (highlightMode === 'none') return false;
    if (highlightMode === 'all') return true;
    
    const kuromojiService = KuromojiService.getInstance();
    
    if (highlightMode === 'content') {
      return kuromojiService.isContentWord(token);
    }
    
    if (highlightMode === 'grammar') {
      return kuromojiService.isGrammarWord(token);
    }
    
    return false;
  };

  const handleWordClick = (token: TokenWithHighlight, event: React.MouseEvent) => {
    if (onWordClick && token.basic_form) {
      onWordClick(token.basic_form, event);
    }
  };

  if (loading || !isKuromojiReady) {
    return <span className={className}>{text}</span>;
  }

  if (error || tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`${className} block md:inline`}>
      {tokens.map((token, index) => {
        const isHighlighted = shouldHighlight(token);
        const posType = KuromojiService.getInstance().getPartOfSpeech(token);
        
        if (showFurigana && token.reading && token.surface_form !== token.reading) {
          // Render with furigana
          return (
            <ruby
              key={index}
              className={`cursor-pointer hover:bg-primary/20 transition-colors rounded px-1 py-0.5 md:px-0.5 md:py-0 inline-block mx-0.5 my-0.5 md:mx-0 md:my-0 ${
                isHighlighted ? `grammar-${posType}` : ''
              }`}
              style={isHighlighted ? { backgroundColor: `${token.color}20` } : {}}
              onClick={(e) => handleWordClick(token, e)}
              data-pos={posType}
            >
              {token.surface_form}
              <rt className="text-xs">{token.reading}</rt>
            </ruby>
          );
        } else {
          // Render without furigana
          return (
            <span
              key={index}
              className={`cursor-pointer hover:bg-primary/20 transition-colors rounded px-1 py-0.5 md:px-0.5 md:py-0 inline-block mx-0.5 my-0.5 md:mx-0 md:my-0 ${
                isHighlighted ? `grammar-${posType}` : ''
              }`}
              style={isHighlighted ? { backgroundColor: `${token.color}20` } : {}}
              onClick={(e) => handleWordClick(token, e)}
              data-pos={posType}
              title={token.reading || token.surface_form}
            >
              {token.surface_form}
            </span>
          );
        }
      })}
    </span>
  );
}

// Legend component to show color coding
export function GrammarLegend() {
  const categories = [
    { type: 'noun', label: 'Nouns', color: POS_COLORS.noun },
    { type: 'verb', label: 'Verbs', color: POS_COLORS.verb },
    { type: 'adjective', label: 'Adjectives', color: POS_COLORS.adjective },
    { type: 'particle', label: 'Particles', color: POS_COLORS.particle },
    { type: 'adverb', label: 'Adverbs', color: POS_COLORS.adverb },
  ];

  return (
    <div className="flex flex-wrap gap-3 md:gap-3 text-xs md:text-sm">
      {categories.map(cat => (
        <div key={cat.type} className="flex items-center gap-1 px-2 py-1 md:px-0 md:py-0 bg-background/50 md:bg-transparent rounded-md">
          <div
            className="w-3 h-3 md:w-4 md:h-4 rounded"
            style={{ backgroundColor: cat.color }}
          />
          <span className="text-muted-foreground">{cat.label}</span>
        </div>
      ))}
    </div>
  );
}