# PWA Testing Guide for Doshi Sensei

## Testing the Splash Screen

### Method 1: Install the PWA Locally

1. **Build and serve the production version:**
   ```bash
   npm run build
   npm run start
   ```

2. **Open in Chrome:**
   - Go to `http://localhost:3000`
   - Click the install icon in the address bar (or three dots menu > "Install Doshi Sensei")
   - Accept the installation

3. **Launch the installed app:**
   - Find "Doshi Sensei" in your applications
   - Launch it to see the splash screen

### Method 2: Chrome DevTools (Faster for Testing)

1. **Open Chrome DevTools** (F12)
2. Go to **Application** tab
3. Click on **Manifest** in the left sidebar
4. You'll see a preview of your app's icons and colors
5. Click **"Add to homescreen"** button to simulate installation

### Method 3: Mobile Testing

1. **Use ngrok or similar to expose localhost:**
   ```bash
   npx ngrok http 3000
   ```

2. **Open the ngrok URL on your phone**
3. **Add to home screen:**
   - Android: Chrome menu > "Add to Home screen"
   - iOS: Share button > "Add to Home Screen"

## Testing Install Prompts

### Chrome DevTools Method:

1. Open **Chrome DevTools** > **Application** tab
2. Go to **Service Workers** section
3. Check **"Bypass for network"** during development
4. In **Application** > **Storage**, click **"Clear site data"**
5. Reload the page
6. The install prompt should appear (if conditions are met)

### Force Show Install Prompt:

Add this temporary button to test:

```jsx
// Add temporarily to any component
<button onClick={() => {
  localStorage.removeItem('pwa-prompt-last-shown');
  window.location.reload();
}}>
  Reset PWA Install Prompt
</button>
```

## Current Splash Screen

Currently, your splash screen shows:
- Background color: `#ffffff` (white)
- Theme color: `#6366f1` (indigo)
- App icon: `/doshi.png`
- App name: "Doshi Sensei"

## Debugging Tips

1. **Check if Service Worker is registered:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))
   ```

2. **Check PWA install state:**
   ```javascript
   window.matchMedia('(display-mode: standalone)').matches
   ```

3. **View manifest in DevTools:**
   - Application tab > Manifest
   - Shows all manifest properties and warnings

## Quick Test Checklist

- [ ] Service worker registered
- [ ] HTTPS enabled (or localhost)
- [ ] Valid manifest.json
- [ ] Icons properly sized
- [ ] Offline page works
- [ ] Install prompt appears