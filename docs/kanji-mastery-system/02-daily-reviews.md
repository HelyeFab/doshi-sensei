# 🔄 Daily Reviews - Implementation Plan

## Overview
The Daily Reviews system is the cornerstone of the Kanji Mastery System, ensuring users review kanji at optimal intervals for long-term retention.

## Table of Contents
1. [User Interface Design](#user-interface-design)
2. [Review Queue Algorithm](#review-queue-algorithm)
3. [Component Structure](#component-structure)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)
6. [Testing Strategy](#testing-strategy)

## User Interface Design

### Dashboard View (`/daily-reviews`)

```tsx
// Mock UI Structure
<DailyReviewsDashboard>
  <Header>
    <StreakCounter days={currentStreak} />
    <ProgressRing completed={15} total={23} />
    <TimeEstimate minutes={5} />
  </Header>
  
  <ReviewSummary>
    <PrioritySection>
      <Critical count={3} /> // Overdue by 7+ days
      <Due count={12} />      // Due today
      <Upcoming count={8} />  // Due tomorrow
    </PrioritySection>
  </ReviewSummary>
  
  <QuickActions>
    <StartReviewButton />
    <QuickPracticeButton minutes={5} />
    <FullSessionButton />
  </QuickActions>
  
  <InsightsPreview>
    <BestTimeHint />
    <AccuracyTrend />
    <WeaknessAlert />
  </InsightsPreview>
</DailyReviewsDashboard>
```

### Review Session View

```tsx
// Review session interface
<ReviewSession>
  <ProgressBar current={5} total={15} />
  
  <ReviewCard>
    <KanjiDisplay character="本" size="large" />
    <QuestionPrompt type="meaning" />
    
    {/* Multiple choice grid */}
    <AnswerGrid>
      <Option>Book</Option>
      <Option>Tree</Option>
      <Option>Person</Option>
      <Option>Water</Option>
    </AnswerGrid>
  </ReviewCard>
  
  <SessionStats>
    <Accuracy>87%</Accuracy>
    <AvgSpeed>2.3s</AvgSpeed>
    <Remaining>10</Remaining>
  </SessionStats>
</ReviewSession>
```

### Results View

```tsx
<ReviewResults>
  <Summary>
    <Score correct={13} total={15} />
    <TimeSpent minutes={4.5} />
    <StreakStatus maintained={true} />
  </Summary>
  
  <DetailedResults>
    <MasteredItems list={[...]} />
    <StrugglingItems list={[...]} />
    <Recommendations>
      <FocusArea>Meanings need work</FocusArea>
      <NextReview time="5 PM" count={8} />
    </Recommendations>
  </DetailedResults>
  
  <Actions>
    <ShareButton />
    <PracticeWeakButton />
    <DoneButton />
  </Actions>
</ReviewResults>
```

## Review Queue Algorithm

### Core Algorithm Implementation

```typescript
// src/services/reviewQueueService.ts

interface ReviewQueueService {
  /**
   * Generate review queue for user
   * Prioritizes by: overdue > due > learning > new
   */
  async generateQueue(userId: string): Promise<ReviewQueue> {
    const allProgress = await this.getAllProgress(userId);
    const now = new Date();
    
    // Categorize by urgency
    const categorized = {
      overdue: [] as QueueItem[],
      due: [] as QueueItem[],
      learning: [] as QueueItem[],
      new: [] as QueueItem[],
    };
    
    allProgress.forEach(progress => {
      const daysSinceDue = differenceInDays(now, progress.dueDate);
      
      if (daysSinceDue > 7) {
        categorized.overdue.push({
          ...progress,
          priority: daysSinceDue * 10, // Higher priority for longer overdue
        });
      } else if (daysSinceDue >= 0) {
        categorized.due.push({
          ...progress,
          priority: daysSinceDue * 5,
        });
      } else if (progress.interval < 7) {
        categorized.learning.push({
          ...progress,
          priority: 1,
        });
      }
    });
    
    // Sort each category
    Object.values(categorized).forEach(category => {
      category.sort((a, b) => b.priority - a.priority);
    });
    
    // Combine into final queue
    return this.buildQueue(categorized);
  }
  
  /**
   * Build final queue with limits
   */
  private buildQueue(categorized: CategorizedItems): ReviewQueue {
    const settings = this.getUserSettings();
    const maxItems = settings.maxDailyReviews || 50;
    
    const queue: QueueItem[] = [];
    
    // Add all critical overdue items
    queue.push(...categorized.overdue);
    
    // Add due items up to limit
    const remainingSlots = maxItems - queue.length;
    queue.push(...categorized.due.slice(0, remainingSlots));
    
    // Add learning items if space
    if (queue.length < maxItems) {
      const learningSlots = Math.min(
        maxItems - queue.length,
        Math.floor(maxItems * 0.2) // Max 20% learning items
      );
      queue.push(...categorized.learning.slice(0, learningSlots));
    }
    
    return {
      items: queue,
      stats: {
        total: queue.length,
        overdue: categorized.overdue.length,
        due: categorized.due.length,
        learning: categorized.learning.length,
      },
      estimatedTime: queue.length * 6, // 6 seconds average per item
    };
  }
}
```

### Intelligent Scheduling

```typescript
// src/services/smartScheduler.ts

class SmartScheduler {
  /**
   * Find optimal review times based on user patterns
   */
  async findOptimalTimes(userId: string): Promise<TimeSlot[]> {
    const history = await this.getReviewHistory(userId, 30); // Last 30 days
    
    // Analyze performance by hour
    const hourlyPerformance = new Map<number, PerformanceMetrics>();
    
    history.forEach(session => {
      const hour = new Date(session.timestamp).getHours();
      const metrics = hourlyPerformance.get(hour) || {
        accuracy: [],
        speed: [],
        completion: [],
      };
      
      metrics.accuracy.push(session.accuracy);
      metrics.speed.push(session.avgResponseTime);
      metrics.completion.push(session.completionRate);
      
      hourlyPerformance.set(hour, metrics);
    });
    
    // Find best hours
    const scoredHours = Array.from(hourlyPerformance.entries())
      .map(([hour, metrics]) => ({
        hour,
        score: this.calculateScore(metrics),
        confidence: metrics.accuracy.length / 30, // How much data we have
      }))
      .filter(slot => slot.confidence > 0.3) // Need at least 30% data
      .sort((a, b) => b.score - a.score);
    
    // Return top 3 time slots
    return scoredHours.slice(0, 3).map(slot => ({
      hour: slot.hour,
      score: slot.score,
      message: this.getTimeMessage(slot.hour),
    }));
  }
  
  private calculateScore(metrics: PerformanceMetrics): number {
    const avgAccuracy = average(metrics.accuracy);
    const avgSpeed = average(metrics.speed);
    const avgCompletion = average(metrics.completion);
    
    // Weighted score (accuracy most important)
    return (avgAccuracy * 0.5) + 
           ((1 / avgSpeed) * 0.3) + // Inverse of speed (faster is better)
           (avgCompletion * 0.2);
  }
  
  private getTimeMessage(hour: number): string {
    if (hour < 9) return "Early bird gets the kanji! 🌅";
    if (hour < 12) return "Morning focus time 🌞";
    if (hour < 15) return "Post-lunch practice 🍱";
    if (hour < 18) return "Afternoon review session 📚";
    if (hour < 21) return "Evening wind-down 🌙";
    return "Night owl study time 🦉";
  }
}
```

## Component Structure

### File Organization

```
src/
├── app/
│   └── daily-reviews/
│       ├── page.tsx                 // Main dashboard
│       ├── layout.tsx               // Layout wrapper
│       └── components/
│           ├── ReviewDashboard.tsx  // Dashboard component
│           ├── ReviewSession.tsx    // Active review session
│           ├── ReviewCard.tsx       // Individual review card
│           ├── ReviewResults.tsx    // Results summary
│           └── ReviewStats.tsx      // Statistics display
├── services/
│   ├── reviewQueueService.ts       // Queue generation logic
│   ├── smartScheduler.ts           // Optimal timing logic
│   └── reviewSessionService.ts     // Session management
├── hooks/
│   ├── useReviewQueue.ts           // Queue management hook
│   ├── useReviewSession.ts         // Session state hook
│   └── useReviewStats.ts           // Statistics hook
└── utils/
    └── reviewHelpers.ts             // Helper functions
```

### Main Component Implementation

```typescript
// src/app/daily-reviews/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ReviewDashboard } from './components/ReviewDashboard';
import { ReviewSession } from './components/ReviewSession';
import { ReviewResults } from './components/ReviewResults';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { useReviewStats } from '@/hooks/useReviewStats';

type ViewState = 'dashboard' | 'reviewing' | 'results';

export default function DailyReviewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>('dashboard');
  const [sessionResults, setSessionResults] = useState(null);
  
  const {
    queue,
    loading,
    error,
    refreshQueue,
  } = useReviewQueue(user?.uid);
  
  const {
    stats,
    streak,
    updateStats,
  } = useReviewStats(user?.uid);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/daily-reviews');
    }
  }, [user, router]);
  
  const handleStartReview = () => {
    if (queue && queue.items.length > 0) {
      setViewState('reviewing');
    }
  };
  
  const handleCompleteReview = (results: ReviewResults) => {
    setSessionResults(results);
    setViewState('results');
    updateStats(results);
    refreshQueue(); // Get updated queue
  };
  
  const handleFinish = () => {
    setViewState('dashboard');
    setSessionResults(null);
  };
  
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {viewState === 'dashboard' && (
        <ReviewDashboard
          queue={queue}
          stats={stats}
          streak={streak}
          onStartReview={handleStartReview}
        />
      )}
      
      {viewState === 'reviewing' && (
        <ReviewSession
          queue={queue}
          onComplete={handleCompleteReview}
          onExit={() => setViewState('dashboard')}
        />
      )}
      
      {viewState === 'results' && (
        <ReviewResults
          results={sessionResults}
          onContinue={handleStartReview}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
```

## Implementation Steps

### Phase 1: Core Infrastructure (Days 1-3)

1. **Create Review Queue Service**
   ```bash
   # Create service files
   touch src/services/reviewQueueService.ts
   touch src/services/reviewSessionService.ts
   ```

2. **Implement FSRS Algorithm**
   ```typescript
   // src/utils/fsrs.ts
   import { FSRS } from 'ts-fsrs';
   
   export const fsrsInstance = new FSRS({
     requestRetention: 0.9,
     maximumInterval: 365,
     // ... other config
   });
   ```

3. **Set up Data Models**
   ```typescript
   // src/types/reviews.ts
   interface ReviewQueue {
     items: ReviewItem[];
     stats: QueueStats;
     estimatedTime: number;
   }
   
   interface ReviewItem {
     kanjiId: string;
     character: string;
     priority: number;
     type: 'meaning' | 'onyomi' | 'kunyomi';
     dueDate: Date;
     overdueBy: number;
   }
   ```

### Phase 2: UI Components (Days 4-6)

1. **Create Dashboard Component**
   - Queue summary
   - Streak display
   - Start button

2. **Build Review Session**
   - Card presentation
   - Answer handling
   - Progress tracking

3. **Implement Results View**
   - Score display
   - Detailed breakdown
   - Next actions

### Phase 3: Integration (Days 7-9)

1. **Connect to Existing Systems**
   - Link to kanjiStudyProgress
   - Use existing auth
   - Integrate with stats

2. **Add to Navigation**
   - Add menu item
   - Create route
   - Set up guards

3. **Configure Access Control**
   - Add to feature registry
   - Set limits
   - Handle permissions

### Phase 4: Enhancement (Days 10-12)

1. **Add Smart Features**
   - Optimal timing
   - Personalized messages
   - Adaptive difficulty

2. **Implement Offline Support**
   - Cache reviews
   - Queue syncing
   - Conflict resolution

3. **Polish UX**
   - Animations
   - Sound effects
   - Haptic feedback

## Code Examples

### Custom Hook for Review Queue

```typescript
// src/hooks/useReviewQueue.ts

export function useReviewQueue(userId?: string) {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    loadQueue();
  }, [userId]);
  
  const loadQueue = async () => {
    try {
      setLoading(true);
      const queueService = new ReviewQueueService();
      const newQueue = await queueService.generateQueue(userId!);
      setQueue(newQueue);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  const refreshQueue = () => loadQueue();
  
  const removeFromQueue = (itemId: string) => {
    if (!queue) return;
    
    setQueue({
      ...queue,
      items: queue.items.filter(item => item.kanjiId !== itemId),
    });
  };
  
  return {
    queue,
    loading,
    error,
    refreshQueue,
    removeFromQueue,
  };
}
```

### Review Card Component

```typescript
// src/app/daily-reviews/components/ReviewCard.tsx

interface ReviewCardProps {
  item: ReviewItem;
  onAnswer: (correct: boolean, responseTime: number) => void;
}

export function ReviewCard({ item, onAnswer }: ReviewCardProps) {
  const [startTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  
  useEffect(() => {
    // Generate options based on question type
    const generated = generateOptions(item);
    setOptions(shuffleArray(generated));
  }, [item]);
  
  const handleSelect = (index: number) => {
    const responseTime = Date.now() - startTime;
    const correct = options[index] === item.correctAnswer;
    
    setSelectedAnswer(index);
    
    // Delay before moving to next
    setTimeout(() => {
      onAnswer(correct, responseTime);
      setSelectedAnswer(null);
    }, correct ? 1000 : 2000);
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="text-8xl font-bold japanese-text mb-4">
          {item.character}
        </div>
        <p className="text-lg text-gray-600">
          {getQuestionPrompt(item.type)}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={selectedAnswer !== null}
            className={cn(
              "p-4 rounded-lg border-2 transition-all",
              selectedAnswer === index && isCorrect(index)
                ? "bg-green-100 border-green-500"
                : selectedAnswer === index
                ? "bg-red-100 border-red-500"
                : "bg-gray-50 border-gray-200 hover:border-blue-400"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/services/__tests__/reviewQueueService.test.ts

describe('ReviewQueueService', () => {
  it('should prioritize overdue items', async () => {
    const service = new ReviewQueueService();
    const queue = await service.generateQueue('test-user');
    
    // First items should be most overdue
    expect(queue.items[0].overdueBy).toBeGreaterThan(7);
  });
  
  it('should respect daily limits', async () => {
    const service = new ReviewQueueService();
    const queue = await service.generateQueue('test-user', { maxItems: 10 });
    
    expect(queue.items.length).toBeLessThanOrEqual(10);
  });
  
  it('should include learning items when space available', async () => {
    const service = new ReviewQueueService();
    const queue = await service.generateQueue('test-user');
    
    const learningItems = queue.items.filter(i => i.interval < 7);
    expect(learningItems.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// src/app/daily-reviews/__tests__/integration.test.tsx

describe('Daily Reviews Integration', () => {
  it('should load and display queue on mount', async () => {
    render(<DailyReviewsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/reviews due/i)).toBeInTheDocument();
    });
  });
  
  it('should update progress after review', async () => {
    const { getByText, getByRole } = render(<DailyReviewsPage />);
    
    fireEvent.click(getByText('Start Review'));
    
    // Complete a review
    fireEvent.click(getByRole('button', { name: /correct answer/i }));
    
    await waitFor(() => {
      expect(getByText(/updated/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

```typescript
// cypress/e2e/daily-reviews.cy.ts

describe('Daily Reviews E2E', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
    cy.visit('/daily-reviews');
  });
  
  it('should complete a full review session', () => {
    cy.contains('Start Review').click();
    
    // Answer 5 questions
    for (let i = 0; i < 5; i++) {
      cy.get('[data-test="answer-option"]').first().click();
      cy.wait(1500); // Wait for animation
    }
    
    // Should see results
    cy.contains('Session Complete').should('be.visible');
    cy.contains('5 reviews completed').should('be.visible');
  });
});
```

## Metrics & Monitoring

### Key Metrics to Track

```typescript
interface ReviewMetrics {
  // User engagement
  dailyActiveReviewers: number;
  avgReviewsPerUser: number;
  completionRate: number;
  
  // Learning effectiveness
  avgAccuracy: number;
  avgResponseTime: number;
  retentionRate: number;
  
  // System performance
  queueGenerationTime: number;
  sessionLoadTime: number;
  syncLatency: number;
}
```

### Analytics Events

```typescript
// Track key events
analytics.track('review_session_started', {
  queueSize: queue.items.length,
  overdueCount: queue.stats.overdue,
  estimatedTime: queue.estimatedTime,
});

analytics.track('review_session_completed', {
  totalReviews: results.total,
  correctCount: results.correct,
  accuracy: results.accuracy,
  duration: results.duration,
});

analytics.track('review_item_answered', {
  kanjiId: item.kanjiId,
  correct: isCorrect,
  responseTime: responseTime,
  quality: quality,
});
```

---

## Next: [Adaptive Learning Implementation](./03-adaptive-learning.md)

*Last Updated: January 2025*