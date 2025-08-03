# 🧠 Kanji & Vocabulary Learning Sessions Architecture (`superpowers-compliant`)

> ⚠️ This is designed to be compliant with your **per-feature usage tracking**, **notification engine**, and **achievement system**.  
> It uses **active recall**, **contextual learning**, **multisensory input**, and **deliberate spaced repetition**.

---

## 🧩 Feature Overview: `word_learning_session`

### 🎯 Goal:
Allow learners to:
- Learn 40–60 new kanji/vocab from a lesson
- Practice using sentence contexts
- Use audio-visual matching
- Review with active recall (gap-fills)
- Be *reminded* and *rewarded* via existing systems

---

## 🧱 Architecture Breakdown

### 1. **Feature Registry**

**File**: `/src/lib/features/registry.ts`
```ts
'word_learning_session': {
  id: 'word_learning_session',
  name: 'Word Learning Session',
  description: 'Multimodal session for learning new words',
  category: 'learning',
  icon: '🧠',
  limitType: 'daily',
  requiresAuth: true,
  requiresSubscription: false,
  status: 'active'
}
```

---

### 2. **Entitlement Rules**

**File**: `/src/lib/entitlements/rules.ts`
```ts
daily: {
  word_learning_session: 1,
}
```

> ⚠️ Default to `1/day` for free users. Premium: `-1` (unlimited)

---

### 3. **Permissions Mapping**

**File**: `/src/lib/access/index.ts`
```ts
const permissionMap: Record<string, string> = {
  'word_learning_session': 'do_learning_sessions',
};
```

---

## 🧠 Learning Session Flow

Each session is divided into 3 Superpowered Phases:

---

### 🚀 Phase 1: **Exposure + Contextualization**

| Type | Details |
|------|---------|
| 🎧 Audio Input | Hear word pronounced (TTS or native) |
| 💬 Word Card | Word (kana+kanji), translation, part of speech |
| 📘 Context Sentence | e.g. 「毎朝、新聞（しんぶん）を読みます。」 |
| 💡 Visual Aid | Optional image/icon |
| ✏️ Prompt | “Say it aloud”, “Try shadowing this sentence” |

✅ **`trackProgress('word_learning_session')`**

---

### 🎮 Phase 2: **Recognition via Multimodal Game**

- 🔊 **Audio Matching**  
  *"Which word did you hear?"*  
  → One correct audio + 3 distractors

- 🧩 **Fill-in-the-Blank**  
  *「毎朝、＿＿を読みます。」*

- 📷 **Image Association (optional)**  
  *"Click the image for 辞書（じしょ）"*

✅ Triggers **micro-recall** → reinforces neural links  
✅ Tracked via **usage + achievements**

---

### 🧠 Phase 3: **Active Recall Drill**

| Type | Prompt |
|------|--------|
| 🗣️ Show English → “Recall the Japanese” |
| ✍️ Show Sentence → Fill the gap |
| 📊 Confidence Rating → Self-grade |

> Optional: Let user "star" words they still struggle with (→ saved to `study_later` list)

---

## 🔁 Post-Session Review & Spaced Repetition

### 🔔 Notifications
Set via Firebase Scheduled Function:
```ts
Daily at 9AM:  
“Time to review yesterday’s 50 words?”  
→ `/reviews?sessionId=XYZ`
```

### 🔄 Auto-Generation of Review
Saved in IndexedDB or Firebase:
```json
{
  sessionId: "abc123",
  reviewedOn: "2025-08-03",
  words: [...],
  weakWords: [...],
  score: 84
}
```

---

## 🏆 Achievement Hooks

Plug into your achievement system:
```ts
trackProgress('word_learning_session'); // triggers:
- 🥇 "First Session Complete"
- 🔥 "7-Day Streak"
- 📚 "500 Words Learned"
```

---

## ⚙️ Developer Implementation Checklist

| Task | File/Feature |
|------|--------------|
| ✅ Register feature | `registry.ts` |
| ✅ Set user limits | `rules.ts` |
| ✅ Track usage | `checkAndTrack()` |
| ✅ Add progress tracking | `trackProgress()` |
| ✅ Achievement & review support | `useAchievements`, `useReviewEngine` |
| ✅ Notification scheduling | `functions/notifications.ts` |
| ✅ Data persistence | Local: IndexedDB or Firebase Firestore |
| ✅ Sentence content support | Tatoeba, BunPro API, or local Genki JSON |
| ✅ Audio | `edge-tts`, ElevenLabs, or native recordings |

---

## 🧩 Reusability and Modularity

- Can plug in **any word source** (Minna, Genki, custom vocab, even N5 kanji)
- Session system accepts a `wordSet` object:
```ts
{
  id: "genki-I-lesson-5",
  name: "Genki I – Lesson 5",
  type: "vocabulary" | "kanji",
  words: [
    { kanji: "新聞", kana: "しんぶん", meaning: "newspaper", audio: "/audio/shinbun.mp3", example: "毎朝、新聞を読みます。" },
    ...
  ]
}
```

---

## ✨ Future Upgrades

- 🎤 Add voice recognition to test pronunciation
- 💬 AI-generated example sentences
- 🔀 Smart shuffling: weak words get more attention
- 📈 Analytics: average confidence, weak areas

---

## 📁 Developer File Structure (Proposal)
```
/features/word-learning-session/
├── index.tsx
├── useSessionEngine.ts
├── data/
│   └── genki-vocab.json
├── hooks/
│   └── useLearningSession.ts
├── audio/
│   └── shinbun.mp3
```