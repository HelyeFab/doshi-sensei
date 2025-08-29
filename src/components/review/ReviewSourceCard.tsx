'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ReviewSource,
  ReviewItem,
  SourceStats
} from '@/lib/review-sources/review-source.interface';
import {
  REVIEW_SOURCE_CONFIGS,
  PRIORITY_CONFIGS,
  getPriorityConfig
} from '@/lib/review-sources/constants';

interface ReviewSourceCardProps {
  source: ReviewSource;
  dueItems: ReviewItem[];
  stats: SourceStats;
  onNavigate: () => void;
  priority: number; // 1-5
  showPreview?: boolean;
  isGoldenTime?: boolean;
}

const ReviewSourceCard: React.FC<ReviewSourceCardProps> = ({
  source,
  dueItems,
  stats,
  onNavigate,
  priority,
  showPreview = true,
  isGoldenTime = false
}) => {
  const sourceConfig = REVIEW_SOURCE_CONFIGS[source.type];
  const priorityConfig = getPriorityConfig(priority as any) || PRIORITY_CONFIGS[2]; // Default to medium
  
  // Calculate estimated time (rough estimate: 30 seconds per item)
  const estimatedTimeMinutes = Math.ceil(stats.dueToday * 0.5);
  
  // Determine card state
  const hasItemsDue = stats.dueToday > 0;
  const isOverdue = stats.overdue > 0;
  const isDisabled = !source.config.enabled;
  
  // Format time display
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format last reviewed time
  const formatLastReviewed = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  // Determine gradient colors based on source type
  const getGradientColors = () => {
    const baseColors = {
      'kanji-mastery': 'from-destructive to-destructive/80',
      'textbook-vocabulary': 'from-primary to-primary/80',
      'flashcards': 'from-accent to-accent/80',
      'grammar-drills': 'from-secondary to-secondary/80',
      'custom-lists': 'from-muted to-muted/80',
      'shadowing-practice': 'from-primary/60 to-primary/40',
      'reading-comprehension': 'from-secondary/60 to-secondary/40',
      'listening-practice': 'from-accent/60 to-accent/40'
    };
    
    return baseColors[source.type] || 'from-muted to-muted/80';
  };

  return (
    <motion.div
      className={`bg-card rounded-lg shadow-sm border transition-all cursor-pointer ${
        isDisabled 
          ? 'border-border/50 opacity-60' 
          : hasItemsDue 
            ? 'border-border hover:shadow-md hover:scale-[1.02]' 
            : 'border-border hover:shadow-sm'
      }`}
      onClick={!isDisabled ? onNavigate : undefined}
      whileHover={!isDisabled ? { y: -2 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      layout
    >
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${getGradientColors()} p-4 rounded-t-lg relative overflow-hidden`}>
        {/* Golden Time Badge */}
        {isGoldenTime && hasItemsDue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2 bg-accent/20 border border-accent/30 rounded-full px-2 py-1"
          >
            <span className="text-xs font-medium text-accent-foreground">🌅 Golden Time</span>
          </motion.div>
        )}

        <div className="flex items-center gap-3 text-white">
          <div className="text-2xl">{sourceConfig.icon}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{sourceConfig.name}</h3>
            <p className="text-white/80 text-sm">{sourceConfig.description}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Statistics Display */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Due Now */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isOverdue ? 'text-destructive' : stats.dueToday > 0 ? 'text-accent' : 'text-muted-foreground'
            }`}>
              {stats.dueToday}
            </div>
            <div className="text-xs text-muted-foreground">Due Now</div>
            {isOverdue && (
              <div className="text-xs text-destructive mt-1">
                +{stats.overdue} overdue
              </div>
            )}
          </div>

          {/* Total Items */}
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.totalItems}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>

          {/* Accuracy */}
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">
              {(stats.retentionRate).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
        </div>

        {/* Preview Cards */}
        {showPreview && hasItemsDue && dueItems.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-2">Next items:</div>
            <div className="space-y-2">
              {dueItems.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {item.content.primary}
                    </div>
                    {item.content.secondary && (
                      <div className="text-muted-foreground text-xs truncate">
                        {item.content.secondary}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground/70 ml-2">
                    {formatLastReviewed(item.metadata.source?.lastReviewed)}
                  </div>
                </div>
              ))}
              
              {dueItems.length > 3 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  +{dueItems.length - 3} more items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estimated Time */}
        {hasItemsDue && (
          <div className="flex items-center justify-between mb-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-primary">
                Estimated time: {formatTime(estimatedTimeMinutes)}
              </span>
            </div>
            {isGoldenTime && (
              <span className="text-xs text-accent-foreground bg-accent/20 px-2 py-1 rounded-full">
                1.2× bonus
              </span>
            )}
          </div>
        )}

        {/* Action Section */}
        <div className="flex items-center justify-between">
          {/* Priority Badge */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${priorityConfig.color}20`,
              color: priorityConfig.color
            }}
          >
            <span>{priorityConfig.icon}</span>
            <span>{priorityConfig.label}</span>
          </div>

          {/* Action Button/Arrow */}
          {isDisabled ? (
            <span className="text-xs text-muted-foreground">Disabled</span>
          ) : hasItemsDue ? (
            <motion.button
              className="flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate();
              }}
            >
              <span>Review</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-sm">Up to date</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {/* No Items State */}
        {!hasItemsDue && !isDisabled && (
          <div className="text-center py-4">
            <div className="text-secondary mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Next review: {stats.lastReviewSession ? 'Tomorrow' : 'Add items to start'}
            </p>
          </div>
        )}

        {/* Disabled State */}
        {isDisabled && (
          <div className="text-center py-4">
            <div className="text-muted-foreground mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Source disabled</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Enable in settings to start reviewing
            </p>
          </div>
        )}

        {/* Study Streak Indicator */}
        {stats.studyStreak > 0 && hasItemsDue && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Study streak:</span>
              <span className="font-medium text-accent">
                🔥 {stats.studyStreak} days
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ReviewSourceCard;