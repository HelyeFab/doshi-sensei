'use client';

import { useState, useEffect } from 'react';
import { kanjiMasteryStorage } from '@/services/kanji-mastery/indexdb-storage';

export default function ReviewScheduleDebug() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviewSchedule();
  }, []);

  const loadReviewSchedule = async () => {
    try {
      await kanjiMasteryStorage.init();
      const allProgress = await kanjiMasteryStorage.getAllProgress();
      
      // Sort by next review date
      const sorted = allProgress.sort((a, b) => 
        new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
      );
      
      setReviews(sorted);
    } catch (error) {
      console.error('Error loading review schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today
    if (d.toDateString() === now.toDateString()) {
      return `Today at ${d.toLocaleTimeString()}`;
    }
    
    // Check if it's tomorrow
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${d.toLocaleTimeString()}`;
    }
    
    // Otherwise show date and time
    return d.toLocaleString();
  };

  const getStatus = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    
    if (d <= now) {
      return { text: 'Due Now', color: 'text-green-600' };
    }
    
    const hoursUntil = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil < 24) {
      return { text: 'Due Soon', color: 'text-yellow-600' };
    }
    
    return { text: 'Scheduled', color: 'text-blue-600' };
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading review schedule...</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-sm text-muted-foreground">No kanji in your study list yet.</div>;
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        📅 Review Schedule (Debug)
      </h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {reviews.map((review, index) => {
          const status = getStatus(review.nextReview);
          return (
            <div key={review.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{review.id}</span>
                <span className={`${status.color} font-medium`}>
                  {status.text}
                </span>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">
                  {formatDate(review.nextReview)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Reviews: {review.reviewCount || 0}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 Tip: Reviews will appear in "Reviews Due" when their scheduled time arrives.
        </p>
      </div>
    </div>
  );
}