
# 🎧 Feature Implementation Plan: "Tap What You Hear" – Listening Quiz

This feature enables users to test their recognition of saved Japanese vocabulary by listening to a word and selecting the correct written form from four options.

---

## 📌 Overview

- **User Flow**: From any saved list, play a word’s audio → present 4 options (1 correct, 3 distractors) → check the answer.
- **Technologies**: Next.js (frontend), IndexedDB (data), Edge-TTS or Web TTS (audio), optional Firebase (tracking for premium users).

---

## 🔄 Phase 1: UI & Navigation

### 🧱 Tasks

- Add a new **"Listening Mode"** entry point on the Drill and Vocabulary List pages.
- Create a page or modal called `/quiz/listening`.
- Display:
  - Character avatar
  - Playback control (auto or tap-to-play)
  - 4 vocabulary cards
  - Check button + Feedback

---

## 📄 Phase 2: Quiz Logic

### 🧠 Core Logic

- Load list from IndexedDB (user’s saved list).
- Randomly pick 1 word as the correct answer.
- Randomly pick 3 distractors that:
  - Are not equal to the correct word
  - Come from similar JLPT level or same list

### 🧪 Sample Object Structure

```js
{
  question: {
    id: "123abc",
    word: "恋人",
    reading: "こいびと",
    meaning: "lover"
  },
  options: [
    { id: "123abc", word: "恋人" },   // correct
    { id: "456def", word: "三連休" },
    { id: "789ghi", word: "海外旅行" },
    { id: "101jkl", word: "湿度" }
  ]
}
```

---

## 🔊 Phase 3: Audio System

### 🔧 Options

- **Preferred**: Edge-TTS (local server or API route calling Edge-TTS Python)
- **Fallback**: Browser `SpeechSynthesisUtterance`

### 🎯 Playback Strategy

- On load → auto play once
- Tap word icon → replay
- Voice: Japanese female/male (customizable later)

---

## 🧩 Phase 4: Answer Check

### ✔️ Logic

- Compare selected answer to `question.id`
- Show green/red feedback immediately
- Track score for session (e.g. 3/5 correct)

### 📊 Save to Local Stats

Store a mini scorecard for each word:

```js
{
  "恋人": { correct: 3, incorrect: 2, lastSeen: "2025-06-25" }
}
```

---

## ⚙️ Phase 5: Settings Integration

- Add toggle in Settings to:
  - Show furigana during quiz
  - Show English translation under option (for beginners)
  - Mute audio by default (for accessibility testing)

---

## 🔐 Phase 6: Freemium Limits

| User Type | Limits |
|-----------|--------|
| Guest     | 3 listening quizzes/day |
| Free      | 3 listening quizzes/day |
| Premium   | Unlimited access + stats cloud sync |

Uses the Three-Pillar Architecture with `checkAndTrack('listening_quiz')` for automatic limit enforcement.

---

## 🌸 Bonus Features (Future)

- Mood-based voice styles (based on companion mood)
- Spaced repetition (auto-review incorrects)
- Daily streak counter with rewards

---

## 🧼 Final Cleanup

- Ensure quiz mode works on mobile and offline
- Add transitions or feedback animations
- Run accessibility checks (keyboard + screen reader)

---

## 🧪 Testing

- Unit test quiz logic and distractor generation
- E2E test flow: load → audio → answer → feedback
- Ensure offline mode fallback for TTS

---

## ✅ Done!

Let me know when you want:

- ✅ UI wireframes
- ✅ Sample JSON quizzes
- ✅ Firebase rule updates
