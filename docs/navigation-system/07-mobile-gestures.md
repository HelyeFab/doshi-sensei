# Mobile Swipe Gestures

## Overview

The navigation system now includes mobile swipe gestures for a native-like navigation experience.

## Features

### Swipe Navigation
- **Swipe Right**: Navigate back in history (from left edge)
- **Swipe Left**: Navigate forward in history (from right edge)
- **Edge Detection**: Gestures only activate from screen edges (20px)
- **Visual Hints**: Shows hints on first use and during swipes

### Configuration

#### User Settings
Users can enable/disable gestures in Settings → Navigation → Swipe Gestures

#### Developer Options
```typescript
useNavigationGestures({
  minSwipeDistance: 75,    // Minimum swipe distance in pixels
  maxSwipeTime: 300,       // Maximum swipe duration in ms
  enabled: true,           // Enable/disable gestures
  showHints: true          // Show visual hints
});
```

### Visual Indicators

1. **Edge Indicators**: Subtle bars on screen edges when navigation is possible
2. **Swipe Hints**: Animated hints showing swipe direction
3. **First-time Tutorial**: Automatic hint on first page with back navigation

### Implementation

#### Components
- `useNavigationGestures` - Hook for gesture detection
- `SwipeHint` - Visual feedback component
- `NavigationGestures` - Global gesture handler

#### Touch Event Handling
- Uses native touch events for best performance
- Prevents default scrolling during horizontal swipes
- Handles touch cancellation gracefully

### Accessibility
- Gestures are opt-in via settings
- Visual hints for discoverability
- Does not interfere with screen readers
- Alternative navigation methods always available

### Browser Support
- Works on all modern mobile browsers
- Automatically disabled on desktop
- Progressive enhancement approach