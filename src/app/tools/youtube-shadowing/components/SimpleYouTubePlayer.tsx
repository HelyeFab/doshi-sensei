'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleYouTubePlayerProps {
  videoId: string | null;
  className?: string;
}

export default function SimpleYouTubePlayer({ videoId, className }: SimpleYouTubePlayerProps) {
  if (!videoId) {
    return (
      <div className={cn("flex items-center justify-center h-64 bg-gray-100 rounded-lg", className)}>
        <p className="text-gray-500">No video to display</p>
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-video bg-black rounded-lg overflow-hidden", className)}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}