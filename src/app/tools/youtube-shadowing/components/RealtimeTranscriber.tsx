'use client';

import { useState, useEffect, useRef } from 'react';
import { TranscriptLine } from '../page';
import { processVideoAudio, createAudioChunks, AudioProcessingProgress } from '@/utils/audioProcessor';
import { Loader2, AlertCircle, Mic, MicOff } from 'lucide-react';

interface RealtimeTranscriberProps {
  videoUrl: string;
  onTranscriptUpdate: (transcript: TranscriptLine[]) => void;
  onError: (error: string) => void;
}

export default function RealtimeTranscriber({
  videoUrl,
  onTranscriptUpdate,
  onError
}: RealtimeTranscriberProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AudioProcessingProgress>({ stage: 'loading', progress: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const currentTimeRef = useRef(0);

  // Start recording audio from the page
  const startRecording = async () => {
    try {
      // Request audio capture permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start(10000); // Capture in 10-second chunks
      setIsRecording(true);
      
      // Process chunks every 30 seconds
      const chunkInterval = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
          processCurrentChunks();
        }
      }, 30000);
      
      // Store interval ID for cleanup
      (mediaRecorderRef.current as any).chunkInterval = chunkInterval;
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError('Failed to access microphone. Please allow microphone access and ensure you are on the YouTube page.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      const interval = (mediaRecorderRef.current as any).chunkInterval;
      if (interval) clearInterval(interval);
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process recorded audio chunks
  const processCurrentChunks = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = []; // Clear processed chunks
    
    try {
      // Convert webm to mp3 and compress
      const processedAudio = await processVideoAudio(audioBlob, setProgress);
      
      // Send to Whisper API
      await transcribeAudio(processedAudio);
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
    }
  };

  // Process the final recorded audio
  const processRecordedAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Process with FFmpeg
      const processedAudio = await processVideoAudio(audioBlob, setProgress);
      
      // Create chunks for better transcription
      const chunks = await createAudioChunks(processedAudio, 30);
      
      // Transcribe each chunk
      for (let i = 0; i < chunks.length; i++) {
        setProgress({ stage: 'transcribing', progress: i / chunks.length });
        await transcribeAudio(chunks[i], i * 30);
      }
      
      setProgress({ stage: 'transcribing', progress: 1 });
    } catch (error) {
      console.error('Audio processing failed:', error);
      onError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Transcribe audio using Whisper API
  const transcribeAudio = async (audioBlob: Blob, startTime: number = currentTimeRef.current) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.mp3');
      formData.append('language', 'ja');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      
      if (data.transcript && data.transcript.length > 0) {
        // Adjust timestamps based on start time
        const adjustedTranscript = data.transcript.map((line: TranscriptLine, index: number) => ({
          ...line,
          id: `${Date.now()}_${index}`,
          startTime: startTime + line.startTime,
          endTime: startTime + line.endTime
        }));
        
        // Merge with existing transcript
        transcriptRef.current = [...transcriptRef.current, ...adjustedTranscript];
        onTranscriptUpdate(transcriptRef.current);
        
        // Update current time reference
        currentTimeRef.current = startTime + 30;
      }
    } catch (error) {
      console.error('Transcription error:', error);
      // Don't show error for individual chunks, just log it
    }
  };

  const getProgressMessage = () => {
    switch (progress.stage) {
      case 'loading':
        return 'Loading audio processor...';
      case 'processing':
        return 'Processing audio...';
      case 'uploading':
        return 'Uploading audio...';
      case 'transcribing':
        return 'Transcribing with AI...';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="font-medium text-foreground mb-4">Real-time Transcription</h3>
      
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                How to use real-time transcription:
              </p>
              <ol className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-decimal list-inside space-y-1">
                <li>Play the YouTube video above</li>
                <li>Click "Start Recording" to capture audio</li>
                <li>The system will transcribe audio every 30 seconds</li>
                <li>Click "Stop Recording" when finished</li>
              </ol>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Note: This captures system audio. Make sure your volume is up and other apps are muted.
              </p>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors animate-pulse"
            >
              <MicOff className="w-5 h-5" />
              Stop Recording
            </button>
          )}
        </div>

        {/* Progress Display */}
        {(isProcessing || isRecording) && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {isRecording ? 'Recording audio... (transcribing every 30s)' : getProgressMessage()}
              </span>
            </div>
            
            {!isRecording && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Transcript Preview */}
        {transcriptRef.current.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">
              Transcribed: {transcriptRef.current.length} segments
            </p>
            <p className="text-xs text-muted-foreground">
              Latest: {transcriptRef.current[transcriptRef.current.length - 1]?.text.substring(0, 50)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}