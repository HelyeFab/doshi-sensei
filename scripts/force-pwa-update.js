#!/usr/bin/env node

/**
 * Force PWA Update Script
 * Run this in the browser console to force clear all caches and update the PWA
 */

console.log(`
===========================================
    FORCE PWA UPDATE - RED PANDA ICONS
===========================================

Copy and run this code in your browser console:

(async () => {
  console.log('🧹 Starting PWA cache cleanup...');
  
  // 1. Unregister all service workers
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (let registration of registrations) {
    await registration.unregister();
    console.log('✅ Unregistered service worker');
  }
  
  // 2. Clear all caches
  const cacheNames = await caches.keys();
  for (let name of cacheNames) {
    await caches.delete(name);
    console.log('✅ Deleted cache:', name);
  }
  
  // 3. Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Cleared local and session storage');
  
  // 4. For installed PWAs, prompt to reinstall
  console.log('');
  console.log('🔄 Next steps:');
  console.log('1. If this is an installed PWA, uninstall it from your device');
  console.log('2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
  console.log('3. Reinstall the PWA when prompted');
  console.log('');
  console.log('🎉 The red panda icon should now appear!');
})();

===========================================

Alternative steps for different platforms:

📱 ANDROID:
1. Open Chrome
2. Go to chrome://settings/content/all
3. Find doshisensei.com
4. Click "Clear & reset"
5. Long-press the PWA icon on home screen
6. Uninstall the app
7. Visit doshisensei.com and reinstall

🍎 iOS:
1. Delete the PWA from home screen
2. Clear Safari cache (Settings > Safari > Clear History and Website Data)
3. Visit doshisensei.com
4. Add to Home Screen again

💻 DESKTOP CHROME:
1. Visit chrome://apps
2. Right-click Doshi Sensei
3. Remove from Chrome
4. Visit doshisensei.com
5. Click install icon in address bar

🦊 FIREFOX:
1. Visit about:preferences#privacy
2. Clear Site Data for doshisensei.com
3. Reinstall the PWA

`);