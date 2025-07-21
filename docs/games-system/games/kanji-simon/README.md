# Kanji Simon Game Documentation

> ✅ **Current Status**: The game is fully functional as of January 15, 2025. All React state management issues have been resolved.

## Overview

Kanji Simon is a memory game inspired by the classic Simon game, designed to help users learn and memorize kanji readings (on'yomi and kun'yomi) and meanings through pattern repetition. Players must watch and repeat increasingly complex sequences to progress through rounds.

## Table of Contents

1. [Game Concept](#game-concept)
2. [Architecture Overview](#architecture-overview)
3. [Component Structure](#component-structure)
4. [Game Flow](#game-flow)
5. [Technical Implementation](#technical-implementation)
6. [Customization Guide](#customization-guide)
7. [Future Enhancements](#future-enhancements)

## Game Concept

### Core Gameplay
- **Simon-style memory game**: Watch a sequence of highlighted segments, then repeat it
- **4 segments**: On'yomi (blue), Kun'yomi (red), Meaning (green), Distractor (yellow)
- **Progressive difficulty**: Each round adds one more item to the sequence
- **Lives system**: 3 lives per game session
- **Score tracking**: Points based on sequence length (100 points × sequence length per round)
- **Full board coverage**: Each kanji gets up to 5 rounds before moving to the next
- **Automatic progression**: Game cycles through all kanji in the mood board
- **TTS with caching**: Google TTS speaks each segment with blazing-fast cached audio
- **Random reading selection**: Segments randomly display different readings each game for better learning
- **Clean UI**: Instructions shown in overlay, minimal on-screen text during gameplay

### Educational Goals
- Reinforce kanji reading associations through repetition
- Build muscle memory for common reading patterns
- Engage visual and kinesthetic learning styles
- Make kanji practice fun and game-like

## Architecture Overview

```
/src/app/games/kanji-simon/
├── page.tsx                    # Board selection page
└── [boardId]/
    └── page.tsx               # Game page for specific board

/src/components/games/KanjiSimon/
├── KanjiSimonGame.tsx         # Core game component
├── KanjiSimonGameWrapper.tsx  # Game state management
├── KanjiSimonBoardSelection.tsx # Board selection UI
├── GameOverScreen.tsx         # End game UI
└── progressTracking.ts        # Save/load game progress

/src/lib/features/
└── registry.ts                # Feature registration

/src/lib/access/
└── index.ts                   # Access control mapping
```

## Component Structure

### KanjiSimonGameSimple.tsx
The main game component that handles:
- Segment rendering with SVG and styled borders
- Sequence generation and playback
- Player input handling
- Visual feedback and animations
- Round progression
- Random reading selection from multiple kanji readings
- Instructions overlay on first load

### KanjiSimonGameWrapper.tsx
Manages the overall game state:
- Cycles through kanji in the mood board
- Tracks lives and total score
- Handles game over and restart logic
- Saves progress to storage
- Manages rounds per kanji (5 rounds before moving to next)
- Ensures all kanji are practiced

### KanjiSimonBoardSelection.tsx
Displays available mood boards:
- Filters active boards with kanji
- Shows board previews with kanji count
- Handles board selection and navigation

## Game Flow

### 1. Initialization
```typescript
// Game starts with:
- Round 1
- Empty sequence
- 3 lives
- Score 0
```

### 2. Round Start
```
3-2-1 Countdown → Flash all segments → Play sequence → Player's turn
```

### 2.5. Progression Logic
- Each kanji gets up to 5 rounds of play
- After 5 successful rounds, move to next kanji automatically
- If player fails (loses life), immediately move to next kanji
- Game ends when all kanji are practiced OR all lives are lost

### 3. Sequence Playback
- Each segment lights up for 800ms
- 300ms gap between segments
- Visual indicators show progress

### 4. Player Turn
- "YOUR TURN!" message appears
- Progress dots show remaining clicks
- Distractor segment is dimmed (50% opacity)

### 5. Feedback
- **Correct**: Segment briefly highlights, continue
- **Wrong**: All segments flash red, lose a life
- **Complete**: All segments flash green, next round

### 6. Game Over
- Shows final score and accuracy
- Option to play again or exit
- Progress saved automatically

## Technical Implementation

### State Management
```typescript
// Simplified state management using standard React hooks
const [showInstructions, setShowInstructions] = useState(true);
const [gameStarted, setGameStarted] = useState(false);
const [phase, setPhase] = useState<'countdown' | 'showing' | 'playing' | 'success' | 'gameover'>('countdown');
const [sequence, setSequence] = useState<string[]>([]);
const [playerSequence, setPlayerSequence] = useState<string[]>([]);
const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);
```

### Segment Generation
```typescript
// Randomly select from all available readings
const onReadings = kanji.readings.on || [];
const kunReadings = kanji.readings.kun || [];

const randomOnReading = onReadings.length > 0 
  ? onReadings[Math.floor(Math.random() * onReadings.length)]
  : 'オン';

// Segments maintain consistent colors but show random readings
const baseSegments: Segment[] = [
  {
    id: 'onyomi',
    label: randomOnReading,
    value: 'onyomi',
    color: 'rgb(191, 219, 254)', // pastel blue
    hoverColor: 'rgb(59, 130, 246)', // bright blue
  },
  // ... other segments with random readings
];
```

### Animation System
- Uses Framer Motion for smooth transitions
- Pastel colors by default, bright when active
- Scale and brightness effects for feedback
- Custom animation delays for visual flow

### Progress Tracking
```typescript
// Saved data structure
interface KanjiSimonProgress {
  boardId: string;
  kanjiProgress: Record<string, KanjiMemoryProgress>;
  lastPlayed: string;
  totalGamesPlayed: number;
  highScore: number;
  longestSequence: number;
}
```

## Customization Guide

### Changing Colors
Edit the segment colors in `KanjiSimonGame.tsx`:
```typescript
// Pastel colors (idle state)
color: 'rgb(191, 219, 254)', // blue
color: 'rgb(254, 202, 202)', // red
color: 'rgb(167, 243, 208)', // green
color: 'rgb(254, 240, 138)', // yellow

// Bright colors (active state)
hoverColor: 'rgb(59, 130, 246)', // blue
hoverColor: 'rgb(239, 68, 68)', // red
hoverColor: 'rgb(34, 197, 94)', // green
hoverColor: 'rgb(250, 204, 21)', // yellow
```

### Adjusting Timing
```typescript
// In playSequence function
await new Promise(resolve => setTimeout(resolve, 800)); // Segment display time
await new Promise(resolve => setTimeout(resolve, 300)); // Gap between segments
```

### Modifying Difficulty
```typescript
// Change lives count in KanjiSimonGameWrapper.tsx
const [lives, setLives] = useState(3); // Default is 3

// Adjust scoring in KanjiSimonGame.tsx
const roundScore = sequence.length * 100; // Points per round
```

### TTS Integration
The game uses Google TTS with caching for audio feedback:
```typescript
// TTS is automatically triggered during:
// 1. Sequence playback - each segment speaks its content
// 2. Player clicks - immediate audio feedback

// The system uses:
const { speakGameText } = useGameTTS();

// With caching for blazing-fast response:
speakGameText(segment.ttsText, 'kanji-simon', { 
  voice: 'female', 
  speed: 1.0,
  provider: 'google' // Optimized for quick vocabulary
});
```

### Content Display
- **Segments**: Show Japanese content (readings or example sentences)
- **Center circle**: Shows kanji character with English meaning below
- **Meaning segment**: Uses first example sentence if available

## Future Enhancements

### 1. Advanced Features
- **Speed modes**: Faster sequence playback for experienced players
- **Pattern recognition**: Bonus points for completing without mistakes
- **Streak bonuses**: Extra points for consecutive correct rounds
- **Power-ups**: Skip a life loss, slow down sequence, etc.

### 2. Educational Improvements
- **Context sentences**: Show example usage after each round
- **Audio pronunciation**: Play readings when segments light up
- **Progress analytics**: Track which readings are most difficult
- **Spaced repetition**: Focus on frequently missed kanji

### 3. Visual Enhancements
- **Themes**: Different color schemes (dark mode, high contrast)
- **Particle effects**: Celebrations for completed rounds
- **3D animations**: Segments that pop out when active
- **Mobile optimizations**: Better touch targets and gestures

### 4. Social Features
- **Leaderboards**: Compare scores with other players
- **Challenges**: Send specific sequences to friends
- **Achievements**: Unlock badges for milestones
- **Daily challenges**: Special boards with rewards

### 5. Integration Ideas
- **Study mode**: Practice specific readings without game pressure
- **Custom boards**: Let users create their own kanji sets
- **API integration**: Pull kanji data from dictionaries
- **Cross-game progress**: Share mastery with other games

## Development Tips

### Adding New Segment Types
```typescript
// Add to baseSegments array
{
  id: 'radical',
  label: kanji.radical || 'N/A',
  value: 'radical',
  color: 'rgb(255, 200, 200)', // custom color
  hoverColor: 'rgb(255, 100, 100)',
  position: 4
}
```

### Implementing Difficulty Levels
```typescript
interface DifficultySettings {
  easy: { speed: 1000, lives: 5, distractorCount: 1 },
  medium: { speed: 800, lives: 3, distractorCount: 1 },
  hard: { speed: 600, lives: 2, distractorCount: 2 }
}
```

### Performance Optimization
- Use `React.memo` for segment components if needed
- Implement virtual DOM diffing for large kanji sets
- Lazy load mood board data
- Cache SVG paths for better performance

## Troubleshooting

### Common Issues
1. **Segments not visible**: Check SVG viewBox and path calculations
2. **Animations stuttering**: Reduce simultaneous animations
3. **Touch not working**: Ensure pointer-events are enabled
4. **Progress not saving**: Verify storage permissions

### Debug Mode
```typescript
// Add to component for debugging
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Sequence:', sequence);
    console.log('Player sequence:', playerSequence);
  }
}, [sequence, playerSequence]);
```

## Recent Updates (January 15, 2025)

### Fixed Issues
- ✅ Resolved all React state management problems using simplified approach
- ✅ Eliminated circular dependencies and infinite re-render loops
- ✅ Game now fully functional and stable

### New Features
- ✅ Random reading selection from all available kanji readings
- ✅ Instructions overlay for first-time players
- ✅ Cleaner UI with minimal on-screen text
- ✅ Visual improvements: black borders with gaps, smaller kanji display
- ✅ Comprehensive logging for debugging (in development mode)

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for historical context and the solution implemented.

## Credits

Kanji Simon was created as part of the Doshi Sensei Japanese learning platform. The game design is inspired by the classic Simon electronic game, adapted for educational purposes.

## Implementation Details

### Key Architecture Decisions
1. **Simplified State Management**: Uses standard React hooks instead of `useReducer` to avoid complexity
2. **Phase-based Game Flow**: Clear phases (countdown → showing → playing → success/gameover) prevent state conflicts
3. **Random Reading Selection**: Educational value enhanced by exposing players to all kanji readings
4. **Visual Design**: Black borders with gaps create a cohesive, polished look

### File Structure
- `KanjiSimonGameSimple.tsx` - Main game component with all game logic
- `KanjiSimonGameWrapper.tsx` - Handles kanji progression and lives management
- `GameOverScreen.tsx` - End game UI
- `progressTracking.ts` - Save/load game progress