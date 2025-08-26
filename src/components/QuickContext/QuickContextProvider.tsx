'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import QuickContextBubble from './QuickContextBubble';
import { cleanFurigana } from '@/utils/cleanFurigana';
import { useLearnTracking } from '@/hooks/useLearnTracking';

interface QuickContextProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  selector?: string; // CSS selector for elements to enable QuickContext on
}

export interface QuickContextSelection {
  text: string;
  type: 'kanji' | 'word' | 'phrase' | 'sentence';
  context: string;
  timestamp: number;
}

// Japanese text regex patterns
const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
const kanjiRegex = /[\u4E00-\u9FAF]/;
const hiraganaRegex = /[\u3040-\u309F]/;
const katakanaRegex = /[\u30A0-\u30FF]/;
const particleRegex = /[\u306F\u304C\u3092\u306B\u3067\u3068\u3082\u3078\u304B\u3089]/;

export default function QuickContextProvider({ 
  children, 
  enabled = true,
  selector = '.japanese-text, .font-ja, [data-quickcontext="true"], .prose p, .vocabulary-item, article p, .story-content, .news-content, .drill-content, .game-text, .practice-text, .reading-text'
}: QuickContextProviderProps) {
  const { track: trackLearning } = useLearnTracking();
  const [selectedText, setSelectedText] = useState('');
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [showBubble, setShowBubble] = useState(false);
  const [surroundingContext, setSurroundingContext] = useState('');
  const [textType, setTextType] = useState<'kanji' | 'word' | 'phrase' | 'sentence'>('word');
  const [hasOpenModals, setHasOpenModals] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();
  const isSelectingRef = useRef(false);
  const selectionHistory = useRef<QuickContextSelection[]>([]);

  // Intelligent text type detection
  const detectTextType = (text: string): 'kanji' | 'word' | 'phrase' | 'sentence' => {
    const trimmed = text.trim();
    
    // Single kanji
    if (trimmed.length === 1 && kanjiRegex.test(trimmed)) {
      return 'kanji';
    }
    
    // Sentence (has punctuation or is long)
    if (trimmed.includes('。') || trimmed.includes('、') || trimmed.includes('！') || trimmed.includes('？') || trimmed.length > 30) {
      return 'sentence';
    }
    
    // Phrase (has particles or multiple words)
    if (particleRegex.test(trimmed) && trimmed.length > 5) {
      return 'phrase';
    }
    
    // Default to word
    return 'word';
  };

  // Smart selection expansion for better context
  const expandToWordBoundary = (text: string, fullText: string, startIdx: number): string => {
    // If single character, try to expand to full word
    if (text.length === 1 && japaneseRegex.test(text)) {
      let start = startIdx;
      let end = startIdx + text.length;
      
      // Expand backwards to word boundary
      while (start > 0 && japaneseRegex.test(fullText[start - 1])) {
        start--;
      }
      
      // Expand forwards to word boundary
      while (end < fullText.length && japaneseRegex.test(fullText[end])) {
        end++;
      }
      
      return fullText.substring(start, end);
    }
    return text;
  };

  // Save to history
  const addToHistory = (text: string, type: 'kanji' | 'word' | 'phrase' | 'sentence', context: string) => {
    const selection: QuickContextSelection = {
      text,
      type,
      context,
      timestamp: Date.now()
    };
    
    // Keep only last 50 selections
    selectionHistory.current = [selection, ...selectionHistory.current.slice(0, 49)];
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('quickcontext_history', JSON.stringify(selectionHistory.current));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  };

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quickcontext_history');
      if (saved) {
        selectionHistory.current = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  const handleSelection = useCallback(() => {
    if (!enabled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowBubble(false);
      return;
    }

    let text = selection.toString().trim();
    
    // Clean furigana patterns from selected text
    text = cleanFurigana(text);
    
    // Check for Japanese text
    if (!text || !japaneseRegex.test(text) || text.length > 200) {
      setShowBubble(false);
      return;
    }

    // Check if selection is within enabled elements
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    const parentElement = anchorNode.nodeType === Node.TEXT_NODE 
      ? anchorNode.parentElement 
      : anchorNode as Element;

    if (!parentElement) return;

    // Check if element matches selector
    const isEnabledElement = parentElement.closest(selector);
    if (!isEnabledElement) {
      setShowBubble(false);
      return;
    }

    // Get full text for context
    const fullText = parentElement.textContent || '';
    const selectionStart = fullText.indexOf(text);
    
    // Try to expand single character selections
    if (text.length === 1) {
      text = expandToWordBoundary(text, fullText, selectionStart);
    }
    
    // Get surrounding context (up to 100 chars before and after)
    const contextStart = Math.max(0, selectionStart - 100);
    const contextEnd = Math.min(fullText.length, selectionStart + text.length + 100);
    const context = fullText.substring(contextStart, contextEnd);
    
    // Detect text type
    const type = detectTextType(text);

    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setTextType(type);
    setBubblePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY
    });
    setSurroundingContext(context);
    setShowBubble(true);
    
    // Add to history
    addToHistory(text, type, context);
    
    // Track text selection with ULAS
    trackLearning({
      type: 'search',
      category: type === 'kanji' ? 'kanji' : 'vocabulary',
      content: {
        value: text,
        metadata: {
          feature: 'quick_context',
          textType: type,
          textLength: text.length,
          context: context.substring(0, 100), // Limit context for tracking
          sourceElement: parentElement?.tagName?.toLowerCase(),
          hasKanji: kanjiRegex.test(text),
          hasHiragana: hiraganaRegex.test(text),
          hasKatakana: katakanaRegex.test(text),
          action: 'text_selected'
        }
      }
    });
  }, [enabled, selector]);

  // Handle click/tap on Japanese text elements for quick activation
  const handleElementClick = useCallback((event: MouseEvent | TouchEvent) => {
    if (!enabled) return;

    const target = event.target as Element;
    if (!target) return;

    // Don't trigger if clicking on the bubble itself
    if (target.closest('[data-quickcontext-bubble="true"]')) {
      return;
    }

    // Check if clicked element matches selector
    const enabledElement = target.closest(selector);
    if (!enabledElement) return;

    // Get text content
    let textContent = '';
    
    // Try to get the most specific text
    if (target.nodeType === Node.ELEMENT_NODE) {
      // Check if it's a small element with Japanese text
      textContent = target.textContent || '';
      
      // If element has only one text node child, use that
      if (target.childNodes.length === 1 && target.childNodes[0].nodeType === Node.TEXT_NODE) {
        textContent = target.childNodes[0].textContent || '';
      }
    }

    // Validate text
    if (!textContent || !japaneseRegex.test(textContent)) {
      return;
    }

    // For long text, require selection instead of click
    if (textContent.length > 50) {
      return;
    }

    const trimmed = textContent.trim();
    const type = detectTextType(trimmed);

    // Get element position
    const rect = target.getBoundingClientRect();

    setSelectedText(trimmed);
    setTextType(type);
    setBubblePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY
    });
    setSurroundingContext(textContent);
    setShowBubble(true);
    
    // Add to history
    addToHistory(trimmed, type, textContent);

    // Prevent default only for valid selections
    event.preventDefault();
    event.stopPropagation();
  }, [enabled, selector]);

  // Handle text selection with debounce
  useEffect(() => {
    if (!enabled) return;

    const handleSelectionChange = () => {
      // Clear previous timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Set new timeout to check selection after user stops selecting
      selectionTimeoutRef.current = setTimeout(() => {
        handleSelection();
      }, 500); // Wait 500ms after selection stops
    };

    const handleMouseUp = (event: MouseEvent) => {
      isSelectingRef.current = false;
      
      // Check if there's a selection
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        handleSelectionChange();
      } else {
        // No selection, treat as click
        handleElementClick(event);
      }
    };

    const handleMouseDown = () => {
      isSelectingRef.current = true;
      setShowBubble(false);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      // For mobile devices
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setTimeout(handleSelection, 100);
      } else {
        // No selection, treat as tap
        handleElementClick(event);
      }
    };

    // Add event listeners
    document.addEventListener('mouseup', handleMouseUp as EventListener);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchend', handleTouchEnd as EventListener);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp as EventListener);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchend', handleTouchEnd as EventListener);
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [enabled, handleSelection, handleElementClick]);

  const handleCloseBubble = useCallback(() => {
    setShowBubble(false);
    setSelectedText('');
    // Clear selection
    window.getSelection()?.removeAllRanges();
  }, []);

  // Add visual feedback for hoverable Japanese text
  useEffect(() => {
    if (!enabled) return;
    
    const style = document.createElement('style');
    style.textContent = `
      ${selector} {
        cursor: text;
        user-select: text;
        -webkit-user-select: text;
      }
      ${selector}:hover {
        background-color: rgba(59, 130, 246, 0.05);
        border-radius: 2px;
        transition: background-color 0.2s ease;
      }
      .quickcontext-active {
        background-color: rgba(59, 130, 246, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [enabled, selector]);

  return (
    <>
      {children}
      {(showBubble || hasOpenModals) && selectedText && (
        <QuickContextBubble
          selectedText={selectedText}
          position={bubblePosition}
          onClose={handleCloseBubble}
          surroundingContext={surroundingContext}
          isKanji={textType === 'kanji'}
          textType={textType}
          history={selectionHistory.current}
          onModalStateChange={setHasOpenModals}
        />
      )}
    </>
  );
}