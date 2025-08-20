'use client';

import { useState, useEffect } from 'react';
import {
  getRandomCharacter,
  getRandomQuote,
  updateCompanionHistory,
  CompanionCharacter,
  CompanionHistory
} from '@/utils/virtualCompanion';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';

interface VirtualCompanionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VirtualCompanion({ isOpen, onClose }: VirtualCompanionProps) {
  const router = useRouter();
  const strings = useStrings();
  const [character, setCharacter] = useState<CompanionCharacter | null>(null);
  const [quote, setQuote] = useState<string>('');
  const [isAnimated, setIsAnimated] = useState(false);
  const [companionHistory, setCompanionHistory] = useState<CompanionHistory>({
    recentCharacters: [],
    lastShownDate: undefined
  });

  // Generate character and quote when modal opens
  useEffect(() => {
    if (isOpen && !character) {
      const newCharacter = getRandomCharacter(companionHistory);
      const newQuote = getRandomQuote();

      setCharacter(newCharacter);
      setQuote(newQuote);

      // Update companion history
      const updatedHistory = updateCompanionHistory(companionHistory, newCharacter.path);
      setCompanionHistory(updatedHistory);

      // Trigger animation after a small delay
      setTimeout(() => setIsAnimated(true), 100);
    }
  }, [isOpen, character, companionHistory]);

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
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col transition-all duration-500 ${
          isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{
          border: '2px solid white',
          boxShadow: 'inset 0 0 0 1px rgb(59, 130, 246), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Content */}
        <div className="px-6 pt-6 pb-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200 group"
            aria-label={strings.virtualCompanion.close}
          >
            <svg
              className="w-4 h-4 text-gray-600 group-hover:text-gray-900 transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Character Icon */}
          {character && (
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 p-3 flex items-center justify-center transform transition-all duration-700 ${
                  isAnimated ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
                }`}
                style={{
                  border: '3px solid white',
                  boxShadow: 'inset 0 0 0 2px rgb(59, 130, 246), 0 8px 16px rgba(0, 0, 0, 0.1)'
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
                <h3 className="text-lg font-semibold text-gray-900">
                  {strings.virtualCompanion.greeting} {character.name}! 👋
                </h3>
                <p className="text-xs text-gray-600 capitalize">
                  {strings.virtualCompanion.yourCompanion} {character.category.replace('-', ' ')} {strings.virtualCompanion.companion}
                </p>
              </div>

              {/* Quote */}
              <div
                className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 transform transition-all duration-700 delay-300 ${
                  isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
                style={{
                  border: '1px solid rgb(59, 130, 246)',
                }}
              >
                <p className="text-gray-700 text-center text-sm leading-relaxed">
                  {quote}
                </p>
              </div>

              {/* Gambatte Message */}
              <div
                className={`text-center transform transition-all duration-700 delay-500 ${
                  isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              >
                <p className="text-blue-600 font-medium text-lg">
                  {strings.virtualCompanion.gambaruMessage}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {strings.virtualCompanion.gambaruTranslation}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                className={`px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 ${
                  isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: '700ms' }}
              >
                {strings.virtualCompanion.thankYou} ✨
              </button>
            </div>
          )}

          {/* Footer Section */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  router.push('/account');
                }}
                className="group flex flex-col items-center gap-1 py-2 px-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-base">👤</span>
                </div>
                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{strings.nav.account}</span>
              </button>
              
              <button
                onClick={() => {
                  onClose();
                  router.push('/settings');
                }}
                className="group flex flex-col items-center gap-1 py-2 px-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-base">⚙️</span>
                </div>
                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{strings.nav.settings}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}