'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewsArticle } from '@/types/news';
import ArticleTTSManager from '@/utils/articleTTS';
import { ChevronDown, Play, Pause, Square, Volume2, Settings } from 'lucide-react';
import { useStrings } from '@/hooks/useLanguage';

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

interface AudioCache {
  [key: string]: {
    audioUrl: string;
    timestamp: number;
    voice: 'male' | 'female';
    provider: 'elevenlabs' | 'google';
  };
}

export default function EnhancedArticleAudioPlayer({ article }: ArticleAudioPlayerProps) {
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
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<AudioCache>({});
  const retryCountRef = useRef(0);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced cache key generation
  const generateCacheKey = useCallback((articleId: string, voice: string, provider: string) => {
    return `${articleId}-${voice}-${provider}`;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('play', handlePlay);
      audioRef.current.removeEventListener('pause', handlePause);
      audioRef.current.removeEventListener('ended', handleEnded);
      audioRef.current.removeEventListener('error', handleError);
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);

      // Clean up blob URL if it exists
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }

    setControls(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      progress: 0
    }));
  }, []);

  // Audio event handlers
  const handlePlay = useCallback(() => {
    setControls(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  }, []);

  const handlePause = useCallback(() => {
    setControls(prev => ({ ...prev, isPlaying: false, isPaused: true }));
  }, []);

  const handleEnded = useCallback(() => {
    setControls(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      progress: 0
    }));
  }, []);

  const handleError = useCallback((e: Event) => {
    console.error('Audio playback error:', e);
    setError(strings.audio.failedToPlay);
    setControls(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false
    }));
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setControls(prev => ({ ...prev, progress: audioRef.current?.currentTime || 0 }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setControls(prev => ({ ...prev, duration: audioRef.current?.duration || 0 }));
    }
  }, []);

  // Setup audio element with event listeners
  const setupAudioElement = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Apply current settings
    audio.playbackRate = controls.playbackSpeed;
    audio.volume = controls.volume;

    return audio;
  }, [controls.playbackSpeed, controls.volume, handlePlay, handlePause, handleEnded, handleError, handleTimeUpdate, handleLoadedMetadata]);

  // Enhanced TTS audio with better caching and error handling
  const playTTSAudio = async () => {
    if (!article?.id || !article?.content) {
      setError(strings.audio.failedToLoad);
      return;
    }

    const cacheKey = generateCacheKey(article.id, voice, provider);

    // Check cache first
    if (audioCache.current[cacheKey]) {
      const cachedAudio = audioCache.current[cacheKey];
      // Check if cache is recent (within 1 hour)
      if (Date.now() - cachedAudio.timestamp < 3600000) {
        try {
          cleanup();
          const audio = new Audio(cachedAudio.audioUrl);
          audioRef.current = setupAudioElement(audio);
          await audio.play();
          setLoadingStatus('Playing cached audio');
          return;
        } catch (error) {
          console.warn('Cached audio failed, regenerating...', error);
          delete audioCache.current[cacheKey];
        }
      }
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus(strings.audio.generating);
    retryCountRef.current = 0;

    const attemptTTSGeneration = async (): Promise<void> => {
      try {
        const audio = await ArticleTTSManager.playArticle(
          article.id,
          article.content,
          {
            voice,
            provider,
            onProgress: (status) => {
              setLoadingStatus(status);
            }
          }
        );

        cleanup();
        audioRef.current = setupAudioElement(audio);

        // Cache the audio URL
        audioCache.current[cacheKey] = {
          audioUrl: audio.src,
          timestamp: Date.now(),
          voice,
          provider
        };

        setIsLoading(false);
        setLoadingStatus('');

      } catch (error) {
        console.error('TTS Error:', error);

        // Retry logic
        if (retryCountRef.current < 2) {
          retryCountRef.current++;
          setLoadingStatus(`Retrying... (${retryCountRef.current}/2)`);
          setTimeout(attemptTTSGeneration, 1000);
          return;
        }

        setError(error instanceof Error ? error.message : 'Failed to generate audio');
        setIsLoading(false);
        setLoadingStatus('');
      }
    };

    await attemptTTSGeneration();
  };

  // Play original audio
  const playOriginalAudio = async () => {
    if (!article.audioUrl) return;

    try {
      cleanup();
      const audio = new Audio(article.audioUrl);
      audioRef.current = setupAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error('Failed to play original audio:', error);
      setError('Failed to play original audio');
    }
  };

  // Play audio based on mode
  const play = async () => {
    if (audioMode === 'original' && article.audioUrl) {
      await playOriginalAudio();
    } else {
      await playTTSAudio();
    }
  };

  // Enhanced pause/resume with better state management
  const togglePause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (controls.isPlaying) {
        audioRef.current.pause();
      } else if (controls.isPaused) {
        // Ensure the audio element is still valid
        if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
          await audioRef.current.play();
        } else {
          // Reload the audio if it's not ready
          setLoadingStatus('Reloading audio...');
          await play();
        }
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      setError('Failed to resume playback');
      // Try to restart the audio
      await play();
    }
  }, [controls.isPlaying, controls.isPaused, play]);

  // Stop playback
  const stop = useCallback(() => {
    cleanup();
    ArticleTTSManager.stop();
  }, [cleanup]);

  // Change playback speed
  const changeSpeed = useCallback((speed: number) => {
    setControls(prev => ({ ...prev, playbackSpeed: speed }));
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  // Change volume
  const changeVolume = useCallback((volume: number) => {
    setControls(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  // Seek to position
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setControls(prev => ({ ...prev, progress: time }));
    }
  }, []);

  // Switch audio mode
  const switchAudioMode = useCallback((mode: 'original' | 'tts') => {
    stop();
    setAudioMode(mode);
    setError(null);
  }, [stop]);

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Voice option handlers
  const handleVoiceChange = useCallback((newVoice: 'male' | 'female') => {
    if (voice !== newVoice) {
      stop();
      setVoice(newVoice);
      setShowMobileOptions(false);
    }
  }, [voice, stop]);

  const handleProviderChange = useCallback((newProvider: 'elevenlabs' | 'google') => {
    if (provider !== newProvider) {
      stop();
      setProvider(newProvider);
      setShowMobileOptions(false);
    }
  }, [provider, stop]);

  const progressPercent = controls.duration > 0
    ? (controls.progress / controls.duration) * 100
    : 0;

  if (!article) {
    return null;
  }

  // Mobile Options Modal
  const MobileOptionsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowMobileOptions(false)}>
      <div className="bg-background rounded-t-2xl w-full p-6 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{strings.audio.mobileOptions}</h3>
          <button
            onClick={() => setShowMobileOptions(false)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            ✕
          </button>
        </div>

        {audioMode === 'tts' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{strings.audio.voice}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleVoiceChange('male')}
                  className={`p-3 rounded-lg text-sm font-medium ${voice === 'male'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                >
                  {strings.audio.maleVoice}
                </button>
                <button
                  onClick={() => handleVoiceChange('female')}
                  className={`p-3 rounded-lg text-sm font-medium ${voice === 'female'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                >
                  {strings.audio.femaleVoice}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{strings.audio.provider}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleProviderChange('elevenlabs')}
                  className={`p-3 rounded-lg text-sm font-medium ${provider === 'elevenlabs'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                >
                  {strings.audio.elevenlabs}
                </button>
                <button
                  onClick={() => handleProviderChange('google')}
                  className={`p-3 rounded-lg text-sm font-medium ${provider === 'google'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                >
                  {strings.audio.google}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {strings.audio.speed}: {controls.playbackSpeed}x
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => changeSpeed(speed)}
                  className={`p-2 rounded text-xs ${controls.playbackSpeed === speed
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                    }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {strings.audio.volume}: {Math.round(controls.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={controls.volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-card rounded-lg border border-border p-4 md:p-6 mb-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-foreground">{strings.audio.playEntireArticle}</h3>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-muted-foreground hidden sm:block">{loadingStatus}</span>
              </div>
            )}
          </div>

          {/* Audio Mode Toggle */}
          {article.audioUrl && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => switchAudioMode('original')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${audioMode === 'original'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {strings.audio.originalAudio}
              </button>
              <button
                onClick={() => switchAudioMode('tts')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${audioMode === 'tts'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {strings.audio.ttsAudio}
              </button>
            </div>
          )}

          {/* Desktop TTS Options */}
          {audioMode === 'tts' && !isMobile && (
            <div className="flex gap-4 flex-wrap">
              <div className="flex gap-2">
                <button
                  onClick={() => handleVoiceChange('male')}
                  className={`px-3 py-1 rounded-md text-sm ${voice === 'male'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {strings.audio.maleVoice}
                </button>
                <button
                  onClick={() => handleVoiceChange('female')}
                  className={`px-3 py-1 rounded-md text-sm ${voice === 'female'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {strings.audio.femaleVoice}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleProviderChange('elevenlabs')}
                  className={`px-3 py-1 rounded-md text-sm ${provider === 'elevenlabs'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {strings.audio.elevenlabs}
                </button>
                <button
                  onClick={() => handleProviderChange('google')}
                  className={`px-3 py-1 rounded-md text-sm ${provider === 'google'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {strings.audio.google}
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
                className="p-2 md:p-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {(controls.isPlaying || controls.isPaused || isLoading) ? (
                <button
                  onClick={togglePause}
                  disabled={isLoading}
                  className="p-3 md:p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 min-w-[48px] md:min-w-[60px] flex items-center justify-center disabled:opacity-50"
                  title={isLoading ? 'Loading...' : controls.isPlaying ? 'Pause' : 'Resume'}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : controls.isPlaying ? (
                    <Pause className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <Play className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </button>
              ) : (
                <button
                  onClick={play}
                  disabled={isLoading}
                  className="p-3 md:p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 min-w-[48px] md:min-w-[60px] flex items-center justify-center disabled:opacity-50"
                  title="Play"
                >
                  <Play className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}

              {/* Mobile Settings Button */}
              {isMobile && audioMode === 'tts' && (
                <button
                  onClick={() => setShowMobileOptions(true)}
                  className="p-2 md:p-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </button>
              )}

              {/* Time display */}
              <div className="text-sm text-muted-foreground ml-auto">
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

            {/* Desktop Speed and Volume controls */}
            {!isMobile && (
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
            )}
          </div>
        </div>
      </div>

      {/* Mobile Options Modal */}
      {showMobileOptions && <MobileOptionsModal />}
    </>
  );
}
