'use client';

import { useEffect, useState, useCallback } from 'react';
import { TranscriptLine } from '../YouTubeShadowing';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { 
  userTranscriptService, 
  TranscriptWithConfidence 
} from '@/services/userTranscripts/UserTranscriptService';
import { EditableTranscriptSegment } from '@/components/transcript/EditableTranscriptSegment';
import { motion } from 'framer-motion';
import { AlertCircle, Edit2, Save, RefreshCw, Music, CheckCircle } from 'lucide-react';
import { TranscriptSegment } from '@/types/transcript';

interface EditableTranscriptDisplayProps {
  transcript: TranscriptLine[];
  videoId: string;
  videoTitle?: string;
  videoUrl?: string;
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    duration?: number;
    thumbnailUrl?: string;
    isMusic?: boolean;
  };
  currentLineIndex?: number;
  showFurigana?: boolean;
  onTranscriptUpdate?: (updatedTranscript: TranscriptLine[]) => void;
}

export default function EditableTranscriptDisplay({
  transcript,
  videoId,
  videoTitle,
  videoUrl,
  metadata,
  currentLineIndex = -1,
  showFurigana = true,
  onTranscriptUpdate,
}: EditableTranscriptDisplayProps) {
  const { user } = useAuth();
  const { isPremium } = useSubscription2();
  const strings = useStrings();
  const [mergedTranscript, setMergedTranscript] = useState<TranscriptWithConfidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEdits, setHasEdits] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditTip, setShowEditTip] = useState(false);
  const [lyricsValidation, setLyricsValidation] = useState<{
    isValidated: boolean;
    confidence: number;
    lyricsFound: boolean;
    isMusic: boolean;
  } | null>(null);
  const [isValidatingLyrics, setIsValidatingLyrics] = useState(false);

  // Convert TranscriptLine to TranscriptSegment format
  const convertToSegments = (lines: TranscriptLine[]): TranscriptSegment[] => {
    return lines.map(line => ({
      text: line.text,
      startTime: line.startTime,
      endTime: line.endTime,
      duration: line.endTime - line.startTime,
      offset: line.startTime * 1000, // Convert to milliseconds
      lang: 'ja',
    }));
  };

  // Load user's edited transcript if available
  useEffect(() => {
    loadUserTranscript();
  }, [videoId, user]);

  // Validate with lyrics if it's a music video
  useEffect(() => {
    if (metadata?.isMusic || videoTitle?.toLowerCase().includes('mv') || 
        videoTitle?.toLowerCase().includes('music')) {
      validateWithLyrics();
    }
  }, [videoId, videoTitle, metadata]);

  const loadUserTranscript = async () => {
    // Always convert segments first
    const segments = convertToSegments(transcript);
    
    if (!user || !isPremium) {
      // Just use original transcript for non-premium users
      setMergedTranscript(
        segments.map((seg, index) => ({
          ...seg,
          confidence: 0.8, // Default confidence
          isUserEdited: false,
          validationSource: 'original' as const,
        }))
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userTranscript = await userTranscriptService.getUserTranscript(videoId);
      
      if (userTranscript) {
        // Merge user edits with current transcript
        const merged = userTranscriptService.mergeTranscriptWithEdits(
          convertToSegments(transcript),
          userTranscript.userEdits
        );
        setMergedTranscript(merged);
        setHasEdits(Object.keys(userTranscript.userEdits).length > 0);
      } else {
        // No edits, use original
        const segments = convertToSegments(transcript);
        setMergedTranscript(
          segments.map((seg, index) => ({
            ...seg,
            confidence: 0.8,
            isUserEdited: false,
            validationSource: 'original' as const,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading user transcript:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate transcript with lyrics
  const validateWithLyrics = async () => {
    if (!videoTitle && !metadata?.channelName) return;
    
    // Only validate for premium users or if it's just detection (no Firebase access needed)
    setIsValidatingLyrics(true);
    try {
      const validation = await userTranscriptService.validateWithLyrics(
        convertToSegments(transcript),
        {
          title: videoTitle,
          channelName: metadata?.channelName,
          category: metadata?.category,
          tags: metadata?.tags,
        }
      );

      setLyricsValidation({
        isValidated: validation.isValidated,
        confidence: validation.confidence,
        lyricsFound: validation.lyricsFound,
        isMusic: validation.lyricsFound || validation.confidence > 0.5,
      });

      // Update confidence scores if lyrics were found and validated
      if (validation.isValidated && validation.validationResult) {
        const updatedTranscript = await userTranscriptService.updateConfidenceWithLyrics(
          mergedTranscript,
          validation.validationResult
        );
        setMergedTranscript(updatedTranscript);
      }
    } catch (error) {
      console.error('Error validating with lyrics:', error);
    } finally {
      setIsValidatingLyrics(false);
    }
  };

  // Handle segment edit
  const handleSegmentEdit = useCallback(async (segmentId: string, newText: string) => {
    if (!user || !isPremium) return;

    const segmentIndex = parseInt(segmentId.replace('segment_', ''));
    const originalSegment = convertToSegments(transcript)[segmentIndex];
    
    if (!originalSegment) return;

    try {
      // Update in database
      await userTranscriptService.updateSegmentEdit(
        videoId,
        segmentId,
        originalSegment.text,
        newText,
        1.0 // User edits have high confidence
      );

      // Update local state
      setMergedTranscript(prev => {
        const updated = [...prev];
        updated[segmentIndex] = {
          ...updated[segmentIndex],
          text: newText,
          isUserEdited: true,
          confidence: 1.0,
          validationSource: 'community',
        };
        return updated;
      });

      setHasEdits(true);

      // Notify parent component
      if (onTranscriptUpdate) {
        const updatedLines = mergedTranscript.map((seg, idx) => ({
          id: `line-${idx}`,
          text: idx === segmentIndex ? newText : seg.text,
          startTime: seg.startTime || 0,
          endTime: seg.endTime || 0,
        }));
        onTranscriptUpdate(updatedLines);
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      // TODO: Show error toast
    }
  }, [user, isPremium, videoId, transcript, mergedTranscript, onTranscriptUpdate]);

  // Save all edits (batch save)
  const handleSaveAll = async () => {
    if (!user || !isPremium) return;

    setIsSaving(true);
    try {
      const userEdits: { [key: string]: any } = {};
      
      mergedTranscript.forEach((seg, index) => {
        if (seg.isUserEdited) {
          const originalSegment = convertToSegments(transcript)[index];
          userEdits[`segment_${index}`] = {
            originalText: originalSegment.text,
            editedText: seg.text,
            editedAt: new Date(),
            confidence: seg.confidence,
          };
        }
      });

      await userTranscriptService.saveUserTranscript(
        videoId,
        convertToSegments(transcript),
        userEdits,
        {
          youtubeVideoId: metadata?.youtubeVideoId,
          channelName: metadata?.channelName,
          duration: metadata?.duration,
          thumbnailUrl: metadata?.thumbnailUrl,
          isMusic: metadata?.isMusic,
        }
      );

      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to save transcript:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original
  const handleResetTranscript = async () => {
    if (!confirm('Are you sure you want to reset all your edits?')) return;

    try {
      await userTranscriptService.deleteUserTranscript(videoId);
      await loadUserTranscript();
      setHasEdits(false);
    } catch (error) {
      console.error('Failed to reset transcript:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lyrics validation status */}
      {lyricsValidation?.isMusic && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            lyricsValidation.lyricsFound 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">
                  Music Video Detected
                  {lyricsValidation.lyricsFound && (
                    <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Lyrics Validated
                    </span>
                  )}
                </p>
                {lyricsValidation.lyricsFound && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Transcript confidence boosted by {Math.round(lyricsValidation.confidence * 20)}% based on lyrics match
                  </p>
                )}
              </div>
            </div>
            {isValidatingLyrics && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            )}
          </div>
        </motion.div>
      )}

      {/* Header with edit controls */}
      {isPremium && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              Click any text to edit the transcript
            </span>
            {hasEdits && (
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                {Object.keys(mergedTranscript.filter(s => s.isUserEdited)).length} edits
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasEdits && (
              <>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save All
                </button>
                <button
                  onClick={handleResetTranscript}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confidence legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Confidence indicators:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-12 border-b-2 border-green-500"></span>
          High (90%+)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-12 border-b border-yellow-500 border-dotted"></span>
          Medium (70-90%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-12 border-b-2 border-red-500 border-dotted"></span>
          Low (&lt;70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-12 border-b-2 border-blue-500 border-dotted"></span>
          User edited
        </span>
        {lyricsValidation?.lyricsFound && (
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Lyrics verified
          </span>
        )}
      </div>

      {/* Transcript segments */}
      <div className="space-y-4">
        {mergedTranscript.map((segment, index) => (
          <motion.div
            key={`segment-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`p-4 rounded-lg ${
              currentLineIndex === index 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500' 
                : 'bg-card'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(segment.startTime || 0)}
              </span>
              <div className="flex-1 text-lg leading-relaxed">
                <EditableTranscriptSegment
                  segment={segment}
                  segmentId={`segment_${index}`}
                  isActive={currentLineIndex === index}
                  onEdit={handleSegmentEdit}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Premium upgrade prompt for non-premium users */}
      {!isPremium && (
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Want to improve transcript accuracy?
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Premium users can edit transcripts to fix errors and save their corrections for future practice.
              </p>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}