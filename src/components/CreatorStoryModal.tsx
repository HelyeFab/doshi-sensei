'use client';

import { useEffect, useState } from 'react';

interface CreatorStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatorStoryModal({ isOpen, onClose }: CreatorStoryModalProps) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimated(true), 100);
    } else {
      setIsAnimated(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto transform transition-all duration-500 ${
          isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{
          border: '2px solid white',
          boxShadow: 'inset 0 0 0 1px var(--primary), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors duration-200 group"
          aria-label="Close"
        >
          <svg
            className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex flex-col items-center space-y-4">
          {/* Creator Image */}
          <div
            className={`w-32 h-32 rounded-full overflow-hidden transform transition-all duration-700 ${
              isAnimated ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
            }`}
            style={{
              border: '3px solid white',
              boxShadow: 'inset 0 0 0 2px var(--primary), 0 8px 16px rgba(0, 0, 0, 0.1)'
            }}
          >
            <img
              src="/doshiemma.JPG"
              alt="Emmanuel - Creator of Dōshi Sensei"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Story */}
          <div
            className={`text-center space-y-4 transform transition-all duration-700 delay-300 ${
              isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <h3 className="text-xl font-semibold text-card-foreground">
              About Dōshi Sensei
            </h3>
            
            <div className="text-card-foreground space-y-3 text-left">
              <p>
                Hi, I'm Emmanuel — and I love learning Japanese.
              </p>
              <p>
                But learning a language isn't always easy. I've been there — bouncing between apps, flashcards, grammar charts, and never feeling fully immersed.
              </p>
              <p>
                Dōshi Sensei is the app I always dreamed of: one space to read, listen, practise, and grow. It's made with care, for people who love Japanese and want to learn it their way.
              </p>
              <p>
                I hope it brings you joy, confidence, and a sense of flow. 🌱
              </p>
              <p className="font-medium text-center">
                Welcome.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className={`mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
              isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            Thank you, Emmanuel! ✨
          </button>
        </div>
      </div>
    </div>
  );
}