# QuickContext Developer Guide

## Quick Start

QuickContext is already enabled globally in the app via the root layout. This guide covers how to work with it, customize it, and troubleshoot common issues.

## Global Implementation (Already Done)

The feature is globally available through the root layout:

```tsx
// src/app/layout.tsx
import { QuickContextProvider } from '@/components/QuickContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* ... other providers ... */}
        <QuickContextProvider>
          {children}
        </QuickContextProvider>
        {/* ... */}
      </body>
    </html>
  );
}
```

## Making Text Selectable

### Method 1: CSS Classes (Recommended)

Add one of these classes to any element containing Japanese text:

```tsx
// Automatically detected classes
<p className="japanese-text">これは日本語です</p>
<span className="font-ja">漢字</span>
```

### Method 2: Data Attribute

For explicit control:

```tsx
<div data-quickcontext="true">
  任意の日本語テキスト
</div>
```

### Method 3: Custom Implementation

For pages needing special behavior:

```tsx
'use client';

import { QuickContextProvider } from '@/components/QuickContext';

export default function CustomPage() {
  return (
    <QuickContextProvider 
      selector=".my-custom-class"
      enabled={userCanSelect} // Conditional enabling
    >
      <div className="my-custom-class">
        カスタムコンテンツ
      </div>
    </QuickContextProvider>
  );
}
```

## Working with Different Content Types

### Stories & Articles

```tsx
// Already works with existing classes
<article className="prose">
  <p className="font-ja">
    {storyContent}
  </p>
</article>
```

### Vocabulary Lists

```tsx
// In vocabulary components
<div className="vocabulary-item">
  <span className="japanese-text">{word.kanji}</span>
  <span className="japanese-text">{word.kana}</span>
</div>
```

### Dynamic Content

```tsx
// For dynamically loaded content
useEffect(() => {
  // Content is automatically detected after render
  // No special handling needed
}, [content]);
```

## Disabling QuickContext

### For Specific Pages

```tsx
// Wrap with disabled provider
export default function AdminPage() {
  return (
    <QuickContextProvider enabled={false}>
      {/* QuickContext won't work here */}
    </QuickContextProvider>
  );
}
```

### For Specific Elements

```tsx
// Use CSS to prevent selection
<div className="select-none">
  This text cannot be selected
</div>
```

## Customizing Behavior

### Custom Actions

Currently, the actions are fixed, but you can extend them:

```tsx
// In QuickContextBubble.tsx
const handleCustomAction = useCallback(async () => {
  const canUse = await checkAndTrack('quick_context');
  if (!canUse) return;
  
  // Your custom logic here
  track('quick_context_custom', { text: selectedText });
  
  // Custom action implementation
}, [checkAndTrack, track, selectedText]);
```

### Custom Styling

The bubble uses Tailwind classes and can be themed:

```scss
// In your global styles
.quick-context-bubble {
  @apply bg-card border-primary; // Uses theme variables
}
```

## Integration Examples

### With Furigana

```tsx
import { FuriganaText } from '@/components/FuriganaText';

<div className="japanese-text">
  <FuriganaText text="漢字" furigana="かんじ" />
</div>
```

### With Grammar Highlighting

```tsx
<div className="japanese-text">
  <GrammarHighlight text="これは本です">
    {/* QuickContext works on highlighted text */}
  </GrammarHighlight>
</div>
```

### With Lazy-Loaded Content

```tsx
const LazyContent = dynamic(() => import('./JapaneseContent'));

<Suspense fallback={<div>Loading...</div>}>
  <div className="japanese-text">
    <LazyContent />
  </div>
</Suspense>
```

## API Reference

### QuickContextProvider Props

```typescript
interface QuickContextProviderProps {
  children: React.ReactNode;
  enabled?: boolean;  // Default: true
  selector?: string;  // Default: '.japanese-text, .font-ja, [data-quickcontext="true"]'
}
```

### Accessing QuickContext State

```tsx
// Currently internal, but could be exposed
import { useQuickContext } from '@/components/QuickContext/context';

function MyComponent() {
  const { selectedText, isVisible } = useQuickContext();
  // Use state as needed
}
```

## Troubleshooting

### Bubble Not Appearing

1. **Check CSS Classes**: Ensure Japanese text has correct classes
2. **Verify Japanese Characters**: Text must contain actual Japanese characters
3. **Check Provider**: Ensure QuickContextProvider wraps the content
4. **Browser Console**: Look for any errors

```javascript
// Debug in console
localStorage.setItem('quickcontext_debug', 'true');
```

### Position Issues

1. **Z-Index Conflicts**: Bubble renders at z-index 9999
2. **Viewport Issues**: Check if content is in viewport
3. **Parent Overflow**: Ensure no `overflow: hidden` on parents

### Mobile Selection Issues

1. **Touch Events**: Long-press to select on mobile
2. **User-Select CSS**: Ensure `user-select` is not disabled
3. **iOS Specific**: May need `-webkit-user-select: text`

### Entitlement Issues

```tsx
// Check user's remaining uses
const { checkAndTrack, getRemainingUses } = useAccess();

const remaining = await getRemainingUses('quick_context');
console.log(`Remaining uses today: ${remaining}`);
```

## Performance Tips

### 1. Optimize Selectors

```tsx
// Too broad (slower)
<QuickContextProvider selector="*">

// Specific (faster)
<QuickContextProvider selector=".japanese-text">
```

### 2. Lazy Load Heavy Components

```tsx
// Modals are already lazy-loaded
const SaveWordModal = lazy(() => import('@/components/drill/SaveWordModal'));
```

### 3. Prevent Unnecessary Re-renders

```tsx
// Memoize content with Japanese text
const japaneseContent = useMemo(() => (
  <div className="japanese-text">
    {processedText}
  </div>
), [processedText]);
```

## Testing QuickContext

### Manual Testing Checklist

- [ ] Select Japanese text → Bubble appears
- [ ] Select English text → No bubble
- [ ] Click bubble → Expands correctly
- [ ] Test all 4 actions
- [ ] Check entitlement limits
- [ ] Test on mobile devices
- [ ] Verify position near edges

### Automated Testing

```tsx
// Example test
import { render, fireEvent } from '@testing-library/react';

test('QuickContext appears on Japanese text selection', () => {
  const { getByText } = render(
    <QuickContextProvider>
      <p className="japanese-text">テスト</p>
    </QuickContextProvider>
  );
  
  // Simulate text selection
  const text = getByText('テスト');
  fireEvent.mouseUp(text);
  
  // Check bubble appears
  expect(document.querySelector('[aria-label="Expand QuickContext menu"]')).toBeInTheDocument();
});
```

## Common Patterns

### Conditional Features

```tsx
const { userType } = useSubscription2();

// Show different UI based on user type
{userType === 'guest' && (
  <div className="text-muted">
    QuickContext not available for guests
  </div>
)}
```

### Analytics Integration

```tsx
// Track custom events
const { track } = useAnalytics();

track('quick_context_custom_event', {
  text: selectedText,
  source: 'vocabulary_page',
  action: 'custom'
});
```

### Error Handling

```tsx
try {
  await handleQuickContextAction();
} catch (error) {
  console.error('QuickContext error:', error);
  showToast('Action failed. Please try again.', 'error');
}
```

## Best Practices

1. **Always use semantic HTML** for Japanese content
2. **Include proper ARIA labels** for accessibility
3. **Test with different text lengths** (single char, word, sentence)
4. **Consider mobile UX** - touch targets should be large enough
5. **Respect user preferences** - allow disabling if needed
6. **Cache frequently used data** to improve performance
7. **Handle errors gracefully** with user-friendly messages

## Getting Help

- Check the [Architecture Documentation](./architecture.md)
- Review [Entitlements Documentation](./entitlements.md)
- See [Quick Reference](./quick-reference.md)
- File issues with the `quickcontext` label