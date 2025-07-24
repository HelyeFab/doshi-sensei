'use client';

import { useEffect, useState, useRef } from 'react';
import { TranscriptLine } from '../page';

interface YouTubeTranscriptExtractorProps {
  videoId: string;
  onTranscriptExtracted: (transcript: TranscriptLine[]) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubeTranscriptExtractor({ 
  videoId, 
  onTranscriptExtracted,
  onError 
}: YouTubeTranscriptExtractorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Setup callback for when API is ready
    window.onYouTubeIframeAPIReady = initializePlayer;

    // If API is already loaded
    if (window.YT && window.YT.Player) {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const initializePlayer = () => {
    if (!containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '0',
      width: '0',
      videoId: videoId,
      events: {
        onReady: onPlayerReady,
        onError: handlePlayerError
      }
    });
  };

  const onPlayerReady = async (event: any) => {
    try {
      const player = event.target;
      
      // Try to get caption tracks
      const captionTracks = player.getOption('captions', 'tracklist');
      
      if (!captionTracks || captionTracks.length === 0) {
        // Try alternative method - fetch from YouTube directly
        await fetchTranscriptFromYouTube();
        return;
      }

      // Look for Japanese tracks
      const jaTrack = captionTracks.find((track: any) => 
        track.languageCode === 'ja' || 
        track.languageCode === 'ja-JP' ||
        track.displayName?.includes('日本語')
      );

      if (jaTrack) {
        // Unfortunately, YouTube IFrame API doesn't provide direct access to caption content
        // We need to use alternative methods
        await fetchTranscriptFromYouTube();
      } else {
        onError('No Japanese captions available for this video');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error accessing captions:', error);
      await fetchTranscriptFromYouTube();
    }
  };

  const fetchTranscriptFromYouTube = async () => {
    try {
      setIsLoading(true);
      
      // Use the new unified endpoint
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://yt-dl.onrender.com';
      const response = await fetch(`${backendUrl}/extract-youtube-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          preferCaptions: true
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.transcript) {
        // Successfully got transcript!
        onTranscriptExtracted(data.transcript);
        setIsLoading(false);
        return;
      }
      
      // No captions found, show helpful message
      let errorMessage = 'No Japanese captions found for this video.\n\n';
      
      if (data.methods) {
        // Show which methods were tried
        errorMessage += 'Methods attempted:\n';
        if (data.methods.youtubeApi) {
          errorMessage += `• YouTube API: ${data.methods.youtubeApi.error || 'No captions'}\n`;
        }
        if (data.methods.ytDlpSubtitles) {
          errorMessage += `• yt-dlp: ${data.methods.ytDlpSubtitles.error || 'No subtitles'}\n`;
        }
      }
      
      errorMessage += '\nAlternatives:\n';
      errorMessage += '1. Upload the audio file for AI transcription\n';
      errorMessage += '2. Use manual subtitle upload if you have an SRT/VTT file\n';
      errorMessage += '3. Try a different video with Japanese captions';
      
      onError(errorMessage);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      onError('Failed to connect to subtitle extraction service. Please try again later.');
      setIsLoading(false);
    }
  };

  const handlePlayerError = (event: any) => {
    console.error('YouTube player error:', event);
    onError('Failed to load YouTube video');
    setIsLoading(false);
  };

  // Alternative approach: Manual subtitle input
  const handleManualSubtitleInput = (subtitleText: string) => {
    try {
      // Parse SRT or VTT format
      const lines = subtitleText.split('\n');
      const transcript: TranscriptLine[] = [];
      let currentEntry: any = {};
      let id = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if it's a timestamp line (SRT/VTT format)
        if (line.includes('-->')) {
          const [start, end] = line.split('-->').map(t => t.trim());
          currentEntry.startTime = parseTimestamp(start);
          currentEntry.endTime = parseTimestamp(end);
        } else if (currentEntry.startTime !== undefined && !lines[i + 1]?.includes('-->')) {
          // This is subtitle text
          currentEntry.text = line;
          currentEntry.id = String(id++);
          currentEntry.words = line.split(/[\s、。！？]/g).filter(w => w.length > 0);
          
          transcript.push({ ...currentEntry });
          currentEntry = {};
        }
      }

      if (transcript.length > 0) {
        onTranscriptExtracted(transcript);
      }
    } catch (error) {
      console.error('Failed to parse subtitles:', error);
      onError('Failed to parse subtitle format');
    }
  };

  const parseTimestamp = (timestamp: string): number => {
    // Parse timestamps in format: 00:00:00,000 or 00:00:00.000
    const parts = timestamp.replace(',', '.').split(':');
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
  };

  return (
    <div>
      {/* Hidden YouTube player for API access */}
      <div ref={containerRef} style={{ display: 'none' }} />
      
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Attempting to extract YouTube captions...
          </p>
        </div>
      )}
    </div>
  );
}