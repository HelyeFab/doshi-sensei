# Matching Game Documentation

## Overview

The Matching Game is a Mahjong solitaire-style memory game where players match Japanese words with their meanings, readings, or exact matches. Built with React and Framer Motion, it provides an engaging way to practice vocabulary through visual memory.

## Game Features

### Core Gameplay
- **Memory Matching**: Flip tiles to reveal words/meanings and find matching pairs
- **Mixed Match Types**: Combines exact matches, reading matches, and meaning matches for variety
- **Visual Feedback**: 3D flip animations and explosion effects for matched tiles
- **Progressive Difficulty**: Automatically scales from 10-30 tiles based on available words
- **Study List Integration**: Uses words from user's saved vocabulary lists

### Technical Features
- **Responsive Design**: Adapts to mobile and desktop screens
- **Icon Variety**: Uses 67 different icons from multiple categories
- **Exit Confirmation**: Prevents accidental game exits
- **Victory Animation**: Confetti celebration on completion
- **Sound Effects**: TTS pronunciation for Japanese words

## File Structure

```
src/components/games/MatchingGame/
├── MatchingGameModal.tsx    # Main game container
├── GameGrid.tsx            # Responsive grid layout
├── Tile.tsx                # Individual tile component
├── VictoryScreen.tsx       # Game completion screen
├── InstructionScreen.tsx   # Pre-game instructions
├── types.ts                # TypeScript definitions
├── gameUtils.ts            # Game logic and utilities
└── iconUtils.ts            # Icon selection logic
```

## Component Architecture

### MatchingGameModal
The main container that manages game state and flow:
- Handles tile selection and matching logic
- Manages game timer and progress tracking
- Coordinates with Three-Pillar access control
- Provides exit confirmation dialog

### GameGrid
Responsive grid container:
- Centers tiles in viewport
- Maintains consistent spacing
- Scales appropriately for different screen sizes

### Tile
Individual tile component with:
- 3D flip animation using CSS transforms
- Explosion effect for matched tiles
- Icon display on back face
- Text display on front face
- Touch-friendly interaction

### VictoryScreen
Completion screen featuring:
- Confetti animation
- Play again option
- Return to list selection

## Game Configuration

### Tile Limits
```typescript
const MIN_PAIRS = 5;    // Minimum word requirement
const MAX_PAIRS = 15;   // Maximum tiles (30 total)
```

### Match Types
1. **Exact Match**: Same word appears twice
2. **Reading Match**: Kanji paired with its hiragana reading
3. **Meaning Match**: Japanese word paired with English meaning

### Word Requirements
- Minimum 5 words in selected lists
- Words must have either kanji or kana field
- Duplicates are automatically filtered

## Integration with Three-Pillar System

### Feature Registration
```typescript
'matching_game': {
  id: 'matching_game',
  name: 'Memory Match',
  description: 'Match Japanese words with their meanings or readings',
  category: 'games',
  icon: '🀄',
  limitType: 'daily',
  requiresAuth: false,
  requiresSubscription: false,
  status: 'active',
  sharedLimitGroup: 'games'  // Shares limit with other games
}
```

### Access Control
- Free users: 3 games per day (shared with other games)
- Premium users: Unlimited plays
- Guest users: 3 games per day without saving progress

## User Flow

1. **Game Selection**: User selects "Memory Match" from games page
2. **List Selection**: Choose vocabulary lists (minimum 5 words)
3. **Instructions**: Brief tutorial on how to play
4. **Gameplay**: Flip tiles to find matching pairs
5. **Victory**: Confetti celebration and options to replay

## Animations

### Tile Flip
```css
transform-style: preserve-3d;
transition: transform 0.6s;
transform: rotateY(180deg);
```

### Explosion Effect
Uses Framer Motion for matched tiles:
```typescript
animate={{
  scale: [1, 1.2, 0],
  opacity: [1, 1, 0],
  rotate: [0, 10, -10, 0]
}}
```

### Confetti
React-confetti library with custom configuration:
- 200 pieces
- 5 second duration
- Gravity effect

## Icon System

### Available Icons (67 total)
Icons are organized in categories:
- Animals (wild, farm, pets)
- Food & Drinks
- Nature & Weather
- Objects & Tools
- Activities & Sports
- Emotions & Expressions

### Icon Selection
- Random selection for each game
- No duplicate icons in same game
- PNG format with transparent backgrounds

## Performance Considerations

### Optimizations
- Tiles removed from DOM when matched
- Minimal re-renders using React.memo
- Efficient state updates with useCallback
- Lazy loading of icon images

### Mobile Performance
- Touch-optimized interactions
- Reduced animation complexity on low-end devices
- Responsive grid prevents overflow

## Accessibility

### Keyboard Support
- Tab navigation between tiles
- Enter/Space to flip tiles
- Escape to show exit dialog

### Screen Reader Support
- ARIA labels for all interactive elements
- Announcement of matched pairs
- Game state updates announced

### Visual Accessibility
- High contrast tile borders
- Clear visual feedback for selection
- No reliance on color alone

## Future Enhancements

### Planned Features
1. **Difficulty Levels**: Easy/Medium/Hard modes
2. **Time Attack Mode**: Complete within time limit
3. **Streak Bonuses**: Rewards for consecutive matches
4. **Custom Themes**: Different tile backs and themes
5. **Multiplayer**: Compete with other learners
6. **Statistics**: Track performance over time

### Technical Improvements
1. **WebGL Renderer**: For smoother animations
2. **Service Worker**: Offline game support
3. **Achievements**: Gamification elements
4. **Leaderboards**: Global and friend rankings

## Troubleshooting

### Common Issues

1. **Empty Tiles**: Ensure words have kanji or word field
2. **No Flip Animation**: Check CSS transform support
3. **Game Won't Start**: Verify minimum word count
4. **Icons Not Loading**: Check public/flat-icons directory

### Debug Mode
Enable debug logging:
```typescript
const DEBUG = process.env.NODE_ENV === 'development';
```

## Code Examples

### Creating a New Match Type
```typescript
// In gameUtils.ts
if (Math.random() < 0.33) {
  // New match type logic
  tiles.push({
    id: `${word.id}-custom-1`,
    content: word.customField,
    matchId: word.id,
    isFlipped: false,
    isMatched: false
  });
}
```

### Adding New Animations
```typescript
// In Tile.tsx
const customVariants = {
  matched: {
    scale: [1, 1.5, 0],
    rotate: [0, 360],
    transition: { duration: 0.5 }
  }
};
```

## Testing

### Unit Tests
- Game logic in gameUtils.test.ts
- Tile matching algorithms
- Score calculation

### Integration Tests
- Full game flow
- Access control integration
- List selection validation

### E2E Tests
- Complete user journey
- Mobile responsiveness
- Performance metrics