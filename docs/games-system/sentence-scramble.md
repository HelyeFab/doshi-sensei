# Sentence Scramble Game Documentation

## Overview

The Sentence Scramble game is an interactive Japanese learning game where users memorize complete sentences and then reassemble them from scrambled word blocks. The game integrates with the three-pillar architecture for access control and uses sentence lists created by users throughout the application.

## Game Flow

### 1. List Selection Phase
- Users can select up to 5 sentence lists from their saved lists
- Only lists with content are shown
- Lists are loaded from `StudyListManager.getSentenceLists()`
- Visual feedback shows selected lists with checkmarks

### 2. Instructions Phase
- Four-step instruction screen explaining the game mechanics:
  - Watch the complete sentence flash
  - Rebuild using colorful blocks
  - Beat the 20-second timer with 5 attempts
  - Score points for correct completions

### 3. Sentence Flash Phase
- Complete sentence displays for 20 seconds
- Individual furigana toggle for reading assistance during memorization
- User can skip early with "Skip Reading" button
- Serves as memorization phase before scrambling

### 4. Countdown Phase
- 3-second countdown ("3", "2", "1", "Get ready!")
- Builds anticipation before scramble phase

### 5. Scramble Phase
- Sentence broken into word blocks with beautiful pastel colors
- Random KanaDrop images mixed in as distractors
- 20-second timer for each sentence
- Maximum 5 attempts per sentence
- Visual feedback for correct/incorrect attempts

### 6. Game Over Phase
- Final score and statistics display
- Option to play again or return to games

## Technical Implementation

### File Structure
```
src/components/games/SentenceScrambleGame/
├── SentenceScrambleModal.tsx    # Main game component
└── types.ts                     # Type definitions and constants
```

### Core Components

#### SentenceScrambleModal.tsx
Main game component handling all phases and game state management.

**Key Features:**
- Multi-phase game state management
- Three-pillar access control integration
- Timer management (20s flash timer, countdown, 20s game timer)
- Individual furigana toggle during sentence flash phase
- Japanese text tokenization
- Visual feedback system
- Exit confirmation dialog

**State Management:**
```typescript
interface GameState {
  phase: 'list-selection' | 'instructions' | 'sentence-flash' | 'countdown' | 'scramble' | 'game-over';
  selectedLists: StudyList[];
  sentences: Sentence[];
  currentSentenceIndex: number;
  currentSentence: ScrambledSentence | null;
  totalScore: number;
  totalAttempts: number;
  gameStartTime: number;
  timeRemaining: number;
  showDistractors: boolean;
}
```

#### types.ts
Comprehensive type definitions and constants for the game.

**Key Types:**
- `WordBlock`: Individual word/distractor blocks
- `ScrambledSentence`: Complete sentence with word blocks
- `GameState`: Overall game state
- `GameStats`: Performance statistics

**Constants:**
- `GAME_CONSTANTS`: Game timing and limits (20s flash, 20s scramble, 5 attempts)
- `WORD_BLOCK_COLORS`: Pastel colors for 3D blocks
- `DISTRACTOR_IMAGES`: KanaDrop images used as distractors

### Three-Pillar Architecture Integration

#### Access Control
- Feature ID: `sentence_scramble`
- Permission: `play_games`
- Limit Type: `daily`
- Shared Limit Group: `games`

#### User Types and Limits
- **Guest/Free Users**: 3 games per day
- **Premium Users**: Unlimited games

#### Implementation Details
```typescript
// Feature registration in registry.ts
'sentence_scramble': {
  id: 'sentence_scramble',
  name: 'Sentence Scramble',
  description: 'Reassemble scrambled Japanese sentences from your saved lists',
  category: 'games',
  icon: '🧩',
  limitType: 'daily',
  requiresAuth: false,
  requiresSubscription: false,
  status: 'active',
  sharedLimitGroup: 'games'
}

// Permission mapping in access/index.ts
const permissionMap = {
  'sentence_scramble': 'play_games',
  // ... other mappings
};
```

### Japanese Text Processing

#### Tokenization
The game uses a custom tokenization function to break sentences into meaningful word blocks:

```typescript
function tokenizeSentence(text: string): string[] {
  // Split by particles and punctuation while preserving them
  const particles = ['は', 'が', 'を', 'に', 'で', 'から', 'まで', 'と', 'や', 'の', 'へ'];
  const punctuation = ['。', '、', '！', '？', '：', '；'];
  
  // Implementation splits text intelligently around particles
  // while keeping them attached to preceding words
}
```

#### Word Block Generation
- Each word gets a unique pastel color from `WORD_BLOCK_COLORS`
- Consistent sizing: `min-w-[50px] max-w-[120px] h-10 sm:h-12`
- 3D effect with shadows and rounded corners
- Unique IDs with timestamps to prevent React key conflicts

### Visual Design

#### Pastel Color Scheme
The game uses a carefully curated set of 12 pastel colors:
- Light Pink (#FFB3BA)
- Light Peach (#FFDFBA)
- Light Yellow (#FFFFBA)
- Light Green (#BAFFBA)
- Light Blue (#BAE1FF)
- Light Purple (#E6BAFF)
- Light Magenta (#FFBAE6)
- Light Orange (#FFE4BA)
- Light Lavender (#D4BAFF)
- Light Mint (#BAFFDF)
- Light Coral (#FFC9BA)
- Light Violet (#E1BAFF)

#### 3D Block Styling
```css
.word-block {
  background: linear-gradient(135deg, color, darker-shade);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.word-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}
```

#### Distractor Integration
- Random KanaDrop images mixed with word blocks
- 40% of word count as distractors (min 1, max 3)
- Images scaled to fit within block dimensions
- Fallback to emoji if image fails to load

### Mobile Responsiveness

#### Responsive Design Features
- Touch-friendly block sizing (minimum 50px width)
- Responsive text scaling (`text-sm sm:text-base`)
- Mobile-optimized layout with proper spacing
- Touch targets meet accessibility guidelines

#### Mobile-Specific Optimizations
- Larger touch targets on mobile
- Optimized timer display for small screens
- Responsive modal sizing
- Appropriate font scaling

#### Reading Assistance Features
- **Individual Furigana Toggle**: Each sentence during flash phase has its own furigana toggle
- **Smart Caching**: Furigana is cached per sentence using existing `generateFuriganaWithCache` system
- **Extended Flash Duration**: 20 seconds for comfortable memorization time
- **Loading States**: Visual spinner while furigana is being generated
- **Ruby Text Display**: Uses same HTML structure and CSS classes as article reader
- **Strategic Positioning**: Toggle button positioned in top-right corner, non-intrusive but accessible

### Performance Optimizations

#### Timer Management
- Proper cleanup of all timers on component unmount
- Efficient timer state management
- Memory leak prevention

#### State Management
- Minimal re-renders through careful state structuring
- Efficient sentence processing and caching
- Optimized distractor selection

### Error Handling

#### Graceful Degradation
- Fallback emoji for failed image loads
- Error boundaries for game crashes
- Network error handling for list loading
- Validation for empty or invalid sentences

#### User Feedback
- Loading states during list fetching
- Clear error messages for failed operations
- Visual feedback for correct/incorrect attempts
- Confirmation dialogs for important actions

### Accessibility Features

#### Screen Reader Support
- Proper ARIA labels for interactive elements
- Semantic HTML structure
- Keyboard navigation support
- Alt text for all images

#### Visual Accessibility
- High contrast color combinations
- Readable font sizes
- Clear visual hierarchy
- Proper focus indicators

### Integration Points

#### StudyListManager
- Retrieves sentence lists via `getSentenceLists()`
- Filters out empty lists
- Handles list loading errors

#### Notification System
- Success/error notifications via `useNotification`
- User feedback for game events
- Error reporting for failed operations

#### Authentication
- User context via `useAuth`
- Subscription status via `useSubscription2`
- Access control via `useAccess`

### String Localization

All user-facing text is centralized in `src/config/strings.ts` under the `games.sentenceScramble` namespace:

```typescript
sentenceScramble: {
  title: "Sentence Scramble",
  selectListsTitle: "Select Sentence Lists",
  selectListsDescription: "Choose up to {maxLists} sentence lists for your scramble game",
  howToPlay: "How to Play",
  memorizeSentence: "Memorize this sentence!",
  skipReading: "Skip Reading",
  submitAnswer: "Submit Answer",
  // ... comprehensive string definitions
}
```

### Future Enhancements

#### Potential Improvements
1. **Difficulty Levels**: Varying complexity based on sentence length
2. **Hint System**: Progressive hints for struggling users
3. **Statistics Tracking**: Detailed performance analytics
4. **Multiplayer Mode**: Competitive sentence scrambling
5. **Voice Recognition**: Speaking the sentence for additional practice
6. **Custom Timing**: User-configurable flash and scramble times

#### Technical Debt
- Consider extracting tokenization logic to separate utility
- Implement comprehensive test coverage
- Add performance monitoring
- Consider lazy loading for large sentence lists

## Testing Recommendations

### Unit Tests
- Tokenization function accuracy
- Word block generation logic
- Timer management functions
- Access control integration

### Integration Tests
- Complete game flow testing
- Three-pillar system integration
- StudyListManager interaction
- Error handling scenarios

### E2E Tests
- Full game completion scenarios
- Mobile responsiveness testing
- Performance under load
- Accessibility compliance

## Maintenance Notes

### Dependencies
- React hooks for state management
- Tailwind CSS for styling
- Lucide React for icons
- StudyListManager for data access

### Configuration
- Game constants in `types.ts`
- Color schemes easily modifiable
- Timer durations configurable
- Distractor count adjustable

### Monitoring
- Track game completion rates
- Monitor performance metrics
- User feedback collection
- Error rate monitoring

This documentation provides a comprehensive overview of the Sentence Scramble game implementation, covering all aspects from technical architecture to user experience design.