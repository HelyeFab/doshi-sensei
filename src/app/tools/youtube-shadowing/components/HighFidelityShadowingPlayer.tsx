'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Settings, 
  Volume2, ChevronUp, ChevronDown, RotateCcw 
} from 'lucide-react';
import { 
  PrecisionTimeManager, TimeSegment, ABRepeatConfig 
} from '@/utils/precisionTimeManager';
import { TranscriptLine } from '../YouTubeShadowing';
import { generateFuriganaWithCache } from '@/utils/furigana';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface HighFidelityShadowingPlayerProps {
  videoId: string;
  transcript: TranscriptLine[];
  onProgress?: (progress: number) => void;
  showFurigana?: boolean;
  className?: string;
}

export default function HighFidelityShadowingPlayer({
  videoId,
  transcript,
  onProgress,
  showFurigana = true,
  className
}: HighFidelityShadowingPlayerProps) {
  // YouTube Player
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  
  // Transcript State
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // A/B Repeat State
  const [abRepeat, setAbRepeat] = useState<ABRepeatConfig>({
    startTime: 0,
    endTime: 0,
    currentRepeat: 0,
    totalRepeats: 3,
    pauseDuration: 1500,
    isActive: false
  });
  const [isSettingABPoints, setIsSettingABPoints] = useState<'A' | 'B' | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Precision Time Manager
  const timeManagerRef = useRef<PrecisionTimeManager>(new PrecisionTimeManager());
  
  // Convert transcript to TimeSegments
  const segments: TimeSegment[] = useMemo(() => 
    transcript.map(line => ({
      id: line.id,
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.text
    })), [transcript]
  );
  
  // Initialize YouTube Player
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      timeManagerRef.current.destroy();
    };
  }, [videoId]);
  
  const initializePlayer = useCallback(() => {
    if (!playerContainerRef.current || playerRef.current) return;
    
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 1,
        playsinline: 1,
        origin: window.location.origin,
        widget_referrer: window.location.href
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange
      }
    });
  }, [videoId]);
  
  const handlePlayerReady = useCallback((event: any) => {
    setIsPlayerReady(true);
    setDuration(event.target.getDuration());
    
    // Set up precision time tracking
    timeManagerRef.current.setPlayer(() => 
      playerRef.current?.getCurrentTime() || 0
    );
    
    // Register time update callback
    const unsubscribe = timeManagerRef.current.onTimeUpdate((time) => {
      setCurrentTime(time);
      
      // Update active segment
      const activeSegment = timeManagerRef.current.findActiveSegment(segments, time);
      if (activeSegment && activeSegment.id !== activeSegmentId) {
        setActiveSegmentId(activeSegment.id);
        if (autoScroll) {
          scrollToActiveSegment(activeSegment.id);
        }
      }
      
      // Handle A/B repeat
      if (abRepeat.isActive && timeManagerRef.current.isSegmentComplete(time, abRepeat.endTime)) {
        handleRepeatEnd();
      }
      
      onProgress?.(time);
    });
    
    return () => unsubscribe();
  }, [segments, activeSegmentId, autoScroll, abRepeat, onProgress]);
  
  const handlePlayerStateChange = useCallback((event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      timeManagerRef.current.startSync();
    } else {
      setIsPlaying(false);
      if (event.data === window.YT.PlayerState.PAUSED) {
        timeManagerRef.current.stopSync();
      }
    }
  }, []);
  
  // Playback Controls
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);
  
  const seekTo = useCallback((time: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(time, true);
  }, []);
  
  const skipBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 5);
    seekTo(newTime);
  }, [currentTime, seekTo]);
  
  const skipForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 5);
    seekTo(newTime);
  }, [currentTime, duration, seekTo]);
  
  // A/B Repeat Functions
  const setAPoint = useCallback(() => {
    setAbRepeat(prev => ({
      ...prev,
      startTime: currentTime,
      isActive: false
    }));
    setIsSettingABPoints('B');
  }, [currentTime]);
  
  const setBPoint = useCallback(() => {
    if (currentTime > abRepeat.startTime) {
      setAbRepeat(prev => ({
        ...prev,
        endTime: currentTime,
        isActive: true,
        currentRepeat: 0
      }));
      setIsSettingABPoints(null);
      seekTo(abRepeat.startTime);
      playerRef.current?.playVideo();
    }
  }, [currentTime, abRepeat.startTime, seekTo]);
  
  const toggleABRepeat = useCallback(() => {
    if (isSettingABPoints === 'A') {
      setAPoint();
    } else if (isSettingABPoints === 'B') {
      setBPoint();
    } else if (abRepeat.isActive) {
      // Cancel repeat
      setAbRepeat(prev => ({ ...prev, isActive: false, currentRepeat: 0 }));
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    } else {
      // Start setting A point
      setIsSettingABPoints('A');
    }
  }, [isSettingABPoints, abRepeat.isActive, setAPoint, setBPoint]);
  
  const handleRepeatEnd = useCallback(() => {
    playerRef.current?.pauseVideo();
    
    const nextRepeat = abRepeat.currentRepeat + 1;
    
    if (nextRepeat < abRepeat.totalRepeats) {
      setAbRepeat(prev => ({ ...prev, currentRepeat: nextRepeat }));
      
      // Pause between repeats
      repeatTimeoutRef.current = setTimeout(() => {
        seekTo(timeManagerRef.current.calculateRepeatSeek(abRepeat));
        playerRef.current?.playVideo();
      }, abRepeat.pauseDuration);
    } else {
      // All repeats complete
      setAbRepeat(prev => ({ ...prev, isActive: false, currentRepeat: 0 }));
    }
  }, [abRepeat, seekTo]);
  
  // Transcript Interaction
  const handleSegmentClick = useCallback((segment: TimeSegment) => {
    seekTo(segment.startTime);
    setActiveSegmentId(segment.id);
  }, [seekTo]);
  
  const scrollToActiveSegment = useCallback((segmentId: string) => {
    if (!transcriptContainerRef.current) return;
    
    const element = document.getElementById(`segment-${segmentId}`);
    if (element) {
      const container = transcriptContainerRef.current;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Smooth scroll to center the active segment
      const scrollTop = container.scrollTop + elementRect.top - containerRect.top - containerRect.height / 2 + elementRect.height / 2;
      
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, []);
  
  // Volume Control
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  }, []);
  
  // Settings Panel
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  return (
    <div className={cn("flex flex-col lg:flex-row gap-4 h-full", className)}>
      {/* Video Player Section */}
      <div className="flex-1 flex flex-col">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <div ref={playerContainerRef} className="absolute inset-0" />
          
          {/* Loading Overlay */}
          {!isPlayerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
            </div>
          )}
        </div>
        
        {/* Player Controls */}
        <div className="bg-white rounded-lg p-4 mt-4 space-y-4">
          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={skipBackward}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Skip backward 5s"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              disabled={!isPlayerReady}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={skipForward}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Skip forward 5s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{timeManagerRef.current.formatTime(currentTime)}</span>
              <span>{timeManagerRef.current.formatTime(duration)}</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* A/B Repeat Range */}
              {abRepeat.isActive && (
                <div 
                  className="absolute top-0 h-full bg-yellow-300/50"
                  style={{ 
                    left: `${(abRepeat.startTime / duration) * 100}%`,
                    width: `${((abRepeat.endTime - abRepeat.startTime) / duration) * 100}%`
                  }}
                />
              )}
            </div>
          </div>
          
          {/* A/B Repeat Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleABRepeat}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                abRepeat.isActive ? "bg-yellow-100 text-yellow-700" : 
                isSettingABPoints ? "bg-blue-100 text-blue-700" : 
                "bg-gray-100 hover:bg-gray-200"
              )}
            >
              <Repeat className="w-4 h-4" />
              <span className="text-sm">
                {isSettingABPoints === 'A' ? 'Set A Point' :
                 isSettingABPoints === 'B' ? 'Set B Point' :
                 abRepeat.isActive ? `Repeat ${abRepeat.currentRepeat + 1}/${abRepeat.totalRepeats}` :
                 'A/B Repeat'}
              </span>
            </button>
            
            <div className="flex items-center gap-3">
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              {/* Settings Button */}
              <button
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Settings Panel */}
          <AnimatePresence>
            {showSettingsPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t space-y-3">
                  {/* Repeat Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Repeat Count</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAbRepeat(prev => ({ 
                          ...prev, 
                          totalRepeats: Math.max(1, prev.totalRepeats - 1) 
                        }))}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm">{abRepeat.totalRepeats}</span>
                      <button
                        onClick={() => setAbRepeat(prev => ({ 
                          ...prev, 
                          totalRepeats: Math.min(10, prev.totalRepeats + 1) 
                        }))}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Pause Duration */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pause Between Repeats</span>
                    <select
                      value={abRepeat.pauseDuration}
                      onChange={(e) => setAbRepeat(prev => ({ 
                        ...prev, 
                        pauseDuration: parseInt(e.target.value) 
                      }))}
                      className="px-2 py-1 text-sm border rounded"
                    >
                      <option value="500">0.5s</option>
                      <option value="1000">1s</option>
                      <option value="1500">1.5s</option>
                      <option value="2000">2s</option>
                      <option value="3000">3s</option>
                    </select>
                  </div>
                  
                  {/* Auto-scroll */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Auto-scroll Transcript</span>
                    <button
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        autoScroll ? "bg-blue-500" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        autoScroll ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Transcript Section */}
      <div className="lg:w-96 flex flex-col bg-white rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Transcript</h3>
        </div>
        
        <div 
          ref={transcriptContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2"
          onWheel={() => setAutoScroll(false)} // Disable auto-scroll on manual scroll
        >
          {segments.map((segment) => (
            <motion.div
              key={segment.id}
              id={`segment-${segment.id}`}
              onClick={() => handleSegmentClick(segment)}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-all",
                activeSegmentId === segment.id 
                  ? "bg-blue-50 border-l-4 border-blue-500" 
                  : "hover:bg-gray-50"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 mt-1">
                  {timeManagerRef.current.formatTime(segment.startTime)}
                </span>
                <p className={cn(
                  "flex-1 leading-relaxed transition-all",
                  activeSegmentId === segment.id ? "text-gray-900 font-medium" : "text-gray-700"
                )}>
                  {showFurigana ? (
                    <span dangerouslySetInnerHTML={{ 
                      __html: generateFuriganaWithCache(segment.text) 
                    }} />
                  ) : (
                    segment.text
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Quick Actions */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={() => {
              setAutoScroll(true);
              if (activeSegmentId) {
                scrollToActiveSegment(activeSegmentId);
              }
            }}
            className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Resume Auto-scroll
          </button>
        </div>
      </div>
    </div>
  );
}