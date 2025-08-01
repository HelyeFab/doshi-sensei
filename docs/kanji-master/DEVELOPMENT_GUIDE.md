# 👨‍💻 Kanji Mastery Development Guide

This guide provides step-by-step instructions for developers working on the Kanji Mastery feature.

## 📋 Prerequisites

- Node.js 18+ and npm
- Basic knowledge of Next.js, TypeScript, and React
- Understanding of Doshi Sensei's Three-Pillar Architecture
- Familiarity with spaced repetition concepts

## 🚀 Getting Started

### 1. Project Setup

```bash
# Clone the repository
git clone [repository-url]
cd doshi-sensei

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Firebase config

# Run development server
npm run dev
```

### 2. Navigate to Feature

Visit `http://localhost:3000/tools/kanji-mastery`

## 🏗️ Adding New Features

### Example: Adding a New Study Mode

Let's add a "Writing Practice" mode as an example.

#### Step 1: Update Types

```typescript
// src/services/kanji-mastery/spaced-repetition.ts
export type StudyMode = 'recognition' | 'production' | 'writing' | 'handwriting'; // Add new mode
```

#### Step 2: Create Component

```typescript
// src/app/tools/kanji-mastery/components/HandwritingPractice.tsx
'use client';

import { useState } from 'react';

interface HandwritingPracticeProps {
  kanji: string;
  onComplete: (success: boolean) => void;
}

export default function HandwritingPractice({ kanji, onComplete }: HandwritingPracticeProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  
  // Implement drawing logic
  // Compare with correct stroke order
  // Call onComplete with result
  
  return (
    <div className="bg-card rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Write: {kanji}</h3>
      <canvas 
        ref={setCanvas}
        className="border border-border rounded"
        width={300}
        height={300}
      />
      {/* Add controls */}
    </div>
  );
}
```

#### Step 3: Integrate with Review System

```typescript
// src/app/tools/kanji-mastery/review/page.tsx
// Add handwriting mode to review options
const handleReview = async (rating: number, mode: StudyMode = 'recognition') => {
  const result = await kanjiSRS.processReview(
    currentKanji.kanji,
    rating,
    mode // Now supports 'handwriting'
  );
  // ... rest of logic
};
```

## 🔧 Common Development Tasks

### Adding New Kanji Data

1. **Add JSON file** to `/kanji_data/` directory:

```json
// kanji_data/custom/custom.json
[
  {
    "kanji": "愛",
    "meaning": "love",
    "onyomi": ["アイ"],
    "kunyomi": ["いと.しい", "あい"],
    "jlpt": "N3",
    "grade": 4,
    "strokes": 13
  }
]
```

2. **Create API route**:

```typescript
// src/app/api/kanji/custom/route.ts
import { NextResponse } from 'next/server';
import kanjiData from '@/kanji_data/custom/custom.json';

export async function GET() {
  return NextResponse.json(kanjiData);
}
```

3. **Update learning flow** to include new source.

### Modifying Access Limits

1. **Update entitlement rules**:

```typescript
// src/lib/entitlements/rules.ts
daily: {
  kanji_mastery: 20, // Changed from 10 for free users
}
```

2. **Use admin dashboard** at `/admin/features` to modify dynamically.

### Adding Achievement Types

1. **Define achievement**:

```typescript
// src/services/kanji-mastery/achievements.ts
export const ACHIEVEMENTS = {
  FIRST_PERFECT: {
    id: 'first_perfect',
    name: 'Perfect Start',
    description: 'Get a perfect score on your first review',
    icon: '⭐',
    condition: (stats) => stats.perfectReviews >= 1
  },
  CENTURY_CLUB: {
    id: 'century_club',
    name: 'Century Club',
    description: 'Learn 100 kanji',
    icon: '💯',
    condition: (stats) => stats.learnedKanji >= 100
  }
};
```

2. **Check achievements** after actions:

```typescript
// In processReview or similar
const newAchievements = checkAchievements(updatedStats);
if (newAchievements.length > 0) {
  await kanjiStorage.saveAchievements(newAchievements);
  // Show achievement notification
}
```

## 🎨 UI/UX Guidelines

### Theme System Usage

Always use theme-aware classes:

```typescript
// ✅ Good
<div className="bg-card text-foreground border-border">
  <button className="bg-primary text-primary-foreground">
    Learn
  </button>
</div>

// ❌ Bad
<div className="bg-white text-gray-900 border-gray-200">
  <button className="bg-blue-600 text-white">
    Learn
  </button>
</div>
```

### Component Patterns

Follow established patterns:

```typescript
// Loading states
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Error states
if (error) {
  return (
    <div className="text-center p-6">
      <p className="text-destructive mb-4">{error}</p>
      <button onClick={retry} className="text-primary hover:underline">
        Try again
      </button>
    </div>
  );
}

// Empty states
if (data.length === 0) {
  return (
    <div className="text-center p-12">
      <div className="text-6xl mb-4">📚</div>
      <p className="text-muted-foreground">No kanji to review yet!</p>
    </div>
  );
}
```

### Mobile Optimization

```typescript
// Use mobile-first approach
<div className="px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>

// Touch-friendly targets
<button className="min-h-[44px] min-w-[44px] p-3">
  {/* Meets mobile touch target guidelines */}
</button>
```

## 🧪 Testing

### Unit Tests

```typescript
// src/services/kanji-mastery/__tests__/spaced-repetition.test.ts
import { kanjiSRS } from '../spaced-repetition';

describe('KanjiSpacedRepetitionService', () => {
  it('should create new card correctly', () => {
    const card = kanjiSRS.createNewCard('人');
    expect(card.due).toBeInstanceOf(Date);
    expect(card.reps).toBe(0);
  });

  it('should calculate next review correctly', async () => {
    const result = await kanjiSRS.processReview('人', 4); // Easy
    expect(result.interval).toBeGreaterThan(1);
    expect(result.nextReview).toBeInstanceOf(Date);
  });
});
```

### Component Tests

```typescript
// src/app/tools/kanji-mastery/components/__tests__/KanjiLearningCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import KanjiLearningCard from '../KanjiLearningCard';

describe('KanjiLearningCard', () => {
  const mockKanji = {
    kanji: '日',
    meaning: 'sun',
    onyomi: ['ニチ', 'ジツ'],
    kunyomi: ['ひ', 'び'],
  };

  it('should display kanji information', () => {
    render(
      <KanjiLearningCard 
        kanji={mockKanji}
        isMarkedEasy={false}
        onMarkEasy={() => {}}
      />
    );
    
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('sun')).toBeInTheDocument();
  });

  it('should handle tab switching', () => {
    render(<KanjiLearningCard {...props} />);
    
    fireEvent.click(screen.getByText('Examples'));
    expect(screen.getByText('No example words available')).toBeInTheDocument();
  });
});
```

## 🐛 Debugging Tips

### Console Helpers

```typescript
// Add debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('[Kanji Mastery] Loading kanji:', { 
    level, 
    count: kanjiList.length 
  });
}

// Use console.table for complex data
console.table(reviewResults.map(r => ({
  kanji: r.kanji,
  rating: r.rating,
  nextReview: r.nextReview.toLocaleDateString()
})));
```

### React DevTools

1. Install React Developer Tools extension
2. Use Components tab to inspect props/state
3. Use Profiler to identify performance issues

### Storage Debugging

```typescript
// Check IndexedDB contents
const debugStorage = async () => {
  const progress = await kanjiStorage.getAllProgress();
  console.log('Stored progress:', progress);
  
  const sessions = await kanjiStorage.getStudySessions();
  console.log('Study sessions:', sessions);
};

// Add to component for testing
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    window.debugKanjiStorage = debugStorage;
  }
}, []);
```

## 🚀 Performance Optimization

### Lazy Loading

```typescript
// Lazy load heavy components
const StrokeOrderModal = lazy(() => import('@/components/kanji/StrokeOrderModal'));

// Use with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <StrokeOrderModal {...props} />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive calculations
const dueKanjiCount = useMemo(() => {
  return progress.filter(p => new Date(p.nextReview) <= now).length;
}, [progress]);

// Memoize callbacks
const handleReview = useCallback((rating: number) => {
  // ... review logic
}, [currentKanji]);
```

### Data Fetching

```typescript
// Implement proper caching
const kanjiCache = new Map();

const fetchKanjiData = async (level: string) => {
  const cacheKey = `jlpt_${level}`;
  
  if (kanjiCache.has(cacheKey)) {
    return kanjiCache.get(cacheKey);
  }
  
  const response = await fetch(`/api/kanji/${cacheKey}`);
  const data = await response.json();
  
  kanjiCache.set(cacheKey, data);
  return data;
};
```

## 📦 Deployment Checklist

Before deploying changes:

- [ ] Run `npm run build` successfully
- [ ] Test all user flows (guest, free, premium)
- [ ] Verify theme compliance in light/dark modes
- [ ] Check mobile responsiveness
- [ ] Run performance audit
- [ ] Update documentation
- [ ] Add migration if needed
- [ ] Test offline functionality

## 🆘 Getting Help

- Check existing documentation in `/docs`
- Search codebase for similar patterns
- Review git history for context
- Ask in team chat with specific questions
- Create detailed bug reports with reproduction steps

---

Remember: The goal is to create a delightful learning experience while maintaining code quality and performance. Happy coding! 🚀