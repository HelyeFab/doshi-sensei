# Matching Game Documentation

## Overview

The Matching Game is a memory-based game where players flip tiles to find matching pairs of Japanese words from their saved study lists. It's a modern take on the classic concentration/memory game with beautiful animations and visual feedback.

## Features

### Core Gameplay
- **Grid Layout**: Dynamic grid size (5x4 to 6x5) based on number of pairs
- **Tile Matching**: Match identical Japanese words to clear them from the board
- **Visual Feedback**: Smooth flip animations and match celebrations
- **Sound Effects**: Optional TTS pronunciation when tiles are flipped
- **Progress Tracking**: Real-time move counter and pair counter

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Adapts to user's theme preference
- **Animations**: 
  - 3D card flip effect
  - Match celebration with sparkles
  - Victory screen with confetti
  - Smooth transitions
- **Controls**:
  - Sound toggle (mute/unmute)
  - Reset game button
  - Close (X) button to exit

## Technical Implementation

### File Structure
```
src/components/games/MatchingGame/
├── MatchingGameModal.tsx    # Main game component
├── GameGrid.tsx            # Grid layout component
├── Tile.tsx               # Individual tile component
├── VictoryScreen.tsx      # Game completion screen
├── types.ts               # TypeScript types
├── gameUtils.ts           # Game logic utilities
└── iconUtils.ts           # Icon randomization
```

### Key Components

#### 1. **MatchingGameModal.tsx**
Main game container that manages:
- Game state (tiles, selections, matches)
- Sound settings
- Modal display/hiding
- Victory detection

#### 2. **Tile.tsx**
Individual tile component with:
- 3D flip animation using CSS transforms
- Front/back faces
- Click handling
- Match animation overlay

#### 3. **GameGrid.tsx**
Responsive grid layout that:
- Adjusts columns/rows based on tile count
- Handles tile positioning
- Manages entrance animations

#### 4. **VictoryScreen.tsx**
Celebration screen showing:
- Total moves taken
- Time elapsed
- Performance message
- Play again / Close options

### Game Configuration

```typescript
export const GAME_CONFIG = {
  GRID_COLS: 6,
  GRID_ROWS: 5,
  TOTAL_TILES: 30,
  MIN_PAIRS: 10,
  MAX_PAIRS: 15,
  FLIP_DURATION: 600,      // ms
  MATCH_DELAY: 800,        // ms
  MISMATCH_DELAY: 1200,    // ms
  VICTORY_DELAY: 500,      // ms
  MAX_SELECTED: 2
};
```

### Icon System

The game uses random icons from the flat-icons collection for tile backs:
- Animals (wild and farm)
- Education items
- Emojis
- Each pair shares the same back icon

### TTS Integration

- Uses Google TTS (via context-based provider selection)
- Pronounces words when tiles are flipped
- Optional - can be muted

## User Requirements

1. **Study Lists**: User must have at least one study list with words
2. **Word Count**: Minimum 10 words needed for a game
3. **Word Validation**: Only lists containing words (not sentences) are shown

## Game Flow

1. User selects "Matching Game" from games menu
2. Selects one or more study lists
3. Game creates 10-15 pairs from available words
4. Player flips tiles to find matches
5. Game ends when all pairs are found
6. Victory screen shows stats and options

## Performance Optimizations

- Memoized tile creation
- Efficient re-renders using React keys
- CSS transforms for smooth animations
- Lazy icon loading

## Accessibility

- Keyboard navigation support
- Clear visual feedback
- Optional sound effects
- High contrast in both themes

## Future Enhancements

1. **Difficulty Levels**:
   - Easy: Fewer pairs (8-10)
   - Medium: Current (10-15)
   - Hard: More pairs (15-20)

2. **Match Modes**:
   - Word to Word (current)
   - Word to Reading (kanji to kana)
   - Word to Meaning

3. **Power-ups**:
   - Peek at all tiles for 2 seconds
   - Reveal one match
   - Shuffle remaining tiles

4. **Multiplayer**:
   - Turn-based matching
   - Score competition

## Integration Points

- **Games Page**: Integrated as a modal game
- **Study Lists**: Pulls words from user's lists
- **TTS System**: Uses game context for Google TTS
- **Theme System**: Respects user's theme preference