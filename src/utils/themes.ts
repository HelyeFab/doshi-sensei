import { ColorScheme, ColorPalette, ThemeMode } from '@/types/settings';

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
  },
  vercel: {
    name: 'Vercel',
    description: 'Pitch black minimalism',
    colors: {
      primary: 'hsl(0, 0%, 9%)', // Very dark gray (not harsh white)
      primaryForeground: 'hsl(0, 0%, 100%)', // White text on dark
      secondary: 'hsl(0, 0%, 9%)', // Near black
      secondaryForeground: 'hsl(0, 0%, 100%)', // White on near black
      accent: 'hsl(0, 0%, 15%)', // Dark gray accent
      accentForeground: 'hsl(0, 0%, 100%)', // White on dark gray
      muted: 'hsl(0, 0%, 15%)', // Slightly lighter black
      mutedForeground: 'hsl(0, 0%, 60%)', // Gray text
    }
  },
  acnh: {
    name: 'Animal Crossing',
    description: 'Cozy island vibes',
    colors: {
      primary: 'hsl(132, 52%, 67%)', // Mint green (#81f1a7 adjusted)
      primaryForeground: 'hsl(140, 30%, 15%)', // Dark green text
      secondary: 'hsl(47, 96%, 68%)', // Warm yellow (#fff563 adjusted)
      secondaryForeground: 'hsl(30, 40%, 25%)', // Brown text
      accent: 'hsl(184, 86%, 72%)', // Sky blue (#81f1f7 adjusted)
      accentForeground: 'hsl(180, 40%, 20%)', // Dark teal text
      muted: 'hsl(35, 52%, 85%)', // Beige (#dbbf9e adjusted)
      mutedForeground: 'hsl(30, 25%, 35%)', // Soft brown text
    }
  },
  zelda: {
    name: 'Zelda OoT',
    description: 'Hyrule adventure',
    colors: {
      primary: 'hsl(123, 68%, 48%)', // Kokiri green (#46f04e adjusted for better contrast)
      primaryForeground: 'hsl(0, 0%, 100%)', // White on green
      secondary: 'hsl(45, 100%, 50%)', // Triforce gold
      secondaryForeground: 'hsl(45, 50%, 15%)', // Dark gold text
      accent: 'hsl(200, 60%, 45%)', // Master Sword blue
      accentForeground: 'hsl(0, 0%, 100%)', // White on blue
      muted: 'hsl(80, 30%, 65%)', // Forest sage green
      mutedForeground: 'hsl(80, 30%, 25%)', // Dark forest text
    }
  },
  mario: {
    name: 'Super Mario',
    description: 'Mushroom Kingdom fun',
    colors: {
      primary: 'hsl(355, 99%, 53%)', // Mario red (#FE0002 adjusted)
      primaryForeground: 'hsl(0, 0%, 100%)', // White on red
      secondary: 'hsl(197, 100%, 43%)', // Mario blue (#049CD8)
      secondaryForeground: 'hsl(0, 0%, 100%)', // White on blue
      accent: 'hsl(48, 100%, 50%)', // Coin/star yellow
      accentForeground: 'hsl(30, 50%, 20%)', // Dark brown on yellow
      muted: 'hsl(30, 70%, 85%)', // Toad mushroom beige
      mutedForeground: 'hsl(30, 30%, 30%)', // Brown text
    }
  }
};

// CSS variable generation for themes
export function generateThemeVariables(scheme: ColorScheme, mode: ThemeMode = 'light'): Record<string, string> {
  const palette = colorPalettes[scheme];

  // Fallback to default if scheme not found
  if (!palette) {
    return generateThemeVariables('default', mode);
  }

  if (mode === 'dark') {
    // Special handling for Vercel theme - pure black
    if (scheme === 'vercel') {
      return {
        '--background': 'hsl(0, 0%, 0%)', // Pure black
        '--foreground': 'hsl(0, 0%, 100%)', // Pure white
        '--card': 'hsl(0, 0%, 4%)', // Slightly lighter than pure black
        '--card-foreground': 'hsl(0, 0%, 100%)',
        '--popover': 'hsl(0, 0%, 4%)',
        '--popover-foreground': 'hsl(0, 0%, 100%)',
        '--primary': 'hsl(0, 0%, 9%)', // Very dark gray for primary (not harsh white)
        '--primary-foreground': 'hsl(0, 0%, 100%)', // White text on dark primary
        '--secondary': 'hsl(0, 0%, 9%)', // Near black
        '--secondary-foreground': 'hsl(0, 0%, 100%)',
        '--muted': 'hsl(0, 0%, 15%)', // Dark gray
        '--muted-foreground': 'hsl(0, 0%, 60%)', // Medium gray
        '--accent': 'hsl(0, 0%, 15%)', // Dark gray accent
        '--accent-foreground': 'hsl(0, 0%, 100%)',
        '--destructive': 'hsl(0, 84%, 60%)', // Red for errors
        '--destructive-foreground': 'hsl(0, 0%, 100%)',
        '--border': 'hsl(0, 0%, 15%)', // Dark gray borders
        '--input': 'hsl(0, 0%, 9%)', // Near black inputs
        '--ring': 'hsl(0, 0%, 40%)', // Subtle gray focus ring
      };
    }
    
    // Special handling for gaming themes in dark mode
    if (scheme === 'acnh') {
      return {
        '--background': 'hsl(180, 20%, 12%)', // Dark teal night
        '--foreground': 'hsl(60, 40%, 95%)', // Soft cream text
        '--card': 'hsl(180, 18%, 16%)', // Slightly lighter teal
        '--card-foreground': 'hsl(60, 40%, 95%)',
        '--popover': 'hsl(180, 18%, 16%)',
        '--popover-foreground': 'hsl(60, 40%, 95%)',
        '--primary': palette.colors.primary, // Keep mint green
        '--primary-foreground': palette.colors.primaryForeground,
        '--secondary': 'hsl(47, 76%, 48%)', // Darker yellow for night
        '--secondary-foreground': 'hsl(0, 0%, 100%)',
        '--muted': 'hsl(35, 25%, 25%)', // Dark beige
        '--muted-foreground': 'hsl(35, 20%, 70%)',
        '--accent': 'hsl(184, 60%, 35%)', // Darker sky blue
        '--accent-foreground': 'hsl(0, 0%, 100%)',
        '--destructive': 'hsl(0, 62.8%, 45%)',
        '--destructive-foreground': 'hsl(0, 0%, 100%)',
        '--border': 'hsl(180, 15%, 25%)',
        '--input': 'hsl(180, 18%, 20%)',
        '--ring': palette.colors.primary,
      };
    }
    
    if (scheme === 'zelda') {
      return {
        '--background': 'hsl(80, 25%, 10%)', // Dark forest night
        '--foreground': 'hsl(45, 40%, 90%)', // Soft gold text
        '--card': 'hsl(80, 20%, 14%)', // Slightly lighter forest
        '--card-foreground': 'hsl(45, 40%, 90%)',
        '--popover': 'hsl(80, 20%, 14%)',
        '--popover-foreground': 'hsl(45, 40%, 90%)',
        '--primary': 'hsl(123, 48%, 35%)', // Darker Kokiri green
        '--primary-foreground': 'hsl(0, 0%, 100%)',
        '--secondary': 'hsl(45, 80%, 40%)', // Darker Triforce gold
        '--secondary-foreground': 'hsl(0, 0%, 100%)',
        '--muted': 'hsl(80, 20%, 20%)', // Dark forest
        '--muted-foreground': 'hsl(80, 15%, 65%)',
        '--accent': 'hsl(200, 50%, 30%)', // Darker Master Sword blue
        '--accent-foreground': 'hsl(0, 0%, 100%)',
        '--destructive': 'hsl(0, 62.8%, 45%)',
        '--destructive-foreground': 'hsl(0, 0%, 100%)',
        '--border': 'hsl(80, 15%, 22%)',
        '--input': 'hsl(80, 20%, 18%)',
        '--ring': 'hsl(45, 80%, 50%)', // Gold ring
      };
    }
    
    if (scheme === 'mario') {
      return {
        '--background': 'hsl(220, 30%, 12%)', // Dark underground blue
        '--foreground': 'hsl(0, 0%, 95%)', // White text
        '--card': 'hsl(220, 25%, 16%)', // Slightly lighter underground
        '--card-foreground': 'hsl(0, 0%, 95%)',
        '--popover': 'hsl(220, 25%, 16%)',
        '--popover-foreground': 'hsl(0, 0%, 95%)',
        '--primary': 'hsl(355, 85%, 40%)', // Darker Mario red
        '--primary-foreground': 'hsl(0, 0%, 100%)',
        '--secondary': 'hsl(197, 80%, 35%)', // Darker Mario blue
        '--secondary-foreground': 'hsl(0, 0%, 100%)',
        '--muted': 'hsl(30, 30%, 20%)', // Dark brown
        '--muted-foreground': 'hsl(30, 20%, 70%)',
        '--accent': 'hsl(48, 90%, 40%)', // Darker coin yellow
        '--accent-foreground': 'hsl(0, 0%, 100%)',
        '--destructive': 'hsl(0, 84%, 50%)',
        '--destructive-foreground': 'hsl(0, 0%, 100%)',
        '--border': 'hsl(220, 20%, 22%)',
        '--input': 'hsl(220, 25%, 18%)',
        '--ring': 'hsl(48, 90%, 50%)', // Yellow ring
      };
    }
    
    // Dark theme - use darker variants for other themes
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
  // Special handling for Vercel theme - pure white
  if (scheme === 'vercel') {
    return {
      '--background': 'hsl(0, 0%, 100%)', // Pure white
      '--foreground': 'hsl(0, 0%, 0%)', // Pure black
      '--card': 'hsl(0, 0%, 98%)', // Slightly off-white for cards
      '--card-foreground': 'hsl(0, 0%, 0%)',
      '--popover': 'hsl(0, 0%, 98%)',
      '--popover-foreground': 'hsl(0, 0%, 0%)',
      '--primary': 'hsl(0, 0%, 0%)', // Black as primary
      '--primary-foreground': 'hsl(0, 0%, 100%)',
      '--secondary': 'hsl(0, 0%, 96%)', // Light gray
      '--secondary-foreground': 'hsl(0, 0%, 0%)',
      '--muted': 'hsl(0, 0%, 96%)', // Light gray
      '--muted-foreground': 'hsl(0, 0%, 40%)', // Dark gray
      '--accent': 'hsl(0, 0%, 96%)', // Light gray accent
      '--accent-foreground': 'hsl(0, 0%, 0%)',
      '--destructive': 'hsl(0, 84%, 60%)', // Red for errors
      '--destructive-foreground': 'hsl(0, 0%, 100%)',
      '--border': 'hsl(0, 0%, 90%)', // Light gray borders
      '--input': 'hsl(0, 0%, 95%)', // Near white inputs
      '--ring': 'hsl(0, 0%, 60%)', // Gray focus ring (not harsh black)
    };
  }
  
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
    localStorage.setItem('colorScheme', scheme);
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
    return getThemePreview('default');
  }

  return {
    primary: palette.colors.primary,
    secondary: palette.colors.secondary,
    accent: palette.colors.accent,
  };
}