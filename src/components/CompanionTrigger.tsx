'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import VirtualCompanion from './VirtualCompanion';

export default function CompanionTrigger() {
  const { settings, isLoading } = useSettings();
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  const handleOpenCompanion = () => {
    setIsCompanionOpen(true);
  };

  const handleCloseCompanion = () => {
    setIsCompanionOpen(false);
  };

  // Don't render anything if settings are loading or showCompanion is disabled
  if (isLoading || !settings.showCompanion) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpenCompanion}
        className="absolute top-4 left-4 z-40 w-16 h-16 rounded-full bg-card hover:bg-card/80 flex items-center justify-center transition-all duration-300 hover:scale-110 group shadow-lg animate-bounce-gentle"
        style={{
          border: '2px solid white',
          boxShadow: 'inset 0 0 0 1px var(--primary), 0 6px 20px rgba(0, 0, 0, 0.2)',
          animation: 'float 3s ease-in-out infinite'
        }}
        aria-label="Open virtual companion"
        title="Say hello to your companion! 🦒"
      >
        {/* Giraffe Icon */}
        <div className="w-10 h-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
          <img
            src="/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg"
            alt="Virtual Companion"
            className="w-full h-full object-contain"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}
          />
        </div>

        {/* Pulsing ring animation */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping"
          style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
        />

        {/* Glowing effect on hover */}
        <div
          className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            boxShadow: '0 0 20px var(--primary)',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}
        />

        {/* Sparkle effect */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-75 animate-pulse"
             style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} />
      </button>

      {/* Virtual Companion Modal */}
      <VirtualCompanion
        isOpen={isCompanionOpen}
        onClose={handleCloseCompanion}
      />
    </>
  );
}
