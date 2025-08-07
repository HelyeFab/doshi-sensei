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

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[QuickContext] Provider mounted', {
      enabled,
      selector
    });
    
    // Check if any matching elements exist on the page
    const matchingElements = document.querySelectorAll(selector);
    console.log('[QuickContext] Found matching elements:', matchingElements.length);
    matchingElements.forEach((el, index) => {
      console.log(`[QuickContext] Element ${index}:`, {
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 50)
      });
    });
  }, [enabled, selector]);

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

  // Handle click/tap on Japanese text elements
  const handleElementClick = useCallback((event: MouseEvent | TouchEvent) => {
    console.log('[QuickContext] Click/tap detected', {
      enabled,
      target: event.target,
      selector
    });

    if (!enabled) {
      console.log('[QuickContext] Not enabled, returning');
      return;
    }

    const target = event.target as Element;
    if (!target) {
      console.log('[QuickContext] No target, returning');
      return;
    }

    // Check if clicked element matches selector
    const enabledElement = target.closest(selector);
    console.log('[QuickContext] Checking selector match:', {
      selector,
      enabledElement,
      targetClasses: target.className,
      targetId: target.id
    });

    if (!enabledElement) {
      console.log('[QuickContext] Element does not match selector, returning');
      return;
    }

    // Get text content
    let textContent = '';
    let elementToUse = target;

    // If clicked on a text node's parent or an element with Japanese text
    if (target.nodeType === Node.ELEMENT_NODE) {
      textContent = target.textContent || '';
      
      // If the element has child nodes, try to get the most specific Japanese text
      if (target.childNodes.length === 1 && target.childNodes[0].nodeType === Node.TEXT_NODE) {
        textContent = target.childNodes[0].textContent || '';
      }
    }

    console.log('[QuickContext] Text content:', textContent);

    // Check if text contains Japanese characters
    if (!textContent || !japaneseRegex.test(textContent)) {
      console.log('[QuickContext] No Japanese text found, returning');
      return;
    }

    // If text is too long (probably a paragraph), don't activate on click
    // Users should select specific text in long passages
    if (textContent.length > 50) {
      console.log('[QuickContext] Text too long (>50 chars), returning');
      return;
    }

    // Clear any existing selection
    window.getSelection()?.removeAllRanges();

    // Get element position
    const rect = elementToUse.getBoundingClientRect();

    console.log('[QuickContext] Setting bubble with text:', textContent.trim());

    setSelectedText(textContent.trim());
    setBubblePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY
    });
    setSurroundingContext(textContent);
    setShowBubble(true);

    // Prevent event from bubbling
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