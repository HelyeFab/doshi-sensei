'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Film, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { processVideoAudio } from '@/utils/audioProcessor';

interface VideoUploaderProps {
  onVideoReady: (videoUrl: string, audioUrl: string, title: string, fileInfo?: { name: string; size: number; type: string }) => void;
}

export default function VideoUploader({ onVideoReady }: VideoUploaderProps) {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file (MP4, WebM, MOV, etc.)');
      return;
    }

    console.log('Video file details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Check file size (limit to 500MB for videos)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError('Video file is too large. Please upload a file smaller than 500MB.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Create object URL for video playback
      setProcessingStage('Creating video preview...');
      // Store the actual file instead of creating URL immediately
      // We'll create the URL after we know it's valid
      const videoFile = file;
      
      // Step 2: Extract audio from video using ffmpeg.wasm
      setProcessingStage('Loading audio extraction tools...');
      setUploadProgress(20);
      
      let audioBlob: Blob;
      try {
        audioBlob = await processVideoAudio(file, (progress) => {
          // Update progress from 20 to 80
          setUploadProgress(20 + (progress.percent * 0.6));
          if (progress.stage) {
            setProcessingStage(progress.stage);
          }
        });
      } catch (ffmpegError) {
        console.error('FFmpeg error:', ffmpegError);
        throw new Error('Failed to extract audio from video. Please try a different video format.');
      }

      // Step 3: Create URLs for video and audio
      setProcessingStage('Finalizing...');
      setUploadProgress(90);
      
      // Create video URL directly from the original file
      const videoUrl = URL.createObjectURL(videoFile);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('Created URLs:', {
        videoUrl,
        audioUrl,
        videoType: videoFile.type
      });

      // Success!
      setUploadProgress(100);
      setProcessingStage('Video ready!');
      
      // Extract filename without extension for title
      const title = videoFile.name.replace(/\.[^/.]+$/, '');
      
      showNotification('Video uploaded successfully!', 'success');
      onVideoReady(videoUrl, audioUrl, title, {
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type
      });
      
      // Reset after short delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setProcessingStage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);

    } catch (err) {
      console.error('Video processing error:', err);
      setError('Failed to process video. Please try again.');
      showNotification('Failed to process video', 'error');
      setIsUploading(false);
      setUploadProgress(0);
      setProcessingStage('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      // Create a synthetic event to reuse handleFileSelect
      const syntheticEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(syntheticEvent);
    } else {
      setError('Please drop a video file');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
        <Film className="w-5 h-5" />
        Upload Video File
      </h3>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isUploading 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        {!isUploading ? (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-foreground font-medium mb-2">
              Drop video file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports MP4, WebM, MOV, AVI (max 500MB)
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <div className="space-y-2">
              <p className="text-foreground font-medium">{processingStage}</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Video processing happens in your browser. Large files may take a few minutes to process.
        </p>
      </div>
    </div>
  );
}