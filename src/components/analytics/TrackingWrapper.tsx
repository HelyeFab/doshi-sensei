/**
 * Tracking Wrapper Component
 * Automatically tracks view events for any wrapped content
 */

import { useEffect, useRef, ReactNode } from 'react';
import { useLearnTracking } from '@/hooks/useLearnTracking';
import { ContentCategory, EventType } from '@/types/analytics';

interface TrackingWrapperProps {
  children: ReactNode;
  category: ContentCategory;
  value: string;
  metadata?: Record<string, any>;
  trackDuration?: boolean;
  trackInteraction?: boolean;
  className?: string;
}

export function TrackingWrapper({
  children,
  category,
  value,
  metadata,
  trackDuration = false,
  trackInteraction = false,
  className
}: TrackingWrapperProps) {
  const { track } = useLearnTracking();
  const startTime = useRef(Date.now());
  const hasTrackedView = useRef(false);

  // Track view on mount
  useEffect(() => {
    if (!hasTrackedView.current) {
      track({
        type: 'view',
        category,
        content: {
          value,
          metadata
        }
      });
      hasTrackedView.current = true;
    }

    // Track duration on unmount if requested
    return () => {
      if (trackDuration) {
        const duration = Date.now() - startTime.current;
        track({
          type: 'complete',
          category,
          content: { value, metadata },
          metrics: { duration }
        });
      }
    };
  }, [value, category]);

  const handleClick = () => {
    if (trackInteraction) {
      track({
        type: 'view',
        category,
        content: { value, metadata },
        metrics: { interaction: 'click' }
      });
    }
  };

  return (
    <div className={className} onClick={trackInteraction ? handleClick : undefined}>
      {children}
    </div>
  );
}