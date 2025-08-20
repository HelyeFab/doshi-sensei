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
        className="fixed top-4 left-4 z-40 w-16 h-16 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center transition-all duration-300 hover:scale-110 group shadow-lg"
        style={{
          border: '2px solid white',
          boxShadow: 'inset 0 0 0 1px rgb(59, 130, 246), 0 6px 20px rgba(0, 0, 0, 0.2)',
          animation: 'float 3s ease-in-out infinite'
        }}
        aria-label={strings.tooltips.openVirtualCompanion}
        title={strings.tooltips.sayHelloToCompanion}
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
          className="absolute inset-0 rounded-full border-2 border-blue-500/50 animate-ping"
          style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
        />

        {/* Glowing effect on hover */}
        <div
          className="absolute inset-0 rounded-full bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            boxShadow: '0 0 20px rgb(59, 130, 246)',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}
        />

        {/* Sparkle effect */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-75 animate-pulse"
             style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} />
      </button>

      {/* Add custom styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 20px rgb(59, 130, 246); }
          100% { box-shadow: 0 0 30px rgb(59, 130, 246), 0 0 40px rgb(59, 130, 246); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}