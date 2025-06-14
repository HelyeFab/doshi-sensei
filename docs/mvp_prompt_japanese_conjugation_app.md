# 🧪 MVP Prompt: Japanese Verb & Adjective Conjugation App

## Doshi Sensei
A next.js app which helps users **learn and practice conjugations of Japanese verbs and adjectives**.

---

## 🧭 Core User Flows

1. **Browse Vocabulary List**
   - Users can browse a list of Japanese verbs/adjectives
   - Filter by JLPT level (N5–N1)
   - Search by Kanji, Kana, or English meaning

2. **View Full Conjugation**
   - Tapping a word in the list opens a detailed conjugation view
   - Show the word in:
     - Kanji
     - Kana (with furigana if possible)
     - Romaji
     - English meaning
   - List all common conjugation forms (e.g., Te-form, past, potential, polite, negative)

3. **Drill Mode**
   - Let users choose:
     - a verb/adjective to drill
     - or a conjugation form (e.g., past, Te-form) to focus on
   - The app then:
     - Presents a conjugation question: stem + blank
     - Offers 6 options (one correct suffix + 5 distractors)
     - Checks and highlights the correct answer

---

## 🔧 Technical Requirements

- Use **Next.js**
- No backend required – app should run offline
- Store verb/adjective data in **local JSON** or SQLite
- Use clean state management
- No audio features are needed at this stage

---

## 📘 Data Structure Example

```json
{
  "kanji": "教える",
  "kana": "おしえる",
  "romaji": "oshieru",
  "meaning": "to teach",
  "type": "Ichidan",
  "jlpt": "N5"
}
```
---

## 💻 Web Resources for data source (MVP)

- https://docs.api.wanikani.com/20170710/#introduction
- https://jisho.org/api/v1/search/words?keyword=house
- https://kanjiapi.dev/
- https://tatoeba.org/en/downloads
- https://github.com/hexenq/kuroshiro
---

## 📱 App Screens (MVP)

- Home screen: Choose between [Practice], [Drill], [Vocab], [Settings]
- Vocab screen: Filterable searchable word list
- Conjugation screen: Full table of forms
- Drill screen: One question per card with multiple choices
- Settings screen: UI toggles (theme, romaji mode, daily goal)
- Dark mode: Dark background with light text

---

## 🧪 Drill Logic

- Question structure: e.g., 割れる → われ？
- Prompt user to pick correct suffix (e.g. 〜て)
- Conjugation logic based on verb type (Godan, Ichidan, irregular)

---

## ✨ Bonus
Display the conjugation rules used ("Show Rules") below each question.
