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