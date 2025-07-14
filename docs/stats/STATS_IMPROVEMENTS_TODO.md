# 📊 Stats System Improvements - Implementation Plan

> **Created**: January 2025  
> **Status**: PENDING - Set aside for future implementation  
> **Priority**: High - Data integrity and accuracy issues

## 🚨 Critical Issues to Fix

### 1. No Uniqueness Tracking for Learned Items
**Problem**: `totalKanjiLearned` and `totalWordsLearned` can count the same item multiple times  
**Current Code Location**: `/src/lib/stats/statsTracker.ts` line ~490  
**Solution**:
```typescript
// Add to UserStatsV2 interface:
interface UserStatsV2 {
  // ... existing fields
  learnedKanjiSet: string[];  // Array of unique kanji IDs
  learnedWordsSet: string[];  // Array of unique word IDs
}

// Update tracking logic:
if (!this.stats.learnedKanjiSet.includes(kanjiId)) {
  this.stats.learnedKanjiSet.push(kanjiId);
  this.stats.totalKanjiLearned = this.stats.learnedKanjiSet.length;
}
```

### 2. Missing Word Learning Implementation
**Problem**: `totalWordsLearned` exists but is never incremented  
**Files to Update**:
- `/src/lib/stats/statsTracker.ts` - Add word tracking logic
- `/src/lib/stats/trackingEvents.ts` - Update `trackVocabStudied` function

### 3. No Data Validation
**Problem**: No validation for impossible values (e.g., correct > total)  
**Solution**: Add validation method in statsTracker.ts

## 💡 Improvements to Implement

### 1. Activity-Specific Accuracy Calculations
**Current**: All marked as "future implementation"  
**Implement**:
- `drillAccuracy`: Track correct/total for drill activities only
- `kanjiAccuracy`: Track correct/total for kanji activities only  
- `gameAccuracy`: Track correct/total for game activities only

### 2. Session-Level Tracking
**Add**: Study session tracking for better insights
```typescript
interface StudySession {
  sessionId: string;
  startTime: number;
  endTime: number;
  activities: ActivityEvent[];
  focusScore: number;
}
```

### 3. Deduplication for Activities
**Add**: Hash-based deduplication to prevent double-counting
```typescript
interface ActivityEvent {
  // ... existing fields
  hash: string; // Hash of type + timestamp + details
}
```

### 4. Data Integrity Checks
**Add**: Validation method to ensure data consistency
- Current streak ≤ longest streak
- All numeric values ≥ 0
- Accuracy values between 0-100

### 5. Performance Optimizations
- Cache streak calculations
- Batch database writes
- Optimize daily activity queries

## 📊 Firebase Structure Updates

### 1. New Firestore Structure
```
userStats/{userId}/
  ├── stats (existing document)
  ├── learnedItems/
  │   ├── kanji/{kanjiId} (subcollection)
  │   │   └── { character, learnedAt, level }
  │   └── words/{wordId} (subcollection)
  │       └── { word, reading, learnedAt }
  └── sessions/{sessionId} (subcollection)
      └── { startTime, endTime, activities[] }
```

### 2. New Indexes Needed
```json
// firestore.indexes.json additions:
{
  "collectionGroup": "dailyActivities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```

### 3. Updated Security Rules
```javascript
// firestore.rules additions:
match /userStats/{userId}/learnedItems/{type}/{itemId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == userId;
}

match /userStats/{userId}/sessions/{sessionId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == userId;
}
```

## 🔧 Implementation Steps

### Phase 1: Core Fixes
1. [ ] Add uniqueness tracking for kanji/words
2. [ ] Implement word learning tracking
3. [ ] Add data validation
4. [ ] Update Firebase structure
5. [ ] Deploy new security rules

### Phase 2: Enhancements
1. [ ] Implement activity-specific accuracy
2. [ ] Add session tracking
3. [ ] Add deduplication logic
4. [ ] Optimize performance

### Phase 3: Migration
1. [ ] Create migration script for existing users
2. [ ] Backfill learned items from activity history
3. [ ] Update stats version to 2.1
4. [ ] Test with production data copy

## 📝 Testing Checklist

### Unit Tests
- [ ] Test uniqueness tracking prevents duplicates
- [ ] Test word learning increments correctly
- [ ] Test validation catches invalid data
- [ ] Test accuracy calculations by activity type
- [ ] Test session tracking

### Integration Tests
- [ ] Test Firebase sync with new structure
- [ ] Test migration script on test data
- [ ] Test performance with large datasets
- [ ] Test backwards compatibility

### Manual Testing
- [ ] Test all tracking functions
- [ ] Verify stats display correctly
- [ ] Check debug panel shows new data
- [ ] Test on mobile devices
- [ ] Verify cloud sync works

## 📋 Files to Modify

1. `/src/lib/stats/statsTracker.ts` - Core tracking logic
2. `/src/lib/stats/trackingEvents.ts` - Tracking functions
3. `/src/types/stats.ts` - Updated interfaces
4. `/src/hooks/useStats.ts` - Hook updates
5. `/src/components/stats/StatsBar.tsx` - Display updates
6. `/firestore.rules` - Security rules
7. `/firestore.indexes.json` - New indexes
8. `/scripts/migrate-stats-v2.1.js` - Migration script (create)

## 🎯 Success Criteria

1. **Data Integrity**: No duplicate counting of learned items
2. **Completeness**: All stats fields are properly tracked
3. **Performance**: No degradation in app performance
4. **Accuracy**: All calculations are correct and validated
5. **Migration**: Existing user data migrated successfully
6. **Testing**: 100% test coverage for stats system

## 📌 Notes

- This upgrade should be backwards compatible
- Consider feature flag for gradual rollout
- Monitor Firebase costs after adding subcollections
- Document all changes in STATS.md after implementation

---

**When ready to implement**: Start with Phase 1 (Core Fixes) as these address critical data integrity issues. Phase 2 and 3 can be implemented incrementally.