# Doshi Sensei Theme System Guide

## Overview

Doshi Sensei features a comprehensive theme system that allows users to customize the visual appearance of the application. The system supports both light and dark modes with multiple color schemes inspired by terminal aesthetics.

## Table of Contents

- [User Guide](#user-guide)
- [Developer Guide](#developer-guide)
- [Architecture](#architecture)
- [Color Schemes](#color-schemes)
- [Implementation Details](#implementation-details)
- [Troubleshooting](#troubleshooting)

## User Guide

### Accessing Theme Settings

1. Navigate to **Settings** from the bottom navigation or desktop menu
2. In the **Appearance** section, click on **App Theme**
3. A modal will open with theme customization options

### Theme Options

#### Brightness Modes

- **☀️ Light**: Always use light mode regardless of system preference
- **🌙 Dark**: Always use dark mode regardless of system preference
- **🖥️ System**: Follow your device's system theme preference (automatic)

#### Color Schemes

The app offers 8 distinct color schemes:

1. **Default** - Classic indigo theme
2. **Ocean** - Blue terminal vibes
3. **Forest** - Green terminal energy
4. **Sunset** - Orange terminal warmth
5. **Purple** - Mystical terminal magic
6. **Rose** - Pink terminal elegance
7. **Emerald** - Fresh terminal mint
8. **Amber** - Golden terminal glow

### Applying Themes

1. Select your preferred **brightness mode** (Light/Dark/System)
2. Choose your desired **color scheme** from the grid
3. Preview your selection in the preview section
4. Click **Apply Theme** to save your changes
5. The theme will be applied immediately and saved for future sessions

### Theme Persistence

- Your theme preferences are automatically saved to browser storage
- Themes persist across browser sessions and page reloads
- System theme mode will automatically switch when your OS theme changes

## Developer Guide

### Core Components

#### ThemeSelector Component
- **Location**: `src/components/ThemeSelector.tsx`
- **Purpose**: Provides the UI for theme selection
- **Props**:
  - `currentTheme`: Current theme mode
  - `currentColorScheme`: Current color scheme
  - `onThemeChange`: Callback for theme changes

#### ThemeProvider Context
- **Location**: `src/contexts/ThemeProvider.tsx`
- **Purpose**: Applies themes to the document
- **Features**:
  - Handles hydration-safe theme application
  - Listens for system theme changes
  - Manages CSS variable application

#### Settings Context
- **Location**: `src/contexts/SettingsContext.tsx`
- **Purpose**: Manages theme settings persistence
- **Features**:
  - Uses functional state updates to prevent race conditions
  - Persists settings to localStorage
  - Provides theme and colorScheme state

### Theme Utilities

#### Core Functions
- **Location**: `src/utils/themes.ts`

```typescript
// Apply theme to document
applyTheme(scheme: ColorScheme, mode: ThemeMode): void

// Generate CSS variables for a theme
generateThemeVariables(scheme: ColorScheme, mode: ThemeMode): Record<string, string>

// Get preview colors for UI
getThemePreview(scheme: ColorScheme): { primary: string; secondary: string; accent: string }
```

#### Color Palettes
All color schemes are defined in `colorPalettes` object with consistent structure:

```typescript
interface ColorPalette {
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
  };
}
```

### Integration

#### Adding New Color Schemes

1. Add new scheme to `colorPalettes` in `src/utils/themes.ts`:

```typescript
newScheme: {
  name: 'New Scheme',
  description: 'Description here',
  colors: {
    primary: 'hsl(xxx, xx%, xx%)',
    // ... other colors
  }
}
```

2. Add the scheme to the `ColorScheme` type in `src/types/index.ts`

3. The scheme will automatically appear in the theme selector

#### Using Themes in Components

Themes use CSS custom properties that are automatically applied:

```css
.my-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}
```

Use Tailwind's theme-aware classes:

```jsx
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground">
    Primary Button
  </button>
</div>
```

## Architecture

### Theme Application Flow

```
User Selection → ThemeSelector → SettingsContext → ThemeProvider → Document
     ↓              ↓              ↓               ↓           ↓
  Modal UI    → onThemeChange → updateSetting → applyTheme → CSS Variables
```

### State Management

1. **Settings Context**: Manages theme preferences and persistence
2. **Theme Provider**: Applies themes to the document
3. **Client Wrapper**: Connects settings to theme provider safely

### Hydration Strategy

The system uses a multi-layered approach to prevent hydration mismatches:

1. **Initial Script**: Sets theme from localStorage before React hydration
2. **Client Wrapper**: Only applies React-managed themes after mounting
3. **Theme Provider**: Waits for component mount before theme application

### CSS Variable System

Themes work by dynamically setting CSS custom properties:

```css
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 271 81% 56%;
  /* ... other variables */
}
```

These are consumed by Tailwind's theme configuration and custom CSS.

## Color Schemes

### Design Philosophy

Each color scheme is inspired by terminal aesthetics and designed for both accessibility and visual appeal:

- **High contrast ratios** for readability
- **Consistent color relationships** across light/dark modes
- **Terminal-inspired palettes** for developer appeal
- **Professional appearance** suitable for educational apps

### Color Scheme Details

| Scheme | Primary | Description | Use Case |
|--------|---------|-------------|----------|
| Default | Indigo | Classic, professional | General use, business |
| Ocean | Blue | Calming, trustworthy | Focus, concentration |
| Forest | Green | Natural, growth-oriented | Progress, learning |
| Sunset | Orange | Warm, energetic | Creativity, enthusiasm |
| Purple | Purple | Creative, mystical | Artistic, imaginative |
| Rose | Pink | Gentle, elegant | Comfortable, friendly |
| Emerald | Teal | Fresh, modern | Innovation, clarity |
| Amber | Yellow | Bright, optimistic | Energy, positivity |

### Accessibility

All themes maintain WCAG AA compliance:
- **Contrast ratios** of at least 4.5:1 for normal text
- **Contrast ratios** of at least 3:1 for large text
- **Color-blind friendly** palette choices
- **Focus indicators** visible in all themes

## Implementation Details

### File Structure

```
src/
├── components/
│   └── ThemeSelector.tsx      # Theme selection UI
├── contexts/
│   ├── SettingsContext.tsx    # Settings management
│   └── ThemeProvider.tsx      # Theme application
├── utils/
│   └── themes.ts              # Theme utilities & palettes
└── types/
    └── index.ts               # Theme-related types
```

### Type Definitions

```typescript
type ThemeMode = 'light' | 'dark' | 'system';

type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' |
                   'purple' | 'rose' | 'emerald' | 'amber';

interface AppSettings {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  // ... other settings
}
```

### Local Storage Schema

```json
{
  "doshi_sensei_settings": {
    "theme": "dark",
    "colorScheme": "purple",
    "showRomaji": true,
    "dailyGoal": 10,
    "practiceReminders": false
  }
}
```

### Browser Compatibility

- **Modern browsers**: Full support (Chrome 80+, Firefox 75+, Safari 13+)
- **CSS Custom Properties**: Required for theme system
- **Local Storage**: Required for persistence
- **Prefers-color-scheme**: Enhanced system theme detection

## Troubleshooting

### Common Issues

#### Theme Not Applying
**Symptoms**: Theme selection doesn't change appearance
**Causes**:
- CSS custom properties not supported
- JavaScript disabled
- Local storage restrictions

**Solutions**:
1. Check browser console for errors
2. Verify CSS custom properties support
3. Clear local storage and try again
4. Ensure JavaScript is enabled

#### Theme Reverting on Reload
**Symptoms**: Theme resets to default after page refresh
**Causes**:
- Local storage disabled/full
- Incognito/private browsing mode
- Browser storage restrictions

**Solutions**:
1. Check local storage permissions
2. Verify storage quota availability
3. Test in normal browsing mode
4. Clear browser data and retry

#### System Theme Not Working
**Symptoms**: System mode doesn't follow OS preference
**Causes**:
- Browser doesn't support `prefers-color-scheme`
- OS doesn't have theme preference set
- Media query not working

**Solutions**:
1. Update to modern browser version
2. Check OS theme settings
3. Test with manual light/dark selection
4. Verify media query support

#### Race Condition Issues
**Symptoms**: Theme flickers or applies incorrectly
**Causes**:
- Multiple rapid theme changes
- State update conflicts
- Component re-rendering issues

**Solutions**:
1. Implemented functional state updates
2. Added proper dependency arrays
3. Debounced rapid changes
4. Fixed component mounting logic

### Debug Mode

To enable theme debugging, temporarily add console logs:

```typescript
// In applyTheme function
console.log('Theme applied:', { scheme, mode, variables });

// In ThemeProvider
console.log('Theme provider update:', { theme, colorScheme });
```

### Performance Considerations

- **CSS Variable Updates**: Minimal performance impact
- **Component Re-renders**: Optimized with React.memo where needed
- **Local Storage**: Synchronous but fast for small data
- **System Theme Detection**: Uses native media queries for efficiency

### Testing Theme System

#### Manual Testing Checklist

1. **Theme Selection**:
   - [ ] Can select light/dark/system modes
   - [ ] Can select all 8 color schemes
   - [ ] Apply button works correctly
   - [ ] Cancel button discards changes
   - [ ] Reset button restores current settings

2. **Theme Application**:
   - [ ] Themes apply immediately
   - [ ] All UI elements update correctly
   - [ ] CSS variables are set properly
   - [ ] No visual glitches during transition

3. **Persistence**:
   - [ ] Themes persist across page reloads
   - [ ] Themes persist across browser sessions
   - [ ] System theme follows OS changes
   - [ ] Settings save to local storage

4. **Accessibility**:
   - [ ] All themes meet contrast requirements
   - [ ] Focus indicators visible in all themes
   - [ ] Text remains readable in all combinations
   - [ ] Color-blind users can distinguish elements

#### Automated Testing

```typescript
// Example test for theme application
test('applies dark theme correctly', () => {
  applyTheme('default', 'dark');

  const root = document.documentElement;
  expect(root.classList.contains('dark')).toBe(true);
  expect(root.style.getPropertyValue('--background')).toBe('222.2 84% 4.9%');
});
```

## Future Enhancements

### Planned Features

1. **Custom Color Schemes**: Allow users to create their own palettes
2. **High Contrast Mode**: Enhanced accessibility option
3. **Animation Preferences**: Respect `prefers-reduced-motion`
4. **Import/Export Themes**: Share theme configurations
5. **Theme Scheduling**: Automatic theme switching by time

### Technical Improvements

1. **CSS-in-JS Integration**: Consider styled-components for complex themes
2. **Theme Transitions**: Smooth animations between theme changes
3. **Performance Optimization**: Lazy loading of color schemes
4. **Advanced Color Management**: Support for P3 color gamut

---

## Conclusion

The Doshi Sensei theme system provides a robust, accessible, and user-friendly way to customize the application's appearance. With proper implementation of modern web standards and careful attention to user experience, it enhances the overall usability of the Japanese learning platform.

For additional support or questions about the theme system, please refer to the troubleshooting section or contact the development team.
