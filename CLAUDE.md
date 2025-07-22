# Claude Development Notes

## Stroke Order Practice Game Plan

### Overview
Create an interactive game where users practice drawing kanji strokes in the correct order using the KanjiVG data we've integrated.

### Game Mechanics
1. **Stroke Drawing Mode**
   - Display a kanji with faded stroke guides
   - User clicks/taps strokes in order
   - Each correct stroke animates and becomes solid
   - Wrong strokes flash red and don't stick
   - Show stroke number hints on hover/touch

2. **Freehand Drawing Mode** (Advanced)
   - Canvas where users draw strokes with mouse/finger
   - Compare drawn path with SVG stroke data
   - Tolerance for slight variations
   - Real-time feedback on stroke accuracy

3. **Difficulty Levels**
   - **Easy**: Full stroke guides visible, numbers shown
   - **Medium**: Faded guides, no numbers
   - **Hard**: No guides, just the target kanji outline
   - **Expert**: Blank canvas, draw from memory

### Scoring System
- Points per correct stroke (decreases with hints used)
- Combo multiplier for consecutive correct strokes
- Time bonus for quick completion
- Accuracy bonus for freehand mode
- Deduct points for wrong attempts

### Game Features
1. **Practice Sets**
   - JLPT levels (N5-N1)
   - School grade levels
   - Custom word lists
   - Daily challenges

2. **Progress Tracking**
   - High scores per kanji
   - Mastery indicators
   - Streak counters
   - Achievement badges

3. **Learning Aids**
   - Stroke order replay
   - Slow motion mode
   - Hint system (costs points)
   - Mnemonic tips

### Technical Implementation

#### Component Structure
```
/src/app/games/stroke-order-practice/
├── page.tsx                    # Main game page
├── layout.tsx                  # Game layout
└── components/
    ├── StrokeOrderGame.tsx     # Main game component
    ├── DrawingCanvas.tsx       # Canvas for freehand mode
    ├── StrokeGuides.tsx        # SVG stroke guides
    ├── GameControls.tsx        # UI controls
    ├── ScoreDisplay.tsx        # Score and progress
    └── GameOverModal.tsx       # Results screen
```

#### Key Technologies
- **Canvas API** or **SVG interactions** for drawing
- **Framer Motion** for animations
- **Path comparison algorithms** for freehand mode
- **Local storage** for practice history
- **Access control** integration for daily limits

#### Game States
1. **Menu** - Select mode and difficulty
2. **Loading** - Load kanji data
3. **Playing** - Active gameplay
4. **Paused** - Pause menu
5. **GameOver** - Show results
6. **Review** - Review mistakes

### Integration Points

1. **Features Registry**
   - Add `stroke_order_practice` feature
   - Set appropriate limits (e.g., 20 practices/day for free users)
   - Track usage with existing system

2. **Access Control**
   - Use existing `view_stroke_order` permission
   - Track practice sessions
   - Show upgrade prompts when limits reached

3. **Stats Tracking**
   - Track games played
   - Record high scores
   - Monitor completion rates
   - Build mastery metrics

4. **Vocabulary Integration**
   - Launch from vocabulary page
   - Practice words from study lists
   - Link to related drills

### UI/UX Design

#### Visual Style
- Clean, minimal interface
- High contrast for stroke visibility
- Smooth animations for feedback
- Mobile-optimized touch targets
- Dark mode support

#### User Flow
1. Select practice mode
2. Choose difficulty
3. Pick kanji set
4. Play through rounds
5. Review results
6. Share or retry

#### Feedback Systems
- Visual: Color changes, animations
- Audio: Optional sound effects
- Haptic: Mobile vibration feedback
- Progress: XP bars, level ups

### Development Phases

#### Phase 1: Basic Click Mode
- Implement basic stroke clicking
- Add scoring system
- Create game UI
- Integrate with features registry

#### Phase 2: Enhanced Features
- Add difficulty levels
- Implement hint system
- Create practice sets
- Add progress tracking

#### Phase 3: Freehand Mode
- Implement drawing canvas
- Add path comparison
- Create accuracy scoring
- Optimize for touch devices

#### Phase 4: Polish
- Add animations and effects
- Implement achievements
- Create tutorial
- Add social features

### Performance Considerations
- Lazy load SVG data
- Optimize animations for mobile
- Cache frequently used kanji
- Minimize re-renders during gameplay

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode
- Adjustable timing settings

## UI Redesign Process (January 2025)

### Overview
Complete UI redesign focusing on clean, modern aesthetics with consistent design patterns across all pages.

### Design System
- **Background**: Light grey (`bg-gray-50`) for contrast with white components
- **Cards**: White with subtle shadows (`bg-white rounded-lg shadow-sm`)
- **Navigation**: Anchored bottom navbar (MyFitnessPal style)
- **Typography**: Rubik font for Latin text, Noto Sans JP for Japanese
- **Spacing**: Consistent `px-4` padding on mobile

### Page Redesign Workflow

#### 1. Backup Original
```bash
cp src/app/[page]/page.tsx src/app/_backups/[page].page.backup.tsx
```

#### 2. Create Empty Scaffold
Use template structure:
```typescript
'use client';

import { useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import Link from 'next/link';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Name - Doshi Sensei",
  "description": "Page description",
  "url": "https://doshisensei.com/page"
};

export default function PageName() {
  const strings = useStrings();

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <div className="mobile-nav-padding">
        {/* Content */}
      </div>
    </div>
  );
}
```

#### 3. Build Step by Step
1. Header with user info (if needed)
2. Navigation elements
3. Main content area
4. Interactive components
5. Mobile optimizations

### Completed Pages
- [x] Homepage - Welcome section, date/progress bar, stats, feature cards
- [x] Practice page - Empty scaffold ready

### Pages to Redesign
- [ ] Games page
- [ ] Vocabulary page
- [ ] News page
- [ ] Stories page
- [ ] Account page
- [ ] Settings page
- [ ] Kanji browser
- [ ] Drill pages

### Design Patterns

#### Page Header (Standard for all pages)
```jsx
<header className="px-4 pt-6 pb-4">
  <div className="flex items-center gap-3">
    {/* Back Button */}
    <Link 
      href="/" // "/" for main pages, parent route for subpages
      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
      aria-label="Go back to home"
    >
      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </Link>
    
    {/* Page Title */}
    <h1 className="text-xl font-bold text-gray-900">
      {strings.pageName?.title || "Page Title"}
    </h1>
  </div>
</header>
```

#### Welcome Section
```jsx
<header className="px-4 pt-6 pb-4" role="banner">
  <div className="flex items-center gap-3">
    <div className="relative w-12 h-12 flex-shrink-0">
      {/* Avatar */}
    </div>
    <div className="flex-1">
      <h1 className="text-xl font-semibold text-gray-900">
        {strings.home.greeting} {displayName}-san! 👋
      </h1>
      <p className="text-sm text-gray-600">{strings.home.readyToPractice}</p>
    </div>
  </div>
</header>
```

#### Feature Cards
```jsx
<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
      {/* Icon */}
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <svg className="w-5 h-5 text-gray-400">
      {/* Arrow */}
    </svg>
  </div>
</div>
```

### Best Practices
- Always use theme system variables
- Maintain mobile-first approach
- Use semantic HTML for accessibility
- Keep SEO structured data
- Reuse existing data/logic
- Never hardcode strings