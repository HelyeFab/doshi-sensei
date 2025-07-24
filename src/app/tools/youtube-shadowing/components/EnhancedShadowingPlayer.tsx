'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShadowingSession, TranscriptLine } from '../page';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Settings, ChevronLeft, ChevronRight, Mic, MicOff, Video, AudioLines } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { AIExplanationTrigger } from '@/components/AIExplanation';

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
}

export default function EnhancedShadowingPlayer({ 
  session, 
  onLineChange,
  showVideo = true 
}: EnhancedShadowingPlayerProps) {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(3);
  const [pauseBetweenRepeats, setPauseBetweenRepeats] = useState(1500);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isYouTubeMode, setIsYouTubeMode] = useState(false);
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const [displayMode, setDisplayMode] = useState<'video' | 'transcript'>('video');
  const [isLocalVideo, setIsLocalVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentLine = session.transcript[session.currentLineIndex];

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
    if (isYouTubeMode && showVideo && videoId && !youtubePlayerRef.current) {
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
        initializeYouTubePlayer();
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTubeMode, showVideo, videoId]);

  // Initialize audio element
  useEffect(() => {
    if (!isYouTubeMode && !isLocalVideo && session.audioUrl && !audioRef.current) {
      const audio = new Audio(session.audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.volume = volume;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', handleAudioTimeUpdate);
      audio.addEventListener('ended', handleAudioEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
        audio.removeEventListener('ended', handleAudioEnded);
        audio.pause();
      };
    }
  }, [isYouTubeMode, isLocalVideo, session.audioUrl]);

  // Initialize local video element when it's rendered
  useEffect(() => {
    if (isLocalVideo && localVideoRef.current && session.videoUrl) {
      // Force reload the video source
      localVideoRef.current.load();
      console.log('Local video initialized with URL:', session.videoUrl);
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
      },
      events: {
        onReady: handleYouTubeReady,
        onStateChange: handleYouTubeStateChange
      }
    });
  };

  const handleYouTubeReady = () => {
    setIsYouTubeReady(true);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setPlaybackRate(playbackSpeed);
      youtubePlayerRef.current.setVolume(volume * 100);
    }
  };

  const handleYouTubeStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      startYouTubeSync();
    } else {
      setIsPlaying(false);
      stopYouTubeSync();
    }
  };

  const startYouTubeSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
        const currentTime = youtubePlayerRef.current.getCurrentTime();
        updateCurrentLineByTime(currentTime);
      }
    }, 250);
  };

  const stopYouTubeSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  const updateCurrentLineByTime = (currentTime: number) => {
    const activeIndex = session.transcript.findIndex(
      line => currentTime >= line.startTime && currentTime < line.endTime
    );
    
    if (activeIndex !== -1 && activeIndex !== session.currentLineIndex) {
      onLineChange(activeIndex);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current || !currentLine) return;

    const currentTime = audioRef.current.currentTime;
    if (currentTime >= currentLine.endTime) {
      audioRef.current.pause();
      handleLineComplete();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!localVideoRef.current || !currentLine) return;

    const currentTime = localVideoRef.current.currentTime;
    updateCurrentLineByTime(currentTime);
    
    if (currentTime >= currentLine.endTime) {
      localVideoRef.current.pause();
      handleLineComplete();
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleLineComplete = () => {
    if (currentRepeat < repeatCount - 1) {
      setCurrentRepeat(prev => prev + 1);
      repeatTimeoutRef.current = setTimeout(() => {
        playCurrentLine();
      }, pauseBetweenRepeats);
    } else {
      setCurrentRepeat(0);
      setIsPlaying(false);
    }
  };

  const playCurrentLine = () => {
    if (!currentLine) return;

    if (isYouTubeMode && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(currentLine.startTime, true);
      youtubePlayerRef.current.playVideo();
      
      // Auto-pause at end of line for repeat functionality
      setTimeout(() => {
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
          handleLineComplete();
        }
      }, (currentLine.endTime - currentLine.startTime) * 1000 / playbackSpeed);
    } else if (isLocalVideo && localVideoRef.current) {
      localVideoRef.current.currentTime = currentLine.startTime;
      localVideoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Video playback error:', err);
          showNotification('Failed to play video', 'error');
        });
    } else if (audioRef.current) {
      audioRef.current.currentTime = currentLine.startTime;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Playback error:', err);
          showNotification('Failed to play audio', 'error');
        });
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      if (isYouTubeMode && youtubePlayerRef.current) {
        youtubePlayerRef.current.pauseVideo();
      } else if (isLocalVideo && localVideoRef.current) {
        localVideoRef.current.pause();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    } else {
      playCurrentLine();
    }
  };

  const handlePrevious = () => {
    if (session.currentLineIndex > 0) {
      onLineChange(session.currentLineIndex - 1);
      setCurrentRepeat(0);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (session.currentLineIndex < session.transcript.length - 1) {
      onLineChange(session.currentLineIndex + 1);
      setCurrentRepeat(0);
      setIsPlaying(false);
    }
  };

  const handleLineClick = (index: number) => {
    onLineChange(index);
    setCurrentRepeat(0);
    setIsPlaying(false);
    
    // Seek to the clicked line
    if (isYouTubeMode && youtubePlayerRef.current && session.transcript[index]) {
      youtubePlayerRef.current.seekTo(session.transcript[index].startTime, true);
    } else if (isLocalVideo && localVideoRef.current && session.transcript[index]) {
      localVideoRef.current.currentTime = session.transcript[index].startTime;
    }
  };

  // Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      showNotification('Failed to access microphone', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (recordedAudio) {
      const audio = new Audio(URL.createObjectURL(recordedAudio));
      audio.play();
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
      {isLocalVideo && showVideo && displayMode === 'video' && session.videoUrl && !videoError && (
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
                showNotification('Video format not supported. Showing fallback player with controls.', 'warning');
              }}
              onLoadedMetadata={() => {
                console.log('Video metadata loaded successfully');
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
      {isLocalVideo && showVideo && displayMode === 'video' && session.videoUrl && videoError && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
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

      {/* Display Mode Toggle (for videos) */}
      {(isYouTubeMode || isLocalVideo) && showVideo && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setDisplayMode('video')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              displayMode === 'video'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Video className="w-4 h-4 inline-block mr-2" />
            Video
          </button>
          <button
            onClick={() => setDisplayMode('transcript')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              displayMode === 'transcript'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <AudioLines className="w-4 h-4 inline-block mr-2" />
            Transcript Only
          </button>
        </div>
      )}
      
      {/* Current Line Display */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-medium text-foreground mb-2">
              {currentLine?.text || ''}
            </p>
            {currentLine?.text && (
              <AIExplanationTrigger
                text={currentLine.text}
                contextType="sentence"
                className="mb-2"
                size="md"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Line {session.currentLineIndex + 1} of {session.transcript.length}
          </p>
          {currentRepeat > 0 && (
            <p className="text-sm text-primary mt-2">
              Repeat {currentRepeat} of {repeatCount}
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
            disabled={session.currentLineIndex === session.transcript.length - 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next line"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Record Your Voice
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium animate-pulse flex items-center gap-2"
            >
              <MicOff className="w-4 h-4" />
              Stop Recording
            </button>
          )}

          {recordedAudio && !isRecording && (
            <button
              onClick={playRecording}
              className="px-4 py-2 bg-muted-foreground text-background rounded-lg hover:bg-muted-foreground/90 transition-colors text-sm font-medium"
            >
              Play Recording
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Settings</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showSettings ? 'rotate-90' : ''}`} />
        </button>

        {showSettings && (
          <div className="mt-4 space-y-4">
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
          </div>
        )}
      </div>

      {/* Transcript List */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <h3 className="font-medium text-foreground mb-4">Full Transcript</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {session.transcript.map((line, index) => (
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
                <p className="flex-1 text-foreground">{line.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}