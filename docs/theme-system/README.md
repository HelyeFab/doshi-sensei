# Theme System Documentation

This folder contains comprehensive documentation for the Doshi Sensei theme system - a sophisticated color scheme management system that provides 8 terminal-inspired themes with light/dark mode support.

## 🎯 Overview

The theme system provides a comprehensive color scheme management solution with 8 terminal-inspired themes, light/dark mode support, and WCAG AA accessibility compliance.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Theme         │    │   CSS Variables │    │   React         │
│   Selection     │    │   System        │    │   Integration   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • 8 Themes      │    │ • HSL Values    │    │ • Context       │
│ • Light/Dark    │    │ • Dynamic Props │    │ • Provider      │
│ • System Auto   │    │ • Tailwind      │    │ • Hooks         │
│ • Persistence   │    │ • Custom CSS    │    │ • Components    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↓                       ↓                       ↓
         └───────────────────────┴───────────────────────┘
                                    ↓
                    ┌────────────────────────────┐
                    │   THEME SYSTEM            │
                    │   /src/components/theme/  │
                    ├────────────────────────────┤
                    │ • 8 Color Schemes         │
                    │ • Accessibility Compliant │
                    │ • Performance Optimized   │
                    │ • Developer Friendly      │
                    └────────────────────────────┘
```

## 📚 Documentation Index

### Core Implementation
- **[01_THEME_ARCHITECTURE.md](./01_THEME_ARCHITECTURE.md)** - Complete theme system architecture and implementation

## 🎨 Available Themes

### 1. **Default Theme**
- **Light**: Clean, professional appearance
- **Dark**: High contrast dark mode
- **Use Case**: Standard application theme

### 2. **Ocean Theme**
- **Light**: Blue-tinted light mode
- **Dark**: Deep ocean dark mode
- **Use Case**: Calming, focused environment

### 3. **Forest Theme**
- **Light**: Green-tinted natural appearance
- **Dark**: Deep forest dark mode
- **Use Case**: Nature-inspired learning

### 4. **Sunset Theme**
- **Light**: Warm orange/red tones
- **Dark**: Rich sunset dark mode
- **Use Case**: Evening study sessions

### 5. **Purple Theme**
- **Light**: Elegant purple accents
- **Dark**: Royal purple dark mode
- **Use Case**: Premium, sophisticated feel

### 6. **Rose Theme**
- **Light**: Soft pink/rose tones
- **Dark**: Deep rose dark mode
- **Use Case**: Gentle, welcoming environment

### 7. **Emerald Theme**
- **Light**: Vibrant green accents
- **Dark**: Rich emerald dark mode
- **Use Case**: Energetic, growth-focused

### 8. **Amber Theme**
- **Light**: Warm amber/yellow tones
- **Dark**: Deep amber dark mode
- **Use Case**: Creative, inspiring environment

## 🚀 Quick Start

### Basic Theme Usage
```typescript
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useTheme } from '@/hooks/useTheme';

function App() {
  return (
    <ThemeProvider>
      <YourAppContent />
    </ThemeProvider>
  );
}

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-background text-foreground">
      <button onClick={() => setTheme('ocean')}>
        Switch to Ocean Theme
      </button>
    </div>
  );
}
```

### Theme-Aware Components
```typescript
// Use theme-aware Tailwind classes
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Primary Button
  </button>
</div>

// Use CSS custom properties
<div style={{
  backgroundColor: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))'
}}>
  Custom styled content
</div>
```

### Theme Selection
```typescript
import { ThemeSelector } from '@/components/theme/ThemeSelector';

function SettingsPage() {
  return (
    <div>
      <h2>Choose Your Theme</h2>
      <ThemeSelector />
    </div>
  );
}
```

## 📁 Key Files in Codebase

### Core Theme Components
- `/src/components/theme/ThemeProvider.tsx` - Main theme provider
- `/src/components/theme/ThemeSelector.tsx` - Theme selection interface
- `/src/components/theme/ClientThemeWrapper.tsx` - Client-side wrapper

### Theme Configuration
- `/src/lib/themes.ts` - Theme definitions and color schemes
- `/src/styles/globals.css` - CSS variable definitions
- `/tailwind.config.js` - Tailwind theme integration

### Hooks and Utilities
- `/src/hooks/useTheme.ts` - Theme management hook
- `/src/contexts/ThemeContext.tsx` - Theme context provider
- `/src/utils/theme.ts` - Theme utility functions

## 🎨 Color Scheme Architecture

### CSS Variable System
```css
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 271 81% 56%;
  --primary-foreground: 0 0% 100%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 271 81% 56%;
  --radius: 0.5rem;
}
```

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

## ♿ Accessibility Features

### WCAG AA Compliance
- **High Contrast Ratios**: All themes meet WCAG AA standards
- **Color Independence**: Information not conveyed by color alone
- **Focus Indicators**: Clear focus indicators for keyboard navigation
- **Reduced Motion**: Respects user's motion preferences

### Color Contrast
```typescript
// Example contrast ratios (all themes meet AA standards)
const contrastRatios = {
  'text-on-background': 4.5,    // WCAG AA requirement
  'text-on-primary': 4.5,       // WCAG AA requirement
  'text-on-secondary': 4.5,     // WCAG AA requirement
  'focus-indicator': 3.0        // WCAG AA requirement
};
```

## ⚡ Performance Optimization

### Hydration Strategy
The system uses a multi-layered approach to prevent hydration mismatches:

1. **Initial Script**: Sets theme from localStorage before React hydration
2. **Client Wrapper**: Only applies React-managed themes after mounting
3. **Theme Provider**: Waits for component mount before theme application

### CSS Variable Performance
- **Hardware Acceleration**: CSS variables are GPU-accelerated
- **Minimal Reflows**: Theme changes don't trigger layout recalculations
- **Efficient Updates**: Only changed variables are updated

## 🔧 Developer Guide

### Creating Custom Themes
```typescript
// Define a new theme
const customTheme: Theme = {
  name: 'custom',
  label: 'Custom Theme',
  light: {
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    primary: '271 81% 56%',
    // ... other colors
  },
  dark: {
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    primary: '271 81% 56%',
    // ... other colors
  }
};

// Register the theme
registerTheme(customTheme);
```

### Theme-Aware Styling
```typescript
// Use theme-aware classes
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground">
    Themed Button
  </button>
</div>

// Use CSS custom properties
const themedStyle = {
  backgroundColor: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  borderColor: 'hsl(var(--border))'
};
```

### Theme Detection
```typescript
// Detect system theme preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Listen for theme changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (theme === 'system') {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
```

## 📱 User Experience

### Theme Selection Interface
- **Visual Preview**: See theme colors before applying
- **Quick Switching**: One-click theme changes
- **System Integration**: Automatic system theme detection
- **Persistence**: Remembered across sessions

### Theme Transitions
- **Smooth Animations**: CSS transitions for theme changes
- **Instant Feedback**: Immediate visual feedback
- **No Flickering**: Proper hydration prevents flash
- **Performance**: Optimized for smooth transitions

## 🔍 Troubleshooting

### Common Issues

#### 1. Theme Not Applying
**Cause**: Hydration mismatch or CSS variable issues
**Solution**: Check ClientThemeWrapper and CSS variable definitions

#### 2. Flash of Unstyled Content
**Cause**: Theme not set before React hydration
**Solution**: Ensure initial script runs before React

#### 3. Theme Not Persisting
**Cause**: Storage issues or context problems
**Solution**: Check SettingsContext and localStorage

#### 4. Accessibility Issues
**Cause**: Insufficient contrast ratios
**Solution**: Verify all themes meet WCAG AA standards

### Debug Tools
```typescript
// Enable theme debugging
localStorage.setItem('theme_debug', 'true');

// Check current theme
console.log('Current theme:', document.documentElement.getAttribute('data-theme'));

// Check CSS variables
console.log('Background color:', getComputedStyle(document.documentElement)
  .getPropertyValue('--background'));
```

## 🔮 Future Enhancements

### Planned Features
1. **Custom Theme Builder**: User-created themes
2. **Theme Sharing**: Share themes between users
3. **Advanced Color Picker**: HSL color picker for customization
4. **Theme Presets**: Pre-built theme collections
5. **Animation Themes**: Different transition styles

### Technical Improvements
1. **CSS-in-JS Integration**: Better theme management
2. **Theme Validation**: Automatic contrast checking
3. **Performance Monitoring**: Theme change performance tracking
4. **Advanced Accessibility**: Enhanced screen reader support
5. **Theme Analytics**: Track theme usage and preferences

---

**Last Updated**: January 2025
**Status**: ✅ Fully Implemented and Production Ready
**Accessibility**: WCAG AA compliant with high contrast ratios
**Performance**: Optimized for smooth transitions and minimal reflows
