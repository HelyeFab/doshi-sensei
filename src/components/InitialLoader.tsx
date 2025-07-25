'use client';

import { useEffect, useState } from 'react';

export default function InitialLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if this is the first load
    const hasLoadedBefore = sessionStorage.getItem('app-loaded');
    
    if (hasLoadedBefore) {
      // App has loaded in this session, don't show loader
      setIsLoading(false);
      return;
    }

    // Show loader for at least 1.5 seconds for smooth experience
    const minLoadTime = 1500;
    const startTime = Date.now();

    const handleLoad = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadTime - elapsedTime);

      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setIsLoading(false);
          sessionStorage.setItem('app-loaded', 'true');
        }, 300); // Fade out duration
      }, remainingTime);
    };

    // Wait for window load or timeout
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      // Fallback timeout
      const timeout = setTimeout(handleLoad, 3000);
      
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timeout);
      };
    }
  }, []);

  if (!isLoading) return null;

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-[10000] transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'hsl(271, 81%, 56%)' }}
    >
      <div className="text-center">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full blur-3xl opacity-20" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full blur-3xl opacity-20" />
        </div>
        
        <div className="relative">
          {/* Animated background circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-white rounded-full blur-2xl opacity-20 animate-pulse" />
          </div>
          
          {/* Doshi character with subtle animation */}
          <img 
            src="/doshi.png" 
            alt="DōshiSensei" 
            className="relative w-32 h-32 mx-auto mb-8"
            style={{
              animation: 'float 3s ease-in-out infinite',
              filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))'
            }}
          />
        </div>
        
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
        
        {/* Elegant loading bar */}
        <div className="w-48 mx-auto mb-4">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{
                animation: 'loading 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        
        <p className="text-sm text-white/70">Master Japanese Conjugations</p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0;
          }
          50% {
            width: 100%;
            margin-left: 0;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}