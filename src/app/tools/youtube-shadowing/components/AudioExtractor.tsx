'use client';

import { useEffect, useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';

interface AudioExtractorProps {
  videoUrl: string;
  onAudioExtracted: (audioUrl: string, title?: string) => void;
}

export default function AudioExtractor({ videoUrl, onAudioExtracted }: AudioExtractorProps) {
  const [status, setStatus] = useState<'idle' | 'extracting' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const strings = useStrings();

  useEffect(() => {
    extractAudio();
  }, [videoUrl]);

  const extractAudio = async () => {
    setStatus('extracting');
    setError(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Call your audio extraction API
      const response = await fetch('https://yt-audio-api-d432.onrender.com/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to extract audio');
      }

      // The API returns the audio file directly
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Extract video ID from URL for title (temporary)
      const videoIdMatch = videoUrl.match(/[?&]v=([^&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : 'Unknown';
      const videoTitle = `YouTube Video ${videoId}`;

      setProgress(100);
      setStatus('completed');
      
      // Notify parent component with the blob URL
      setTimeout(() => {
        onAudioExtracted(audioUrl, videoTitle);
      }, 500);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to extract audio');
      console.error('Audio extraction error:', err);
    }
  };

  const retry = () => {
    setProgress(0);
    extractAudio();
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="font-medium text-foreground mb-4">{strings.youtubeShadowing?.extractingAudio || 'Extracting Audio'}</h3>
      
      {status === 'extracting' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-muted-foreground">{strings.youtubeShadowing?.extractingMessage || 'Extracting audio from YouTube...'}</span>
          </div>
          
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            {strings.youtubeShadowing?.extractingNote || 'This may take a minute depending on the video length'}
          </p>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center gap-3 text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{strings.youtubeShadowing?.extractSuccess || 'Audio extracted successfully!'}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {strings.youtubeShadowing?.extractErrorNote || 'Make sure the video is public and not age-restricted'}
              </p>
            </div>
          </div>
          
          <button
            onClick={retry}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {strings.youtubeShadowing?.tryAgain || 'Try again'}
          </button>
        </div>
      )}

    </div>
  );
}