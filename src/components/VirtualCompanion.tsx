'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getRandomCharacter,
  getRandomQuote,
  updateCompanionHistory,
  CompanionCharacter
} from '@/utils/virtualCompanion';
import { useStrings } from '@/contexts/LanguageContext';

interface VirtualCompanionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VirtualCompanion({ isOpen, onClose }: VirtualCompanionProps) {
  const { settings, updateSetting } = useSettings();
  const strings = useStrings();
  const [character, setCharacter] = useState<CompanionCharacter | null>(null);
  const [quote, setQuote] = useState<string>('');
  const [isAnimated, setIsAnimated] = useState(false);

  // Generate character and quote when modal opens
  useEffect(() => {
    if (isOpen && !character && settings) {
      // Ensure companionHistory exists with default values
      const companionHistory = settings.companionHistory || { recentCharacters: [], lastShownDate: undefined };

      const newCharacter = getRandomCharacter(companionHistory);
      const newQuote = getRandomQuote();

      setCharacter(newCharacter);
      setQuote(newQuote);

      // Update companion history
      const updatedHistory = updateCompanionHistory(companionHistory, newCharacter.path);
      updateSetting('companionHistory', updatedHistory);

      // Trigger animation after a small delay
      setTimeout(() => setIsAnimated(true), 100);
    }
  }, [isOpen, character, settings, updateSetting]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCharacter(null);
      setQuote('');
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
        className={`relative bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto transform transition-all duration-500 ${isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
          aria-label={strings.tooltips.closeCompanion}
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

        {/* Character Icon */}
        {character && (
          <div className="flex flex-col items-center space-y-4">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-4 flex items-center justify-center transform transition-all duration-700 ${isAnimated ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
                }`}
              style={{
                border: '3px solid white',
                boxShadow: 'inset 0 0 0 2px var(--primary), 0 8px 16px rgba(0, 0, 0, 0.1)'
              }}
            >
              <img
                src={character.path}
                alt={character.name}
                className="w-full h-full object-contain"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
              />
            </div>

            {/* Character Name */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-card-foreground mb-1">
                Hello from {character.name}! 👋
              </h3>
              <p className="text-sm text-muted-foreground capitalize">
                Your {character.category.replace('-', ' ')} companion
              </p>
            </div>

            {/* Quote */}
            <div
              className={`bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 transform transition-all duration-700 delay-300 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              style={{
                border: '1px solid var(--primary)',
                background: 'linear-gradient(135deg, rgba(var(--primary), 0.1), rgba(var(--accent), 0.1))'
              }}
            >
              <p className="text-card-foreground text-center leading-relaxed">
                {quote}
              </p>
            </div>

            {/* Gambatte Message */}
            <div
              className={`text-center transform transition-all duration-700 delay-500 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
            >
              <p className="text-primary font-medium japanese-text text-lg">
                頑張ってください！
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                (Gambatte kudasai! - Good luck!)
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className={`mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              style={{ transitionDelay: '700ms' }}
            >
              Thank you! ✨
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
