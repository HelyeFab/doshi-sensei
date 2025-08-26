"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

// Japanese regex patterns
const kanjiRegex = /[\u4E00-\u9FAF]/g;
import { SaveWordModal } from "@/components/drill/SaveWordModal";
import AIExplanationModal from "@/components/AIExplanation/AIExplanationModal";
import { JapaneseWord } from "@/types";
import { searchJMdictWords } from "@/utils/jmdictLocalSearch";
import { useFeature } from "@/hooks/useFeature";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useLearnTracking } from "@/hooks/useLearnTracking";
import { useTTS } from "@/hooks/useTTS";
import { QuickContextSelection } from "./QuickContextProvider";
import { cleanFurigana } from "@/utils/cleanFurigana";

interface Position {
  x: number;
  y: number;
}

interface QuickContextBubbleProps {
  selectedText: string;
  position: Position;
  onClose: () => void;
  surroundingContext?: string;
  isKanji?: boolean;
  textType?: "kanji" | "word" | "phrase" | "sentence";
  history?: QuickContextSelection[];
  onModalStateChange?: (hasOpenModals: boolean) => void;
}

export default function QuickContextBubble({
  selectedText,
  position,
  onClose,
  surroundingContext,
  isKanji = false,
  textType = "word",
  history = [],
  onModalStateChange,
}: QuickContextBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupResults, setLookupResults] = useState<JapaneseWord[]>([]);
  const [wordData, setWordData] = useState<JapaneseWord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [savingWordId, setSavingWordId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [keepBubbleVisible, setKeepBubbleVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStarted, setDragStarted] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef(null);
  const dragControls = useDragControls();
  const { checkAndTrack, getRemainingUsage } = useFeature('quick_context', {
    showModal: true,
    showToast: true,
    trackUsage: true
  });
  const { track } = useAnalytics();
  const { track: trackLearning } = useLearnTracking();
  const { speak: speakTTS, stop: stopTTS, state: ttsState } = useTTS();
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Get remaining uses on mount
    getRemainingUsage("quick_context").then((uses) => {
      setRemainingUses(uses);
    });
    return () => setMounted(false);
  }, []);

  // Notify parent when modals are open/closed
  useEffect(() => {
    const hasOpenModals = showSaveModal || showAIModal || showLookupModal;
    onModalStateChange?.(hasOpenModals);
  }, [showSaveModal, showAIModal, showLookupModal, onModalStateChange]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Don't close if currently dragging
      if (isDragging || dragStarted) {
        return;
      }

      // Don't close if modals are open
      if (showSaveModal || showAIModal || showLookupModal) {
        return;
      }

      // Don't close if clicking on the bubble itself
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        // Check if this is a QuickContext bubble element
        const target = e.target as HTMLElement;
        if (target.closest('[data-quickcontext-bubble="true"]')) {
          return;
        }

        // Check if clicking on a modal
        if (target.closest(".fixed.inset-0")) {
          return;
        }

        onClose();
      }
    };

    // Add longer delay to prevent immediate closure on mobile and initial render
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 800); // Increased to 800ms for better stability

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [
    onClose,
    showSaveModal,
    showAIModal,
    showLookupModal,
    isDragging,
    dragStarted,
  ]);

  // Fetch word data when text is selected
  useEffect(() => {
    if (selectedText && !isKanji) {
      fetchWordData();
    }
  }, [selectedText]);

  const fetchWordData = async () => {
    setIsLoading(true);
    try {
      // Clean furigana from text before searching
      const cleanText = cleanFurigana(selectedText);
      
      const results = await searchJMdictWords(cleanText);
      if (results && results.length > 0) {
        setWordData(results[0]);
      }
    } catch (error) {
      console.error("Error fetching word data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    try {
      const canUse = await checkAndTrack("quick_context");
      if (!canUse) {
        return;
      }

      track("quick_context_save", { text: selectedText });

      // Track save action with ULAS
      trackLearning({
        type: 'save',
        category: isKanji ? 'kanji' : 'vocabulary',
        content: {
          value: selectedText,
          metadata: {
            feature: 'quick_context',
            action: 'save_to_list',
            textType,
            hasWordData: !!wordData,
            context: surroundingContext?.substring(0, 100)
          }
        }
      });

      // Create a word object if we don't have one
      const wordToSave = wordData || {
        id: `quick_${Date.now()}`,
        kanji: isKanji ? selectedText : "",
        kana: !isKanji ? selectedText : "",
        romaji: "",
        meaning: "",
        type: "other" as const,
        jlpt: "N5" as const,
        tags: [],
      };

      setWordData(wordToSave);
      setShowSaveModal(true);
      setKeepBubbleVisible(true); // Keep bubble visible when modal opens

      // Update remaining uses
      const newUses = await getRemainingUsage("quick_context");
      setRemainingUses(newUses);
    } catch (error) {
      console.error("Error in handleSave:", error);
    }
  }, [
    checkAndTrack,
    track,
    selectedText,
    wordData,
    getRemainingUsage,
    isKanji,
  ]);

  const handleLookup = useCallback(async () => {
    const canUse = await checkAndTrack("quick_context");
    if (!canUse) return;

    track("quick_context_lookup", { text: selectedText });

    // Track lookup action with ULAS
    trackLearning({
      type: 'search',
      category: isKanji ? 'kanji' : 'vocabulary',
      content: {
        value: selectedText,
        metadata: {
          feature: 'quick_context',
          action: 'dictionary_lookup',
          textType,
          context: surroundingContext?.substring(0, 100)
        }
      }
    });

    // Clean furigana from text before searching
    const cleanText = cleanFurigana(selectedText);

    // Search in local JMDict and show results in modal
    setIsLookupLoading(true);
    try {
      const results = await searchJMdictWords(cleanText, 30);
      setLookupResults(results || []);
      setShowLookupModal(true);
      setKeepBubbleVisible(true); // Keep bubble visible when modal opens
    } catch (error) {
      console.error("Error searching words:", error);
      setLookupResults([]);
      setShowLookupModal(true); // Show modal even if no results
    } finally {
      setIsLookupLoading(false);
    }

    // Update remaining uses
    const newUses = await getRemainingUsage("quick_context");
    setRemainingUses(newUses);
  }, [
    checkAndTrack,
    track,
    selectedText,
    textType,
    isKanji,
    getRemainingUsage,
  ]);

  const handleListen = useCallback(async () => {
    const canUse = await checkAndTrack("quick_context");
    if (!canUse) return;

    track("quick_context_tts", { text: selectedText });

    // Use our app's TTS system with caching
    await speakTTS(selectedText, {
      voice: "female",
      context: "quick_context",
      priority: "high",
    });

    // Update remaining uses
    const newUses = await getRemainingUsage("quick_context");
    setRemainingUses(newUses);
  }, [checkAndTrack, track, selectedText, speakTTS, getRemainingUsage]);

  const handleAIExplain = useCallback(async () => {
    try {
      const canUse = await checkAndTrack("quick_context");
      if (!canUse) {
        return;
      }

      track("quick_context_ai", { text: selectedText, type: textType });
      setShowAIModal(true);
      setKeepBubbleVisible(true); // Keep bubble visible when modal opens
    } catch (error) {
      console.error("Error in handleAIExplain:", error);
    }
  }, [checkAndTrack, track, selectedText, textType]);

  // Copy to clipboard with proper error handling and fallback
  const handleCopy = useCallback(async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(selectedText);
        setCopiedText(selectedText);
        setTimeout(() => setCopiedText(""), 2000);
        track("quick_context_copy", { text: selectedText, type: textType, method: "clipboard" });
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = selectedText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopiedText(selectedText);
            setTimeout(() => setCopiedText(""), 2000);
            track("quick_context_copy", { text: selectedText, type: textType, method: "execCommand" });
          } else {
            setCopiedText("Failed");
            setTimeout(() => setCopiedText(""), 2000);
          }
        } catch (err) {
          setCopiedText("Failed");
          setTimeout(() => setCopiedText(""), 2000);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      // Show error feedback
      setCopiedText("Failed");
      setTimeout(() => setCopiedText(""), 2000);
    }
  }, [selectedText, track, textType]);

  // Keyboard shortcuts (must be after handleSave is defined)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Esc to close
      if (e.key === "Escape") {
        onClose();
      }

      // Q for quick save (only when bubble is expanded)
      if (e.key === "q" || e.key === "Q") {
        if (isExpanded && !showSaveModal && !showAIModal && !showLookupModal) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [
    onClose,
    isExpanded,
    showSaveModal,
    showAIModal,
    showLookupModal,
    handleSave,
  ]);

  // Calculate bubble position to avoid screen edges - Mobile-first responsive
  const getBubblePosition = () => {
    const padding = 16; // Increased padding for better mobile experience
    const isMobile = window.innerWidth < 768;

    // Mobile-first responsive sizing
    const maxBubbleWidth = isMobile
      ? Math.min(320, window.innerWidth - padding * 2) // Larger on mobile
      : Math.min(360, window.innerWidth - padding * 2); // Even larger on desktop

    const bubbleWidth = isExpanded ? maxBubbleWidth : isMobile ? 56 : 48; // Larger touch target on mobile
    const bubbleHeight = isExpanded
      ? isMobile
        ? 280
        : 240
      : isMobile
      ? 56
      : 48; // More space on mobile

    let x = position.x - bubbleWidth / 2; // Center horizontally
    let y = position.y - bubbleHeight - (isMobile ? 16 : 10); // Position above selection

    // Adjust if too close to edges
    if (x + bubbleWidth > window.innerWidth - padding) {
      x = window.innerWidth - bubbleWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }
    if (y < padding) {
      y = position.y + (isMobile ? 20 : 30); // Position below if no room above
    }

    return { x, y, width: bubbleWidth };
  };

  const bubblePosition = getBubblePosition();

  if (!mounted) return null;


  // Hide bubble visually when minimized and modal is open
  const shouldShowBubble =
    isExpanded || (!showSaveModal && !showAIModal && !showLookupModal);

  const content = (
    <>
      {/* Invisible constraints container for drag boundaries */}
      <div
        ref={constraintsRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 9998,
        }}
      />

      <AnimatePresence>
        {shouldShowBubble && (
          <motion.div
            ref={bubbleRef}
            data-quickcontext-bubble="true"
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{
              duration: 0.2,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            drag={isExpanded}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0}
            dragTransition={{
              power: 0,
              timeConstant: 0,
              min: 0,
              max: 0,
              bounceDamping: 10,
              bounceStiffness: 100,
            }}
            onDragStart={() => {
              setIsDragging(true);
              setDragStarted(true);
            }}
            onDragEnd={() => {
              setIsDragging(false);
              // Keep dragStarted true for a moment to prevent immediate close
              setTimeout(() => setDragStarted(false), 100);
            }}
            style={{
              position: "fixed",
              left: bubblePosition.x,
              top: bubblePosition.y,
              width: isExpanded
                ? bubblePosition.width
                : window.innerWidth < 768
                ? 56
                : 48,
              zIndex: 9999,
              touchAction: "none",
            }}
            className={`
            bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-lg
            transition-all duration-300 ease-in-out
            ${!isExpanded ? "hover:scale-105 hover:shadow-xl" : "shadow-2xl"}
            ${isExpanded ? "ring-1 ring-primary/20" : ""}
          `}
          >
            {!isExpanded ? (
              // Compact bubble - Modern floating action button
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                }}
                className="w-full h-full flex items-center justify-center rounded-2xl bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-all duration-200 cursor-pointer select-none touch-none group"
                aria-label="Expand QuickContext menu"
                type="button"
              >
                <div className="relative">
                  <img
                    src="/flat-icons/ui/quick-context/robot.svg"
                    alt="QuickContext Helper"
                    className="w-7 h-7 md:w-8 md:h-8 pointer-events-none transition-transform group-hover:scale-110"
                  />
                  {/* Pulse indicator */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                </div>
              </button>
            ) : (
              // Expanded bubble - Fresh new design
              <div className="w-full h-full flex flex-col">
                {/* Clean header bar */}
                <div
                  className="h-10 bg-background border-b border-border flex items-center justify-between px-3 cursor-move select-none rounded-t-lg"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragStarted(true);
                    dragControls.start(e);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ touchAction: "none" }}
                  title="Drag to move"
                >
                  {/* Title and usage */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-medium text-foreground">QuickContext</span>
                    {remainingUses !== null && remainingUses !== -1 && (
                      <span className="text-[10px] text-muted-foreground">
                        • {remainingUses} left
                      </span>
                    )}
                  </div>

                  {/* Window controls */}
                  <div
                    className="flex items-center gap-1"
                    onPointerDownCapture={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setIsExpanded(false);
                      }}
                      className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center"
                      aria-label="Minimize"
                      title="Minimize"
                    >
                      <div className="w-3 h-0.5 bg-foreground/60" />
                    </button>
                    <button
                      onClick={onClose}
                      className="w-7 h-7 rounded-md bg-muted/50 hover:bg-destructive/20 transition-colors flex items-center justify-center group"
                      aria-label="Close"
                      title="Close"
                    >
                      <svg
                        className="w-3 h-3 text-muted-foreground group-hover:text-destructive"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Main content area */}
                <div className="flex-1 p-4 flex flex-col gap-3">
                  {/* Selected text card */}
                  <div className="bg-card rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-ja font-semibold text-foreground break-all">
                          {selectedText}
                        </p>
                      </div>
                      <div className={`
                        px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider
                        ${textType === "kanji" ? "bg-primary/10 text-primary" :
                          textType === "word" ? "bg-accent/10 text-accent" :
                          textType === "phrase" ? "bg-secondary/10 text-secondary" :
                          "bg-destructive/10 text-destructive"}
                      `}>
                        {textType}
                      </div>
                    </div>
                  </div>

                  {/* Action tiles - Clean grid layout */}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {/* Save tile */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave();
                      }}
                      className="bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all group"
                      aria-label="Save to lists"
                      type="button"
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        🔖
                      </div>
                      <span className="text-[11px] text-foreground font-medium">Save</span>
                    </button>

                    {/* Lookup tile */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLookup();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLookup();
                      }}
                      className="bg-accent/5 hover:bg-accent/10 border border-accent/20 hover:border-accent/40 rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all group"
                      aria-label="Look up in dictionary"
                      type="button"
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        🔍
                      </div>
                      <span className="text-[11px] text-foreground font-medium">Lookup</span>
                    </button>

                    {/* Listen tile */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleListen();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleListen();
                      }}
                      className="bg-secondary/5 hover:bg-secondary/10 border border-secondary/20 hover:border-secondary/40 rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Listen to pronunciation"
                      disabled={ttsState.isLoading || ttsState.isPlaying}
                      type="button"
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        {ttsState.isPlaying || ttsState.isLoading ? '⏸️' : '🗣️'}
                      </div>
                      <span className="text-[11px] text-foreground font-medium">
                        {ttsState.isPlaying || ttsState.isLoading ? "Playing" : "Listen"}
                      </span>
                    </button>

                    {/* AI tile */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAIExplain();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAIExplain();
                      }}
                      className="bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/40 rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all group"
                      aria-label="AI explanation"
                      type="button"
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        💡
                      </div>
                      <span className="text-[11px] text-foreground font-medium">AI</span>
                    </button>

                    {/* Copy tile */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopy();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopy();
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      className="bg-muted/20 hover:bg-muted/30 border border-muted/30 hover:border-muted/50 rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all group"
                      aria-label="Copy to clipboard"
                    >
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        📋
                      </div>
                      <span className="text-[11px] text-foreground font-medium">
                        {copiedText === selectedText ? "Copied!" : copiedText === "Failed" ? "Failed" : "Copy"}
                      </span>
                    </button>

                    {/* Empty tile for balance */}
                    <div className="bg-card/50 border border-border/30 rounded-lg p-3 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground/50">More soon</span>
                    </div>
                  </div>

                  {/* Keyboard hints - desktop only */}
                  <div className="hidden md:flex items-center justify-center gap-3 pt-2 border-t border-border/30">
                    <kbd className="px-1.5 py-0.5 bg-muted/30 border border-border/50 rounded text-[10px] font-mono text-muted-foreground">
                      Esc
                    </kbd>
                    <span className="text-[10px] text-muted-foreground">close</span>
                    <kbd className="px-1.5 py-0.5 bg-muted/30 border border-border/50 rounded text-[10px] font-mono text-muted-foreground">
                      Q
                    </kbd>
                    <span className="text-[10px] text-muted-foreground">save</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals - Outside of AnimatePresence so they stay open when bubble is minimized */}
      {showSaveModal &&
        wordData &&
        (
        (
          <SaveWordModal
            word={wordData}
            onClose={() => {
              setShowSaveModal(false);
              setKeepBubbleVisible(false); // Allow bubble to be hidden again
            }}
            onSaveComplete={() => {
            }}
            itemType={isKanji ? "kanji" : "word"}
          />
        ))}

      {showAIModal &&
        (
        (
          <AIExplanationModal
            text={selectedText}
            contextType={selectedText.length > 20 ? "sentence" : "word"}
            surroundingContext={surroundingContext}
            onClose={() => {
              setShowAIModal(false);
              setKeepBubbleVisible(false); // Allow bubble to be hidden again
            }}
          />
        ))}

      {/* Lookup Modal */}
      {showLookupModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
          data-quickcontext-modal="true"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              setShowLookupModal(false);
              setKeepBubbleVisible(false);
            }
          }}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            data-quickcontext-modal-content="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">
                Dictionary Results for{" "}
                <span className="font-ja">「{selectedText}」</span>
              </h3>
              <button
                onClick={() => {
                  setShowLookupModal(false);
                  setKeepBubbleVisible(false);
                }}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isLookupLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg
                  className="w-8 h-8 text-primary animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            ) : lookupResults.length > 0 ? (
              <div className="space-y-4">
                {lookupResults.map((result, index) => (
                  <div
                    key={result.id || index}
                    className="p-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {result.kanji && (
                            <span className="text-xl font-ja font-bold text-foreground">
                              {result.kanji}
                            </span>
                          )}
                          {result.kana && (
                            <span className="text-lg font-ja text-muted-foreground">
                              {result.kana}
                            </span>
                          )}
                          {result.type && result.type !== "other" && (
                            <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                              {result.type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-2">
                          {result.meaning || result.english}
                        </p>
                        {result.detailedMeaning &&
                          result.detailedMeaning.length > 0 && (
                            <div className="space-y-1 mt-2 pt-2 border-t border-border">
                              {result.detailedMeaning
                                .slice(0, 3)
                                .map((detail, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-muted-foreground"
                                  >
                                    <span className="font-medium">
                                      {idx + 1}.
                                    </span>{" "}
                                    {detail.glosses.join(", ")}
                                    {detail.partOfSpeech.length > 0 && (
                                      <span className="ml-2 text-xs opacity-70">
                                        ({detail.partOfSpeech.join(", ")})
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          // Immediately set the word data and switch modals
                          setWordData(result);
                          setShowLookupModal(false);
                          setShowSaveModal(true);
                          setKeepBubbleVisible(true);
                        }}
                        className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 hover:scale-105 transition-all duration-200"
                        aria-label="Save this word"
                        title="Save to study list"
                      >
                        <svg
                          className="w-5 h-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  No results found for{" "}
                  <span className="font-ja font-bold">「{selectedText}」</span>
                </p>
                <p className="text-xs mt-2">
                  Try searching for a different form of the word
                </p>
                {isKanji && (
                  <p className="text-xs mt-2 text-primary">
                    Note: Single kanji may not have dictionary entries. Try
                    selecting a complete word.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}
