/**
 * Unified Review Engine UI Components
 * 
 * This module exports all UI components for the Unified Review Engine (URE),
 * providing a complete review system interface for the Doshi Sensei application.
 */

// Core Components
export { default as ReviewDueWidget } from './ReviewDueWidget';
export { default as ReviewSession } from './ReviewSession';
export { default as NotificationSettings } from './NotificationSettings';
export { default as ProgressDashboard } from './ProgressDashboard';
export { default as SmartReviewWidget } from './SmartReviewWidget';

// Re-export hooks for convenience
export { useUnifiedReview } from '@/hooks/useUnifiedReview';
export { useReviewSession } from '@/hooks/useReviewSession';
export { useReviewNotifications } from '@/hooks/useReviewNotifications';

// Type exports
export type {
  ReviewItem,
  ReviewProgress,
  SessionState,
  SessionSummary,
  ContentType,
  ReviewRating,
  StudyMode,
  AlgorithmType,
  NotificationOptions,
  NotificationChannelType,
} from '@/lib/unified-review';

// Component prop types for external use
export interface ReviewDueWidgetProps {
  showBreakdown?: boolean;
  maxBreakdownItems?: number;
  onStartReview?: () => void;
  refreshInterval?: number;
  className?: string;
}

export interface ReviewSessionProps {
  sessionPreferences?: {
    maxItems?: number;
    maxDuration?: number;
    contentTypes?: ContentType[];
    studyModes?: StudyMode[];
    includeNew?: boolean;
    newItemsLimit?: number;
  };
  onSessionComplete?: (summary: SessionSummary) => void;
  onSessionCancel?: () => void;
  showDetailedProgress?: boolean;
  className?: string;
}

export interface NotificationSettingsProps {
  onSettingsSaved?: (preferences: any) => void;
  showAdvancedSettings?: boolean;
  className?: string;
}

export interface ProgressDashboardProps {
  defaultPeriod?: 7 | 30 | 90;
  showDetailedStats?: boolean;
  className?: string;
}

/**
 * Usage Examples:
 * 
 * ```tsx
 * import { ReviewDueWidget, ReviewSession, ProgressDashboard } from '@/components/unified-review';
 * 
 * // Basic review widget
 * <ReviewDueWidget onStartReview={() => setShowSession(true)} />
 * 
 * // Review session with custom preferences
 * <ReviewSession 
 *   sessionPreferences={{ maxItems: 20, includeNew: true }}
 *   onSessionComplete={(summary) => console.log('Session completed:', summary)}
 * />
 * 
 * // Progress dashboard with 7-day view
 * <ProgressDashboard defaultPeriod={7} showDetailedStats={true} />
 * ```
 */