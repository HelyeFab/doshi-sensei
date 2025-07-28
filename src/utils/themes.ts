import { ColorScheme, ColorPalette, ThemeMode } from '@/types';

// Define color palettes based on terminal color schemes
export const colorPalettes: Record<ColorScheme, ColorPalette> = {
  default: {
    name: 'Default',
    description: 'Classic indigo theme',
    colors: {
      primary: 'hsl(239, 84%, 67%)',
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(210, 40%, 96%)',
      secondaryForeground: 'hsl(222.2, 84%, 4.9%)',
      accent: 'hsl(210, 40%, 96%)',
      accentForeground: 'hsl(222.2, 84%, 4.9%)',
      muted: 'hsl(210, 40%, 96%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  ocean: {
    name: 'Ocean',
    description: 'Blue terminal vibes',
    colors: {
      primary: 'hsl(199, 89%, 48%)', // Terminal blue
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(196, 100%, 95%)',
      secondaryForeground: 'hsl(197, 37%, 24%)',
      accent: 'hsl(189, 94%, 43%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(196, 100%, 95%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  forest: {
    name: 'Forest',
    description: 'Green terminal energy',
    colors: {
      primary: 'hsl(142, 71%, 45%)', // Terminal green
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(138, 76%, 97%)',
      secondaryForeground: 'hsl(140, 100%, 27%)',
      accent: 'hsl(142, 69%, 58%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(138, 76%, 97%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  sunset: {
    name: 'Sunset',
    description: 'Orange terminal warmth',
    colors: {
      primary: 'hsl(25, 95%, 53%)', // Terminal orange
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(25, 100%, 97%)',
      secondaryForeground: 'hsl(20, 14.3%, 4.1%)',
      accent: 'hsl(33, 100%, 52%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(25, 100%, 97%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  purple: {
    name: 'Purple',
    description: 'Mystical terminal magic',
    colors: {
      primary: 'hsl(271, 81%, 56%)', // Terminal purple
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(270, 100%, 98%)',
      secondaryForeground: 'hsl(270, 15%, 9%)',
      accent: 'hsl(262, 83%, 58%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(270, 100%, 98%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  rose: {
    name: 'Rose',
    description: 'Pink terminal elegance',
    colors: {
      primary: 'hsl(330, 81%, 60%)', // Terminal pink
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(330, 100%, 98%)',
      secondaryForeground: 'hsl(330, 15%, 9%)',
      accent: 'hsl(346, 77%, 49%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(330, 100%, 98%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  emerald: {
    name: 'Emerald',
    description: 'Fresh terminal mint',
    colors: {
      primary: 'hsl(158, 64%, 52%)', // Terminal teal/emerald
      primaryForeground: 'hsl(0, 0%, 98%)',
      secondary: 'hsl(151, 100%, 97%)',
      secondaryForeground: 'hsl(151, 80%, 4%)',
      accent: 'hsl(160, 84%, 39%)',
      accentForeground: 'hsl(0, 0%, 98%)',
      muted: 'hsl(151, 100%, 97%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
    }
  },
  amber: {
    name: 'Amber',
    description: 'Golden terminal glow',
    colors: {
      primary: 'hsl(48, 96%, 53%)', // Terminal yellow/amber
      primaryForeground: 'hsl(26, 83%, 14%)',
      secondary: 'hsl(48, 100%, 96%)',
      secondaryForeground: 'hsl(45, 92%, 8%)',
      accent: 'hsl(45, 93%, 47%)',
      accentForeground: 'hsl(26, 83%, 14%)',
      muted: 'hsl(48, 100%, 96%)',
      mutedForeground: 'hsl(45, 7%, 45%)',
    }
  }
};

// CSS variable generation for themes
export function generateThemeVariables(scheme: ColorScheme, mode: ThemeMode = 'light'): Record<string, string> {
  const palette = colorPalettes[scheme];

  // Fallback to default if scheme not found
  if (!palette) {
    console.warn(`Color scheme '${scheme}' not found, falling back to 'default'`);
    return generateThemeVariables('default', mode);
  }

  if (mode === 'dark') {
    // Dark theme - use darker variants
    return {
      '--background': 'hsl(214, 25%, 22%)', // #2E3440
      '--foreground': 'hsl(210, 40%, 98%)',
      '--card': 'hsl(216, 19%, 28%)', // Slightly lighter than background for cards
      '--card-foreground': 'hsl(210, 40%, 98%)',
      '--popover': 'hsl(216, 19%, 28%)', // Same as card
      '--popover-foreground': 'hsl(210, 40%, 98%)',
      '--primary': palette.colors.primary,
      '--primary-foreground': palette.colors.primaryForeground,
      '--secondary': 'hsl(216, 19%, 16%)', // Darker variant for secondary
      '--secondary-foreground': 'hsl(210, 40%, 98%)',
      '--muted': 'hsl(216, 19%, 18%)', // Slightly darker for muted elements
      '--muted-foreground': 'hsl(215, 20.2%, 65.1%)',
      '--accent': 'hsl(216, 19%, 25%)', // Subtle accent
      '--accent-foreground': 'hsl(210, 40%, 98%)',
      '--destructive': 'hsl(0, 62.8%, 30.6%)',
      '--destructive-foreground': 'hsl(210, 40%, 98%)',
      '--border': 'hsl(216, 16%, 18%)', // Subtle borders
      '--input': 'hsl(216, 19%, 25%)', // Input fields slightly visible
      '--ring': palette.colors.primary,
    };
  }

  // Light theme variants
  return {
    '--background': 'hsl(210, 20%, 98%)',
    '--foreground': 'hsl(222.2, 84%, 4.9%)',
    '--card': 'hsl(0, 0%, 100%)',
    '--card-foreground': 'hsl(222.2, 84%, 4.9%)',
    '--popover': 'hsl(0, 0%, 100%)',
    '--popover-foreground': 'hsl(222.2, 84%, 4.9%)',
    '--primary': palette.colors.primary,
    '--primary-foreground': palette.colors.primaryForeground,
    '--secondary': palette.colors.secondary,
    '--secondary-foreground': palette.colors.secondaryForeground,
    '--muted': palette.colors.muted,
    '--muted-foreground': palette.colors.mutedForeground,
    '--accent': palette.colors.accent,
    '--accent-foreground': palette.colors.accentForeground,
    '--destructive': 'hsl(0, 84.2%, 60.2%)',
    '--destructive-foreground': 'hsl(210, 40%, 98%)',
    '--border': 'hsl(214.3, 31.8%, 91.4%)',
    '--input': 'hsl(214.3, 31.8%, 91.4%)',
    '--ring': palette.colors.primary,
  };
}

// Apply theme to document
export function applyTheme(scheme: ColorScheme, mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const effectiveMode = mode === 'system' ? systemTheme : mode;
  
  // Remove existing theme classes
  root.classList.remove('dark', 'light');
  root.classList.add(effectiveMode);
  
  // Save to localStorage for the blocking script
  try {
    localStorage.setItem('theme', effectiveMode);
  } catch (e) {
    // Fail silently if localStorage is not available
  }
  
  // Apply all CSS variables
  const variables = generateThemeVariables(scheme, effectiveMode);
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Store current scheme in data attribute for CSS targeting if needed
  root.setAttribute('data-color-scheme', scheme);
}

// Get theme preview colors for UI
export function getThemePreview(scheme: ColorScheme): { primary: string; secondary: string; accent: string } {
  const palette = colorPalettes[scheme];

  // Fallback to default if scheme not found
  if (!palette) {
    console.warn(`Color scheme '${scheme}' not found for preview, falling back to 'default'`);
    return getThemePreview('default');
  }

  return {
    primary: palette.colors.primary,
    secondary: palette.colors.secondary,
    accent: palette.colors.accent,
  };
}

export default { colorPalettes, generateThemeVariables, applyTheme, getThemePreview };
