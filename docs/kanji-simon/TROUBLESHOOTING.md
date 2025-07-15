# Kanji Simon Game - Troubleshooting & Current Issues

## Status: Game Fixed with useReducer Pattern (January 15, 2025)

This document outlines the issues encountered during the implementation of the Kanji Simon game and the attempted fixes.

## Problem Summary

The Kanji Simon game was successfully implemented with all visual and audio features, but experienced critical issues preventing proper gameplay:

1. **Maximum Update Depth Error** - React infinite loop causing the game to crash
2. **Game Start Issues** - Game not initializing properly when "Start Game" button is clicked
3. **Component Mount Issues** - `isMountedRef` being set to false incorrectly

## Root Cause Analysis

### 1. React Hooks Circular Dependencies

The main issue stems from complex interdependencies between React hooks:

```javascript
// The playSequence callback depends on many values
const playSequence = useCallback(async () => {
  // ... game logic
}, [sequence, segments, speakGameText, stopTTS]);

// This effect depends on playSequence
useEffect(() => {
  if (condition) {
    playSequence();
  }
}, [playSequence]); // Creates circular dependency
```

**Problem**: When any dependency of `playSequence` changes, it creates a new function reference, which triggers the effect, which may update state, causing dependencies to change again.

### 2. State Update Timing Issues

Multiple `useEffect` hooks trying to coordinate game flow:
- Segment initialization
- Sequence generation
- Sequence playback
- Player turn management

These effects can trigger each other in unexpected ways, leading to:
- Race conditions
- Multiple simultaneous state updates
- Maximum update depth exceeded errors

### 3. Ref vs State Management

The game uses both refs and state for tracking:
- `isMountedRef` - tracking if component is mounted
- `playScheduledRef` - preventing multiple plays
- `hasInitializedRef` - preventing re-initialization
- Various state variables (isPlaying, isPlayerTurn, etc.)

**Issue**: The cleanup effect was incorrectly setting `isMountedRef.current = false` when `stopTTS` changed, not just on unmount.

## Attempted Solutions

### 1. State Machine Approach
Tried implementing a single `gameState` variable to control flow:
```javascript
const [gameState, setGameState] = useState<'initializing' | 'ready' | 'playing' | 'waiting'>('initializing');
```
**Result**: Still had circular dependency issues

### 2. Ref-based Scheduling
Used refs to prevent multiple scheduled plays:
```javascript
const playScheduledRef = useRef(false);
```
**Result**: Helped prevent some loops but didn't solve the core issue

### 3. Simplified Dependencies
Removed complex callbacks from effect dependencies:
```javascript
}, [sequence.length, round]); // Instead of including callback functions
```
**Result**: Partially successful but caused other timing issues

### 4. Manual Start Button
Added explicit game start to control initialization:
```javascript
const [gameStarted, setGameStarted] = useState(false);
```
**Result**: Gave more control but initialization still failed

## Current State

The game has all features implemented:
- ✅ Visual design (4 segments, animations)
- ✅ TTS integration with caching
- ✅ Sequence generation and playback
- ✅ Score tracking and lives system
- ✅ Progress through all kanji in mood board

But experiences:
- ❌ Initialization failures
- ❌ Infinite re-render loops
- ❌ State management conflicts

## Recommended Solutions

### 1. Complete Refactor with useReducer
Replace multiple `useState` calls with a single reducer:
```javascript
const [gameState, dispatch] = useReducer(gameReducer, initialState);
```
This would centralize all state updates and prevent circular dependencies.

### 2. Remove Complex useCallback Dependencies
Simplify callbacks to not depend on changing values:
```javascript
const playSequence = useCallback(async () => {
  // Use refs or direct state reads instead of dependencies
}, []); // No dependencies
```

### 3. Single Effect Controller
Use one main effect to control game flow:
```javascript
useEffect(() => {
  switch(gamePhase) {
    case 'init': // Initialize
    case 'play': // Play sequence
    case 'wait': // Wait for input
  }
}, [gamePhase]);
```

### 4. Separate Sequence Player Component
Extract sequence playback into a separate component to isolate its state management.

## Technical Debt

1. **Too Many Effects**: 5+ separate `useEffect` hooks trying to coordinate
2. **Mixed Patterns**: Using both refs and state for similar purposes
3. **Callback Dependencies**: Complex callbacks creating new references on every render
4. **No Error Boundaries**: Game crashes take down the whole page

## Next Steps

1. **Refactor State Management**: Move to `useReducer` pattern
2. **Simplify Effects**: Combine related effects into single controllers
3. **Add Error Boundaries**: Prevent game crashes from affecting the whole app
4. **Unit Tests**: Add tests for game logic separate from React
5. **Progressive Enhancement**: Start with basic game, add features incrementally

## Lessons Learned

1. **Start Simple**: Should have implemented basic game loop first
2. **State Design First**: Plan state structure before implementation
3. **Avoid Circular Dependencies**: Be careful with `useCallback` dependencies
4. **Test Early**: Manual testing would have caught issues sooner
5. **Incremental Features**: Add TTS, animations, etc. after core game works

## Conclusion

While the Kanji Simon game has all the desired features implemented, the complex state management and React hooks interactions have created stability issues. A refactor focusing on simpler state management patterns would likely resolve these issues and create a more maintainable codebase.

## Solution Implemented (January 15, 2025)

The game has been successfully refactored using the `useReducer` pattern, which resolved all the circular dependency and infinite loop issues:

### Key Changes:
1. **Centralized State Management**: All game state is now managed by a single reducer
2. **Clear Game Phases**: Defined explicit phases (`setup`, `ready`, `countdown`, `playingSequence`, `playerTurn`, `roundComplete`, `gameOver`)
3. **Single Effect Controller**: One main effect manages game flow based on the current phase
4. **Timer Management**: All timeouts are tracked and cleaned up properly
5. **No Circular Dependencies**: Actions are dispatched without complex callback dependencies

### Technical Implementation:
- Single `GameState` interface contains all state
- `GameAction` types define all possible state changes
- `gameReducer` handles state transitions predictably
- Removed all `useCallback` dependencies that were causing loops
- Function references don't change, preventing re-render cycles

The game now works smoothly without any React hook errors or infinite loops.