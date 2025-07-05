'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle } from '@/types/news';
import ArticleTTSManager from '@/utils/articleTTS';

interface ArticleAudioPlayerProps {
  article: NewsArticle;
}

interface AudioControls {
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  volume: number;
  progress: number;
  duration: number;
}

export default function ImprovedArticleAudioPlayer({ article }: ArticleAudioPlayerProps) {
  const [controls, setControls] = useState<AudioControls>({
    isPlaying: false,
    isPaused: false,
    playbackSpeed: 1.0,
    volume: 1.0,
    progress: 0,
    duration: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<'original' | 'tts'>('tts');
  const [voice, setVoice] = useState<'male' | 'female'>('male');
  const [provider, setProvider] = useState<'elevenlabs' | 'google'>('elevenlabs');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      ArticleTTSManager.stop();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update progress periodically
  useEffect(() => {
    if (controls.isPlaying && audioRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setControls(prev => ({
            ...prev,
            progress: audioRef.current!.currentTime,
            duration: audioRef.current!.duration || 0
          }));
        }
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [controls.isPlaying]);

  // Play TTS audio
  const playTTSAudio = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStatus('Preparing audio...');

    try {
      const audio = await ArticleTTSManager.playArticle(
        article.id,
        article.content,
        {
          voice,
          provider,
          onProgress: setLoadingStatus
        }
      );

      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('play', () => {
        setControls(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      });

      audio.addEventListener('pause', () => {
        setControls(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      });

      audio.addEventListener('ended', () => {
        setControls(prev => ({ 
          ...prev, 
          isPlaying: false, 
          isPaused: false,
          progress: 0
        }));
        audioRef.current = null;
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio');
        setControls(prev => ({ 
          ...prev, 
          isPlaying: false, 
          isPaused: false 
        }));
      });

      // Apply settings
      audio.playbackRate = controls.playbackSpeed;
      audio.volume = controls.volume;

    } catch (error) {
      console.error('TTS Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate audio');
      setControls(prev => ({ ...prev, isPlaying: false, isPaused: false }));
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // Play original audio
  const playOriginalAudio = () => {
    if (!article.audioUrl) return;

    const audio = new Audio(article.audioUrl);
    audioRef.current = audio;

    // Set up event listeners
    audio.addEventListener('play', () => {
      setControls(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    });

    audio.addEventListener('pause', () => {
      setControls(prev => ({ ...prev, isPlaying: false, isPaused: true }));
    });

    audio.addEventListener('ended', () => {
      setControls(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isPaused: false,
        progress: 0
      }));
      audioRef.current = null;
    });

    // Apply settings
    audio.playbackRate = controls.playbackSpeed;
    audio.volume = controls.volume;

    audio.play();
  };

  // Play audio
  const play = () => {
    if (audioMode === 'original' && article.audioUrl) {
      playOriginalAudio();
    } else {
      playTTSAudio();
    }
  };

  // Pause/Resume
  const togglePause = () => {
    if (controls.isPlaying) {
      ArticleTTSManager.pause();
    } else if (controls.isPaused) {
      ArticleTTSManager.resume();
    }
  };

  // Stop playback
  const stop = () => {
    ArticleTTSManager.stop();
    setControls(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      progress: 0
    }));
    audioRef.current = null;
  };

  // Change playback speed
  const changeSpeed = (speed: number) => {
    setControls(prev => ({ ...prev, playbackSpeed: speed }));
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Change volume
  const changeVolume = (volume: number) => {
    setControls(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  };

  // Seek to position
  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setControls(prev => ({ ...prev, progress: time }));
    }
  };

  // Switch audio mode
  const switchAudioMode = (mode: 'original' | 'tts') => {
    stop();
    setAudioMode(mode);
    setError(null);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = controls.duration > 0 
    ? (controls.progress / controls.duration) * 100 
    : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
              />
            </svg>
            <h3 className="font-medium text-foreground">Listen to Article</h3>
          </div>
          {isLoading && (
            <span className="text-sm text-muted-foreground">{loadingStatus}</span>
          )}
        </div>

        {/* Audio Mode Toggle */}
        {article.audioUrl && (
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => switchAudioMode('original')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                audioMode === 'original' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Original Audio
            </button>
            <button
              onClick={() => switchAudioMode('tts')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                audioMode === 'tts' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              AI Voice
            </button>
          </div>
        )}

        {/* TTS Options */}
        {audioMode === 'tts' && (
          <div className="flex gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setVoice('male')}
                className={`px-3 py-1 rounded-md text-sm ${
                  voice === 'male' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setVoice('female')}
                className={`px-3 py-1 rounded-md text-sm ${
                  voice === 'female' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Female
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setProvider('elevenlabs')}
                className={`px-3 py-1 rounded-md text-sm ${
                  provider === 'elevenlabs' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                ElevenLabs
              </button>
              <button
                onClick={() => setProvider('google')}
                className={`px-3 py-1 rounded-md text-sm ${
                  provider === 'google' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Google
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Main Controls */}
        <div className="space-y-3">
          {/* Playback controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={stop}
              disabled={!controls.isPlaying && !controls.isPaused}
              className="p-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>

            {controls.isPlaying || controls.isPaused ? (
              <button
                onClick={togglePause}
                disabled={isLoading}
                className="p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xl min-w-[60px] flex items-center justify-center disabled:opacity-50"
              >
                {controls.isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={play}
                disabled={isLoading}
                className="p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xl min-w-[60px] flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}

            {/* Time display */}
            <div className="text-sm text-muted-foreground">
              {formatTime(controls.progress)} / {formatTime(controls.duration)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div 
              className="w-full bg-muted rounded-full h-2 cursor-pointer relative"
              onClick={(e) => {
                if (controls.duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const time = percentage * controls.duration;
                  seek(time);
                }
              }}
            >
              <div
                className="bg-primary h-2 rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Speed and Volume controls */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Speed:</span>
              <select
                value={controls.playbackSpeed}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                className="bg-muted rounded px-2 py-1 text-sm"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={controls.volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}