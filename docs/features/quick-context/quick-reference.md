# QuickContext Quick Reference

## At a Glance

**What**: Context-aware floating assistant for Japanese text  
**Where**: Globally available via root layout  
**Who**: Free users (10/day), Premium (unlimited), Guests (no access)  
**How**: Select Japanese text → Bubble appears → Choose action  

## File Locations

```
src/
├── components/
│   └── QuickContext/
│       ├── index.ts                    # Exports
│       ├── QuickContextProvider.tsx    # Selection detection
│       ├── QuickContextBubble.tsx      # Floating UI
│       └── README.md                   # Component docs
├── lib/
│   ├── features/
│   │   ├── registry.ts                # Feature: 'quick_context'
│   │   └── permission-map.ts          # Permission mapping
│   └── entitlements/
│       └── rules.ts                   # Limits: guest:0, free:10, premium:-1
└── app/
    └── layout.tsx                     # Global provider integration
```

## Quick Commands

### Enable on Elements

```tsx
// Method 1: CSS Classes
<p className="japanese-text">日本語</p>
<span className="font-ja">漢字</span>

// Method 2: Data Attribute
<div data-quickcontext="true">テキスト</div>

// Method 3: Custom Selector
<QuickContextProvider selector=".my-class">
```

### Disable QuickContext

```tsx
// For entire page
<QuickContextProvider enabled={false}>

// For specific element
<div className="select-none">
```

## Entitlements Quick Check

| User | Daily Limit | Code Check |
|------|------------|------------|
| Guest | 0 | `quick_context: 0` |
| Free | 10 | `quick_context: 10` |
| Premium | ∞ | `quick_context: -1` |

## Component Props

### QuickContextProvider
```typescript
interface Props {
  children: React.ReactNode;
  enabled?: boolean;   // default: true
  selector?: string;   // default: '.japanese-text, .font-ja, [data-quickcontext="true"]'
}
```

### QuickContextBubble (Internal)
```typescript
interface Props {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  surroundingContext?: string;
  isKanji?: boolean;
}
```

## Actions & Integrations

| Action | Icon | Integration | Navigation |
|--------|------|-------------|------------|
| Save | 📚 | `SaveWordModal` | Modal overlay |
| Lookup | 🔍 | Vocabulary page | `/vocabulary?search=...` |
| Listen | 🔊 | `useTTS` hook | In-place audio |
| AI | 🤖 | `AIExplanationModal` | Modal overlay |

## Analytics Events

```typescript
// Tracked events
'quick_context_save'    // Word saved
'quick_context_lookup'  // Dictionary opened
'quick_context_tts'     // Audio played
'quick_context_ai'      // AI explanation
```

## CSS Classes Used

```scss
// Bubble states
.quick-context-bubble     // Main container
.w-12 h-12               // Collapsed size
.w-72                    // Expanded width

// Z-index
z-index: 9999            // Above everything

// Animation
framer-motion            // All animations
```

## Debug Mode

```javascript
// Enable debug logging
localStorage.setItem('quickcontext_debug', 'true');

// Check user's remaining uses
const { getRemainingUses } = useAccess();
const remaining = await getRemainingUses('quick_context');
console.log(`Uses left: ${remaining}`);

// Force refresh entitlements
window.location.reload();
```

## Common Issues & Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| No bubble | Classes correct? | Add `.japanese-text` |
| Wrong position | Z-index conflict? | Check parent overflow |
| Can't select | CSS `user-select`? | Remove `select-none` |
| Limit hit | Check usage | Wait for midnight reset |
| Not working | Provider wrapped? | Check layout.tsx |

## Testing Checklist

- [ ] Japanese text selection → bubble appears
- [ ] English text selection → no bubble
- [ ] Bubble click → expands menu
- [ ] Save action → opens modal
- [ ] Lookup → navigates to vocabulary
- [ ] Listen → plays audio
- [ ] AI → shows explanation
- [ ] Guest user → no access message
- [ ] Free user at limit → upgrade modal
- [ ] Premium user → unlimited uses

## Useful Snippets

### Check Feature Status
```typescript
const isEnabled = featureRegistry['quick_context'].status === 'active';
```

### Get User's Limit
```typescript
const { userType } = useSubscription2();
const limits = await getUserLimitsAsync(userType);
const dailyLimit = limits.daily.quick_context; // 0, 10, or -1
```

### Track Custom Event
```typescript
const { track } = useAnalytics();
track('quick_context_custom', { 
  text: selectedText,
  customData: value 
});
```

### Manual Bubble Trigger
```typescript
// Not recommended, but possible
const event = new CustomEvent('quickcontext:show', {
  detail: { text: '日本語', position: { x: 100, y: 100 } }
});
window.dispatchEvent(event);
```

## Performance Tips

1. **Selector Specificity**: More specific = faster
2. **Lazy Load**: Modals already lazy-loaded
3. **Debounce**: Selection events debounced
4. **Cache**: TTS audio is cached
5. **Portal**: Renders outside React tree

## Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Mobile Safari 14+ ✅
- Chrome Android 90+ ✅

## Related Docs

- [Full README](./README.md) - Complete overview
- [Architecture](./architecture.md) - Technical details
- [Developer Guide](./developer-guide.md) - Implementation
- [Entitlements](./entitlements.md) - Access control

## Quick Contact

- **Feature Owner**: QuickContext Team
- **Slack Channel**: #quickcontext
- **Issue Label**: `quickcontext`
- **Priority Support**: Premium users only