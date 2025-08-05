// Test script to apply Vercel theme
// Run this in the browser console when the app is running

// Apply Vercel theme in dark mode
function applyVercelDarkTheme() {
  const root = document.documentElement;
  
  // Add dark class
  root.classList.remove('light');
  root.classList.add('dark');
  
  // Apply Vercel theme CSS variables for dark mode
  const vercelDarkVars = {
    '--background': '0 0% 0%', // Pure black
    '--foreground': '0 0% 100%', // Pure white
    '--card': '0 0% 4%', // Slightly lighter than pure black
    '--card-foreground': '0 0% 100%',
    '--popover': '0 0% 4%',
    '--popover-foreground': '0 0% 100%',
    '--primary': '0 0% 9%', // Very dark gray (not harsh white)
    '--primary-foreground': '0 0% 100%', // White text on dark
    '--secondary': '0 0% 9%', // Near black
    '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 15%', // Dark gray
    '--muted-foreground': '0 0% 60%', // Medium gray
    '--accent': '0 0% 15%', // Dark gray accent
    '--accent-foreground': '0 0% 100%',
    '--destructive': '0 84% 60%', // Red for errors
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 15%', // Dark gray borders
    '--input': '0 0% 9%', // Near black inputs
    '--ring': '0 0% 40%', // Subtle gray focus ring
  };
  
  Object.entries(vercelDarkVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  root.setAttribute('data-color-scheme', 'vercel');
  console.log('✅ Vercel dark theme applied');
}

// Apply Vercel theme in light mode
function applyVercelLightTheme() {
  const root = document.documentElement;
  
  // Add light class
  root.classList.remove('dark');
  root.classList.add('light');
  
  // Apply Vercel theme CSS variables for light mode
  const vercelLightVars = {
    '--background': '0 0% 100%', // Pure white
    '--foreground': '0 0% 0%', // Pure black
    '--card': '0 0% 98%', // Slightly off-white for cards
    '--card-foreground': '0 0% 0%',
    '--popover': '0 0% 98%',
    '--popover-foreground': '0 0% 0%',
    '--primary': '0 0% 0%', // Black as primary
    '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 96%', // Light gray
    '--secondary-foreground': '0 0% 0%',
    '--muted': '0 0% 96%', // Light gray
    '--muted-foreground': '0 0% 40%', // Dark gray
    '--accent': '0 0% 96%', // Light gray accent
    '--accent-foreground': '0 0% 0%',
    '--destructive': '0 84% 60%', // Red for errors
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 90%', // Light gray borders
    '--input': '0 0% 95%', // Near white inputs
    '--ring': '0 0% 0%', // Black focus ring
  };
  
  Object.entries(vercelLightVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  root.setAttribute('data-color-scheme', 'vercel');
  console.log('✅ Vercel light theme applied');
}

// Toggle between light and dark Vercel theme
function toggleVercelTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    applyVercelLightTheme();
  } else {
    applyVercelDarkTheme();
  }
}

// Instructions
console.log(`
🎨 Vercel Theme Test Script
===========================

Run these commands to test the Vercel theme:

1. Apply Vercel Dark Theme (pitch black):
   applyVercelDarkTheme()

2. Apply Vercel Light Theme (pure white):
   applyVercelLightTheme()

3. Toggle between light/dark:
   toggleVercelTheme()

The theme will be applied immediately to see how the app looks with Vercel's color scheme.
`);

// Export functions for use in console
window.applyVercelDarkTheme = applyVercelDarkTheme;
window.applyVercelLightTheme = applyVercelLightTheme;
window.toggleVercelTheme = toggleVercelTheme;