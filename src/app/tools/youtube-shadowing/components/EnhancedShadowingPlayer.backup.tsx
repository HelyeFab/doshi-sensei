'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShadowingSession, TranscriptLine } from '../YouTubeShadowing';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Settings, ChevronLeft, ChevronRight, Video, AudioLines } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { AIExplanationTrigger } from '@/components/AIExplanation';
import { generateFuriganaWithCache } from '@/utils/furigana';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface EnhancedShadowingPlayerProps {
  session: ShadowingSession;
  onLineChange: (index: number) => void;
  showVideo?: boolean;
  showFurigana?: boolean;
  onToggleFurigana?: () => void;
}

export default function EnhancedShadowingPlayer({ 
  session, 
  onLineChange,
  showVideo = true,
  showFurigana = true,
  onToggleFurigana 
}: EnhancedShadowingPlayerProps) {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(3);
  const [pauseBetweenRepeats, setPauseBetweenRepeats] = useState(1500);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [activeRepeatNumber, setActiveRepeatNumber] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isYouTubeMode, setIsYouTubeMode] = useState(false);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const [displayMode, setDisplayMode] = useState<'video' | 'transcript'>('video');
  const [isLocalVideo, setIsLocalVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [currentLineFurigana, setCurrentLineFurigana] = useState<string>('');
  const [isPausingForRepeat, setIsPausingForRepeat] = useState(false);
  const [isInRepeatMode, setIsInRepeatMode] = useState(false);
  const [isHandlingRepeatEnd, setIsHandlingRepeatEnd] = useState(false);
  const [useFormattedTranscript, setUseFormattedTranscript] = useState(true); // Default to true - use AI when available
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const repeatMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const currentRepeatRef = useRef<number>(0);

  // Determine which transcript to use
  const hasFormattedTranscript = session.videoMetadata?.formattedTranscript && 
                                  session.videoMetadata?.formattedTranscript.length > 0;
  
  // Debug logging for formatted transcript
  useEffect(() => {

  }, [session.videoMetadata, useFormattedTranscript, hasFormattedTranscript]);
  
  const activeTranscript = (useFormattedTranscript && hasFormattedTranscript) 
    ? session.videoMetadata.formattedTranscript 
    : session.transcript;
  const currentLine = activeTranscript[session.currentLineIndex];

  // Sync currentRepeat state with ref to avoid closure issues
  useEffect(() => {
    currentRepeatRef.current = currentRepeat;
  }, [currentRepeat]);

  // Helper function to clean romaji from text
  const cleanRomaji = (text: string): string => {
    // More comprehensive romaji removal patterns
    let cleaned = text;
    
    // Pattern 1: Remove standalone romaji words (only Latin characters)
    cleaned = cleaned.replace(/\b[a-zA-Z]+\b/g, (match) => {
      // Keep uppercase abbreviations like "OK", "AI", etc.
      if (match === match.toUpperCase() && match.length <= 3) {
        return match;
      }
      // Remove lowercase romaji
      return '';
    });
    
    // Pattern 2: Remove romaji that appears after Japanese characters
    cleaned = cleaned.replace(/([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF])\s*[a-z]+/gi, '$1');
    
    // Pattern 3: Remove romaji at the beginning of lines
    cleaned = cleaned.replace(/^[a-z]+\s*/gmi, '');
    
    // Pattern 4: Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // Generate furigana for current line
  useEffect(() => {
    const generateFurigana = async () => {
      if (!currentLine) {
        setCurrentLineFurigana('');
        return;
      }
      
      // Clean romaji from the text first
      const cleanedText = cleanRomaji(currentLine.text);
      
      if (!showFurigana) {
        setCurrentLineFurigana(cleanedText);
        return;
      }

      try {
        const withFurigana = await generateFuriganaWithCache(cleanedText);
        setCurrentLineFurigana(withFurigana);
      } catch (error) {
        console.error('Failed to generate furigana:', error);
        setCurrentLineFurigana(cleanedText);
      }
    };

    generateFurigana();
  }, [currentLine, showFurigana]);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = session.videoUrl ? extractVideoId(session.videoUrl) : null;

  // Determine if we're in YouTube mode or local video mode
  useEffect(() => {
    const isYT = (session.audioUrl === 'youtube-player' || !session.audioUrl) && videoId;
    const isLocal = session.videoUrl?.startsWith('blob:') || session.videoUrl?.startsWith('data:');
    
    setIsYouTubeMode(!!isYT);
    setIsLocalVideo(!!isLocal);
    
    if ((isYT || isLocal) && showVideo) {
      setDisplayMode('video');
    }
  }, [session.audioUrl, videoId, showVideo, session.videoUrl]);

  // Initialize YouTube player
  useEffect(() => {
    if (isYouTubeMode && showVideo && videoId && displayMode === 'video') {
      // Destroy existing player if any
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
        setIsYouTubeReady(false);
      }

      // Load YouTube IFrame API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initializeYouTubePlayer();
      };

      // If API is already loaded
      if (window.YT && window.YT.Player) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initializeYouTubePlayer();
        }, 100);
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      if (lineEndTimeoutRef.current) {
        clearTimeout(lineEndTimeoutRef.current);
      }
      if (repeatMonitorRef.current) {
        clearInterval(repeatMonitorRef.current);
      }
    };
  }, [isYouTubeMode, showVideo, videoId, displayMode]);

  // Initialize audio element
  useEffect(() => {
    if (!isYouTubeMode && !isLocalVideo && session.audioUrl && !audioRef.current) {
      const audio = new Audio(session.audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.volume = volume;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', handleAudioTimeUpdate);
      audio.addEventListener('ended', handleAudioEnded);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));

      return () => {
        audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
        audio.removeEventListener('ended', handleAudioEnded);
        audio.removeEventListener('play', () => setIsPlaying(true));
        audio.removeEventListener('pause', () => setIsPlaying(false));
        audio.pause();
      };
    }
  }, [isYouTubeMode, isLocalVideo, session.audioUrl]);

  // Initialize local video element when it's rendered
  useEffect(() => {
    if (isLocalVideo && localVideoRef.current && session.videoUrl) {
      // Force reload the video source
      localVideoRef.current.load();

    }
  }, [isLocalVideo, session.videoUrl]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    } else if (youtubePlayerRef.current && youtubePlayerRef.current.setPlaybackRate) {
      youtubePlayerRef.current.setPlaybackRate(playbackSpeed);
    } else if (localVideoRef.current) {
      localVideoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    } else if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
      youtubePlayerRef.current.setVolume(volume * 100);
    } else if (localVideoRef.current) {
      localVideoRef.current.volume = volume;
    }
  }, [volume]);

  const initializeYouTubePlayer = () => {
    // Ensure the DOM element exists before creating the player
    const playerElement = document.getElementById('enhanced-youtube-player');
    if (!playerElement) {

      setTimeout(() => {
        if (isYouTubeMode && displayMode === 'video') {
          initializeYouTubePlayer();
        }
      }, 200);
      return;
    }

    try {
      youtubePlayerRef.current = new window.YT.Player('enhanced-youtube-player', {
        videoId: videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          controls: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          cc_load_policy: 1,
          cc_lang_pref: 'ja',
          playsinline: 1,
          disablekb: 0,
          fs: 1,
          iv_load_policy: 3, // Disable annotations
          widget_referrer: window.location.origin
        },
        events: {
          onReady: handleYouTubeReady,
          onStateChange: handleYouTubeStateChange
        }
      });
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
    }
  };

  const handleYouTubeReady = () => {
    setIsYouTubeReady(true);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setPlaybackRate(playbackSpeed);
      youtubePlayerRef.current.setVolume(volume * 100);
    }
  };

  const handleYouTubeStateChange = (event: any) => {

    // Ignore state changes while handling repeat end or in repeat mode
    if (isHandlingRepeatEnd || (repeatCount > 1)) {

      return;
    }
    
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      // Only start automatic sync when NOT in repeat mode
      if (repeatCount <= 1 && !isPausingForRepeat && currentRepeat === 0) {
        startYouTubeSync();
      }
    } else {
      setIsPlaying(false);
      stopYouTubeSync();
      
      // If paused, cancel any pending line-end timeout
      if (event.data === window.YT.PlayerState.PAUSED && lineEndTimeoutRef.current) {
        clearTimeout(lineEndTimeoutRef.current);
        lineEndTimeoutRef.current = null;
      }
    }
  };

  const startYouTubeSync = () => {
    // Guard: never run sync while in repeat mode
    if (isInRepeatMode || repeatCount > 1 || isPausingForRepeat || currentRepeat > 0) {

      return;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // In normal mode, just track position for UI updates
    syncIntervalRef.current = setInterval(() => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime && isYouTubeReady) {
        try {
          const currentTime = youtubePlayerRef.current.getCurrentTime();
          updateCurrentLineByTime(currentTime);
        } catch (error) {
          console.error('Error getting YouTube current time:', error);
        }
      }
    }, 100);
  };

  const stopYouTubeSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  const updateCurrentLineByTime = (currentTime: number) => {
    // During repeat mode, don't allow automatic line changes
    if (isInRepeatMode || repeatCount > 1 || isPausingForRepeat || currentRepeat > 0) {

      return;
    }
    
    // Normal mode - allow line changes
    // Find the current line based on the playback time
    // Add a small buffer (0.1s) to handle timing inconsistencies
    const activeIndex = activeTranscript.findIndex(
      (line: TranscriptLine) => currentTime >= (line.startTime - 0.1) && currentTime < (line.endTime + 0.1)
    );
    
    // Only update if we found a valid line and it's different from current
    if (activeIndex !== -1 && activeIndex !== session.currentLineIndex) {

      onLineChange(activeIndex);
    } else if (activeIndex === -1 && currentTime > 0) {
      // If no line matches, find the closest previous line
      const closestIndex = activeTranscript.findLastIndex(
        (line: TranscriptLine) => currentTime >= line.endTime
      );
      if (closestIndex !== -1 && closestIndex !== session.currentLineIndex) {
        // We're between lines, stay on the last completed line

        onLineChange(closestIndex);
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current || !currentLine || isPausingForRepeat) return;

    const currentTime = audioRef.current.currentTime;
    
    // Calculate effective end time considering next line
    const nextLineIndex = session.currentLineIndex + 1;
    const nextLine = nextLineIndex < activeTranscript.length ? activeTranscript[nextLineIndex] : null;
    let effectiveEndTime = currentLine.endTime;
    
    if (nextLine && Math.abs(nextLine.startTime - currentLine.endTime) < 0.5) {
      effectiveEndTime = nextLine.startTime - 0.05;
    }
    
    if (currentTime >= effectiveEndTime) {
      audioRef.current.pause();
      handleLineComplete();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!localVideoRef.current || !currentLine || isPausingForRepeat) return;

    const currentTime = localVideoRef.current.currentTime;
    updateCurrentLineByTime(currentTime);
    
    // Calculate effective end time considering next line
    const nextLineIndex = session.currentLineIndex + 1;
    const nextLine = nextLineIndex < activeTranscript.length ? activeTranscript[nextLineIndex] : null;
    let effectiveEndTime = currentLine.endTime;
    
    if (nextLine && Math.abs(nextLine.startTime - currentLine.endTime) < 0.5) {
      effectiveEndTime = nextLine.startTime - 0.05;
    }
    
    if (currentTime >= effectiveEndTime && repeatCount > 1) {
      localVideoRef.current.pause();
      handleLineComplete();
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleLineComplete = () => {
    const currentRep = currentRepeatRef.current;
    const nextRepeat = currentRep + 1;

    // Stop any ongoing sync to prevent advancing to next line
    stopYouTubeSync();
    
    if (nextRepeat < repeatCount) {
      // More repeats to go

      setCurrentRepeat(nextRepeat);
      setActiveRepeatNumber(nextRepeat + 1);
      setIsPausingForRepeat(true);
      
      repeatTimeoutRef.current = setTimeout(() => {

        playCurrentLine();
      }, pauseBetweenRepeats);
    } else {
      // All repeats done

      setCurrentRepeat(0);
      setActiveRepeatNumber(1);
      setIsInRepeatMode(false); // Clear repeat mode flag
      
      // Check if we should auto-advance to next line
      if (autoAdvance && session.currentLineIndex < activeTranscript.length - 1) {

        // Add a small delay before advancing
        setTimeout(() => {
          onLineChange(session.currentLineIndex + 1);
          // Start playing the next line after a brief pause
          setTimeout(() => {
            playCurrentLine();
          }, 500);
        }, 1000); // 1 second pause before advancing
      } else {
        setIsPlaying(false);
      }
    }
  };

  const playCurrentLine = () => {
    if (!currentLine) return;

    // Use the ref which always has the current value
    const repeatNum = currentRepeatRef.current + 1;

    setIsPausingForRepeat(false);
    
    // Set repeat mode flag when starting with repeats
    if (repeatCount > 1) {
      setIsInRepeatMode(true);
    }

    if (isYouTubeMode && youtubePlayerRef.current && isYouTubeReady) {
      // Stop any existing monitoring
      stopYouTubeSync();
      
      // Seek to start and play
      youtubePlayerRef.current.seekTo(currentLine.startTime, true);
      youtubePlayerRef.current.playVideo();
      setIsPlaying(true); // Ensure state is updated
      
      // For repeat mode, use a separate interval to check position
      if (repeatCount > 1) {
        // Clear any existing repeat monitor
        if (repeatMonitorRef.current) {
          clearInterval(repeatMonitorRef.current);
        }
        
        const checkInterval = setInterval(() => {
          if (!youtubePlayerRef.current || !isYouTubeReady || !currentLine) {
            clearInterval(checkInterval);
            repeatMonitorRef.current = null;
            return;
          }
          
          try {
            const currentTime = youtubePlayerRef.current.getCurrentTime();
            
            // Calculate the actual end time we should use
            // Check if there's a next line that starts very close to our end time
            const nextLineIndex = session.currentLineIndex + 1;
            const nextLine = nextLineIndex < activeTranscript.length ? activeTranscript[nextLineIndex] : null;
            
            let effectiveEndTime = currentLine.endTime;
            
            // If there's a next line and it starts within 0.5 seconds of our end time,
            // use the next line's start time as our end point to avoid overlap
            if (nextLine && Math.abs(nextLine.startTime - currentLine.endTime) < 0.5) {
              effectiveEndTime = nextLine.startTime - 0.05; // Stop just before next line starts
              console.log(`[MONITOR] Adjusting end time from ${currentLine.endTime} to ${effectiveEndTime} (next line starts at ${nextLine.startTime})`);
            }
            
            console.log(`[MONITOR] Time: ${currentTime.toFixed(2)}, End: ${effectiveEndTime.toFixed(2)}`);
            
            // If we've reached or passed the effective end time, pause
            if (currentTime >= effectiveEndTime - 0.1) { // Small buffer for accuracy

              clearInterval(checkInterval);
              repeatMonitorRef.current = null;
              setIsHandlingRepeatEnd(true); // Flag to prevent state change interference
              
              // First pause the video
              youtubePlayerRef.current.pauseVideo();
              
              // Then seek to exact effective end time after a small delay
              setTimeout(() => {
                if (youtubePlayerRef.current) {
                  youtubePlayerRef.current.seekTo(effectiveEndTime, true);
                  
                  // Wait for seek to complete then handle line completion
                  setTimeout(() => {
                    handleLineComplete();
                    setIsHandlingRepeatEnd(false);
                  }, 200);
                }
              }, 100);
            }
          } catch (error) {
            console.error('[MONITOR] Error checking time:', error);
            clearInterval(checkInterval);
            repeatMonitorRef.current = null;
          }
        }, 50); // Check more frequently
        
        // Store interval reference for cleanup
        repeatMonitorRef.current = checkInterval;
      } else {
        // Normal mode - start regular sync
        setIsInRepeatMode(false);
        startYouTubeSync();
      }
    } else if (isLocalVideo && localVideoRef.current) {
      localVideoRef.current.currentTime = currentLine.startTime;
      localVideoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Video playback error:', err);
          showNotification({ title: 'Failed to play video', type: 'error' });
        });
    } else if (audioRef.current) {
      audioRef.current.currentTime = currentLine.startTime;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Playback error:', err);
          showNotification({ title: 'Failed to play audio', type: 'error' });
        });
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // User is manually pausing - cancel any pending line-end timeout
      if (lineEndTimeoutRef.current) {
        clearTimeout(lineEndTimeoutRef.current);
        lineEndTimeoutRef.current = null;
      }
      
      if (isYouTubeMode && youtubePlayerRef.current) {
        youtubePlayerRef.current.pauseVideo();
      } else if (isLocalVideo && localVideoRef.current) {
        localVideoRef.current.pause();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      playCurrentLine();
    }
  };

  const handlePrevious = () => {
    if (session.currentLineIndex > 0) {
      // Clear any pending timeouts and intervals
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
        repeatTimeoutRef.current = null;
      }
      if (lineEndTimeoutRef.current) {
        clearTimeout(lineEndTimeoutRef.current);
        lineEndTimeoutRef.current = null;
      }
      if (repeatMonitorRef.current) {
        clearInterval(repeatMonitorRef.current);
        repeatMonitorRef.current = null;
      }
      stopYouTubeSync();
      setIsPausingForRepeat(false);
      setIsInRepeatMode(false);
      onLineChange(session.currentLineIndex - 1);
      setCurrentRepeat(0);
      setActiveRepeatNumber(1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (session.currentLineIndex < activeTranscript.length - 1) {
      // Clear any pending timeouts and intervals
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
        repeatTimeoutRef.current = null;
      }
      if (lineEndTimeoutRef.current) {
        clearTimeout(lineEndTimeoutRef.current);
        lineEndTimeoutRef.current = null;
      }
      if (repeatMonitorRef.current) {
        clearInterval(repeatMonitorRef.current);
        repeatMonitorRef.current = null;
      }
      stopYouTubeSync();
      setIsPausingForRepeat(false);
      setIsInRepeatMode(false);
      onLineChange(session.currentLineIndex + 1);
      setCurrentRepeat(0);
      setActiveRepeatNumber(1);
      setIsPlaying(false);
    }
  };

  const handleLineClick = (index: number) => {
    // Clear any pending timeouts and intervals
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    if (lineEndTimeoutRef.current) {
      clearTimeout(lineEndTimeoutRef.current);
      lineEndTimeoutRef.current = null;
    }
    if (repeatMonitorRef.current) {
      clearInterval(repeatMonitorRef.current);
      repeatMonitorRef.current = null;
    }
    
    stopYouTubeSync();
    setIsPausingForRepeat(false);
    setIsInRepeatMode(false);
    onLineChange(index);
    setCurrentRepeat(0);
    setActiveRepeatNumber(1);
    setIsPlaying(false);
    
    // Seek to the clicked line
    if (isYouTubeMode && youtubePlayerRef.current && activeTranscript[index]) {
      if (typeof youtubePlayerRef.current.seekTo === 'function') {
        youtubePlayerRef.current.seekTo(activeTranscript[index].startTime, true);
      } else {
        console.error('YouTube player seekTo method not available');
      }
    } else if (isLocalVideo && localVideoRef.current && activeTranscript[index]) {
      localVideoRef.current.currentTime = activeTranscript[index].startTime;
    }
  };

  return (
    <div className="space-y-4">
      {/* Video/Audio Display */}
      {isYouTubeMode && showVideo && displayMode === 'video' && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <div id="enhanced-youtube-player" className="absolute inset-0" />
            {!isYouTubeReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white">Loading YouTube player...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local Video Display */}
      {isLocalVideo && showVideo && displayMode === 'video' && session.videoUrl && session.videoUrl.startsWith('blob:') && !videoError && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleAudioEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => {
                console.error('Video playback error:', e);
                const video = e.currentTarget as HTMLVideoElement;
                console.error('Video error details:', {
                  error: video.error,
                  src: video.src,
                  readyState: video.readyState,
                  networkState: video.networkState
                });
                setVideoError(true);
                showNotification({ title: 'Video format not supported', message: 'Showing fallback player with controls.', type: 'warning' });
              }}
              onLoadedMetadata={() => {

                setVideoError(false); // Reset error if video loads successfully
              }}
              controls={false} // We use our own controls
              playsInline
              preload="metadata"
            >
              <source src={session.videoUrl} type="video/mp4" />
              <source src={session.videoUrl} type="video/webm" />
              <source src={session.videoUrl} type="video/mov" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Fallback Video Player with Native Controls */}
      {isLocalVideo && showVideo && displayMode === 'video' && session.videoUrl && session.videoUrl.startsWith('blob:') && videoError && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-warning-foreground">
              Using browser's native video player. Some shadowing features may be limited.
            </p>
          </div>
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={session.videoUrl}
              className="w-full h-full object-contain"
              controls
              playsInline
            />
          </div>
        </div>
      )}

      {/* Settings Button - Outside transcript container */}
      <div className="flex justify-end mb-2 relative">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-all group"
          aria-label="Settings"
          title="Click for playback settings and AI transcript toggle"
        >
          <Settings className="w-4 h-4 text-foreground group-hover:rotate-45 transition-transform" />
          <span className="text-sm font-medium text-foreground">Settings</span>
        </button>

        {/* Settings Dropdown Modal */}
        {showSettings && (
          <>
            {/* Backdrop to close on outside click */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowSettings(false)}
            />
            
            {/* Settings Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-lg shadow-lg border border-border p-4 z-50 max-h-[80vh] overflow-y-auto">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </h3>
              
              <div className="space-y-4">
                {/* Speed Control */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Playback Speed: {playbackSpeed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Repeat Count */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Repeat Count: {repeatCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Pause Between Repeats */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Pause Between Repeats: {pauseBetweenRepeats / 1000}s
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="500"
                    value={pauseBetweenRepeats}
                    onChange={(e) => setPauseBetweenRepeats(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Volume Control */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Volume: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Auto Advance Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <label className="text-sm font-medium text-foreground block">Auto-advance</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto move to next line
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoAdvance(!autoAdvance)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoAdvance ? 'bg-primary' : 'bg-muted'
                    }`}
                    role="switch"
                    aria-checked={autoAdvance}
                    aria-label="Toggle auto-advance"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoAdvance ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Display Options</h4>
                  
                  {/* Furigana Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 pr-3">
                      <label className="text-sm font-medium text-foreground block">Furigana</label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Show reading hints above kanji
                      </p>
                    </div>
                    <button
                      onClick={() => onToggleFurigana?.()}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showFurigana ? 'bg-primary' : 'bg-muted'
                      }`}
                      role="switch"
                      aria-checked={showFurigana}
                      aria-label="Toggle furigana"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showFurigana ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* AI-Formatted Transcript Toggle - Only show when AI version exists */}
                  {hasFormattedTranscript && (
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 pr-3">
                        <label className="text-sm font-medium text-foreground block">
                          {useFormattedTranscript ? '✨ AI-Optimized' : '📝 Raw Transcript'}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {useFormattedTranscript 
                            ? 'Using AI-improved line breaks' 
                            : 'Using original YouTube captions'}
                        </p>
                      </div>
                      <button
                        onClick={() => setUseFormattedTranscript(!useFormattedTranscript)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          useFormattedTranscript ? 'bg-primary' : 'bg-muted'
                        }`}
                        role="switch"
                        aria-checked={useFormattedTranscript}
                        aria-label="Toggle between AI-formatted and raw transcript"
                        title={useFormattedTranscript ? 'Switch to raw transcript' : 'Switch to AI-optimized'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            useFormattedTranscript ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  
                  {/* Display Mode Toggle */}
                  {(isYouTubeMode || isLocalVideo) && showVideo && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground block mb-1">Display Mode</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (displayMode !== 'video') {
                              setDisplayMode('video');
                              setIsPlaying(false);
                            }
                          }}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            displayMode === 'video'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          Video
                        </button>
                        <button
                          onClick={() => {
                            if (displayMode !== 'transcript') {
                              setDisplayMode('transcript');
                              setIsPlaying(false);
                              if (youtubePlayerRef.current) {
                                youtubePlayerRef.current.pauseVideo();
                              }
                            }
                          }}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            displayMode === 'transcript'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          Transcript
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
        
      {/* Current Line Display */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {/* AI Icon row */}
        {currentLine?.text && (
          <div className="flex justify-start mb-4">
            <AIExplanationTrigger
              text={cleanRomaji(currentLine.text)}
              contextType="sentence"
              size="lg"
            />
          </div>
        )}
        
        <div className="text-center mb-6">
          <div className="py-8 px-4">
            <p 
              className="text-2xl font-medium text-foreground japanese-text"
              dangerouslySetInnerHTML={{ 
                __html: showFurigana 
                  ? currentLineFurigana 
                  : cleanRomaji(currentLine?.text || '')
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Line {session.currentLineIndex + 1} of {activeTranscript.length}
          </p>
          {hasFormattedTranscript && (
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-opacity-20"
                 style={{ 
                   backgroundColor: useFormattedTranscript ? 'rgb(168 85 247 / 0.1)' : 'rgb(251 191 36 / 0.1)',
                   color: useFormattedTranscript ? 'rgb(168 85 247)' : 'rgb(245 158 11)'
                 }}>
              {useFormattedTranscript ? '✨ AI-Optimized' : '📝 Raw Transcript'}
            </div>
          )}
          {repeatCount > 1 && (
            <p className="text-sm text-primary mt-2">
              Repeat {activeRepeatNumber} of {repeatCount}
            </p>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={handlePrevious}
            disabled={session.currentLineIndex === 0}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous line"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button
            onClick={handleNext}
            disabled={session.currentLineIndex === activeTranscript.length - 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next line"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Transcript List */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <h3 className="font-medium text-foreground mb-4">Full Transcript</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activeTranscript.map((line: TranscriptLine, index: number) => (
            <div
              key={line.id}
              onClick={() => handleLineClick(index)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                index === session.currentLineIndex
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-sm text-muted-foreground font-mono">
                  {Math.floor(line.startTime / 60)}:{String(Math.floor(line.startTime % 60)).padStart(2, '0')}
                </span>
                <p className="flex-1 text-foreground">{cleanRomaji(line.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}