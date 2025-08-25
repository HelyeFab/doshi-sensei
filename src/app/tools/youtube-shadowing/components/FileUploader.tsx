'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  acceptedFormats?: string;
  maxSizeMB?: number;
}

export default function FileUploader({
  onFileSelect,
  isLoading = false,
  acceptedFormats = '.mp4,.webm,.mov,.mp3,.wav,.m4a,.ogg,.aac',
  maxSizeMB = 100
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    // Check file type
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'];
    const allValidTypes = [...validVideoTypes, ...validAudioTypes];

    if (!allValidTypes.includes(file.type)) {
      // Check by extension as fallback
      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['mp4', 'webm', 'mov', 'mp3', 'wav', 'm4a', 'ogg', 'aac'];
      
      if (!extension || !validExtensions.includes(extension)) {
        setError('Please upload a valid video (MP4, WebM, MOV) or audio file (MP3, WAV, M4A, OGG)');
        return false;
      }
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File): string => {
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type.startsWith('audio/')) return '🎵';
    return '📁';
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        <div className="text-center">
          {/* Icon */}
          <div className="text-5xl mb-4">
            {selectedFile ? getFileIcon(selectedFile) : '📤'}
          </div>

          {/* Status */}
          {!selectedFile ? (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Drop your media file here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:text-primary/80 underline font-medium"
                  disabled={isLoading}
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: MP4, WebM, MOV, MP3, WAV, M4A, OGG (max {maxSizeMB}MB)
              </p>
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedFile.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-primary hover:text-primary/80 underline mt-2"
                  >
                    Choose different file
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </p>
          </motion.div>
        )}
      </div>

      {/* File Format Info */}
      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <span>💡</span>
          Supported Formats
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Video:</span> MP4, WebM, MOV
          </div>
          <div>
            <span className="font-medium">Audio:</span> MP3, WAV, M4A, OGG, AAC
          </div>
        </div>
      </div>
    </div>
  );
}