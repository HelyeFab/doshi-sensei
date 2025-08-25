'use client';

import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import Image from 'next/image';

export default function TestSplashPage() {
  const [showSplash, setShowSplash] = useState(false);
  const [duration, setDuration] = useState(2);

  const handleShowSplash = () => {
    setShowSplash(true);
    // Reset after the duration
    setTimeout(() => {
      setShowSplash(false);
    }, duration * 1000 + 500); // Add 500ms for fade out
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Test Controls */}
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Splash Screen Test Page</h1>
        
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">React Component Version</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            
            <button
              onClick={handleShowSplash}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
            >
              Show Splash Screen
            </button>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Shows the React component version with Framer Motion animations</p>
            <p>• Used when the app loads in the browser</p>
            <p>• Automatically hides after {duration} seconds</p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Static HTML Version</h2>
          
          <div className="space-y-4">
            <a
              href="/splash.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg font-medium transition-colors"
            >
              Open Static Splash Screen
            </a>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Pure HTML/CSS version for faster loading</p>
              <p>• Used for PWA launch screens</p>
              <p>• Opens in a new tab</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Preview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Mobile View</h3>
              <div className="relative w-full h-96 bg-gradient-to-br from-primary via-accent to-secondary rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Image
                      src="/doshi.png"
                      alt="Dōshi Sensei"
                      width={80}
                      height={80}
                      className="mx-auto mb-4"
                    />
                    <p className="text-white text-lg font-semibold">Dōshi Sensei</p>
                    <p className="text-white/90 text-sm">Master Japanese, One Step at a Time</p>
                    <div className="flex justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
                {/* Background kanji */}
                <div className="absolute top-4 left-4 text-6xl text-white/10 font-bold">道</div>
                <div className="absolute bottom-4 right-4 text-6xl text-white/10 font-bold">師</div>
                <div className="absolute top-1/3 right-8 text-5xl text-white/10 font-bold">先</div>
                <div className="absolute bottom-1/3 left-8 text-5xl text-white/10 font-bold">生</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">Beautiful gradient background</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">Animated Dōshi mascot</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">Floating kanji characters (道, 師, 先, 生)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">Loading dots animation</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">Smooth fade-out transition</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">Mobile-optimized responsive design</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">PWA-ready with Apple device support</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Implementation Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-foreground mb-2">Files:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">/src/components/SplashScreen.tsx</code></li>
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">/public/splash.html</code></li>
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">/src/components/SplashScreenMeta.tsx</code></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-foreground mb-2">Usage:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Integrated in <code className="text-xs bg-muted px-1 py-0.5 rounded">layout.tsx</code></li>
                <li>• Shows for 2 seconds on app load</li>
                <li>• Cached by service worker for offline use</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Show the actual splash screen when triggered */}
      {showSplash && <SplashScreen duration={duration * 1000} forceShow={true} />}
    </div>
  );
}