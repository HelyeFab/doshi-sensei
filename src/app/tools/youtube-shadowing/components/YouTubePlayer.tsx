'use client';

import { useEffect, useRef } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export default function YouTubePlayer({ videoUrl, onReady, onTimeUpdate }: YouTubePlayerProps) {
  const playerRef = useRef<HTMLIFrameElement>(null);
  
  // Extract video ID from URL
  const getVideoId = (url: string): string | null => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(videoUrl);

  useEffect(() => {
    if (onReady) {
      // Simple ready callback after iframe loads
      const timer = setTimeout(onReady, 1000);
      return () => clearTimeout(timer);
    }
  }, [videoId, onReady]);

  if (!videoId) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        ref={playerRef}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}