# StatsBar Metrics Guide

This document explains what each metric in the StatsBar tracks and how it's calculated.

## Overview

The StatsBar displays 3 key metrics that provide users with a quick overview of their core progress on Doshi Sensei. It's integrated into the homepage feature cards grid, taking up the space of two cards for better visual prominence. For detailed statistics including daily, weekly, and monthly breakdowns, registered users can visit the Account page.

## Metrics Breakdown

### 1. 🔥 Streak
**What it tracks**: Consecutive days of activity on the platform

**How it's calculated**:
- Increments by 1 for each consecutive day with at least one activity
- Resets to 0 if no activity is recorded for a full calendar day
- Activities include: flashcards, articles, stories, games, drills, or any tracked learning activity
- Based on the user's local timezone

**Data source**: `stats.currentStreak` from UserStatsV2

---

### 2. 🎮 Pokémon (Pokéball icon)
**What it tracks**: Total number of unique Pokémon caught in the KanjiQuest game

**How it's calculated**:
- Increments when a new Pokémon is successfully caught in KanjiQuest
- Each Pokémon can only be caught once (no duplicates)
- Pokémon are earned by correctly answering kanji questions in the game

**Data source**: `stats.pokemonCaught` from UserStatsV2

---

### 3. 🏆 All Time
**What it tracks**: Total number of all activities ever completed

**How it's calculated**:
- Cumulative count of all learning activities since account creation
- Includes: flashcards, articles, stories, games, drills, kanji studies, vocabulary studies
- Never decreases, only increases with new activities
- Persists across all sessions

**Data source**: `stats.totalActivities` from UserStatsV2

---

## Technical Implementation Notes

### Data Flow
1. Activities are tracked in real-time via `statsTracker.trackActivity()`
2. Stats are stored in IndexedDB for offline access
3. Premium users get cloud sync via Firebase
4. Guest users have memory-only stats that reset on page reload

### Activity Types
The following activities contribute to the stats:
- `flashcard_session` - Flashcard reviews
- `article_read` - News article completions
- `story_read` - Story completions  
- `game_played` - Any game completion
- `drill_completed` - Conjugation drill completions
- `kanji_studied` - Kanji learning sessions
- `vocab_studied` - Vocabulary study sessions

### Update Frequency
- **Real-time**: All stats update immediately when activities are tracked
- **Sync**: Premium users sync to cloud every 30 seconds or on activity
- **Cache**: Stats are cached in memory for performance

### Edge Cases
- **Timezone changes**: Stats respect the user's current timezone
- **Clock changes**: Daylight saving time is handled automatically
- **Data migration**: Old stats are preserved during system updates
- **Offline mode**: Stats continue tracking offline and sync when reconnected

---

## Detailed Statistics (Account Page)

Registered users (free and premium) can access comprehensive statistics on the Account page, including:

### Daily Breakdown
- Individual counts for Flashcards, Articles, Stories, and Games
- Current date display in dd/MM/yyyy format
- Real-time updates as activities are completed

### Weekly Summary (Last 7 Days)
- Breakdown by activity type
- Total activities count
- Rolling 7-day window

### Monthly Summary (Last 30 Days)
- Breakdown by activity type
- Total activities count
- Rolling 30-day window

### All-Time Statistics
- Total activities across all categories
- Days active
- Individual counts for each activity type
- Performance metrics (accuracy, total questions)
- Member since date

### Access Requirements
- **Guest users**: No access (stats don't persist)
- **Free users**: Full access to detailed stats
- **Premium users**: Full access to detailed stats with cloud sync