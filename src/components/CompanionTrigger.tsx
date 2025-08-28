'use client';

import { usePathname } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { useVirtualCompanion } from '@/contexts/VirtualCompanionContext';

export default function CompanionTrigger() {
  const strings = useStrings();
  const pathname = usePathname();
  const { openCompanion } = useVirtualCompanion();

  // Hide the companion trigger on homepage
  if (pathname === '/') {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={openCompanion}
        className="fixed top-4 left-4 z-40 w-16 h-16 rounded-full bg-card hover:bg-muted flex items-center justify-center transition-all duration-300 hover:scale-110 group shadow-lg border-2 border-primary"
        style={{
          animation: 'float 3s ease-in-out infinite'
        }}
        aria-label={strings.tooltips.openVirtualCompanion}
        title={strings.tooltips.sayHelloToCompanion}
      >
        {/* Red Panda Mascot */}
        <div className="w-10 h-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
          <img
            src="/doshi.png"
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
            animation: 'glow 2s ease-in-out infinite alternate'
          }}
        />

        {/* Sparkle effect */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full opacity-75 animate-pulse"
             style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} />
      </button>

      {/* Add custom styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 20px hsl(var(--primary)); }
          100% { box-shadow: 0 0 30px hsl(var(--primary)), 0 0 40px hsl(var(--primary)); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}