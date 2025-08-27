/**
 * Theme initialization script that runs before React hydrates
 * This prevents the white flash when using dark theme
 */

export default function ThemeInitScript() {
  // This script will be injected and executed immediately, blocking render
  const themeScript = `
    (function() {
      try {
        // Get saved preferences from localStorage
        const storedTheme = localStorage.getItem('theme');
        const storedColorScheme = localStorage.getItem('colorScheme');
        const settingsStr = localStorage.getItem('appSettings');
        
        let theme = storedTheme;
        let colorScheme = storedColorScheme || 'default';
        
        // Try to get theme from settings object if available
        if (settingsStr) {
          try {
            const settings = JSON.parse(settingsStr);
            theme = theme || settings.theme;
            colorScheme = settings.colorScheme || colorScheme;
          } catch (e) {}
        }
        
        // Determine effective theme
        let effectiveTheme = theme;
        if (!effectiveTheme || effectiveTheme === 'system') {
          effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        // Apply theme class immediately to prevent flash
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(effectiveTheme);
        
        // Store the color scheme as data attribute for CSS to use
        document.documentElement.setAttribute('data-color-scheme', colorScheme);
        
        // Add a class to indicate theme has been initialized
        document.documentElement.classList.add('theme-initialized');
      } catch (e) {
        // If anything fails, default to light theme to prevent white flash
        document.documentElement.classList.add('light');
      }
    })();
  `.trim();

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}