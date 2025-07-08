# 🗺️ Kanji Mood Boards with Map-Based Progression – Technical Design Document

## 📘 Overview

This document outlines the implementation of a hybrid feature for your Japanese learning app that combines:
- 🎴 **Kanji Mood Boards** (theme-based visual groupings)
- 🗺️ **Kanji Progression Map** (spatial, game-like JLPT journey)

The system transforms kanji study into an exploratory experience where users unlock "thematic worlds" (mood boards) as they progress across a map based on JLPT level and kanji mastery.

---

## 🎯 Goals

- Increase engagement with **visual, contextual learning**
- Organise kanji semantically (by theme/mood)
- Introduce gated progression using **map locations** per JLPT level
- Maintain technical simplicity for initial implementation

---

## 🧩 Core Concepts

### 1. 🌈 Mood Board (Thematic Clusters)

Each board contains:
- A background image
- 3–10 related kanji
- Thematic labels (e.g., Nature, Emotions, Tools)
- Kanji card with:
  - Character
  - Meaning
  - Readings (onyomi, kunyomi)
  - Example words
  - Visual cues (optional: emoji, illustrations)

Stored as JSON:

```json
{
  "id": "nature_n5",
  "theme": "Nature",
  "jlpt": "N5",
  "map_zone": "Beginner Village",
  "background": "/assets/moods/nature.jpg",
  "kanji": [
    { "char": "木", "meaning": "tree", "on": ["モク"], "kun": ["き"], "examples": ["木曜日", "木の上"] },
    { "char": "山", "meaning": "mountain", "on": ["サン"], "kun": ["やま"], "examples": ["山川", "富士山"] }
  ]
}
```

---

### 2. 🗺️ Kanji Map (World Progression)

Each JLPT level is a **map zone**:
- N5 → "Beginner Village"
- N4 → "River of Action"
- N3 → "Emotion Hills"
- N2 → "Logic City"
- N1 → "Wisdom Peak"

Each zone contains 3–6 themed Mood Boards. Users unlock zones as they master 80% of the previous zone.

Visual map can be:
- Interactive SVG (lightweight)
- Static image + CSS click areas
- Canvas map engine (advanced)

---

## 🛠️ Tech Stack & Components

| Component      | Description                                      |
|----------------|--------------------------------------------------|
| `kanjiBoards.json` | Contains all mood board clusters                |
| `MapScreen.vue` or `.tsx` | Displays map with unlock logic + navigation  |
| `MoodBoard.vue` | Grid layout of themed kanji cards with details |
| `KanjiCard.vue` | Flip interaction, displays character + back info |
| `kanjiProgress.ts` | Local & remote (Firestore) sync of user state   |

---

## 🧠 Unlock Logic

```ts
function isZoneUnlocked(userProgress, zone) {
  const required = mapZoneRequirements[zone];
  return required.every(prevZone => userProgress[prevZone]?.passed);
}
```

Use this to:
- Lock map areas until enough mood boards are passed
- Disable tap/click on locked zones
- Show progress rings on each mood board thumbnail

---

## 💾 Data Storage

- Local: `IndexedDB` or `localStorage`
- Cloud Sync: Firebase (for premium users)

User progress schema:

```json
{
  "user_id": "abc123",
  "passed_moodboards": ["nature_n5", "daily_n5"],
  "unlocked_zones": ["Beginner Village"]
}
```

---

## 📲 UI Flow

1. User lands on JLPT Kanji Map
2. Sees unlocked zone(s); clicks "Beginner Village"
3. Sees a grid of unlocked Mood Boards (cards with theme image)
4. Opens board → sees themed kanji + study modes (flip, MCQ, draw)
5. Completes kanji practice → board marked as "Passed"
6. Unlocks new board(s) or zone(s) on threshold

---

## 🏆 Engagement Features

- 🥇 Badge per completed board
- 🔥 Streak rewards (x days of kanji review)
- 🎁 Unlockable rewards (e.g., mascot items)
- 📆 Daily board suggestion

---

## ✅ Summary

| Feature             | Benefit                              |
|---------------------|--------------------------------------|
| Mood Boards         | Contextual + visual learning         |
| Map Zones           | Gamified progression                 |
| Unlock System       | Drives continuous study              |
| Modular JSON Data   | Easy to expand with new themes       |
| Theming by JLPT     | Keeps learning structured            |

Would you like a sample dataset (JSON) of 10 mood boards with N5 kanji to get started?
