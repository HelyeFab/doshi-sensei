'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import QuickContextBubble from './QuickContextBubble';

interface QuickContextProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  selector?: string; // CSS selector for elements to enable QuickContext on
}

export default function QuickContextProvider({ 
  children, 
  enabled = true,
  selector = '.japanese-text, .font-ja, [data-quickcontext="true"]'
}: QuickContextProviderProps) {
  const [selectedText, setSelectedText] = useState('');
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [showBubble, setShowBubble] = useState(false);
  const [surroundingContext, setSurroundingContext] = useState('');
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();
  const isSelectingRef = useRef(false);

  const handleSelection = useCallback(() => {
    if (!enabled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowBubble(false);
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length > 100) {
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

    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get surrounding context (up to 50 chars before and after)
    const fullText = parentElement.textContent || '';
    const selectionStart = fullText.indexOf(text);
    const contextStart = Math.max(0, selectionStart - 50);
    const contextEnd = Math.min(fullText.length, selectionStart + text.length + 50);
    const context = fullText.substring(contextStart, contextEnd);

    setSelectedText(text);
    setBubblePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY
    });
    setSurroundingContext(context);
    setShowBubble(true);
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

    const handleMouseUp = () => {
      isSelectingRef.current = false;
      handleSelectionChange();
    };

    const handleMouseDown = () => {
      isSelectingRef.current = true;
      setShowBubble(false);
    };

    const handleTouchEnd = () => {
      // For mobile devices
      setTimeout(handleSelection, 100);
    };

    // Add event listeners
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [enabled, handleSelection]);

  const handleCloseBubble = useCallback(() => {
    setShowBubble(false);
    setSelectedText('');
    // Clear selection
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <>
      {children}
      {showBubble && selectedText && (
        <QuickContextBubble
          selectedText={selectedText}
          position={bubblePosition}
          onClose={handleCloseBubble}
          surroundingContext={surroundingContext}
          isKanji={/^[\u4e00-\u9faf]+$/.test(selectedText)}
        />
      )}
    </>
  );
}