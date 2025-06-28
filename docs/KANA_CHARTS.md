# Kana Charts Implementation

## Overview
The Kana Charts feature allows users to study Hiragana and Katakana characters through interactive charts with audio support. This feature is integrated into the Practice page as a separate tab.

## Features

### 1. Interactive Character Selection
- Click any character to select/deselect it for study
- No limit on the number of characters that can be selected
- Selection persists across sessions using localStorage
- Visual indicators show which characters are selected

### 2. Audio Support
- Each character has a speaker icon for Text-to-Speech playback
- Uses the existing TTS system with ElevenLabs/Google fallback
- Audio plays the Japanese pronunciation of the character

### 3. Study Modes
- **Hiragana Study**: Practice hiragana characters only
- **Katakana Study**: Practice katakana characters only
- **Both**: Practice both scripts in the same session

### 4. Chart Organization
- **Basic Characters**: Standard 46 characters organized by row (a, ka, sa, etc.)
- **Digraphs (Yōon)**: Combined characters (kya, sha, etc.)
- Special handling for irregular rows (ya, wa, n)

### 5. Study Modal
- Flashcard-style practice for selected characters
- Shows character and asks for romaji
- Tracks correct/incorrect answers
- Progress bar shows completion status

## File Structure

```
src/
├── data/
│   └── kanaData.ts          # Complete hiragana/katakana data
├── components/
│   └── kana/
│       ├── KanaChart.tsx    # Chart display component
│       └── KanaStudyModal.tsx # Study session modal
└── app/
    └── practice/
        └── page.tsx         # Updated with kana tab
```

## Data Structure

```typescript
interface KanaCharacter {
  id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  type: 'vowel' | 'consonant' | 'y-consonant' | 'digraph';
  row: string;
  column: string;
  pronunciation?: string; // Special pronunciation notes
}
```

## Usage

1. Navigate to Practice page
2. Click "Kana Charts" tab
3. Select Hiragana or Katakana chart
4. Click characters to select them
5. Choose study mode and click "Start Study"
6. Practice recognizing characters in the study modal

## Theme Integration

The components follow the app's theme system:
- Uses existing color scheme variables
- Responsive design for mobile/desktop
- Consistent with kanji browser UI patterns
- Dark mode compatible

## Future Enhancements

- Add stroke order animations
- Include handwriting practice
- Add more detailed pronunciation guides
- Create preset selections (e.g., "First 10 hiragana")
- Add statistics tracking for kana practice