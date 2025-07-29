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
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SlideUpModal from '@/components/SlideUpModal';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface VirtualCompanionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VirtualCompanion({ isOpen, onClose }: VirtualCompanionProps) {
  const { settings, updateSetting } = useSettings();
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const [character, setCharacter] = useState<CompanionCharacter | null>(null);
  const [quote, setQuote] = useState<string>('');
  const [isAnimated, setIsAnimated] = useState(false);
  const [showDoshiModal, setShowDoshiModal] = useState(false);
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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

        {/* Footer Section */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => {
                onClose();
                router.push('/account');
              }}
              className="group flex flex-col items-center gap-1 py-3 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-xl">👤</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Account</span>
            </button>
            
            <button
              onClick={() => {
                onClose();
                router.push('/settings');
              }}
              className="group flex flex-col items-center gap-1 py-3 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-xl">⚙️</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Settings</span>
            </button>
            
            <button
              onClick={() => setShowDoshiModal(true)}
              className="group flex flex-col items-center gap-1 py-3 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-xl">🌸</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Dōshi Sensei</span>
            </button>
            
            {user && (
              <button
                onClick={handleSignOut}
                className="group flex flex-col items-center gap-1 py-3 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-xl">👋</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Doshi Sensei Info Modal */}
      <SlideUpModal
        isOpen={showDoshiModal}
        onClose={() => setShowDoshiModal(false)}
        title="About Dōshi Sensei"
        height="auto"
        showHandle={false}
      >
        <div className="px-6 py-8">
          <div className="flex flex-col items-center space-y-6">
            {/* Profile Picture */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
              <Image
                src="/doshi-emma.JPG"
                alt="Dōshi Sensei"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Description */}
            <div className="text-center space-y-4 text-muted-foreground max-w-md">
              <p className="text-foreground font-medium">
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
              <p className="text-sm italic pt-4 border-t border-border">
                "Dōshi" (動詞) means "verb" in Japanese, reflecting our origins as a conjugation practice app that has grown into a full-featured learning platform.
              </p>
              <p className="font-semibold text-foreground text-lg">
                Welcome.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowDoshiModal(false)}
              className="mt-4 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
            >
              Got it! ✨
            </button>
          </div>
        </div>
      </SlideUpModal>
    </div>
  );
}
