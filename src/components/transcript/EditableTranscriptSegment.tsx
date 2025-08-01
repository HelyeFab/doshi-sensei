'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Check, X, AlertCircle } from 'lucide-react';
import { TranscriptWithConfidence } from '@/services/userTranscripts/UserTranscriptService';
import { useSubscription2 } from '@/hooks/useSubscription2';

interface EditableTranscriptSegmentProps {
  segment: TranscriptWithConfidence;
  segmentId: string;
  isActive: boolean;
  onEdit: (segmentId: string, newText: string) => Promise<void>;
  onCancel?: () => void;
}

export function EditableTranscriptSegment({
  segment,
  segmentId,
  isActive,
  onEdit,
  onCancel,
}: EditableTranscriptSegmentProps) {
  const { isPremium } = useSubscription2();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(segment.text);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!isPremium) {
      // Show upgrade modal or tooltip
      return;
    }
    setIsEditing(true);
    setEditedText(segment.text);
  };

  const handleSave = async () => {
    if (editedText.trim() === segment.text.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(segmentId, editedText.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedText(segment.text);
    onCancel?.();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceStyles = (confidence: number) => {
    if (segment.isUserEdited) {
      return 'border-b-2 border-blue-500 border-dotted';
    }
    if (confidence >= 0.9) return '';
    if (confidence >= 0.7) return 'border-b border-yellow-500 border-dotted';
    return 'border-b-2 border-red-500 border-dotted';
  };

  return (
    <motion.div
      className={`group relative inline-block ${isActive ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!isEditing ? (
        <span
          className={`relative ${getConfidenceStyles(segment.confidence)} cursor-pointer transition-all duration-200`}
          onClick={handleStartEdit}
        >
          {segment.text}
          
          {/* Confidence indicator on hover */}
          {!segment.isUserEdited && segment.confidence < 0.9 && (
            <span className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs bg-black/80 text-white px-2 py-1 rounded whitespace-nowrap">
              Confidence: {Math.round(segment.confidence * 100)}%
            </span>
          )}
          
          {/* User edited badge */}
          {segment.isUserEdited && (
            <span className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs bg-blue-500 text-white px-2 py-1 rounded">
              Edited
            </span>
          )}
          
          {/* Edit icon on hover (premium only) */}
          {isPremium && (
            <Edit2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity duration-200" />
          )}
        </span>
      ) : (
        <div className="inline-flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            className="min-w-[200px] px-2 py-1 border rounded text-sm resize-none"
            rows={1}
            disabled={isSaving}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Low confidence warning */}
      {!segment.isUserEdited && segment.confidence < 0.5 && !isEditing && (
        <AlertCircle className={`inline-block ml-1 w-3 h-3 ${getConfidenceColor(segment.confidence)}`} />
      )}
    </motion.div>
  );
}