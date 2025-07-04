# Kana Drop Game Design Document

## Overview

Kana Drop is an interactive falling-blocks game designed to help users master selected kana characters through visual recognition and quick response gameplay. Players must identify and click on specific kana characters as they fall from the top of the screen while avoiding distractors.

## Game Concept

### Core Mechanics
- **Selected Kana**: Users select up to 5 kana characters to practice
- **Falling Objects**: Selected kana and distractor images fall from the top of the screen
- **Bottom Controls**: Romaji representations of selected kana as clickable buttons
- **Objective**: Click falling kana that match the selected romaji button to score points
- **Win Condition**: Reach 100 points
- **End Conditions**: Reach 100 points or close the modal

## Gameplay Details

### 1. Pre-Game Setup
- User selects 1-5 kana characters from the kana chart
- Game launches in a visually appealing modal
- 3-second countdown with "Get Ready!" message
- Selected romaji buttons appear at the bottom

### 2. Game Flow

#### Falling Mechanics
- **Initial Speed**: Slow (2 seconds to fall from top to bottom)
- **Speed Progression**: Increases by 10% every 20 points scored
- **Maximum Speed**: 0.5 seconds (4x initial speed)
- **Spawn Rate**: New object every 0.5-1 second (randomized)
- **Fall Pattern**: Random horizontal positions across screen width
- **Object Ratio**: 30% target kana, 70% distractors

#### Active Selection System
- Only one romaji button can be active at a time
- Clicking a romaji button highlights it (glow effect)
- When active, clicking corresponding falling kana scores points
- Player must switch active selection to score with different kana

### 3. Scoring System

| Action | Points | Effect |
|--------|--------|--------|
| Correct kana click | +5 | Sparkle animation + pronunciation |
| Missed target kana | -10 | When selected kana reaches bottom |
| Distractor click | -5 | Red flash effect |
| Wrong kana click | -10 | Error sound |

### 4. Visual Design

#### Game Area
```
┌─────────────────────────────────┐
│         SCORE: 45               │
│                                 │
│   あ    🐨    い    🦁          │ ← Falling objects
│                                 │
│        🎨    あ                 │
│                                 │
│   う        🏆                  │
│                                 │
│        か          ぎゅ          │
│                                 │
│─────────────────────────────────│
│  [a] [i] [u] [ka] [gyu]        │ ← Clickable romaji buttons
└─────────────────────────────────┘
```

#### Visual Elements
- **Background**: Soft gradient (matches app theme)
- **Falling Kana**: Large, clear font with slight shadow
- **Distractors**: Colorful flat icons (50% opacity)
- **Selected Button**: Glowing border + pulse animation
- **Score Display**: Top center, large font
- **Effects**: Particle sparkles for correct clicks

### 5. Audio Feedback

| Event | Sound |
|-------|-------|
| Correct click | Kana pronunciation (TTS) |
| Wrong kana click | Error beep |
| Distractor click | Soft thud |
| Game start | Cheerful chime |
| Victory (100 points) | Celebration fanfare |

### 6. Distractor Images

50 random flat-icon images from categories:
- Animals (wild & domestic)
- Education items
- Summer/emotion icons
- Various colorful objects

Selected distractors (examples):
```
/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg
/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg
/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg
/flat-icons/4341021-education/svg/037-trophy.svg
/flat-icons/4341021-education/svg/044-color palette.svg
/flat-icons/17517790-summer-watermelon/svg/001-happy.svg
... (44 more)
```

### 7. Game States

#### Start Screen
- Shows selected kana with their romaji
- "Start Game" button
- Brief instructions

#### Playing State
- Active gameplay
- Score display
- Pause button (optional future feature)

#### Victory Screen
- Congratulations message
- Final score
- Time taken
- Accuracy percentage
- "Play Again" / "Select New Kana" buttons

### 8. Technical Implementation

#### Component Structure
```
KanaDropGame/
├── KanaDropModal.tsx       // Main modal container
├── GameCanvas.tsx          // Game rendering area
├── FallingObject.tsx       // Individual falling item
├── RomajiControls.tsx      // Bottom button controls
├── GameStats.tsx           // Score and stats display
└── VictoryScreen.tsx       // End game display
```

#### State Management
```typescript
interface GameState {
  score: number;
  selectedKana: KanaChar[];
  activeRomaji: string | null;
  fallingObjects: FallingObject[];
  gameSpeed: number;
  isPlaying: boolean;
  startTime: number;
  clicks: { correct: number; wrong: number; };
}
```

#### Animation
- Use Framer Motion for smooth falling animations
- CSS transforms for performance
- RequestAnimationFrame for game loop

### 9. Responsive Design

#### Desktop
- Full modal size: 800x600px
- Large kana characters (48px)
- Comfortable click targets

#### Mobile
- Full screen modal
- Touch-optimized buttons
- Larger hit areas for falling objects
- Adjusted spawn rate for smaller screens

### 10. Accessibility

- High contrast between kana and background
- Clear visual feedback for all actions
- Optional sound effects (can be muted)
- Keyboard support for romaji selection (future)

## Future Enhancements

1. **Difficulty Levels**: Easy/Medium/Hard with adjusted speeds
2. **Power-ups**: Time slow, clear distractors, double points
3. **Combo System**: Bonus points for consecutive correct clicks
4. **Leaderboard**: Track high scores per kana set
5. **Achievement System**: Unlock badges for milestones
6. **Mixed Mode**: Practice hiragana and katakana together

## Integration Points

1. **Kana Selection**: Integrates with existing KanaChart component
2. **Audio**: Uses existing TTSManager for pronunciations
3. **Stats Tracking**: Can integrate with StatsManager (future)
4. **Theme**: Follows app's existing design system
5. **Modal System**: Uses existing modal patterns

## Success Metrics

- Average session length > 2 minutes
- Completion rate > 70%
- Retry rate > 50%
- Improvement in kana recognition speed
- User feedback scores > 4/5

## Development Phases

### Phase 1: MVP (Current)
- Basic falling mechanics
- Score system
- Single active selection
- Victory condition

### Phase 2: Polish
- Smooth animations
- Particle effects
- Better visual feedback
- Mobile optimization

### Phase 3: Enhancement
- Difficulty progression
- Stats tracking
- Achievement system
- Social sharing