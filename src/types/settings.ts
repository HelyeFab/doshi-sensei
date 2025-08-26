// Theme and Color types
export type ThemeMode = 'dark' | 'light' | 'system';
export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'purple' | 'rose' | 'emerald' | 'amber' | 'vercel' | 'acnh' | 'zelda' | 'mario';

export interface ColorPalette {
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

// Companion History for Virtual Companion
export interface CompanionHistory {
  recentCharacters: string[];
  lastShownDate?: string;
}

// Navigation preferences
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string;
}

export interface NavigationPreferences {
  customNavItems: string[]; // Array of nav item IDs (excluding home)
  useCustomNavigation: boolean;
}

// TTS Settings
export interface TTSSettings {
  provider?: 'elevenlabs' | 'google' | 'auto';
  voice?: 'default' | 'male' | 'female';
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

// App Settings
export interface AppSettings {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  practiceReminders: boolean;
  showCompanion: boolean; // Toggle to show/hide virtual companion
  companionHistory: CompanionHistory;
  navigationPreferences?: NavigationPreferences; // Optional for backward compatibility
  ttsSettings?: TTSSettings; // TTS configuration
  navigationGestures?: boolean; // Enable/disable swipe navigation gestures
}