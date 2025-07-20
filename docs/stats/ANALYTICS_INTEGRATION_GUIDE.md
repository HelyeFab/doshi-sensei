# Analytics Integration Guide

## Overview

This guide shows how to integrate the analytics system into existing components. The analytics system runs parallel to the user stats system and provides admin-only insights.

## Quick Start

### 1. Import the hook

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
```

### 2. Use in your component

```typescript
function MyComponent() {
  const { trackPageView, trackGameComplete } = useAnalytics();
  
  // Track events
  const handleGameComplete = (score: number) => {
    trackGameComplete('kanji_quest', score, 85);
  };
}
```

## Integration Examples

### Article Reader Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function ArticleReader({ article }: { article: NewsArticle }) {
  const { trackArticleView, trackArticleComplete } = useAnalytics();
  const [readingStartTime] = useState(Date.now());
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  // Track article view on mount
  useEffect(() => {
    if (!hasTrackedView) {
      trackArticleView(article.category, article.id);
      setHasTrackedView(true);
    }
  }, [article.id, hasTrackedView]);
  
  // Track completion when scrolled to bottom
  const handleScroll = () => {
    if (progress >= 95 && readingProgress < 95) {
      const readingTime = Math.floor((Date.now() - readingStartTime) / 1000); // seconds
      trackArticleComplete(article.category, readingTime, article.id);
    }
  };
}
```

### Game Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function KanjiQuest() {
  const { track, trackGameComplete } = useAnalytics();
  
  // Track game start
  const startGame = () => {
    track('game_start', { game: 'kanji_quest' });
  };
  
  // Track game completion
  const endGame = (score: number, correctAnswers: number, totalQuestions: number) => {
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    trackGameComplete('kanji_quest', score, accuracy);
  };
}
```

### Drill Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function ConjugationDrill() {
  const { track, trackDrillComplete } = useAnalytics();
  
  // Track drill start
  const startDrill = () => {
    track('drill_start', { type: 'conjugation' });
  };
  
  // Track drill completion
  const completeDrill = (results: DrillResults) => {
    trackDrillComplete('conjugation', results.correct, results.total);
  };
}
```

### Feature Limit Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAccess } from '@/hooks/useAccess';

function PremiumFeature() {
  const { checkAndTrack } = useAccess();
  const { trackLimitReached, trackUpgradeModalShown } = useAnalytics();
  
  const handleFeatureUse = async () => {
    const canUse = await checkAndTrack('premium_feature');
    
    if (!canUse) {
      // The access system will show the modal, we just track it
      trackLimitReached('premium_feature');
      // Note: trackUpgradeModalShown is called by the modal component itself
    }
  };
}
```

### Upgrade Modal Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function UpgradeModal({ trigger, feature }: UpgradeModalProps) {
  const { trackUpgradeModalShown, track } = useAnalytics();
  
  useEffect(() => {
    trackUpgradeModalShown(trigger, feature);
  }, []);
  
  const handleUpgradeClick = () => {
    track('upgrade_modal_clicked', { trigger, feature });
    // Navigate to upgrade page
  };
}
```

### Story Reader Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function StoryReader({ story }: { story: Story }) {
  const { track } = useAnalytics();
  const [startTime] = useState(Date.now());
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  
  // Track story start
  useEffect(() => {
    if (!hasTrackedStart) {
      track('story_start', { 
        level: story.level,
        storyId: story.id 
      });
      setHasTrackedStart(true);
    }
  }, [story.id]);
  
  // Track story completion
  const onComplete = () => {
    const readTime = Math.floor((Date.now() - startTime) / 1000);
    track('story_complete', { 
      level: story.level,
      readTime,
      storyId: story.id 
    });
  };
}
```

### Moodboard Integration

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MoodboardViewer({ theme }: { theme: string }) {
  const { track } = useAnalytics();
  const [viewStartTime] = useState(Date.now());
  
  // Track view time when leaving
  useEffect(() => {
    return () => {
      const viewTime = Math.floor((Date.now() - viewStartTime) / 1000);
      track('moodboard_view', { theme, viewTime });
    };
  }, [theme, viewStartTime]);
}
```

### Error Tracking

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { trackError } = useAnalytics();
  
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    trackError('react_error', error.message);
  };
  
  // Component error boundary implementation
}
```

## Best Practices

### 1. Avoid Duplicate Tracking

Use state to ensure events are tracked only once:

```typescript
const [hasTracked, setHasTracked] = useState(false);

useEffect(() => {
  if (!hasTracked && condition) {
    trackEvent();
    setHasTracked(true);
  }
}, [condition]);
```

### 2. Debounce Rapid Events

For scroll or input events:

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedTrack = useDebouncedCallback(
  (value) => {
    track('search_performed', { query: value });
  },
  1000 // Wait 1 second after user stops typing
);
```

### 3. Track Meaningful Metrics

Focus on actionable insights:
- ✅ Completion rates
- ✅ Time spent on meaningful activities
- ✅ Feature discovery
- ❌ Every mouse movement
- ❌ Every keystroke

### 4. Include Context

Always provide relevant context:

```typescript
// Good
trackGameComplete('kanji_quest', score, accuracy);

// Better
trackGameComplete('kanji_quest', score, accuracy, {
  level: currentLevel,
  timeSpent: gameTime,
  hintsUsed: hintCount
});
```

### 5. Handle Failures Gracefully

Analytics should never break the user experience:

```typescript
try {
  trackComplexEvent(data);
} catch (error) {
  console.warn('Analytics error:', error);
  // Continue normal operation
}
```

## Testing Analytics

### 1. Check Browser Console

All analytics events are logged:
```
📊 [Analytics] Event tracked: article_view { queueSize: 1, data: {...} }
```

### 2. Check Firebase Console

Navigate to Firestore > analytics > [date] > daily > aggregated

### 3. Use Analytics Debug Mode

Set in environment:
```bash
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

## Privacy Considerations

### For Guest Users
- No user ID stored
- Only aggregate counts
- Session-based tracking
- No persistent identifiers

### For Registered Users
- User ID included for better insights
- Data linked to account
- Can be requested/deleted by user
- Follows privacy policy

## Common Patterns

### 1. Page View with Metadata

```typescript
useEffect(() => {
  trackPageView(pathname, {
    referrer: document.referrer,
    searchParams: Object.fromEntries(searchParams)
  });
}, [pathname]);
```

### 2. Feature Discovery

```typescript
const [discoveries, setDiscoveries] = useState<Set<string>>(new Set());

const trackDiscovery = (feature: string) => {
  if (!discoveries.has(feature)) {
    track('feature_discovered', { feature });
    setDiscoveries(prev => new Set(prev).add(feature));
  }
};
```

### 3. Conversion Funnel

```typescript
// Step 1: User hits limit
trackLimitReached('articles_read');

// Step 2: Modal shown (tracked by modal)
// Step 3: User clicks upgrade (tracked by modal)

// Step 4: User completes purchase
track('subscription_started', { 
  plan: 'premium',
  source: 'article_limit' 
});
```

## Troubleshooting

### Events Not Appearing in Firebase

1. Check initialization:
   ```typescript
   // Should see in console:
   📊 [Analytics] Initialized: { userType: 'free', sessionId: '...', userId: 'set' }
   ```

2. Check batch timing:
   - Events batch every 5 minutes
   - Force flush on page unload
   - Check Firebase after waiting

3. Check Firebase rules:
   - Analytics collection should allow admin writes

### High Firebase Costs

1. Review aggregation logic
2. Increase batch interval
3. Reduce event granularity
4. Check for infinite loops

---

*Last Updated: January 2025*