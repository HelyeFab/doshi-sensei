# QuickContext Feature Documentation

## Overview

QuickContext is an intelligent, context-aware learning assistant that appears whenever users select Japanese text anywhere in the Doshi Sensei app. It provides instant access to essential learning tools through a non-intrusive floating bubble interface.

## Key Features

### 🎯 Smart Text Selection Detection
- Automatically detects when Japanese text is selected
- Works on any page in the app through global provider
- Intelligent kanji/word/sentence recognition
- Seamless integration with existing content

### 💬 Floating Bubble Interface
- Minimalist design with Doshi mascot icon
- Expands on tap to reveal action menu
- Smart positioning to avoid screen edges
- Smooth animations with Framer Motion

### 🛠 Integrated Learning Tools

#### 1. **Save to Lists** (📚)
- Intelligently categorizes content (kanji, words, sentences)
- Integrates with existing SaveWordModal
- Respects user's list limits
- Tracks saves for analytics

#### 2. **Dictionary Lookup** (🔍)
- Navigates to internal vocabulary page
- Pre-fills search with selected text
- No external dependencies
- Works offline with cached data

#### 3. **Text-to-Speech** (🔊)
- Uses app's cached TTS system
- Multiple voice options
- High-priority playback
- Visual feedback during playback

#### 4. **AI Explanation** (🤖)
- Reuses existing AIExplanationModal
- Context-aware explanations
- Considers surrounding text
- Grammar and usage insights

## User Experience Flow

1. **Select Text**: User highlights any Japanese text on the page
2. **Bubble Appears**: Small Doshi mascot bubble appears near selection
3. **Tap to Expand**: Clicking bubble shows the action menu
4. **Choose Action**: User selects from save/lookup/listen/AI options
5. **Seamless Interaction**: Action completes without leaving current page

## Three-Pillar Architecture Integration

QuickContext is fully integrated with Doshi Sensei's Three-Pillar Architecture:

### Feature Registry
- Feature ID: `quick_context`
- Category: `learning`
- Status: `active`
- Limit Type: `daily`

### Entitlements
| User Type | Daily Limit | Access Level |
|-----------|------------|--------------|
| Guest | 0 | No access |
| Free | 10 | Limited daily uses |
| Premium Monthly | Unlimited | Full access |
| Premium Yearly | Unlimited | Full access |

### Permissions
- Free users have `quick_context` permission
- Tracked through `useAccess` hook
- Automatic limit enforcement

## Technical Highlights

### Global Availability
```tsx
// Added to root layout.tsx
<QuickContextProvider>
  {children}
</QuickContextProvider>
```

### Automatic Detection
Works on elements with:
- `.japanese-text` class
- `.font-ja` class
- `data-quickcontext="true"` attribute

### Performance Optimized
- Lazy-loaded components
- Efficient event listeners
- Portal rendering for bubble
- Minimal re-renders

## Analytics Integration

QuickContext tracks all user interactions:
- `quick_context_save`: Word saved to list
- `quick_context_lookup`: Dictionary lookup
- `quick_context_tts`: Text-to-speech used
- `quick_context_ai`: AI explanation requested

## Accessibility

- Keyboard navigation support
- ARIA labels on all interactive elements
- Screen reader compatible
- High contrast mode support

## Security

- No external API calls for dictionary
- Respects user privacy
- Entitlement checks prevent abuse
- Rate limiting through daily limits

## Future Enhancements

- [ ] History of selected words
- [ ] Custom actions per page type
- [ ] Offline AI explanations
- [ ] Batch operations
- [ ] Keyboard shortcuts
- [ ] Export selected words

## Related Documentation

- [Architecture Details](./architecture.md)
- [Developer Guide](./developer-guide.md)
- [Entitlements System](./entitlements.md)
- [Quick Reference](./quick-reference.md)

## Support

For questions or issues related to QuickContext, please check:
1. The [troubleshooting guide](./troubleshooting.md)
2. The [developer guide](./developer-guide.md)
3. File an issue in the project repository