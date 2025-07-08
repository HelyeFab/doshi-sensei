# Kanji Study System Documentation

## Overview

The Kanji Study System is a comprehensive learning tool integrated into the Kanji Mood Boards feature of Doshi Sensei. It provides an interactive, spaced-repetition based approach to learning kanji characters, their meanings, and readings. The system is designed to maximize retention while providing a smooth, engaging user experience.

## Table of Contents

1. [Features](#features)
2. [User Guide](#user-guide)
3. [Technical Architecture](#technical-architecture)
4. [Components](#components)
5. [Data Flow](#data-flow)
6. [Spaced Repetition Algorithm](#spaced-repetition-algorithm)
7. [Progress Tracking](#progress-tracking)
8. [Daily Limits & Monetization](#daily-limits--monetization)
9. [Firebase Integration](#firebase-integration)
10. [API Reference](#api-reference)
11. [Future Enhancements](#future-enhancements)

## Features

### Core Features
- **Interactive Flashcard Interface**: Clean, modern UI with animations
- **Multiple Question Types**: Tests kanji recognition, meaning, on'yomi, and kun'yomi
- **Text Input System**: Natural typing experience with case-insensitive matching
- **Immediate Feedback**: Shows correct/incorrect status after each answer
- **Progress Tracking**: Comprehensive tracking of learning progress per kanji
- **Spaced Repetition**: Advanced SRS algorithm for optimal learning intervals
- **Session Management**: Complete session history with detailed analytics

### User Experience
- **Random Question Order**: Prevents pattern memorization
- **Visual Progress Bar**: Shows session progress at a glance
- **Keyboard Support**: Escape to close, Enter to submit
- **Mobile Responsive**: Optimized for all screen sizes
- **Theme Support**: Respects user's light/dark theme preference

### Business Features
- **Daily Limits**: Free users limited to 3 study sessions per day
- **Premium Benefits**: Unlimited study sessions for premium users
- **Upgrade Prompts**: Contextual upgrade modal when limit reached
- **Usage Analytics**: Detailed tracking for business insights

## User Guide

### Starting a Study Session

1. **Access Study Mode**
   - Navigate to any Kanji Mood Board
   - Click the "Study" button in the header
   - The button shows remaining sessions for free users

2. **Study Interface**
   - Large kanji display with gradient background
   - Question text indicating what to answer
   - Text input field for your answer
   - Progress bar showing session completion

3. **Question Types**
   The system randomly tests four aspects of each kanji:
   - **Kanji → Meaning**: See the kanji, type its English meaning
   - **Meaning → Kanji**: See the meaning, type the kanji character
   - **On'yomi Reading**: See the kanji, type its on'yomi reading
   - **Kun'yomi Reading**: See the kanji, type its kun'yomi reading

4. **Answering Questions**
   - Type your answer in the input field
   - Press Enter or click "Check Answer"
   - View immediate feedback
   - Click "Next Question" to continue

5. **Session Completion**
   - View your final score and percentage
   - Progress is automatically saved
   - Study access refreshes for the next session

### Answer Matching Rules

- **Case Insensitive**: "LOVE" matches "love"
- **Exact Match Required**: No partial matches
- **Multiple Readings**: Any valid reading is accepted
- **Kanji Input**: Must match the exact character

### Daily Limits (Free Users)

- **3 Sessions Per Day**: Resets at midnight local time
- **Visual Indicators**: Button shows remaining sessions
- **Upgrade Prompt**: Clear path to premium when limit reached
- **Premium Users**: Unlimited study sessions

## Technical Architecture

### Component Structure

```
src/
├── components/
│   └── kanji-moods/
│       ├── KanjiStudyModal.tsx    # Main study interface
│       └── MoodBoard.tsx          # Updated with study button
└── utils/
    └── kanjiStudyProgress.ts      # Progress tracking & SRS logic
```

### Data Models

#### KanjiStudyResult
```typescript
interface KanjiStudyResult {
  boardId: string;
  kanjiChar: string;
  questionType: 'kanji' | 'meaning' | 'onyomi' | 'kunyomi';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  timestamp: Date;
}
```

#### KanjiStudySession
```typescript
interface KanjiStudySession {
  boardId: string;
  boardTitle: string;
  startedAt: Date;
  completedAt?: Date;
  totalQuestions: number;
  correctAnswers: number;
  results: KanjiStudyResult[];
  accuracy: number;
}
```

#### KanjiProgress
```typescript
interface KanjiProgress extends FlashcardProgress {
  kanjiChar: string;
  boardId: string;
  meaningAccuracy: number;
  onyomiAccuracy: number;
  kunyomiAccuracy: number;
  totalMeaningAttempts: number;
  totalOnyomiAttempts: number;
  totalKunyomiAttempts: number;
}
```

## Components

### KanjiStudyModal

The main study interface component with the following responsibilities:

- **Session Management**: Initializes and manages study sessions
- **Question Generation**: Randomizes kanji and question types
- **Answer Validation**: Checks user input against correct answers
- **Progress Tracking**: Updates progress after each answer
- **UI State Management**: Handles modal states and transitions

#### Key Functions

```typescript
// Initialize study session with random order
useEffect(() => {
  if (isOpen && kanjiList.length > 0) {
    // Randomize kanji order
    // Randomize question type order
    // Initialize session state
  }
}, [isOpen, kanjiList]);

// Check answer and update progress
const checkAnswer = async () => {
  // Validate answer
  // Calculate response time
  // Create study result
  // Update progress via SRS
  // Update UI state
};

// Move to next question or complete session
const nextQuestion = async () => {
  // Check if session complete
  // Save session if complete
  // Otherwise advance to next question
};
```

### MoodBoard Integration

The MoodBoard component was enhanced with:

- **Study Access Check**: Validates user can study
- **Study Button**: Visual states for access levels
- **Upgrade Modal**: Premium upgrade flow
- **Session Refresh**: Updates limits after study

## Data Flow

### Study Session Flow

```
1. User clicks Study button
   ↓
2. Check daily limit & premium status
   ↓
3. Open KanjiStudyModal
   ↓
4. Initialize random session
   ↓
5. For each question:
   a. Display question
   b. Accept user input
   c. Validate answer
   d. Update progress (SRS)
   e. Save result
   ↓
6. Complete session
   ↓
7. Save session data
   ↓
8. Update daily count
   ↓
9. Refresh access status
```

### Progress Update Flow

```
1. User submits answer
   ↓
2. Calculate quality score (1-5)
   ↓
3. Update SRS algorithm
   ↓
4. Update question-type accuracy
   ↓
5. Save to localStorage
   ↓
6. Sync to Firebase
```

## Spaced Repetition Algorithm

The system uses the advanced FSRS (Free Spaced Repetition Scheduler) algorithm:

### Quality Calculation

```typescript
let quality: FlashcardQuality;
if (!result.isCorrect) {
  quality = 1; // Wrong answer
} else if (responseTime < 2000) {
  quality = 5; // Perfect recall
} else if (responseTime < 4000) {
  quality = 4; // Good recall
} else {
  quality = 3; // Correct but slow
}
```

### Key Parameters

- **Initial Stability**: 0.4 to 4.8 days based on first response
- **Kanji Difficulty Multiplier**: 1.4x (kanji are harder than vocabulary)
- **Response Time Threshold**: 3 seconds for normal speed
- **Maximum Interval**: 365 days
- **Minimum Interval**: 1 minute

### Progress States

- **Learning**: New kanji, short intervals
- **Reviewing**: Known kanji, medium intervals
- **Mastered**: Well-known kanji, long intervals
- **Difficult**: Struggling kanji, reduced intervals

## Progress Tracking

### Local Storage Schema

```javascript
// Kanji Progress
localStorage['doshi_kanji_progress'] = {
  "userId_boardId_kanjiChar": {
    // FlashcardProgress fields
    // Plus kanji-specific fields
    meaningAccuracy: 0.85,
    onyomiAccuracy: 0.72,
    kunyomiAccuracy: 0.68,
    totalMeaningAttempts: 10,
    totalOnyomiAttempts: 10,
    totalKunyomiAttempts: 10
  }
}

// Daily Study Count
localStorage['doshi_kanji_daily_study'] = {
  date: "2024-01-20",
  count: 2,
  lastStudyTime: "2024-01-20T15:30:00Z"
}
```

### Firebase Schema

```
users/
  userId/
    kanjiProgress/
      progressId/
        ...all progress fields
        createdAt: timestamp
        updatedAt: timestamp
    boardStats/
      boardId/
        totalSessions: number
        totalQuestions: number
        totalCorrect: number
        averageAccuracy: number
        lastStudied: timestamp
```

## Daily Limits & Monetization

### Implementation

```typescript
export async function canUserStudy(): Promise<{
  canStudy: boolean;
  remainingSessions: number;
  isPremium: boolean;
}> {
  // Check premium status from Firebase
  // Check daily count from localStorage
  // Return access status
}
```

### Limit Rules

- **Free Users**: 3 sessions per day
- **Premium Users**: Unlimited sessions
- **Reset Time**: Midnight local time
- **Count Storage**: localStorage for instant checks

### Upgrade Flow

1. User reaches daily limit
2. Study button becomes disabled
3. Click shows upgrade modal
4. Modal includes:
   - Current usage (e.g., "3/3 sessions used")
   - Premium benefits
   - Clear CTA to upgrade

## Firebase Integration

### Sync Strategy

- **Immediate Local Save**: All progress saved to localStorage first
- **Background Sync**: Firebase updates happen asynchronously
- **Conflict Resolution**: Local state takes precedence
- **Offline Support**: Full functionality without connection

### Firebase Operations

```typescript
// Save/Update Progress
setDoc(doc(firestore, 'users', userId, 'kanjiProgress', progressId), {
  ...kanjiProgress,
  updatedAt: serverTimestamp()
});

// Save Session
updateDoc(doc(firestore, 'users', userId), {
  kanjiStudySessions: arrayUnion(session),
  totalKanjiStudySessions: increment(1),
  lastKanjiStudySession: serverTimestamp()
});

// Update Board Stats
updateDoc(doc(firestore, 'users', userId, 'boardStats', boardId), {
  totalSessions: increment(1),
  totalQuestions: increment(session.totalQuestions),
  averageAccuracy: increment(accuracyDelta)
});
```

## API Reference

### Core Functions

#### `getKanjiProgress(boardId: string, kanjiChar: string)`
Retrieves progress for a specific kanji, checking localStorage first, then Firebase.

#### `updateKanjiProgressFromResult(result: KanjiStudyResult, responseTime: number)`
Updates kanji progress using SRS algorithm and saves to storage.

#### `saveStudySession(session: KanjiStudySession)`
Saves a complete study session and updates statistics.

#### `canUserStudy()`
Checks if user can start a study session based on limits and premium status.

#### `getDailyStudyCount()`
Returns the number of sessions completed today.

#### `getBoardKanjiProgress(boardId: string)`
Gets all kanji progress for a specific board.

#### `calculateBoardMastery(boardId: string)`
Calculates overall statistics for a mood board.

### Utility Functions

#### `incrementDailyStudyCount()`
Increments the daily study counter for free users.

#### `getAllKanjiProgress()`
Retrieves all kanji progress from localStorage.

#### `saveAllKanjiProgress(progress: Record<string, KanjiProgress>)`
Saves all kanji progress to localStorage.

## Future Enhancements

### Planned Features

1. **Study Statistics Dashboard**
   - Performance graphs over time
   - Accuracy by question type
   - Learning velocity metrics
   - Streak tracking

2. **Smart Review Scheduling**
   - Due kanji notifications
   - Optimal review time suggestions
   - Batch review sessions

3. **Advanced Study Modes**
   - Writing practice integration
   - Sentence context questions
   - Audio pronunciation tests
   - Kanji component breakdown

4. **Gamification**
   - XP system for correct answers
   - Achievement badges
   - Leaderboards
   - Study streaks

5. **Customization Options**
   - Adjustable session length
   - Question type preferences
   - Difficulty settings
   - Custom review intervals

### Technical Improvements

1. **Performance Optimization**
   - IndexedDB integration for better storage
   - Optimistic UI updates
   - Preloading next questions
   - Better caching strategies

2. **Analytics Enhancement**
   - Detailed learning analytics
   - A/B testing framework
   - User behavior tracking
   - Conversion optimization

3. **Accessibility**
   - Screen reader support
   - Keyboard navigation improvements
   - High contrast mode
   - Font size options

## Troubleshooting

### Common Issues

**Study button disabled but user is premium**
- Clear localStorage to reset daily count
- Check Firebase connection
- Verify premium status in Firebase

**Progress not saving**
- Check browser storage permissions
- Verify localStorage space
- Check Firebase rules

**Incorrect answer matching**
- Ensure exact character match for kanji
- Check for extra spaces
- Verify reading format (hiragana/katakana)

### Debug Mode

Add `?debug=true` to URL to enable:
- Console logging of all progress updates
- Session state visualization
- Storage inspection tools
- Firebase sync status

## Conclusion

The Kanji Study System provides a robust, scalable solution for kanji learning within Doshi Sensei. By combining modern SRS algorithms with thoughtful UX design and smart monetization, it creates value for both users and the business. The modular architecture ensures easy maintenance and future expansion as the product grows.