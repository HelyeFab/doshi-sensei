'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Minimum splash screen time
    const timeout = setTimeout(() => {
      setFadeOut(true);
      // Complete after fade animation
      setTimeout(onComplete, 500);
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'hsl(271, 81%, 56%)' }}
    >
      <div className="text-center">
        <img 
          src="/doshi.png" 
          alt="DōshiSensei" 
          className="w-32 h-32 mx-auto mb-8"
          style={{ 
            filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))'
          }}
        />
        <h1 
          className="text-5xl font-extrabold mb-3 font-manrope"
          style={{ 
            color: 'hsl(25, 95%, 53%)',
            letterSpacing: '-0.02em'
          }}
        >
          DōshiSensei
        </h1>
        <p className="text-lg text-white/90 mb-8 font-medium">動詞先生</p>
        <div className="flex items-center justify-center gap-3" style={{ height: '20px' }}>
          <span 
            className="inline-block w-2.5 h-2.5 bg-white rounded-full"
            style={{ 
              animation: 'pulse-dot 1.4s ease-in-out infinite',
              animationDelay: '0s'
            }}
          />
          <span 
            className="inline-block w-2.5 h-2.5 bg-white rounded-full"
            style={{ 
              animation: 'pulse-dot 1.4s ease-in-out infinite',
              animationDelay: '0.2s'
            }}
          />
          <span 
            className="inline-block w-2.5 h-2.5 bg-white rounded-full"
            style={{ 
              animation: 'pulse-dot 1.4s ease-in-out infinite',
              animationDelay: '0.4s'
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse-dot {
          0%, 60%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          30% {
            transform: scale(1.5);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
