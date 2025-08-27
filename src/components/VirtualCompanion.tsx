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
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface VirtualCompanionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VirtualCompanion({ isOpen, onClose }: VirtualCompanionProps) {
  const { settings, updateSetting } = useSettings();
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const { canInstall, install, isInstalling, isInstalled } = usePWAInstall();
  const [character, setCharacter] = useState<CompanionCharacter | null>(null);
  const [quote, setQuote] = useState<string>('');
  const [isAnimated, setIsAnimated] = useState(false);
  const [showDoshiModal, setShowDoshiModal] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  
  // Show banner if not installed (regardless of install prompt availability for now)
  const showInstallBanner = !isInstalled;
  
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

      {/* Modal - Relative positioning with flex container */}
      <div
        className={`relative bg-card rounded-2xl shadow-2xl border-2 border-border w-full max-w-md flex flex-col transition-all duration-500 ${isAnimated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
      >
        {/* Content wrapper */}
        <div className={`px-6 pt-6 ${showInstallBanner ? 'pb-0' : 'pb-4'} flex-shrink-0`}>
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
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-3 flex items-center justify-center transform transition-all duration-700 border-4 border-card shadow-lg ${isAnimated ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
                }`}
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
              <h3 className="text-lg font-semibold text-card-foreground">
                Hello from {character.name}! 👋
              </h3>
              <p className="text-xs text-muted-foreground capitalize">
                Your {character.category.replace('-', ' ')} Companion
              </p>
            </div>

            {/* Quote */}
            <div
              className={`bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-3 transform transition-all duration-700 delay-300 border border-primary/20 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
            >
              <p className="text-card-foreground text-center text-sm leading-relaxed">
                {quote}
              </p>
            </div>

            {/* Gambatte Message */}
            <div
              className={`text-center transform transition-all duration-700 delay-500 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
            >
              <p className="text-primary font-medium japanese-text text-base">
                頑張ってください！
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                (Gambatte kudasai! - Good luck!)
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className={`px-5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              style={{ transitionDelay: '700ms' }}
            >
              Thank you! ✨
            </button>
          </div>
        )}

        {/* Footer Section */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                onClose();
                router.push('/account');
              }}
              className="group flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-base">👤</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Account</span>
            </button>
            
            <button
              onClick={() => {
                onClose();
                router.push('/settings');
              }}
              className="group flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-base">⚙️</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Settings</span>
            </button>
            
            <button
              onClick={() => setShowDoshiModal(true)}
              className="group flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-base">🌸</span>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Dōshi Sensei</span>
            </button>
            
            {user ? (
              <button
                onClick={handleSignOut}
                className="group flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-base">👋</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  router.push('/login');
                }}
                className="group flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl hover:bg-muted/50 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-base">🔑</span>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Sign In</span>
              </button>
            )}
          </div>
        </div>
        </div>{/* End of content wrapper */}

        {/* PWA Install Banner - Only show if app is not installed */}
        {showInstallBanner && (
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 border-t border-border/50 rounded-b-2xl flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">Install App</p>
                  <p className="text-xs text-muted-foreground">Quick access from home</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (canInstall) {
                    install();
                  } else {
                    // Show install guide modal instead of alert
                    setShowInstallGuide(true);
                  }
                }}
                disabled={isInstalling}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
              >
                {isInstalling ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Installing</span>
                  </>
                ) : (
                  canInstall ? 'Install' : 'How to Install'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Doshi Sensei Info Modal */}
      <SlideUpModal
        isOpen={showDoshiModal}
        onClose={() => setShowDoshiModal(false)}
        title="About Dōshi Sensei"
        height="auto"
        showHandle={false}
      >
        <div className="px-6 py-6">
          <div className="flex flex-col items-center space-y-4">
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

      {/* PWA Install Guide Modal */}
      <SlideUpModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        title="How to Install Dōshi Sensei"
        height="auto"
        showHandle={false}
      >
        <div className="px-6 py-6">
          <div className="space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Install the app for quick access from your home screen and offline support!
              </p>

              {/* Chrome */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  <h3 className="font-semibold text-foreground">Chrome / Edge</h3>
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-7">
                  <li>Look for the install icon in the address bar</li>
                  <li>Click it and select "Install"</li>
                  <li>Or click the ⋯ menu → Apps → Install this site</li>
                </ol>
              </div>

              {/* Safari */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍎</span>
                  <h3 className="font-semibold text-foreground">Safari (iOS)</h3>
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-7">
                  <li>Tap the Share button (box with arrow)</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Name it and tap "Add"</li>
                </ol>
              </div>

              {/* Android */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <h3 className="font-semibold text-foreground">Android</h3>
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-7">
                  <li>Tap the ⋮ menu in your browser</li>
                  <li>Select "Add to Home screen"</li>
                  <li>Name it and tap "Add"</li>
                </ol>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02]"
            >
              Got it! 👍
            </button>
          </div>
        </div>
      </SlideUpModal>
    </div>
  );
}