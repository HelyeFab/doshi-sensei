# QuickContext Feature Documentation

## Overview
QuickContext is a smart, context-aware learning assistant that appears when users select Japanese text anywhere in the app. It provides instant access to save words, lookup definitions, listen to pronunciation, and get AI explanations.

## Features
- **Smart Text Selection**: Automatically detects Japanese text selection
- **Floating Bubble UI**: Custom Doshi Sensei themed floating interface
- **Save to Lists**: Intelligently saves words/kanji/sentences to appropriate lists
- **Dictionary Lookup**: Opens Jisho.org for detailed definitions
- **TTS Integration**: Uses app's cached TTS system for pronunciation
- **AI Explanations**: Powered by existing AI explanation modal

## Entitlements
- **Guest Users**: 0 uses per day (no access)
- **Free Users**: 10 uses per day
- **Premium Users**: Unlimited

## How to Use

### 1. Add to Any Page with Japanese Text

```tsx
import { QuickContextProvider } from '@/components/QuickContext';

export default function YourPage() {
  return (
    <QuickContextProvider>
      <div className="japanese-text">
        今日は良い天気ですね。
      </div>
    </QuickContextProvider>
  );
}
```

### 2. Enable on Specific Elements

```tsx
// Option 1: Use the default selectors (automatically works with .japanese-text, .font-ja)
<QuickContextProvider>
  <p className="font-ja">日本語のテキスト</p>
</QuickContextProvider>

// Option 2: Custom selector
<QuickContextProvider selector=".my-custom-class">
  <p className="my-custom-class">日本語のテキスト</p>
</QuickContextProvider>

// Option 3: Data attribute
<QuickContextProvider>
  <p data-quickcontext="true">日本語のテキスト</p>
</QuickContextProvider>
```

### 3. Disable for Certain Pages

```tsx
<QuickContextProvider enabled={false}>
  {/* QuickContext won't work here */}
</QuickContextProvider>
```

## User Experience

1. **Select Text**: User selects any Japanese text
2. **Bubble Appears**: Small Doshi mascot bubble appears near selection
3. **Tap to Expand**: Clicking bubble shows action menu
4. **Choose Action**:
   - Save: Add to study lists
   - Lookup: Open dictionary
   - Listen: Hear pronunciation
   - AI: Get contextual explanation

## Technical Details

### Components
- `QuickContextProvider`: Handles text selection detection
- `QuickContextBubble`: The floating UI component
- Integration with existing systems:
  - `SaveWordModal` for list management
  - `AIExplanationModal` for AI features
  - `useTTS` hook for pronunciation

### Three-Pillar Architecture Integration
✅ **Feature Registry**: Added as 'quick_context'
✅ **Entitlement Rules**: Guest: 0, Free: 10, Premium: -1
✅ **Permission Map**: Mapped to 'quick_context' permission

## Example Pages to Add QuickContext

1. **Stories** (`/stories`)
2. **Articles** (`/news`)
3. **Textbook Vocabulary** (`/tools/textbook-vocabulary`)
4. **Kanji Browser** (`/kanji-browser`)
5. **Any Reading Material**

## Future Enhancements
- History of selected words
- Custom actions per page type
- Offline support
- Batch operations