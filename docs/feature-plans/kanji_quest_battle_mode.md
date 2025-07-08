# 🐾 Kanji Quest – Wild Battle Mode

## 📌 Feature Overview

"Kanji Quest" is a gamified study mode inspired by Pokémon battles. Users study a set of 5 kanji, then battle through a quiz. A successful attempt (≥75% correct) results in catching a Pokémon and adding it to the user's in-app Pokédex.

---

## 🎮 Game Flow

### 1. Wild Encounter Phase
- Triggered when user taps **“Start Wild Encounter”**
- Show: “A wild Pokémon appeared!” with animation/sprite
- Pokémon is randomly selected from full pool (1–1025)
- 5 kanji are randomly picked from current JLPT level

### 2. Study Phase
For each of the 5 kanji:
- Show:
  - Kanji character
  - On’yomi / Kun’yomi readings
  - English meaning
  - Sample vocab (2–3 items) with furigana toggle
- Include “Ready” or “Studied” switch for each card

✅ User must mark all 5 as “Studied” to unlock the quiz

### 3. Training Ground Quiz
- 5–7 multiple-choice questions based on the 5 kanji
- Question types:
  - Pick the reading
  - Pick the meaning
  - Identify kanji from vocab
  - Complete the word
- 75% or more correct = success
- <75% = fail → reshuffle and retry

### 4. Pokémon Capture
- If success:
  - Show Pokéball animation or celebration
  - Pokémon added to user’s `pokedex` collection
- If failure:
  - Show “The wild Pokémon fled…”
  - Retry available

---

## 🧱 Data Models

### `study_sessions/{sessionId}.json`
```json
{
  "kanji": ["猫", "森", "車", "空", "白"],
  "pokemonId": 93,
  "status": "pending",
  "startTime": "...",
  "quizScore": null
}
```

### `pokedex/{userId}.json`
```json
{
  "caught": [1, 4, 25, 93],
  "lastCaught": {
    "id": 93,
    "name": "Haunter",
    "date": "2025-06-28"
  }
}
```

---

## 📘 Developer Implementation Notes

- Kanji data source: app’s existing JLPT kanji store
- Pokémon images: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- Quiz engine: can reuse your existing drill system with a custom layout
- Use local IndexedDB for non-logged-in users
- Sync to Firebase for logged-in users
- Track which kanji groups have been completed to prevent repetition

---

## 💡 Extensions (Optional)
- Add XP points for each caught Pokémon
- Allow Pokémon to “evolve” after reviewing same kanji multiple times
- Use badges or quests (e.g. “Catch all N5 Pokémon!”)

---

## ✅ Requirements Checklist

- [ ] Battle intro screen
- [ ] Kanji study view with 5 cards
- [ ] Quiz engine for battle
- [ ] Pokémon capture logic
- [ ] Pokédex collection UI
- [ ] Firebase/IndexedDB integration