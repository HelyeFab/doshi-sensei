/**
 * Theme initialization script that runs before React hydrates
 * This prevents the white flash when using dark theme
 */

export default function ThemeInitScript() {
  // This script will be injected and executed immediately
  const themeScript = `
    (function() {
      try {
        // Get theme from localStorage
        const storedTheme = localStorage.getItem('theme');
        const storedColorScheme = localStorage.getItem('colorScheme');
        
        // Apply theme class immediately
        if (storedTheme) {
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(storedTheme);
        } else {
          // Default to system preference
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          document.documentElement.classList.add(systemTheme);
        }
        
        // Apply color scheme if available
        if (storedColorScheme) {
          // This is a simplified version - you might need to apply actual CSS variables here
          document.documentElement.setAttribute('data-color-scheme', storedColorScheme);
        }
      } catch (e) {
        // Fail silently if localStorage is not available
        console.error('Theme init error:', e);
      }
    })();
  `.trim();

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      // This ensures the script runs immediately, blocking render
    />
  );
}