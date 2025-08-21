"use client";

import { useState, useEffect } from "react";
import SlideUpModal from "@/components/SlideUpModal";
import StrokeOrderDisplay from "./StrokeOrderDisplay";

interface StrokeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  kanji: string;
  word?: string;
  meaning?: string;
}

export default function StrokeOrderModal({
  isOpen,
  onClose,
  kanji,
  word,
  meaning,
}: StrokeOrderModalProps) {
  // Split kanji string into individual characters
  const kanjiList = kanji.split("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentKanji = kanjiList[currentIndex] || kanji;

  // Reset to first kanji when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(kanjiList.length - 1, prev + 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, kanjiList.length]);

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      height="90%"
      showHandle={false}
      showCloseButton={false}
    >
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 relative rounded-t-3xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-md"
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5 text-foreground"
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

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-foreground">
              Stroke Order: {currentKanji}
            </h2>
            {kanjiList.length > 1 && (
              <span className="text-sm text-muted-foreground bg-background/50 px-2 py-1 rounded">
                {currentIndex + 1} of {kanjiList.length}
              </span>
            )}
          </div>
          {word && word !== kanji && (
            <p className="text-lg text-muted-foreground">{word}</p>
          )}
          {meaning && (
            <p className="text-sm text-muted-foreground mt-1">{meaning}</p>
          )}

          {/* Kanji navigation for compound words */}
          {kanjiList.length > 1 && (
            <div className="flex items-center gap-2 mt-3">
              {kanjiList.map((k, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`
                    px-3 py-1 rounded-lg font-medium transition-all
                    ${
                      index === currentIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent text-foreground"
                    }
                  `}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <StrokeOrderDisplay
              kanji={currentKanji}
              size={280}
              autoPlay={false}
              showControls={true}
              strokeSpeed={800}
            />
          </div>

          {/* Navigation arrows for multi-kanji words */}
          {kanjiList.length > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous kanji (←)"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <span className="text-sm text-muted-foreground">
                Use ← → arrow keys to navigate
              </span>

              <button
                onClick={handleNext}
                disabled={currentIndex === kanjiList.length - 1}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next kanji (→)"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Tips */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-medium text-sm text-foreground mb-2">Tips:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Follow the stroke order carefully</li>
              <li>• Pay attention to stroke direction</li>
              <li>• Practice writing along with the animation</li>
              <li>• Use the grid to maintain proper proportions</li>
            </ul>
          </div>

          {/* Available Kanji Notice */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Stroke Order Available:</strong> We have stroke order data
              for over 6,900 kanji characters, covering all common kanji and
              most specialized characters.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Stroke data provided by KanjiVG under CC BY 3.0 FR license
            </p>
          </div>
        </div>
      </div>
    </SlideUpModal>
  );
}
