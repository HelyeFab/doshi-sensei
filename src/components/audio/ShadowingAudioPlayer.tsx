'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewsArticle } from '@/types/news';
import ArticleTTSManager from '@/utils/articleTTS';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Settings } from 'lucide-react';

interface ShadowingAudioPlayerProps {
  article: NewsArticle;
  onClose?: () => void;
}

interface SentenceData {
  text: string;
  startIndex: number;
  endIndex: number;
}

export default function ShadowingAudioPlayer({ article, onClose }: ShadowingAudioPlayerProps) {
  // State
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<'male' | 'female'>('male');
  const [provider, setProvider] = useState<'elevenlabs' | 'google'>('elevenlabs');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(1);
  const [pauseBetweenRepeats, setPauseBetweenRepeats] = useState(2000); // ms
  const [showSettings, setShowSettings] = useState(false);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse sentences on mount
  useEffect(() => {
    if (article?.content) {
      const parsedSentences = parseSentences(article.content);
      setSentences(parsedSentences);
    }
  }, [article]);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    };
  }, []);

  // Parse content into sentences
  const parseSentences = (content: string): SentenceData[] => {
    // Japanese sentence endings: 。！？
    const sentenceRegex = /[^。！？]+[。！？]/g;
    const sentences: SentenceData[] = [];
    let match;
    
    while ((match = sentenceRegex.exec(content)) !== null) {
      sentences.push({
        text: match[0].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    // If no sentences found, treat the whole content as one sentence
    if (sentences.length === 0 && content.trim()) {
      sentences.push({
        text: content.trim(),
        startIndex: 0,
        endIndex: content.length
      });
    }
    
    return sentences;
  };

  // Play current sentence
  const playCurrentSentence = async () => {
    if (currentSentenceIndex >= sentences.length || !sentences[currentSentenceIndex]) {
      setError('No sentence to play');
      return;
    }

    const sentence = sentences[currentSentenceIndex];
    setIsLoading(true);
    setError(null);
    setIsPlaying(true);

    try {
      // Generate TTS for the sentence
      const audio = await ArticleTTSManager.playArticle(
        `${article.id}_sentence_${currentSentenceIndex}`,
        sentence.text,
        {
          voice,
          provider,
          onProgress: (status) => {
            console.log('[Shadowing] TTS Progress:', status);
          }
        }
      );

      if (audio) {
        audioRef.current = audio;
        audio.playbackRate = playbackSpeed;
        
        // Handle audio end
        audio.onended = () => {
          handleSentenceEnd();
        };

        // Handle audio error
        audio.onerror = (e) => {
          console.error('[Shadowing] Audio error:', e);
          setError('Failed to play audio');
          setIsPlaying(false);
          setIsLoading(false);
        };

        // Start playing
        await audio.play();
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[Shadowing] Error playing sentence:', err);
      setError(err instanceof Error ? err.message : 'Failed to play sentence');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // Handle when a sentence finishes playing
  const handleSentenceEnd = () => {
    const nextRepeat = currentRepeat + 1;
    
    if (nextRepeat < repeatCount) {
      // More repeats to go
      setCurrentRepeat(nextRepeat);
      
      // Pause before repeating
      repeatTimeoutRef.current = setTimeout(() => {
        playCurrentSentence();
      }, pauseBetweenRepeats);
    } else {
      // Done with repeats, reset
      setCurrentRepeat(0);
      setIsPlaying(false);
    }
  };

  // Control functions
  const play = () => {
    if (!isPlaying && !isLoading) {
      setCurrentRepeat(0);
      playCurrentSentence();
    }
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
    }
    setIsPlaying(false);
    setCurrentRepeat(0);
  };

  const nextSentence = () => {
    stop();
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    }
  };

  const previousSentence = () => {
    stop();
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Get current sentence
  const currentSentence = sentences[currentSentenceIndex];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shadowing Practice</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Voice</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVoice('male')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      voice === 'male' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => setVoice('female')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      voice === 'female' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>

              {/* Speed Control */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Speed: {playbackSpeed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Repeat Count */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Repeat Count: {repeatCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Pause Between Repeats */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pause Between: {pauseBetweenRepeats / 1000}s
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
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6">
          {/* Sentence Display */}
          <div className="mb-6">
            <div className="text-sm text-muted-foreground mb-2">
              Sentence {currentSentenceIndex + 1} of {sentences.length}
              {repeatCount > 1 && isPlaying && ` (Repeat ${currentRepeat + 1}/${repeatCount})`}
            </div>
            <div className="bg-muted/50 rounded-lg p-6 min-h-[150px] flex items-center justify-center">
              {currentSentence ? (
                <p className="text-2xl leading-relaxed text-center japanese-text">
                  {currentSentence.text}
                </p>
              ) : (
                <p className="text-muted-foreground">No sentence available</p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentSentenceIndex + 1) / sentences.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousSentence}
              disabled={currentSentenceIndex === 0}
              className="p-3 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={isPlaying ? pause : play}
              disabled={isLoading || !currentSentence}
              className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            <button
              onClick={nextSentence}
              disabled={currentSentenceIndex === sentences.length - 1}
              className="p-3 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 text-sm text-muted-foreground text-center">
            <p>Listen to each sentence and repeat it during the pause.</p>
            <p>Adjust settings to match your learning pace.</p>
          </div>
        </div>

        {/* Sentence List */}
        <div className="border-t max-h-[200px] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-2">All Sentences</h3>
            <div className="space-y-1">
              {sentences.map((sentence, index) => (
                <button
                  key={index}
                  onClick={() => {
                    stop();
                    setCurrentSentenceIndex(index);
                  }}
                  className={`w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm ${
                    index === currentSentenceIndex ? 'bg-muted font-medium' : ''
                  }`}
                >
                  <span className="text-muted-foreground mr-2">{index + 1}.</span>
                  {sentence.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}