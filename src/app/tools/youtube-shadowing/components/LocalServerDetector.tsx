'use client';

import { useEffect, useState } from 'react';

interface LocalServerDetectorProps {
  onServerDetected: (isAvailable: boolean) => void;
}

export default function LocalServerDetector({ onServerDetected }: LocalServerDetectorProps) {
  const [checking, setChecking] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  
  useEffect(() => {
    checkLocalServer();
    
    // Re-check every 5 seconds
    const interval = setInterval(checkLocalServer, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const checkLocalServer = async () => {
    try {
      const response = await fetch('http://localhost:8080/health', {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      
      if (response.ok) {
        setIsAvailable(true);
        onServerDetected(true);
      } else {
        setIsAvailable(false);
        onServerDetected(false);
      }
    } catch (error) {
      setIsAvailable(false);
      onServerDetected(false);
    } finally {
      setChecking(false);
    }
  };
  
  if (checking) {
    return null;
  }
  
  if (isAvailable) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-sm text-green-800 font-medium">
            Local server detected - YouTube extraction will work perfectly!
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium mb-1">
              YouTube blocking detected
            </p>
            <p className="text-sm text-amber-700 mb-2">
              For reliable YouTube extraction, run our local helper on your computer:
            </p>
            <ol className="text-sm text-amber-700 space-y-1 ml-4">
              <li>1. Install yt-dlp: <code className="bg-amber-100 px-1 rounded">pip install yt-dlp</code></li>
              <li>2. Download and run our local server</li>
              <li>3. Keep it running while using this feature</li>
            </ol>
            <div className="mt-3 flex items-center gap-3">
              <a
                href="/yt-dl/ytdl-local-server.js"
                download
                className="inline-flex items-center gap-2 text-sm bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Download Local Helper
              </a>
              <a
                href="https://github.com/yt-dlp/yt-dlp#installation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-700 hover:text-amber-800 underline"
              >
                yt-dlp installation guide
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}