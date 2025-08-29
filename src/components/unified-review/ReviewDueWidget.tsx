'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContentType } from '@/lib/unified-review';
import { useUnifiedReview } from '@/hooks/useUnifiedReview';

interface DueItemsBreakdown {
  [ContentType.KANJI]: number;
  [ContentType.VOCABULARY]: number;
  [ContentType.FLASHCARD]: number;
  [ContentType.GRAMMAR]: number;
  [ContentType.SENTENCE]: number;
  [ContentType.RADICAL]: number;
  [ContentType.CUSTOM]: number;
  total: number;
}

interface ReviewDueWidgetProps {
  /**
   * Whether to show detailed breakdown by content type
   */
  showBreakdown?: boolean;
  
  /**
   * Maximum number of items to show in breakdown
   */
  maxBreakdownItems?: number;
  
  /**
   * Callback when start review is clicked
   */
  onStartReview?: () => void;
  
  /**
   * Auto-refresh interval in seconds (default: 30)
   */
  refreshInterval?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Content type display configurations
const CONTENT_TYPE_CONFIG = {
  [ContentType.KANJI]: {
    label: 'Kanji',
    icon: '漢',
    color: 'text-red-600 dark:text-red-400'
  },
  [ContentType.VOCABULARY]: {
    label: 'Vocabulary',
    icon: '語',
    color: 'text-blue-600 dark:text-blue-400'
  },
  [ContentType.FLASHCARD]: {
    label: 'Flashcards',
    icon: '📚',
    color: 'text-green-600 dark:text-green-400'
  },
  [ContentType.GRAMMAR]: {
    label: 'Grammar',
    icon: '文',
    color: 'text-purple-600 dark:text-purple-400'
  },
  [ContentType.SENTENCE]: {
    label: 'Sentences',
    icon: '例',
    color: 'text-orange-600 dark:text-orange-400'
  },
  [ContentType.RADICAL]: {
    label: 'Radicals',
    icon: '部',
    color: 'text-pink-600 dark:text-pink-400'
  },
  [ContentType.CUSTOM]: {
    label: 'Custom',
    icon: '⭐',
    color: 'text-yellow-600 dark:text-yellow-400'
  }
};

export default function ReviewDueWidget({
  showBreakdown = true,
  maxBreakdownItems = 5,
  onStartReview,
  refreshInterval = 30,
  className = ''
}: ReviewDueWidgetProps) {
  const { engine, isLoading } = useUnifiedReview();
  const [dueItems, setDueItems] = useState<DueItemsBreakdown>({
    [ContentType.KANJI]: 0,
    [ContentType.VOCABULARY]: 0,
    [ContentType.FLASHCARD]: 0,
    [ContentType.GRAMMAR]: 0,
    [ContentType.SENTENCE]: 0,
    [ContentType.RADICAL]: 0,
    [ContentType.CUSTOM]: 0,
    total: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch due items count
  const fetchDueItems = async () => {
    if (!engine) return;

    try {
      const breakdown: DueItemsBreakdown = {
        [ContentType.KANJI]: 0,
        [ContentType.VOCABULARY]: 0,
        [ContentType.FLASHCARD]: 0,
        [ContentType.GRAMMAR]: 0,
        [ContentType.SENTENCE]: 0,
        [ContentType.RADICAL]: 0,
        [ContentType.CUSTOM]: 0,
        total: 0
      };

      // Get all due items and count by content type
      const dueItems = await engine.getDueItems();
      
      // Count items by content type
      for (const item of dueItems) {
        if (item.contentType && breakdown.hasOwnProperty(item.contentType)) {
          breakdown[item.contentType as ContentType]++;
          breakdown.total++;
        }
      }

      setDueItems(breakdown);
      setLastUpdate(new Date());
    } catch (error) {
      // Silently handle error
    }
  };

  // Initial load and setup auto-refresh
  useEffect(() => {
    fetchDueItems();

    const interval = setInterval(fetchDueItems, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [engine, refreshInterval]);

  // Handle start review
  const handleStartReview = () => {
    if (onStartReview) {
      onStartReview();
    }
  };

  // Get breakdown items to display (sorted by count, descending)
  const getBreakdownItems = () => {
    return Object.entries(CONTENT_TYPE_CONFIG)
      .map(([type, config]) => ({
        type: type as ContentType,
        config,
        count: dueItems[type as ContentType]
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, maxBreakdownItems);
  };

  const breakdownItems = getBreakdownItems();

  if (isLoading) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card border-border hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          📅 Reviews Due
          <span className="text-sm font-normal text-muted-foreground">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Total Count */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-foreground mb-1">
            {dueItems.total}
          </div>
          <div className="text-sm text-muted-foreground">
            {dueItems.total === 0 ? 'No reviews due' : 
             dueItems.total === 1 ? '1 item ready for review' :
             `${dueItems.total} items ready for review`}
          </div>
        </div>

        {/* Breakdown */}
        {showBreakdown && breakdownItems.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-sm font-medium text-foreground">Breakdown:</div>
            <div className="space-y-1">
              {breakdownItems.map(({ type, config, count }) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{config.icon}</span>
                    <span className={`font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="text-foreground font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleStartReview}
          disabled={dueItems.total === 0}
          className="w-full"
          size="default"
        >
          {dueItems.total === 0 ? 'No Reviews Available' : 'Start Review Session'}
        </Button>

        {/* Next Review Info */}
        {dueItems.total === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-2">
            Check back later for new reviews
          </div>
        )}
      </CardContent>
    </Card>
  );
}