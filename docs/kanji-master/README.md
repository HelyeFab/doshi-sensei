# 🎯 Kanji Mastery Documentation

Welcome to the comprehensive documentation for Doshi Sensei's Kanji Mastery feature. This guide covers everything you need to know about developing, maintaining, and extending the kanji learning system.

## 📚 Documentation Structure

- **[Architecture Overview](./ARCHITECTURE.md)** - System design and component relationships
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Step-by-step guide for developers
- **[API Reference](./API_REFERENCE.md)** - Detailed API documentation
- **[SRS Algorithm](./SRS_ALGORITHM.md)** - Spaced repetition implementation details
- **[Storage System](./STORAGE_SYSTEM.md)** - Data persistence and sync strategies
- **[Testing Guide](./TESTING_GUIDE.md)** - Testing strategies and examples
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## 🚀 Quick Start

### For Users
1. Navigate to `/tools/kanji-mastery` or click "Kanji Mastery" from the home page
2. Configure your study session (JLPT level, session size)
3. Start learning with comprehensive kanji cards
4. Review kanji when due using the SRS system
5. Track your progress on the dashboard

### For Developers
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Navigate to
http://localhost:3000/tools/kanji-mastery
```

## 🏗️ Feature Overview

The Kanji Mastery system is built on several core principles:

1. **Three-Pillar Architecture** - Integrated with Doshi Sensei's access control system
2. **FSRS Algorithm** - State-of-the-art spaced repetition for optimal retention
3. **Progressive Disclosure** - Information revealed in digestible chunks
4. **Multi-Modal Learning** - Visual, audio, and contextual learning
5. **Offline-First** - Full functionality without internet, with sync for premium users

## 📁 Project Structure

```
src/
├── app/tools/kanji-mastery/        # Main feature pages
│   ├── page.tsx                    # Dashboard
│   ├── learn/page.tsx              # Learning flow
│   ├── review/page.tsx             # Review sessions
│   └── components/                 # Feature-specific components
├── services/kanji-mastery/         # Business logic
│   ├── spaced-repetition.ts        # SRS algorithm
│   └── storage.ts                  # Data persistence
└── lib/                            # Three-pillar integration
    ├── features/registry.ts        # Feature registration
    ├── entitlements/rules.ts       # Access limits
    └── access/index.ts             # Permission mapping
```

## 🔑 Key Features

### Learning Flow
- **Customizable Sessions**: 1-50 kanji per session
- **Level Selection**: JLPT N5-N1 or school grades
- **Rich Content**: Meanings, readings, examples, sentences
- **Stroke Order**: Integrated animations
- **Audio Support**: TTS for all readings

### Review System
- **Smart Scheduling**: FSRS algorithm optimizes review timing
- **5-Level Rating**: Forgot, Hard, Good, Easy, Perfect
- **Progress Tracking**: Retention rate, streaks, mastery levels
- **Multi-Mode**: Recognition, production, and writing practice

### Progress & Achievements
- **Real-Time Stats**: Kanji learned, retention rate, streak tracking
- **Achievement System**: Unlock badges and rewards
- **Visual Progress**: Charts and progress bars
- **Export Options**: Data export for analysis

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **State Management**: React hooks, Context API
- **Data Storage**: IndexedDB (all users), Firebase (premium sync)
- **Algorithm**: ts-fsrs library with custom optimizations
- **UI Components**: Custom components with theme system
- **Testing**: Jest, React Testing Library

## 📦 Firebase Collections

When premium users sync their Kanji Mastery data, it's stored in the following Firebase Firestore collections:

### Collection Structure
```
users/
└── {userId}/
    ├── kanjiProgress/          # Individual kanji learning progress
    │   └── {kanjiCharacter}/   # Document ID is the kanji character itself
    │       ├── id              # Kanji character
    │       ├── lastReviewed    # ISO date string
    │       ├── nextReview      # ISO date string
    │       ├── reviewCount     # Number of reviews
    │       ├── easeFactor      # SRS ease factor
    │       ├── interval        # Days until next review
    │       ├── difficulty      # Current difficulty
    │       ├── lapses          # Number of times forgotten
    │       ├── quality         # Last review quality (1-5)
    │       ├── retentionRate   # Calculated retention percentage
    │       ├── masteryLevel    # 0-100 mastery score
    │       ├── createdAt       # ISO date string
    │       └── updatedAt       # ISO date string
    │
    └── kanjiStudySessions/     # Study session records
        └── {sessionId}/        # Auto-generated session ID
            ├── id              # Session ID
            ├── date            # Session start time (ISO string)
            ├── kanjiReviewed   # Number of kanji studied
            ├── averageQuality  # Average review quality
            ├── timeSpent       # Time in seconds
            ├── userId          # User ID (for validation)
            ├── jlptLevel       # Optional JLPT level filter
            ├── kanjiCorrect    # Number answered correctly
            ├── newKanji        # Number of new kanji learned
            ├── startTime       # ISO date string
            └── endTime         # ISO date string (if session ended)
```

### Viewing in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database**
4. Browse to: `users` → `{userId}` → `kanjiProgress` or `kanjiStudySessions`

### Security Rules
The collections are protected by Firebase security rules (lines 635-693 in `firestore.rules`):
- Only premium users can read/write their own data
- `kanjiProgress` can be created and updated
- `kanjiStudySessions` are immutable once created (no updates allowed)
- Users can only access their own data (validated by userId)

## 📊 Access Control

The feature integrates with Doshi Sensei's Three-Pillar Architecture:

| User Type | Daily Limit | Features |
|-----------|-------------|----------|
| Guest | 5 kanji/day | Basic learning, no sync |
| Free | 10 kanji/day | Learning + review, local storage |
| Premium | Unlimited | All features + cloud sync |

## 🎨 Design Principles

1. **Theme Compliance**: Full support for 8 color schemes + dark mode
2. **Mobile-First**: Optimized for touch interactions
3. **Accessibility**: WCAG AA compliant
4. **Performance**: Lazy loading, optimized renders
5. **Offline Support**: PWA capabilities

## 📈 Metrics & Analytics

The system tracks (anonymously for privacy):
- Study session frequency and duration
- Retention rates by JLPT level
- Popular kanji and common mistakes
- Feature usage patterns

## 🔮 Future Enhancements

- [ ] Handwriting recognition
- [ ] Custom kanji lists
- [ ] Social features (leaderboards)
- [ ] AI-powered mnemonics
- [ ] Video lessons integration
- [ ] Kanji radical breakdown

## 🤝 Contributing

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for contribution guidelines.

## 📝 License

Part of the Doshi Sensei project. All rights reserved.

---

For specific implementation details, please refer to the individual documentation files listed above.