# 🚀 Stats System Quick Start Guide

## For Developers New to the Stats System

### 1. Basic Integration (5 minutes)

```typescript
// In any component where you need stats
import { useStats } from '@/hooks/useStats';

function MyComponent() {
  const { stats, loading } = useStats();
  
  return (
    <div>
      <p>Your streak: {loading ? '...' : stats.currentStreak} days</p>
    </div>
  );
}
```

### 2. Track User Activities (2 minutes per event)

```typescript
import { trackDrillCompleted } from '@/lib/stats/trackingEvents';

// After user completes an activity
await trackDrillCompleted('verb-conjugation', 10, 8); // 8/10 correct
```

### 3. Common Patterns

#### Pattern 1: Activity Completion
```typescript
const handleActivityComplete = async () => {
  // Track the activity
  await trackDrillCompleted(activityType, total, correct);
  
  // Navigate or show results
  router.push('/results');
};
```

#### Pattern 2: Real-time Stats Display
```typescript
function LiveStats() {
  const { stats } = useStats(); // Auto-updates!
  
  return <div>Drills today: {stats.drillsCompleted}</div>;
}
```

#### Pattern 3: Progress Tracking
```typescript
const { stats, trackActivity } = useStats();

// Custom activity tracking
await trackActivity('practice', {
  feature: 'sentence-builder',
  duration: 5000,
  score: 85
});
```

### 4. Testing Your Integration

```typescript
// In browser console
localStorage.setItem('STATS_DEBUG', 'true');

// Now all stats operations will log to console
```

### 5. Common Mistakes to Avoid

❌ **Don't track in useEffect without dependencies**
```typescript
// BAD
useEffect(() => {
  trackActivity('view', {}); // Tracks on every render!
});
```

✅ **Do track on user actions**
```typescript
// GOOD
const handleClick = async () => {
  await trackActivity('interaction', { feature: 'button-click' });
};
```

---

## Quick Reference Card

### Tracking Functions
- `trackDrillCompleted(type, total, correct, words?)`
- `trackStoryRead(id, title, time?)`
- `trackArticleRead(id, title, time?)`
- `trackKanjiStudy(kanji, correct, type)`
- `trackGamePlayed(game, score, total?, correct?)`
- `trackVocabStudied(id, word, type)`

### Stats Properties
- `stats.currentStreak` - Days in a row
- `stats.totalDaysActive` - Total unique days
- `stats.overallAccuracy` - Percentage (0-100)
- `stats.drillsCompleted` - Total drills done
- `stats.pokemonCaught` - Pokemon collected

### Hooks & Tools
- `useStats()` - Main stats hook
- `<StatsBar />` - Pre-built stats display
- `/admin` - Stats recovery tool