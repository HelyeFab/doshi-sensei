# Firestore Collections Documentation

## Overview
This document outlines all Firestore collections used in Doshi Sensei and identifies critical issues with data persistence.

## ⚠️ CRITICAL ISSUE IDENTIFIED
**The Universal Learning Analytics System (ULAS) is NOT saving learning events to a dedicated Firestore collection for persistence!**

### The Problem
- Learning events (what users view, practice, test) are only stored in:
  - **IndexedDB** (browser local storage) - gets cleared when browser data is cleared
  - **Memory** (temporary) - lost on page refresh
  - **Firebase** - ONLY for premium users, not for free users

### Why Your Review Page Was Blank
- Free users' learning data is stored only in IndexedDB
- If you clear browser data, switch devices, or use incognito mode, all learning history is lost
- The review system cannot retrieve what you learned yesterday because it wasn't persisted to Firebase

## 📊 User Activity & Stats Collections

### 1. `/userStats/{userId}/current/`
- `summary` - Streaks, total activities, dates
- `activities` - Activity counts by type (drills, stories, etc.)
- `performance` - Accuracy metrics and scores
- `metadata` - User info and version
- **Note**: Only synced for premium users

### 2. `/userStats/{userId}/dailyActivities/{date}/`
- Daily activity details with timestamps
- Activity summaries per day
- **Note**: Only synced for premium users

### 3. `/analytics/{userId}/events/`
- Individual learning events (premium only)
- Detailed tracking data for ULAS system
- **PROBLEM**: Free users never get this collection created

### 4. `/analytics/{userId}/stats/current`
- Aggregated analytics statistics
- **PROBLEM**: Premium-only feature

## 👤 User Data Collections

### 5. `/users/{userId}/`
- Main user profile document
- Subscription info, preferences, settings
- Pokedex data (caught Pokemon)

### 6. `/users/{userId}/srsData/{cardId}`
- Spaced repetition system data for flashcards
- Individual card review history

### 7. `/users/{userId}/kanjiProgress/{progressId}`
- Individual kanji learning progress
- Study sessions and mastery levels

### 8. `/users/{userId}/boardStats/{boardId}`
- Kanji board game statistics
- Performance metrics per board

### 9. `/users/{userId}/search_history/data`
- Search history (premium feature)
- Query logs and timestamps

### 10. `/users/{userId}/usage/current`
- Feature usage tracking for limits
- Daily/monthly usage counters

## 📚 Content Collections

### 11. `/articles/`
- Japanese articles for reading practice
- Scraped news content with metadata
- Expiration dates and difficulty levels

### 12. `/user_bookmarks/`
- Article bookmarks by users
- Saved reading materials

## 🔒 Security Collections

### 13. `/security_events/`
- Authentication and security events
- Login attempts, suspicious activities
- IP tracking and device fingerprints

## 💳 Subscription Collections

### 14. `/subscriptions/{subscriptionId}`
- Stripe/PayPal subscription data
- Payment history and status

### 15. `/subscription_events/`
- Subscription lifecycle events
- Upgrades, downgrades, cancellations

## 🚨 Missing Collections (NEEDED!)

### What's Missing for ULAS
The system needs these collections for ALL users (not just premium):

1. **`/learning_events/{userId}/events/`**
   - Store every learning interaction
   - What content was viewed/practiced
   - When it was accessed
   - Performance metrics

2. **`/user_knowledge/{userId}/items/`**
   - Track what kanji/vocab/grammar user has seen
   - Exposure count and contexts
   - Last seen timestamps

3. **`/review_queue/{userId}/items/`**
   - Items scheduled for review
   - SRS intervals and due dates
   - Review history

## 💡 Solution Recommendations

### Immediate Fix
1. Create a new collection `/learning_events/{userId}/` that stores data for ALL users
2. Implement a lightweight sync that works for free users (with limits)
3. Store at least 30 days of learning history in Firebase for all users

### Long-term Solution
1. Implement proper ULAS with dedicated collections
2. Create a tiered storage system:
   - Free users: 30 days of history
   - Premium users: Unlimited history
3. Add offline-first sync that automatically backs up to Firebase

## 📝 Summary

**Current State**:
- Free users: Data only in browser (IndexedDB) - easily lost
- Premium users: Data synced to Firebase every 30 seconds
- No dedicated learning events collection for the ULAS system

**Result**:
- Review pages blank after browser data cleared
- No way to track long-term learning progress for free users
- ULAS system cannot provide intelligent recommendations without persistent data

**Critical Need**:
- Implement Firebase persistence for ALL users' learning events
- Create dedicated collections for the learning analytics system
- Ensure data survives browser clears and device switches