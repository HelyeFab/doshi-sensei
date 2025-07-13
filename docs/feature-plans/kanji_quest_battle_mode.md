# 🐾 Kanji Quest – Wild Battle Mode

## 📌 Feature Overview

"Kanji Quest" is a gamified study mode inspired by Pokémon battles. Users study a set of 5 kanji, then battle through a quiz. A successful attempt (≥75% correct) results in catching a Pokémon and adding it to the user's in-app Pokédex.

---

## 🎮 Game Flow

### 1. Wild Encounter Phase
- Triggered when user taps **“Start Wild Encounter”**
- Show: “A wild Pokémon appeared!” with animation/sprite
- Pokémon is randomly selected from full pool (1–1025)
- **3-5 kanji** are selected by the user from current JLPT level (minimum 3, maximum 5)

### 2. Study Phase
For each of the selected kanji:
- Show:
  - Kanji character
  - On’yomi / Kun’yomi readings
  - English meaning
  - Sample vocab (2–3 items) with furigana toggle
- Include “Ready” or “Studied” switch for each card

✅ User must mark all 5 as “Studied” to unlock the quiz

### 3. Training Ground Quiz - Systematic Question System
- **NEW SYSTEM**: Each kanji will be encountered multiple times through random encounters
- **Question Generation**:
  - Each kanji has up to 3 question types: on'yomi, kun'yomi (if they exist), and meaning
  - Questions are asked systematically - one type per encounter
  - A kanji appears randomly until ALL its question types have been asked
  - If a kanji has 3 question types, it will appear 3 times; if only 2, then 2 times
- **Multiple Readings Display**:
  - When multiple readings exist (e.g., 10 on'yomi readings), display only the first 3-4 in answer options
  - All readings are considered correct answers
- **Tracking System**:
  - The game tracks which question types have been asked for each kanji
  - Encounters continue until all questions for all kanji have been answered
  - Total encounters = sum of all available question types across all selected kanji
- 75% or more correct = success
- <75% = fail → continue with remaining unanswered questions

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

---

## 🎯 Implementation Details

### Tutorial Modal
- **Colorful tutorial modal** displayed when user clicks Kanji Quest button
- Uses Pokemon flat icons from `/flat-icons/1752632-pokemon/` for visual appeal
- Explains the new systematic question system with 4 steps:
  1. Select 3-5 kanji team
  2. Wild encounters with random kanji appearances
  3. Battle through all question types (on'yomi, kun'yomi, meaning)
  4. Catch Pokemon upon successful completion
- Includes pro tips about multiple readings and encounter system
- Available from both games page and kanji browser

### Question Tracking Implementation
```typescript
// Track asked questions per kanji
const [askedQuestions, setAskedQuestions] = useState<Map<string, Set<'onyomi' | 'kunyomi' | 'meaning'>>>(new Map());

// Get available question types for a kanji
const getAvailableQuestionTypes = (kanji: GameKanji): ('onyomi' | 'kunyomi' | 'meaning')[] => {
  const asked = askedQuestions.get(kanji.id) || new Set();
  const available: ('onyomi' | 'kunyomi' | 'meaning')[] = [];
  
  if (kanji.on_readings && kanji.on_readings.length > 0 && !asked.has('onyomi')) {
    available.push('onyomi');
  }
  if (kanji.kun_readings && kanji.kun_readings.length > 0 && !asked.has('kunyomi')) {
    available.push('kunyomi');
  }
  if (!asked.has('meaning')) {
    available.push('meaning');
  }
  
  return available;
};

// Get next random encounter
const getNextEncounter = (kanji: GameKanji[]): { kanji: GameKanji; questionType: 'onyomi' | 'kunyomi' | 'meaning' } | null => {
  const kanjiWithQuestions = kanji.filter(k => {
    const available = getAvailableQuestionTypes(k);
    return available.length > 0;
  });
  
  if (kanjiWithQuestions.length === 0) return null;
  
  const randomKanji = kanjiWithQuestions[Math.floor(Math.random() * kanjiWithQuestions.length)];
  const availableTypes = getAvailableQuestionTypes(randomKanji);
  const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  
  return { kanji: randomKanji, questionType: randomType };
};
```