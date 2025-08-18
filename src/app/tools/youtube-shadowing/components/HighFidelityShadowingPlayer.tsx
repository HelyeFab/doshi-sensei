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
import { TranscriptLine, ShadowingSession } from '../YouTubeShadowing';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface HighFidelityShadowingPlayerProps {
  session: ShadowingSession;
  onLineChange: (index: number) => void;
  showVideo?: boolean;
  showFurigana?: boolean;
  onToggleFurigana?: () => void;
  className?: string;
}

export default function HighFidelityShadowingPlayer({
  session,
  onLineChange,
  showVideo = true,
  showFurigana = true,
  onToggleFurigana,
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
  
  // Auto-Repeat State
  const [abRepeat, setAbRepeat] = useState<ABRepeatConfig>({
    startTime: 0,
    endTime: 0,
    currentRepeat: 0,
    totalRepeats: 3,
    pauseDuration: 1500,
    isActive: false
  });
  const [autoRepeatMode, setAutoRepeatMode] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Precision Time Manager
  const timeManagerRef = useRef<PrecisionTimeManager>(new PrecisionTimeManager());
  
  // Extract video ID from URL
  const videoId = useMemo(() => {
    if (!session?.videoUrl) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = session.videoUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  }, [session?.videoUrl]);
  
  // Convert transcript to TimeSegments
  const segments: TimeSegment[] = useMemo(() => 
    session?.transcript?.map(line => ({
      id: line.id,
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.text
    })) || [], [session?.transcript]
  );
  
  // Initialize YouTube Player with production-ready error handling
  useEffect(() => {
    if (!videoId) return;
    
    let mounted = true;
    let apiLoadTimeout: NodeJS.Timeout;
    
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        
        // Set up timeout for API load
        apiLoadTimeout = setTimeout(() => {
          if (mounted && !window.YT) {
            console.warn('[PLAYER] YouTube API load timeout - using fallback player');
            setIsPlayerReady(true); // Enable manual controls
          }
        }, 5000);
        
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          clearTimeout(apiLoadTimeout);
          if (mounted) {
            initializePlayer();
          }
        };
      } else {
        initializePlayer();
      }
    };
    
    loadYouTubeAPI();
    
    return () => {
      mounted = false;
      clearTimeout(apiLoadTimeout);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        playerRef.current = null;
      }
      timeManagerRef.current.destroy();
    };
  }, [videoId]);
  
  const initializePlayer = useCallback(() => {
    if (!playerContainerRef.current || playerRef.current || !videoId) return;
    
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
  }, []);
  
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
    
    console.log('[PLAY/PAUSE] Current state:', isPlaying ? 'PLAYING' : 'PAUSED');
    console.log('[PLAY/PAUSE] Auto-repeat mode:', autoRepeatMode);
    console.log('[PLAY/PAUSE] A/B repeat active:', abRepeat.isActive);
    
    if (isPlaying) {
      console.log('[PLAY/PAUSE] Pausing playback');
      playerRef.current.pauseVideo();
      // Clear any pending repeats
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
        repeatTimeoutRef.current = null;
      }
    } else {
      console.log('[PLAY/PAUSE] Starting playback');
      // If in auto-repeat mode and no active repeat, set up for current segment
      if (autoRepeatMode && !abRepeat.isActive && activeSegmentId) {
        const activeSegment = segments.find(s => s.id === activeSegmentId);
        if (activeSegment) {
          console.log('[PLAY/PAUSE] Setting up auto-repeat for current segment');
          console.log(`[PLAY/PAUSE] Segment: ${activeSegment.startTime} - ${activeSegment.endTime}`);
          setAbRepeat({
            startTime: activeSegment.startTime,
            endTime: activeSegment.endTime,
            currentRepeat: 0,
            totalRepeats: abRepeat.totalRepeats,
            pauseDuration: abRepeat.pauseDuration,
            isActive: true
          });
        }
      }
      playerRef.current.playVideo();
    }
  }, [isPlaying, autoRepeatMode, abRepeat, activeSegmentId, segments]);
  
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
  
  // Handle auto-repeat mode segment completion
  const handleAutoRepeatSegmentEnd = useCallback((segmentIndex: number) => {
    console.log('[AUTO-REPEAT] handleAutoRepeatSegmentEnd called for segment:', segmentIndex);
    
    // Immediately pause to prevent progression
    if (playerRef.current) {
      console.log('[AUTO-REPEAT] Pausing video');
      playerRef.current.pauseVideo();
    }
    
    const currentRep = abRepeat.currentRepeat + 1;
    console.log(`[AUTO-REPEAT] Completed repeat ${abRepeat.currentRepeat + 1} of ${abRepeat.totalRepeats}`);
    
    if (currentRep < abRepeat.totalRepeats) {
      // More repeats for this segment
      console.log(`[AUTO-REPEAT] Setting up repeat ${currentRep + 1}`);
      setAbRepeat(prev => ({ ...prev, currentRepeat: currentRep }));
      
      // Clear any existing timeout
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      
      console.log(`[AUTO-REPEAT] Waiting ${abRepeat.pauseDuration}ms before repeat`);
      repeatTimeoutRef.current = setTimeout(() => {
        // Seek back to start of current segment
        if (playerRef.current && segments[segmentIndex]) {
          console.log(`[AUTO-REPEAT] Seeking back to ${segments[segmentIndex].startTime}`);
          playerRef.current.seekTo(segments[segmentIndex].startTime, true);
          // Small delay to ensure seek completes
          setTimeout(() => {
            console.log('[AUTO-REPEAT] Resuming playback');
            playerRef.current?.playVideo();
          }, 100);
        }
      }, abRepeat.pauseDuration);
    } else {
      // All repeats done, move to next segment
      const nextIndex = segmentIndex + 1;
      console.log(`[AUTO-REPEAT] All repeats done. Moving to segment ${nextIndex}`);
      
      if (nextIndex < segments.length) {
        // Reset for next segment
        console.log('[AUTO-REPEAT] Resetting for next segment');
        setAbRepeat(prev => ({ 
          ...prev, 
          isActive: false, 
          currentRepeat: 0 
        }));
        
        // Clear any existing timeout
        if (repeatTimeoutRef.current) {
          clearTimeout(repeatTimeoutRef.current);
        }
        
        // Small pause before next segment
        repeatTimeoutRef.current = setTimeout(() => {
          if (playerRef.current && segments[nextIndex]) {
            console.log(`[AUTO-REPEAT] Seeking to next segment at ${segments[nextIndex].startTime}`);
            playerRef.current.seekTo(segments[nextIndex].startTime, true);
            // Small delay to ensure seek completes
            setTimeout(() => {
              console.log('[AUTO-REPEAT] Starting playback of next segment');
              playerRef.current?.playVideo();
            }, 100);
          }
        }, 500);
      } else {
        // Reached end of transcript
        console.log('[AUTO-REPEAT] Reached end of transcript. Stopping auto-repeat.');
        setAutoRepeatMode(false);
        setAbRepeat(prev => ({ ...prev, isActive: false, currentRepeat: 0 }));
      }
    }
  }, [abRepeat.currentRepeat, abRepeat.totalRepeats, abRepeat.pauseDuration, segments]);
  
  // Transcript Interaction
  const handleSegmentClick = useCallback((segment: TimeSegment, index: number) => {
    seekTo(segment.startTime);
    setActiveSegmentId(segment.id);
    onLineChange(index);
  }, [seekTo, onLineChange]);
  
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
  
  // Set up time tracking listener
  useEffect(() => {
    if (!isPlayerReady) return;
    
    let lastSegmentId: string | null = null;
    let lastLoggedTime = 0;
    
    const unsubscribe = timeManagerRef.current.onTimeUpdate((time) => {
      setCurrentTime(time);
      
      // Update active segment
      const activeSegment = timeManagerRef.current.findActiveSegment(segments, time);
      if (activeSegment) {
        const segmentIndex = segments.findIndex(s => s.id === activeSegment.id);
        
        // Check if segment actually changed
        if (activeSegment.id !== lastSegmentId) {
          console.log(`[AUTO-REPEAT] Segment changed to: ${activeSegment.id}, Index: ${segmentIndex}`);
          console.log(`[AUTO-REPEAT] Segment time: ${activeSegment.startTime} - ${activeSegment.endTime}`);
          
          lastSegmentId = activeSegment.id;
          setActiveSegmentId(activeSegment.id);
          setCurrentSegmentIndex(segmentIndex);
          
          if (autoScroll) {
            scrollToActiveSegment(activeSegment.id);
          }
          
          // In auto-repeat mode, ALWAYS update the A/B repeat for the new segment
          if (autoRepeatMode) {
            console.log('[AUTO-REPEAT] Updating repeat for new segment');
            console.log(`[AUTO-REPEAT] Setting new bounds: ${activeSegment.startTime} - ${activeSegment.endTime}`);
            console.log(`[AUTO-REPEAT] Total repeats: ${abRepeat.totalRepeats}, Pause: ${abRepeat.pauseDuration}ms`);
            setAbRepeat(prev => ({
              startTime: activeSegment.startTime,
              endTime: activeSegment.endTime,
              currentRepeat: 0,
              totalRepeats: prev.totalRepeats,
              pauseDuration: prev.pauseDuration,
              isActive: true
            }));
          }
        }
        
        // Check if we're near the end of segment - add more detailed logging
        const timeToEnd = abRepeat.endTime - time;
        if (autoRepeatMode && abRepeat.isActive) {
          // Log every 0.5 seconds to see progress
          if (Math.floor(time * 2) !== Math.floor(lastLoggedTime * 2)) {
            console.log(`[AUTO-REPEAT] Progress: Time=${time.toFixed(2)}, End=${abRepeat.endTime.toFixed(2)}, TimeToEnd=${timeToEnd.toFixed(2)}`);
            lastLoggedTime = time;
          }
          
          if (timeToEnd < 0.2 && timeToEnd > -0.1) {
            console.log(`[AUTO-REPEAT] ⚠️ NEAR END - Time: ${time.toFixed(2)}, End: ${abRepeat.endTime.toFixed(2)}, Diff: ${timeToEnd.toFixed(3)}`);
          }
        }
        
        // Handle auto-repeat mode segment completion
        if (autoRepeatMode && abRepeat.isActive && timeManagerRef.current.isSegmentComplete(time, abRepeat.endTime)) {
          console.log(`[AUTO-REPEAT] 🔴 SEGMENT COMPLETE! Time: ${time}, End: ${abRepeat.endTime}`);
          console.log(`[AUTO-REPEAT] Current repeat: ${abRepeat.currentRepeat}/${abRepeat.totalRepeats}`);
          handleAutoRepeatSegmentEnd(segmentIndex);
        }
      }
      
    });
    
    return () => unsubscribe();
  }, [isPlayerReady, segments, autoScroll, abRepeat, autoRepeatMode, handleAutoRepeatSegmentEnd, scrollToActiveSegment]);
  
  // Don't render if no session or transcript
  if (!session || !session.transcript || session.transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No transcript available
      </div>
    );
  }
  
  return (
    <div className={cn("flex flex-col lg:flex-row gap-4 h-full", className)}>
      {/* Video Player Section */}
      <div className="flex-1 flex flex-col">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {/* YouTube API container or fallback iframe */}
          {isPlayerReady && !playerRef.current && videoId ? (
            // Fallback to simple iframe if API fails
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div ref={playerContainerRef} className="absolute inset-0" />
          )}
          
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
            </div>
          </div>
          
          {/* Auto-Repeat Controls */}
          <div className="flex items-center justify-between">
            {/* Auto-Repeat Mode Button */}
            <button
              onClick={() => {
                const newMode = !autoRepeatMode;
                console.log('[AUTO-REPEAT] Mode toggled:', newMode ? 'ON' : 'OFF');
                setAutoRepeatMode(newMode);
                if (newMode) {
                  // Reset when enabling auto-repeat
                  console.log('[AUTO-REPEAT] Resetting A/B repeat state');
                  setAbRepeat(prev => ({ ...prev, isActive: false, currentRepeat: 0 }));
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                autoRepeatMode ? "bg-green-100 text-green-700" : "bg-gray-100 hover:bg-gray-200"
              )}
            >
              <Repeat className="w-4 h-4" />
              <span className="text-sm">
                {autoRepeatMode ? `Auto-Repeat ON (${abRepeat.currentRepeat + 1}/${abRepeat.totalRepeats})` : 'Auto-Repeat Each Line'}
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
          {segments.map((segment, index) => (
            <motion.div
              key={segment.id}
              id={`segment-${segment.id}`}
              onClick={() => handleSegmentClick(segment, index)}
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
                  {segment.text}
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