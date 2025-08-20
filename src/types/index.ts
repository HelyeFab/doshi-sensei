// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export type ColorScheme = 
  | 'default' 
  | 'ocean' 
  | 'forest' 
  | 'sunset' 
  | 'purple' 
  | 'rose' 
  | 'emerald' 
  | 'amber' 
  | 'vercel' 
  | 'acnh' 
  | 'zelda' 
  | 'mario';

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

export interface AppSettings {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  language: 'en' | 'ja';
  fontSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}