# Settings Page Implementation Plan

## Overview

The Settings page allows users to customize their experience in Doshi Sensei. This document outlines the implementation plan for this feature, which is referenced in the home page but not yet implemented.

## Current Status

The application currently has:
- Home page with navigation to Settings (not implemented)
- Strings configuration with text for Settings features
- No existing settings storage or preference management

## Feature Requirements

Based on the MVP prompt and existing strings configuration, the Settings page should include:

1. Theme toggle (Dark/Light mode)
2. Display language options
3. Romaji display toggle
4. Daily goal setting
5. Practice reminder toggle
6. Reset progress option
7. About information and version

## Implementation Phases

### Phase 1: Basic Settings Page Setup

1. Create the settings page component:
   ```
   src/app/settings/page.tsx
   ```

2. Implement basic layout with:
   - Header with back navigation
   - Settings categories
   - Individual setting controls

3. Add routing from home page to settings page

### Phase 2: Settings State Management

1. Create a settings context and provider:
   ```
   src/contexts/SettingsContext.tsx
   ```

2. Implement local storage persistence for settings:
   ```
   src/utils/storage.ts
   ```

3. Define default settings and types:
   ```typescript
   // Add to src/types/index.ts
   export interface AppSettings {
     theme: 'dark' | 'light' | 'system';
     language: 'en' | 'ja';
     showRomaji: boolean;
     dailyGoal: number;
     practiceReminders: boolean;
   }
   ```

4. Create hooks for accessing and updating settings:
   ```
   src/hooks/useSettings.ts
   ```

### Phase 3: Theme Implementation

1. Implement theme switching functionality:
   - Create theme provider component
   - Add CSS variables for theme colors
   - Implement system theme detection

2. Update existing components to use theme variables

3. Add smooth transitions between themes

### Phase 4: User Preferences

1. Implement language switching:
   - Create language files for supported languages
   - Add language selection UI
   - Implement language context provider

2. Add Romaji display toggle:
   - Update components to conditionally show/hide Romaji
   - Persist preference across sessions

3. Implement daily goal setting:
   - Create number input or slider component
   - Add validation
   - Connect to progress tracking

### Phase 5: Data Management

1. Implement progress tracking:
   - Store practice and drill history
   - Calculate statistics (words learned, accuracy, etc.)
   - Display progress toward daily goal

2. Add reset progress functionality:
   - Create confirmation dialog
   - Implement data clearing
   - Reset statistics

### Phase 6: About Section and Polish

1. Create About section:
   - App version information
   - Credits and acknowledgments
   - Links to resources

2. Add final UI polish:
   - Animations for interactions
   - Responsive design improvements
   - Accessibility enhancements

## Technical Implementation Details

### Data Flow

1. User changes a setting
2. Setting is updated in context
3. Setting is persisted to local storage
4. Components react to setting changes
5. UI updates to reflect new settings

### Component Structure

```
src/app/settings/
├── page.tsx                  # Main settings page
├── components/
│   ├── ThemeSelector.tsx     # Theme selection control
│   ├── LanguageSelector.tsx  # Language selection dropdown
│   ├── DailyGoalSetting.tsx  # Goal setting control
│   ├── ToggleSetting.tsx     # Generic toggle setting component
│   ├── ResetProgress.tsx     # Reset progress button with confirmation
│   └── AboutSection.tsx      # About information display
```

### Settings Context

```typescript
// src/contexts/SettingsContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings } from '@/types';
import { loadSettings, saveSettings } from '@/utils/storage';

const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'en',
  showRomaji: true,
  dailyGoal: 10,
  practiceReminders: false
};

const SettingsContext = createContext<{
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}>({
  settings: defaultSettings,
  updateSetting: () => {},
  resetSettings: () => {}
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const savedSettings = loadSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
```

### Storage Utility

```typescript
// src/utils/storage.ts
import { AppSettings } from '@/types';

const SETTINGS_KEY = 'doshi_sensei_settings';
const PROGRESS_KEY = 'doshi_sensei_progress';

export function loadSettings(): AppSettings | null {
  if (typeof window === 'undefined') return null;

  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch (error) {
    console.error('Error clearing progress:', error);
  }
}
```

## Integration with Existing Features

1. Theme integration:
   - Update all existing pages to use theme variables
   - Add theme-aware components

2. Language integration:
   - Replace hardcoded strings with language-aware text
   - Update existing components to support multiple languages

3. Romaji display:
   - Update vocabulary and practice pages to respect Romaji setting
   - Add conditional rendering for Romaji text

## Next Steps

1. Create the basic settings page structure
2. Implement settings context and storage
3. Add theme switching functionality
4. Implement user preferences
5. Add progress tracking and reset functionality
6. Create about section
7. Polish UI and integrate with other features

## Timeline Estimate

- Phase 1: 1 day
- Phase 2: 1-2 days
- Phase 3: 1-2 days
- Phase 4: 1-2 days
- Phase 5: 1-2 days
- Phase 6: 1 day

Total: 6-10 days depending on complexity and polish requirements
