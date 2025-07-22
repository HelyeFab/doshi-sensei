'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShadowingSession, TranscriptLine } from '../page';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Settings, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

interface ShadowingPlayerProps {
  session: ShadowingSession;
  onLineChange: (index: number) => void;
}

export default function ShadowingPlayer({ session, onLineChange }: ShadowingPlayerProps) {
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

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentLine = session.transcript[session.currentLineIndex];

  // Initialize audio element
  useEffect(() => {
    if (session.audioUrl && !audioRef.current) {
      const audio = new Audio(session.audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.volume = volume;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleAudioEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleAudioEnded);
        audio.pause();
      };
    }
  }, [session.audioUrl]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (!audioRef.current || !currentLine) return;

    const currentTime = audioRef.current.currentTime;
    if (currentTime >= currentLine.endTime) {
      audioRef.current.pause();
      handleLineComplete();
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleLineComplete = () => {
    if (currentRepeat < repeatCount - 1) {
      // More repeats to go
      setCurrentRepeat(prev => prev + 1);
      repeatTimeoutRef.current = setTimeout(() => {
        playCurrentLine();
      }, pauseBetweenRepeats);
    } else {
      // All repeats done
      setCurrentRepeat(0);
      setIsPlaying(false);
    }
  };

  const playCurrentLine = () => {
    if (!audioRef.current || !currentLine) return;

    audioRef.current.currentTime = currentLine.startTime;
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(err => {
        console.error('Playback error:', err);
        showNotification('Failed to play audio', 'error');
      });
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
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
      {/* Current Line Display */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="text-center mb-6">
          <p className="text-2xl font-medium text-foreground mb-2">
            {currentLine?.text || ''}
          </p>
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
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
            >
              Record Your Voice
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium animate-pulse"
            >
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