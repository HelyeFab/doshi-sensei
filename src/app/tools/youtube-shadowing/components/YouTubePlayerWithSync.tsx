'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TranscriptLine } from '../YouTubeShadowing';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerWithSyncProps {
  videoId: string;
  transcript: TranscriptLine[];
  currentLineIndex: number;
  onLineChange: (index: number) => void;
}

export default function YouTubePlayerWithSync({ 
  videoId, 
  transcript,
  currentLineIndex,
  onLineChange
}: YouTubePlayerWithSyncProps) {
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (!playerRef.current && videoId) {
        initializePlayer();
      }
    };

    // If API is already loaded
    if (window.YT && window.YT.Player && !playerRef.current) {
      initializePlayer();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const initializePlayer = () => {
    playerRef.current = new window.YT.Player('youtube-player', {
      videoId: videoId,
      height: '100%',
      width: '100%',
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        cc_load_policy: 1, // Show captions by default
        cc_lang_pref: 'ja', // Prefer Japanese captions
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handleStateChange
      }
    });
  };

  const handlePlayerReady = () => {
    setIsReady(true);

  };

  const handleStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      startSyncInterval();
    } else {
      setIsPlaying(false);
      stopSyncInterval();
    }
  };

  const startSyncInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        updateCurrentLine(currentTime);
      }
    }, 250); // Check 4 times per second for smooth sync
  };

  const stopSyncInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const updateCurrentLine = (currentTime: number) => {
    const activeIndex = transcript.findIndex(
      line => currentTime >= line.startTime && currentTime < line.endTime
    );
    
    if (activeIndex !== -1 && activeIndex !== currentLineIndex) {
      onLineChange(activeIndex);
    }
  };

  // Jump to specific line
  const seekToLine = useCallback((lineIndex: number) => {
    if (playerRef.current && transcript[lineIndex]) {
      playerRef.current.seekTo(transcript[lineIndex].startTime, true);
    }
  }, [transcript]);

  // Play/pause specific line
  const playLine = useCallback((lineIndex: number) => {
    if (playerRef.current && transcript[lineIndex]) {
      const line = transcript[lineIndex];
      playerRef.current.seekTo(line.startTime, true);
      playerRef.current.playVideo();
      
      // Auto-pause at end of line
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
      }, (line.endTime - line.startTime) * 1000);
    }
  }, [transcript]);

  // Repeat current line
  const repeatCurrentLine = useCallback(() => {
    playLine(currentLineIndex);
  }, [currentLineIndex, playLine]);

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <div id="youtube-player" className="absolute inset-0" />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white">Loading YouTube player...</div>
          </div>
        )}
      </div>
      
      {/* Player Controls */}
      <div className="flex items-center gap-4 justify-center">
        <button
          onClick={() => seekToLine(Math.max(0, currentLineIndex - 1))}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={currentLineIndex === 0}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={repeatCurrentLine}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Repeat Line
        </button>
        
        <button
          onClick={() => seekToLine(Math.min(transcript.length - 1, currentLineIndex + 1))}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={currentLineIndex === transcript.length - 1}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Current Line Display */}
      {transcript[currentLineIndex] && (
        <div className="bg-gray-100 p-6 rounded-xl text-center">
          <p className="text-2xl font-medium text-gray-900">
            {transcript[currentLineIndex].text}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Line {currentLineIndex + 1} of {transcript.length}
          </p>
        </div>
      )}
    </div>
  );
}