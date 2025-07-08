# Doshi Sensei Onboarding System - Usage Guide

## Overview

The onboarding system provides a comprehensive 5-screen tutorial that introduces new users to Doshi Sensei's Japanese conjugation learning features.

## Features

- **5-Screen Interactive Tutorial**: Welcome → Conjugation Demo → Lists → Practice → Success
- **Real Conjugation Engine**: Uses actual conjugation logic for demonstrations
- **Animated Demonstrations**: Visual feedback and smooth transitions
- **Accessibility Support**: Keyboard navigation, screen reader friendly
- **Analytics Tracking**: Comprehensive user interaction tracking
- **Mobile Responsive**: Works on all device sizes
- **Theme Integration**: Respects user's color scheme preferences

## How to Test

### For New Users
- Clear your browser's localStorage
- Visit the app - onboarding will automatically start

### Manual Trigger
- Add `?tutorial=true` to any URL
- Example: `http://localhost:3000?tutorial=true`

### Reset Onboarding
```javascript
// In browser console
localStorage.removeItem('doshi_onboarding_completed');
localStorage.removeItem('doshi_onboarding_date');
location.reload();
```

## Screen Details

### 1. Welcome Screen
- Introduces the app with humor and encouragement
- Lists key features (127+ conjugation forms, custom lists, etc.)
- Uses friendly emojis and animations

### 2. Conjugation Demo
- Shows real conjugation of 食べる (taberu - to eat)
- Interactive "Cast Conjugation Spell" button
- Displays 5 common conjugation forms with animations

### 3. Lists Demo
- Simulates vocabulary search and saving workflow
- Shows how to create and manage word lists
- Demonstrates the list pill UI component

### 4. Practice Demo
- Explains two learning modes: Practice vs Drill
- Shows actual practice interface for studying
- Interactive drill question with 行く (iku - to go)

### 5. Success Screen
- Congratulations with Japanese "おめでとう!"
- Optional settings preview (themes, romaji toggle)
- Saves user preferences to localStorage

## User Interactions Tracked

- Screen view times and progression
- Button clicks and demo interactions
- Drop-off points for optimization
- Settings selections in final screen
- Total completion time

## Integration

The onboarding system is automatically integrated into the app through:

```tsx
// In layout.tsx
<OnboardingWrapper>
  <div className="min-h-screen bg-background text-foreground">
    {children}
    {/* Other components */}
  </div>
</OnboardingWrapper>
```

## Keyboard Navigation

- **Arrow Right/Space/Enter**: Next screen
- **Arrow Left**: Previous screen
- **Escape**: Exit tutorial (with confirmation)

## Accessibility Features

- Screen reader announcements for screen changes
- Focus management and keyboard navigation
- High contrast mode support
- Reduced motion support for users with preferences
- Skip tutorial option for power users

## Performance

- Lazy loaded components
- Hardware-accelerated animations
- Minimal bundle size impact
- Optimized for 60fps animations

## Analytics Events

The system tracks these Google Analytics events:

- `onboarding_screen_view` - User views each screen
- `onboarding_interaction` - User interacts with demos
- `onboarding_completed` - User completes tutorial
- `onboarding_drop_off` - User exits early

## Customization

### Adding New Screens

1. Create new screen component in `src/components/onboarding/screens/`
2. Add to screen array in `OnboardingModal.tsx`
3. Update total steps in `ProgressBar`
4. Add screen name to `getScreenName()` function

### Modifying Demo Content

- Edit word examples in individual screen components
- Update conjugation demos in `AnimatedWord.tsx`
- Modify mock interfaces in `ListsScreen.tsx`

### Styling Changes

- Animations defined in `globals.css`
- Color schemes in CSS custom properties
- Component styling uses Tailwind classes

## File Structure

```
src/components/onboarding/
├── OnboardingWrapper.tsx       # Main integration component
├── OnboardingModal.tsx         # Modal container with navigation
├── screens/
│   ├── WelcomeScreen.tsx       # Screen 1: Introduction
│   ├── ConjugationScreen.tsx   # Screen 2: Conjugation demo
│   ├── ListsScreen.tsx         # Screen 3: Lists management
│   ├── PracticeScreen.tsx      # Screen 4: Practice modes
│   └── SuccessScreen.tsx       # Screen 5: Completion & settings
├── components/
│   ├── TutorialButton.tsx      # Consistent button styling
│   ├── ProgressBar.tsx         # Tutorial progress indicator
│   └── AnimatedWord.tsx        # Animated conjugation display
├── hooks/
│   └── useOnboardingState.ts   # State management & analytics
└── index.ts                    # Barrel exports
```

## Technical Dependencies

- React 19+ with hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Next.js 15+ for SSR support
- Local storage for persistence

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)
- Progressive enhancement for older browsers

## Troubleshooting

### Onboarding Not Showing
1. Check localStorage for `doshi_onboarding_completed`
2. Verify `OnboardingWrapper` is in layout tree
3. Check browser console for errors

### Animations Not Working
1. Check `prefers-reduced-motion` setting
2. Verify CSS imports are loading
3. Check for JavaScript errors preventing state updates

### Settings Not Persisting
1. Verify localStorage is available
2. Check for quota exceeded errors
3. Ensure settings context is properly connected
