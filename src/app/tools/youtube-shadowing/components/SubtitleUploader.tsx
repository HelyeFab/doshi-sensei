'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { TranscriptLine } from '../page';
import { useStrings } from '@/contexts/LanguageContext';

interface SubtitleUploaderProps {
  onSubtitlesLoaded: (transcript: TranscriptLine[]) => void;
}

export default function SubtitleUploader({ onSubtitlesLoaded }: SubtitleUploaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strings = useStrings();

  const parseTimestamp = (timestamp: string): number => {
    // Parse SRT/VTT timestamps: 00:00:00,000 or 00:00:00.000 or 00:00.000
    const cleanTime = timestamp.replace(',', '.').trim();
    const parts = cleanTime.split(':');
    
    if (parts.length === 3) {
      // HH:MM:SS.mmm
      const [hours, minutes, seconds] = parts;
      return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    } else if (parts.length === 2) {
      // MM:SS.mmm
      const [minutes, seconds] = parts;
      return parseInt(minutes) * 60 + parseFloat(seconds);
    } else if (parts.length === 1) {
      // SS.mmm
      return parseFloat(parts[0]);
    }
    
    return 0;
  };

  const parseSRT = (content: string): TranscriptLine[] => {
    const transcript: TranscriptLine[] = [];
    const blocks = content.trim().split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;
      
      // First line is usually the sequence number (skip it)
      let timeIndex = 0;
      if (/^\d+$/.test(lines[0])) {
        timeIndex = 1;
      }
      
      // Parse timestamp
      const timeLine = lines[timeIndex];
      if (!timeLine || !timeLine.includes('-->')) continue;
      
      const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
      const startTime = parseTimestamp(startStr);
      const endTime = parseTimestamp(endStr);
      
      // Remaining lines are the subtitle text
      const textLines = lines.slice(timeIndex + 1);
      const text = textLines.join(' ').trim();
      
      if (text) {
        transcript.push({
          id: String(transcript.length + 1),
          text,
          startTime,
          endTime,
          words: text.split(/[\s、。！？]/g).filter(w => w.length > 0)
        });
      }
    }
    
    return transcript;
  };

  const parseVTT = (content: string): TranscriptLine[] => {
    // Remove WEBVTT header
    const cleanContent = content.replace(/^WEBVTT.*$/m, '').trim();
    // VTT is similar to SRT but may have additional metadata
    return parseSRT(cleanContent);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setError(null);
    
    try {
      const content = await file.text();
      let transcript: TranscriptLine[] = [];
      
      if (file.name.endsWith('.srt')) {
        transcript = parseSRT(content);
      } else if (file.name.endsWith('.vtt')) {
        transcript = parseVTT(content);
      } else {
        // Try to parse as SRT by default
        transcript = parseSRT(content);
      }
      
      if (transcript.length === 0) {
        throw new Error('No valid subtitles found in file');
      }
      
      onSubtitlesLoaded(transcript);
      setIsExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse subtitle file');
      console.error('Subtitle parsing error:', err);
    }
  };

  const handleTextPaste = () => {
    const textarea = document.getElementById('subtitle-paste') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const content = textarea.value.trim();
    if (!content) {
      setError('Please paste subtitle content');
      return;
    }
    
    setError(null);
    
    try {
      const transcript = parseSRT(content);
      
      if (transcript.length === 0) {
        throw new Error('No valid subtitles found. Please ensure the format is correct (SRT/VTT)');
      }
      
      onSubtitlesLoaded(transcript);
      setIsExpanded(false);
      textarea.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse subtitles');
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-amber-800 font-medium">
            YouTube subtitle extraction is blocked
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Due to YouTube's restrictions on cloud services, automatic subtitle extraction isn't available. 
            You can manually add subtitles instead.
          </p>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm font-medium text-amber-900 hover:text-amber-700 underline"
          >
            {isExpanded ? 'Hide options' : 'Add subtitles manually'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-amber-200 pt-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Upload subtitle file (SRT/VTT)
            </label>
            <label className="block">
              <input
                type="file"
                accept=".srt,.vtt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-full p-4 border-2 border-dashed border-amber-300 rounded-lg text-center cursor-pointer hover:border-amber-400 transition-colors bg-white">
                <FileText className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Click to upload SRT/VTT file
                </p>
              </div>
            </label>
          </div>
          
          {/* Text Paste */}
          <div>
            <label htmlFor="subtitle-paste" className="block text-sm font-medium text-amber-900 mb-2">
              Or paste subtitle content
            </label>
            <textarea
              id="subtitle-paste"
              className="w-full h-32 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              placeholder="Paste SRT/VTT content here..."
            />
            <button
              onClick={handleTextPaste}
              className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Load Subtitles
            </button>
          </div>
          
          {/* Instructions */}
          <div className="text-xs text-amber-700 space-y-1">
            <p>To get subtitles from YouTube:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open the video on YouTube</li>
              <li>Click the "..." menu below the video</li>
              <li>Select "Show transcript"</li>
              <li>Copy the transcript and paste it here</li>
            </ol>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}