# 📚 AI Story Feature – Admin Upload Module

This document outlines the features and structure of the **AI Story Reader** section for the Doshi Sensei app.

## 🎯 Purpose
To allow admins to upload AI-generated JLPT-level Japanese stories with images, furigana, and contextual interaction. Users can browse, read, and study these stories in both casual and study modes.

---

## ✅ Features to Implement

### 📖 Story Content
- Each story should have:
  - Title
  - JLPT level
  - Theme
  - Cover image per page
  - Story text per page (with furigana)
  - English translation
  - Tag-based categorization (e.g. fantasy, school, culture)

### 🧠 Study Interactions
- Tap on words to show:
  - Reading
  - Meaning
  - Option to save word to personal list
- Toggle furigana display (on/off)
- Glossary sidebar for words tapped
- Color-code words by JLPT level

### 🗂️ Structure and Storage
- Story stored as JSON object
- Each page includes:
  - Page number
  - Image URL
  - Text with `<ruby>` tags
  - Translation

### 🎮 Quizzing
- Each story ends with a multiple-choice quiz (2–5 questions)
- Users can review their score and retry

---

## 🔐 Admin Dashboard Upload
- Admin should be able to:
  - Upload story metadata and pages
  - Upload page images (via CDN or Firebase)
  - Write text per page (in Japanese with ruby)
  - Write translations
  - Add 2–5 quiz questions

---

## 🌐 Frontend Rendering
- Story page should support:
  - Vertical scroll reading or swipe pagination
  - Glossary modal
  - Responsive layout with media queries
  - Offline caching if possible

---

## 📎 Future Enhancements
- Add TTS narration
- Story ratings by users
- Progress tracking (what has been read)