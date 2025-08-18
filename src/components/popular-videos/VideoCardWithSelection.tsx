'use client';

import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Youtube, Mic, FileVideo, Trash2, Check, ExternalLink, Flame, Users, Calendar } from 'lucide-react';
import { ExternalImage } from '@/components/ui/OptimizedImage';
import { Timestamp } from 'firebase/firestore';

interface PopularVideo {
  id: string;
  videoTitle?: string;
  videoUrl?: string;
  accessCount: number;
  userCount?: number;
  totalPractices?: number;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
  language: string;
  duration?: number;
  contentType: 'youtube' | 'audio' | 'video';
  createdBy?: string;
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    thumbnailUrl?: string;
  };
}

interface VideoCardWithSelectionProps {
  video: PopularVideo;
  index: number;
  isHistoryTab: boolean;
  globalSelectionMode: boolean;
  isInitiallySelected: boolean;
  onToggleSelection: (videoId: string, isSelected: boolean) => void;
  onPractice: (video: PopularVideo) => void;
  onDelete: (video: PopularVideo) => void;
}

const getYouTubeThumbnail = (videoId?: string) => {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

const getContentIcon = (contentType: 'youtube' | 'audio' | 'video') => {
  switch (contentType) {
    case 'youtube':
      return <Youtube className="w-5 h-5" />;
    case 'audio':
      return <Mic className="w-5 h-5" />;
    case 'video':
      return <FileVideo className="w-5 h-5" />;
    default:
      return <Play className="w-5 h-5" />;
  }
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp: Timestamp) => {
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const VideoCardWithSelection = memo(({ 
  video, 
  index, 
  isHistoryTab,
  globalSelectionMode,
  isInitiallySelected,
  onToggleSelection, 
  onPractice, 
  onDelete 
}: VideoCardWithSelectionProps) => {
  // Local selection state - only updates when this specific card is toggled
  const [isSelected, setIsSelected] = useState(isInitiallySelected);
  
  // Sync with external selection state only when needed
  useEffect(() => {
    setIsSelected(isInitiallySelected);
  }, [isInitiallySelected]);

  const videoId = video.metadata?.youtubeVideoId || (video.contentType === 'youtube' ? video.id.replace('youtube_', '') : null);
  const thumbnailUrl = video.contentType === 'youtube' ? getYouTubeThumbnail(videoId) : null;

  const handlePracticeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (globalSelectionMode && isHistoryTab) {
      return;
    }
    
    onPractice(video);
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (globalSelectionMode && isHistoryTab) {
      const newSelected = !isSelected;
      setIsSelected(newSelected);
      onToggleSelection(video.id, newSelected);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className={`bg-card rounded-2xl shadow-md border overflow-hidden hover:shadow-xl transition-all duration-300 ${
        isSelected ? 'border-primary border-2' : 'border-border'
      } ${globalSelectionMode && isHistoryTab ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* Thumbnail or Content Type Indicator */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group">
        {/* Selection checkbox overlay */}
        {globalSelectionMode && isHistoryTab && (
          <div 
            className="absolute top-3 left-3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              const newSelected = !isSelected;
              setIsSelected(newSelected);
              onToggleSelection(video.id, newSelected);
            }}
          >
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-primary border-primary' 
                : 'bg-white/90 border-gray-400 hover:border-primary'
            }`}>
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        )}
        
        {thumbnailUrl ? (
          <ExternalImage
            src={thumbnailUrl} 
            alt={video.videoTitle || 'Video thumbnail'}
            className="w-full h-full object-cover"
            width={320}
            height={180}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                {getContentIcon(video.contentType)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {video.contentType === 'audio' ? 'Audio File' : 'Video File'}
              </p>
            </div>
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          </div>
        </div>

        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs px-2 py-1 rounded-md font-medium">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Popularity badge */}
        {(video.userCount || video.accessCount || 0) > 10 && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Popular
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-3 text-lg">
          {video.videoTitle || `Untitled ${video.contentType === 'audio' ? 'Audio' : video.contentType === 'video' ? 'Video' : 'Content'}`}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span className="font-medium">{(video.userCount || video.accessCount || 0).toLocaleString()} users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(video.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!globalSelectionMode ? (
            <>
              <button
                onClick={handlePracticeClick}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium text-center flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Practice Now
              </button>
              {video.videoUrl && video.contentType === 'youtube' && (
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl transition-all duration-200 hover:scale-105"
                  title="View on YouTube"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
              {isHistoryTab && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video);
                  }}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl transition-all duration-200 hover:scale-105"
                  title="Remove from history"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <div className="w-full text-center py-2.5 text-sm font-medium text-muted-foreground">
              {isSelected ? 'Selected' : 'Tap to select'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.video.id === nextProps.video.id &&
    prevProps.isInitiallySelected === nextProps.isInitiallySelected &&
    prevProps.globalSelectionMode === nextProps.globalSelectionMode &&
    prevProps.isHistoryTab === nextProps.isHistoryTab
  );
});

VideoCardWithSelection.displayName = 'VideoCardWithSelection';