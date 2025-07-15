# Mood Paths - Reading Routes Game Context Memory

## Overview
This document serves as a context memory for the "Reading Routes" game feature, which is an engaging revision system for kanji in mood boards. The game helps users master kanji meanings and readings (on'yomi and kun'yomi) through an interactive path-selection mechanic.

## Core Concept
**Reading Routes** is a visually stunning game where:
- A kanji appears in the center of the screen
- Multiple paths branch out showing different readings
- Users select the correct reading based on the context shown
- Visual feedback teaches when to use each reading type

## Key Features

### 1. Visual Design Elements
- **Center Kanji**: Large, glowing kanji with theme-based animations
- **Reading Paths**: Curved paths with particle effects connecting kanji to readings
- **Context Display**: Shows the kanji in a word/sentence context
- **Color Coding**:
  - 🔵 Blue = kun'yomi context
  - 🔴 Red = on'yomi context  
  - 🟣 Purple = both readings possible

### 2. Game Mechanics
- Players see a kanji in context (e.g., 水 in "水曜日")
- Multiple reading options appear as paths
- Correct selection triggers celebration effects
- Wrong selection shows explanation of correct reading
- Progress tracking for each reading type

### 3. Implementation Architecture
- Appears on the Games page
- Each mood board has a button linking to its Reading Routes game
- Game loads specific kanji from the selected mood board
- Progress syncs with existing mood board progress system

## Technical Implementation Plan

### Pages Structure
```
/games (Games listing page)
  └─ Reading Routes card/section
  
/games/reading-routes/[boardId] (Game page)
  └─ Loads kanji from specific mood board
```

### Component Structure
```
ReadingRoutesGame/
├── ReadingRoutesContainer.tsx (main game logic)
├── KanjiCenter.tsx (central kanji display)
├── ReadingPath.tsx (individual path component)
├── ContextDisplay.tsx (shows kanji in context)
├── ProgressHUD.tsx (score, timer, progress)
├── ParticleSystem.tsx (visual effects)
└── GameOverScreen.tsx (results and progress update)
```

### Data Flow
1. User clicks "Practice with Reading Routes" on mood board page
2. Navigate to `/games/reading-routes/[boardId]`
3. Game loads kanji data from the mood board
4. Progress saves to localStorage and syncs with mood board progress
5. Results integrate with existing analytics

## Visual Features to Implement

### Animations
- Path particle flow effects (using Framer Motion)
- Kanji rotation and glow effects
- Success/failure feedback animations
- Smooth transitions between questions

### Theme Integration
Each mood board theme affects the game's visual style:
- **Nature**: Leaf particles, nature sounds, green color scheme
- **Daily Life**: House icons, daily object particles, warm colors
- **Numbers**: Geometric patterns, counting animations, blue scheme

### Mobile Optimization
- Touch-friendly path selection
- Responsive layout for portrait/landscape
- Swipe gestures for quick answers
- Haptic feedback support

## Progress Tracking

### Per-Kanji Metrics
```typescript
{
  kanji: "水",
  meaningMastery: 85,
  onYomiMastery: {
    "スイ": 70,
    "すい": 0  // if alternate exists
  },
  kunYomiMastery: {
    "みず": 90,
    "みな": 30  // if alternate exists
  },
  contextsSeen: ["水曜日", "水", "水泳", ...],
  totalAttempts: 45,
  streak: 5
}
```

### Integration Points
- Updates mood board progress when kanji mastery reaches threshold
- Shares progress data with existing study system
- Analytics events for game sessions
- Achievement system integration

## Next Steps
1. Create git branch for implementation
2. Set up basic game route and page
3. Implement core game mechanics
4. Add visual polish and animations
5. Integrate with mood board progress system
6. Test and refine based on user feedback

## Design Decisions
- Start with basic path selection before adding complex animations
- Use existing mood board color schemes for consistency
- Leverage current progress tracking infrastructure
- Build mobile-first with desktop enhancements
- Keep initial scope focused on core learning mechanics

## Notes for Implementation
- Consider using Canvas or WebGL for particle effects if performance is an issue
- Implement difficulty settings (timer on/off, hint availability)
- Add sound effects toggle for accessibility
- Consider offline capability for practice mode
- Plan for future features: multiplayer, daily challenges, achievements