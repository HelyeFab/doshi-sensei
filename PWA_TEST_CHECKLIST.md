# PWA Test Checklist for Doshi Sensei

## 🚀 Installation & Setup

### Desktop (Chrome/Edge)
- [ ] Install prompt appears after 3+ page interactions
- [ ] Install prompt doesn't appear during onboarding
- [ ] Install button in address bar works
- [ ] App installs successfully
- [ ] Desktop shortcut created
- [ ] App opens in standalone window
- [ ] App icon shows correctly in taskbar

### Mobile Android
- [ ] Install prompt appears after engagement
- [ ] "Add to Home Screen" banner works
- [ ] App installs with correct icon
- [ ] Splash screen displays on launch
- [ ] Status bar matches theme color

### iOS (Safari)
- [ ] Manual install guide appears for iOS users
- [ ] "Add to Home Screen" works from share menu
- [ ] All splash screens display correctly
- [ ] Status bar style applies correctly
- [ ] App opens fullscreen without Safari UI

## 🔄 Update Mechanism

- [ ] Service worker registers on first visit
- [ ] Updates detected on subsequent visits
- [ ] Update banner appears (not repeatedly)
- [ ] "Update" button refreshes to new version
- [ ] No aggressive auto-updates during use
- [ ] Version changes reflected after update

## 📱 PWA Features

### Manifest
- [ ] App name displays correctly
- [ ] Theme color applies to browser UI
- [ ] Background color shows during load
- [ ] Icons load at all sizes
- [ ] Screenshots display in install dialog
- [ ] Shortcuts work after installation
- [ ] Description shows in app stores

### Share Target
- [ ] App appears in share menu (after install)
- [ ] Can receive shared text
- [ ] Can receive shared URLs
- [ ] Japanese text handled correctly
- [ ] YouTube URLs route to shadowing tool

### File Handling
- [ ] .txt files open in app
- [ ] .csv vocabulary imports work
- [ ] .json data imports correctly
- [ ] File associations registered

### Protocol Handler
- [ ] web+doshisensei:// links work
- [ ] Deep links route correctly
- [ ] Parameters passed properly

## 🌐 Offline Functionality

- [ ] App loads when offline (cached pages)
- [ ] Offline page displays for uncached routes
- [ ] Static assets load from cache
- [ ] Images cached and display offline
- [ ] Fonts load from cache
- [ ] Failed API calls queue for retry
- [ ] Queue syncs when back online

## ⚡ Performance

### Loading
- [ ] Initial load under 3 seconds (3G)
- [ ] Subsequent loads under 1 second
- [ ] No layout shifts during load
- [ ] Fonts don't cause text flash
- [ ] Images lazy load properly

### Caching
- [ ] Static assets cached (CSS, JS)
- [ ] Images cached with proper strategy
- [ ] API responses cached appropriately
- [ ] Cache size stays reasonable
- [ ] Old caches cleaned up

### Navigation
- [ ] Back/forward buttons work
- [ ] Deep links work correctly
- [ ] No duplicate history entries
- [ ] Smooth transitions between pages

## 🎨 UI/UX

### Responsive Design
- [ ] Works on all screen sizes
- [ ] Touch targets 44x44px minimum
- [ ] Text readable without zoom
- [ ] Viewport configured correctly
- [ ] Orientation changes handled

### Native Features
- [ ] Status bar styled correctly
- [ ] No browser UI in standalone
- [ ] Pull-to-refresh works (if applicable)
- [ ] System fonts used appropriately
- [ ] Safe areas respected (notches)

## 🔒 Security

- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] No mixed content warnings
- [ ] Secure cookies only
- [ ] API keys not exposed

## 📊 Analytics & Monitoring

- [ ] Install events tracked
- [ ] Update events logged
- [ ] Offline usage monitored
- [ ] Performance metrics captured
- [ ] Error tracking works

## 🌍 Cross-Browser Testing

### Chrome (Desktop & Mobile)
- [ ] All PWA features work
- [ ] Install process smooth
- [ ] Updates work correctly

### Edge (Desktop)
- [ ] Install from address bar
- [ ] Runs in standalone window
- [ ] All features functional

### Safari (iOS)
- [ ] Add to Home Screen works
- [ ] Splash screens display
- [ ] Standalone mode works
- [ ] iOS-specific features work

### Firefox (Desktop & Mobile)
- [ ] Basic PWA features work
- [ ] Service worker functions
- [ ] Offline mode works

### Samsung Internet
- [ ] Install process works
- [ ] PWA features functional
- [ ] Ambient badge shows

## 🐛 Edge Cases

- [ ] Works with ad blockers
- [ ] Functions with JS disabled gracefully
- [ ] Handles slow/flaky connections
- [ ] Manages storage quota limits
- [ ] Recovers from service worker errors
- [ ] Handles browser back after install
- [ ] Works in private/incognito mode limitations

## ✅ Testing Steps

1. **Fresh Install Test**
   - Clear all data (cache, cookies, storage)
   - Visit site as new user
   - Complete onboarding
   - Interact with 3+ pages
   - Install when prompted
   - Verify all features work

2. **Update Test**
   - Install current version
   - Deploy new version
   - Visit app again
   - Verify update detected
   - Apply update
   - Confirm new version active

3. **Offline Test**
   - Load app online
   - Navigate several pages
   - Go offline (airplane mode)
   - Try navigating
   - Test cached vs uncached pages
   - Go online and verify sync

4. **Cross-Device Test**
   - Test on real devices when possible
   - Use BrowserStack/Sauce Labs for others
   - Test on slow connections (3G throttle)
   - Verify on different OS versions

## 📝 Known Issues

1. **iOS Limitations**
   - No automatic install prompts
   - No push notifications (yet)
   - Limited service worker support
   - Manual install required

2. **Firefox Limitations**
   - No install prompts on desktop
   - Limited PWA support
   - Service workers work but limited

3. **Current Implementation**
   - [x] Fixed duplicate notification handlers
   - [x] Fixed update loop issue
   - [x] Added iOS support
   - [x] Implemented offline queue
   - [x] Added share target
   - [x] Added file handlers
   - [x] Added protocol handler
   - [x] Generated real screenshots
   - [x] Created proper icons

## 🎯 Success Criteria

- Install rate > 10% of engaged users
- Update adoption > 90% within 24 hours  
- Offline usage > 5% of sessions
- Performance score > 90 (Lighthouse)
- Zero critical bugs in production
- Positive user feedback on PWA experience

## 📅 Testing Schedule

- **Pre-deployment**: Full checklist
- **Post-deployment**: Smoke tests
- **Weekly**: Performance monitoring
- **Monthly**: Cross-browser verification
- **Quarterly**: Full regression testing

---

Last Updated: January 2025
Version: 1.0.0