# 📚 Doshi Sensei Kanji Mastery System

This document outlines a comprehensive kanji learning and retention system for Doshi Sensei, designed to provide flexibility, structure, and long-term memorization benefits to learners.

---

## 🎯 Vision

To provide students with a powerful, immersive way to learn and **retain** kanji through a combination of:

- Personalization
- Spaced Repetition
- Immersive Experiences
- Smart Tracking and Feedback

---

## 1. 📊 Kanji Learning Dashboard

### Features

- Students choose the number of kanji to study per session (default: 5/day)
- A warning appears if the number exceeds a reasonable limit (e.g. >20)
- Students can choose by:
  - JLPT level
  - 

---

## 2. 📘 Learning Flow

### For each kanji, show:

- **Stroke order animation**
- **Meaning** (EN + JP)
- **On’yomi** and **Kun’yomi**
- 2–3 example words (with furigana + translations)
- 1–2 example sentences
- Audio pronunciation
- Option to save or mark as "easy"
  
  
  
  

---

## 3. 🧠 Retention System (Sophisticated Algorithm)

### Hybrid Algorithm:

A. **Spaced Repetition System (SRS)**

- Based on SuperMemo 2 or FSRS algorithms
- Kanji will reappear at increasing intervals based on correct answers

B. **Active Recall**

- Flashcard-style review (kanji → meaning, meaning → kanji)
- Active recall should include also readings

C. **Recognition + Production Drills**

- Read kanji in context (sentences)
- Type meaning / pronunciation from kanji
- Write kanji using stroke input (optional)

D. **Error Weighting**

- Mistakes influence future intervals
- Hardest kanji appear more often
- Use streak count to reinforce correct recall

---

## 4. 🧭 Study Modes

| Mode          | Description                          |
| ------------- | ------------------------------------ |
| 🧪 Drill Mode | Study 5–10 new kanji + recall review |
|               |                                      |
|               |                                      |
|               |                                      |

---

## 5. 🏆 Achievements & Progress

- Track:
  - Streaks (daily practice)
  - Total kanji learned
  - Retention rate
  - Quiz accuracy
- Unlock:
  - Titles, Badges, Avatars
  - Special study backgrounds
  - Companion powers for games

---

## 6. 🔁 Review Schedule (SRS Timeline)

| Review Count | Suggested Interval            |
| ------------ | ----------------------------- |
| 1st review   | After 1 day                   |
| 2nd review   | After 3 days                  |
| 3rd review   | After 7 days                  |
| 4th review   | After 14 days                 |
| 5th review   | After 30 days                 |
| Mastered     | Periodic review based on user |

---

## 7. 🧮 Algorithm Input Parameters

- `kanjiId`
- `difficultyRating` (1–5 from quiz feedback)
- `lastReviewed`
- `successRate`
- `nextReviewTimestamp`

---

## 8. ☁️ Offline & PWA Support

- Cache reviewed kanji and next reviews with IndexedDB + Firebase
- Allow full offline practice and sync on reconnect

---

## 9. 📬 Notifications (Optional)

- PWA Notifications for daily practice
- "You’re about to break your streak!"
- “It’s time to review 3 kanji!”

---

## 

---

🧑‍💻 *Built with care for self-learners who want more than flashcards.*
