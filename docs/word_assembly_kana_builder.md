# 馃 Feature Implementation Plan: Word Assembly Challenge (Kana Builder)

This feature challenges users to build the correct kana spelling of a word they hear, helping with long vowel distinctions, small kana combinations, and general orthographic awareness in Japanese.

---

## 馃幆 Goal

To train users to accurately recall and construct kanji sequences by listening and assembling the word from shuffled fragments.

---

## 馃И Phase 1: Word Model Structure

Each quiz item is based on:
- A target word (kanji)
- Audio pronunciation
- Correct kana segments
- A mix of distractors

### 馃搫 Example JSON Object

```json
{
  "word": "銇嶃倗銇�",
  "audioUrl": "/audio/kyou.mp3",
  "correctKana": ["銇嶃倗", "銇�"],
  "distractors": ["銇�", "銈堛亞", "銇嶃倛"]
}
```

---

## 馃攰 Phase 2: Audio Setup

- Play word on load
- Re-play on user request
- TTS options: Edge-TTS or Web Speech API (client-side fallback)

---

## 馃攧 Phase 3: Game UI Layout

```
+--------------------------+
| 馃棧锔� "銇嶃倗銇�" (play icon)    |
+--------------------------+

[ 銇� ]   [ 銈堛亞 ]   [ 銇� ]   [ 銇嶃倗 ]   鈫� draggable options

[ ___ ] + [ ___ ]                     鈫� answer slots

[ SUBMIT ] [ SHUFFLE ] [ HINT ]
```

- Use `react-beautiful-dnd` or `framer-motion` for drag and drop
- Show check feedback (鉁� / 鉁�)

---

## 馃 Phase 4: Logic and Validation

- When user submits:
  - Join selected kana
  - Compare to correct answer
  - Store attempt data to local stats (correct/incorrect, timestamp)

### 馃搳 Sample Stats Storage

```js
{
  "銇嶃倗銇�": { attempts: 4, correct: 3, lastSeen: "2025-06-25" }
}
```

---

## 馃З Phase 5: Distractor Generation Strategy

Use dynamic distractors:
- Break down correct kanji into components
- Include common confusions (e.g. 銈堛亞 vs. 銈囥亞)
- Pull from same JLPT level

Distractor types:
- Single kanji units (銇�, 銈�)
- Misleading kanji clusters (銈堛亞, 銇娿亞)
- Random irrelevant kana (later stage)

---

## 馃洜 Phase 6: Settings Integration

- 馃帤 Show furigana under each piece (for beginners)
- 馃攬 Auto-play audio toggle
- 馃挕 Show hint after 1 failed attempt (optional)

---

## 馃攼 Phase 7: Freemium Support

| Feature          | Free Users | Premium Users |
|------------------|------------|----------------|
| Daily games      | 3          | Unlimited      |
| Hints            | 鉂�         | 鉁�              |
| Score tracking   | Local only | Cloud sync     |

Use Firebase counters or local IndexedDB logic to enforce limits.

---

## 馃巵 Bonus Features (Future)

- 馃幃 Daily streak rewards
- 馃尭 Themed kana sets (based on mood boards)
- 馃З Hard mode: show only audio, no visual kana at first

---

## 馃И Phase 8: Testing

- Unit test: input match, distractor uniqueness
- UI test: drag & drop reordering
- Audio test: fallback vs. Edge-TTS
- Accessibility: Tab nav + screen reader for audio

---

## 馃Ъ Final Notes

- Optimize kanji rendering for clarity and spacing
- Use animation to enhance success/failure feedback
- Keep session summary at the end with 鈥淭ry Again鈥� flow

---

## 鉁� Ready for Build

Let me know if you'd like:
- 鉁� JSON generator for quiz dataset
- 鉁� UI component starter
- 鉁� Firebase sync rules
