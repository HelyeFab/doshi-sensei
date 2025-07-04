'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Simulate loading with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Start fade out
          setFadeOut(true);
          // Complete after fade animation
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Minimum splash screen time
    const minTimeout = setTimeout(() => {
      if (progress < 100) {
        setProgress(100);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(minTimeout);
    };
  }, [onComplete, progress]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Main Logo/Image in Oval */}
      <div className="relative mb-8">
        <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-primary/20">
          <Image
            src="/doshi.png"
            alt="Doshi Sensei"
            width={192}
            height={192}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* Logo overlay */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <span className="text-xl font-bold text-primary-foreground japanese-text">動</span>
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground app-name mb-2">
          Doshi Sensei
        </h1>
        <p className="text-lg text-muted-foreground japanese-text mb-2">
          動詞 先生
        </p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Master Japanese Conjugations
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-64 h-2 bg-primary/20 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Loading Text */}
      <p className="text-sm text-muted-foreground">
        {progress < 30 ? 'Initializing...' :
         progress < 60 ? 'Loading resources...' :
         progress < 90 ? 'Almost ready...' :
         'Starting app...'}
      </p>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-primary/40 rounded-full animate-pulse delay-300"></div>
      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-primary/20 rounded-full animate-pulse delay-700"></div>
    </div>
  );
}
