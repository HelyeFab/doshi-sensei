# Streak System Documentation

## Overview

The streak system in Doshi Sensei tracks consecutive days of user activity to encourage daily engagement with the Japanese learning app. The system is designed to be both motivating and forgiving, allowing users to maintain streaks with minimal daily effort.

## How Streaks Work

### Basic Concept
- A **streak** represents the number of consecutive days a user has performed at least one qualifying activity
- Streaks increment by 1 for each consecutive day of activity
- Missing a day breaks the streak, resetting it to 1 on the next activity
- The system tracks both `currentStreak` and `longestStreak`

### Day Boundaries
- Uses **UTC midnight** as the day boundary
- All dates are normalized to ISO format (`YYYY-MM-DD`) for consistency
- Timezone changes are handled gracefully

## Activities That Count for Streaks

### ✅ Qualifying Activities

#### 1. Completing a Drill Session
- **Location**: `src/app/drill/page.tsx`
- **Trigger**: Finishing any conjugation drill or flashcard review
- **Method**: `StatsManager.recordDrillSession()`
- **Requirements**:
  - Must complete the entire drill (all questions)
  - Any score counts (even 0% accuracy)
  - Both conjugation drills and flashcard reviews qualify

#### 2. Viewing a Word in Practice Mode
- **Location**: `src/app/practice/page.tsx`
- **Trigger**: Clicking on a word to view its details
- **Method**: `StatsManager.recordWordStudied()`
- **Requirements**:
  - Simply opening a word's practice page counts
  - No additional interaction required
  - Minimal effort activity

#### 3. Completing a Kanji Study Session
- **Location**: `src/utils/kanjiStudyProgress.ts`
- **Trigger**: Finishing a kanji study session
- **Method**: `StatsManager.recordKanjiStudySession()`
- **Requirements**:
  - Must complete the full study session
  - Any score counts (even 0% accuracy)
  - Starting but not finishing doesn't count

### ❌ Activities That Don't Count

- Opening the app without performing qualifying activities
- Browsing vocabulary without selecting words
- Viewing settings or other configuration pages
- Reading stories (has separate tracking)
- Playing games (Kana Drop, etc.)
- Saving words to lists
- Viewing kanji mood boards
- Any other app usage that doesn't trigger the three qualifying methods

## Streak Logic Rules

### Same Day Multiple Activities
```typescript
if (normalizedLastActive === normalizedToday) {
  return; // No change to streak
}
```

**Behavior**: Multiple activities on the same day count as **one day**:
- Complete 3 drills + view 5 words + kanji study = **1 day**
- Any combination of qualifying activities = **1 day**

### Consecutive Days
```typescript
if (diffDays === 1) {
  stats.currentStreak += 1; // Increment streak
}
```

**Behavior**: Each consecutive day of activity increments the streak:
- Day 1: Drill → Streak = 1
- Day 2: Word study → Streak = 2
- Day 3: Kanji study → Streak = 3

### Streak Break
```typescript
if (diffDays > 1) {
  stats.currentStreak = 1; // Reset to 1
}
```

**Behavior**: Missing a day breaks the streak:
- Day 1: Drill → Streak = 1
- Day 2: No activity → Streak = 1 (maintained)
- Day 3: No activity → Streak = 1 (maintained)
- Day 4: Drill → Streak = 1 (reset, not 2)

### Negative Day Differences
```typescript
else {
  // Negative difference (clock moved backwards) - maintain streak but don't increment
  console.warn('Negative day difference detected, maintaining current streak');
}
```

**Behavior**: Clock changes maintain the current streak without incrementing.

## Implementation Details

### Data Storage

#### Local Storage
- **Key**: `'doshi_sensei_user_stats'`
- **Format**: JSON with UserStats interface
- **Sync**: Immediate updates for fast UI response

#### Cloud Storage (Premium Users)
- **Collection**: `'stats'`
- **Document**: `'user_stats'`
- **Sync**: Background sync with conflict resolution

### UserStats Interface
```typescript
interface UserStats {
  currentStreak: number;      // Current consecutive days
  longestStreak: number;      // Highest streak ever achieved
  lastActiveDate: string;     // Last day user was active (ISO format)
  firstUseDate: string;       // First day user used the app
  totalDaysUsed: number;      // Total unique days used
  // ... other stats
}
```

### Key Methods

#### `updateDailyUsageAndStreak()`
- **Purpose**: Core streak calculation logic
- **Called by**: All qualifying activity methods
- **Features**: Date normalization, streak validation

#### `validateStreak()`
- **Purpose**: Validate stored streak against actual activity data
- **Features**: Cross-references with drill history
- **Output**: Console warnings for mismatches

#### `mergeStreaksIntelligently()`
- **Purpose**: Smart cloud sync conflict resolution
- **Logic**: Prefers streaks from more recent activity
- **Features**: Logging for monitoring

#### `recalculateStreak()`
- **Purpose**: Manual streak correction from activity data
- **Use case**: Debugging and fixing corrupted streaks
- **Features**: Rebuilds streak from actual session data

## Cloud Sync Behavior

### Conflict Resolution
The system uses intelligent merging for streaks across devices:

1. **No Activity**: If one device has no streak, use the other
2. **Recent Activity**: If both devices have recent activity (within 1 day), use the higher streak
3. **Different Activity**: Use the streak from the device with more recent activity

### Example Scenarios

#### Scenario 1: Device A More Recent
- Device A: 5-day streak, last active 2 hours ago
- Device B: 3-day streak, last active 2 days ago
- **Result**: Use Device A's 5-day streak

#### Scenario 2: Both Recent
- Device A: 3-day streak, last active 1 hour ago
- Device B: 5-day streak, last active 30 minutes ago
- **Result**: Use Device B's 5-day streak (higher)

#### Scenario 3: No Conflict
- Device A: 0-day streak, last active 5 days ago
- Device B: 2-day streak, last active 1 hour ago
- **Result**: Use Device B's 2-day streak

## Real-World Examples

### Daily User
```
Monday: Complete 1 drill → Streak = 1
Tuesday: View 3 words → Streak = 2
Wednesday: Complete kanji session → Streak = 3
Thursday: Complete 2 drills → Streak = 4
Friday: View 1 word → Streak = 5
```

### Inconsistent User
```
Monday: Complete drill → Streak = 1
Tuesday: No activity → Streak = 1 (maintained)
Wednesday: No activity → Streak = 1 (maintained)
Thursday: View word → Streak = 1 (reset, not 2)
Friday: Complete drill → Streak = 2
```

### Multiple Activities Per Day
```
Monday: Complete drill + view 5 words + kanji study → Streak = 1
Tuesday: Complete 3 drills → Streak = 2
Wednesday: View 1 word → Streak = 3
```

## Minimum Effort Strategy

### Easiest Way to Maintain Streak
**View one word in practice mode** - This requires minimal effort:
1. Go to Practice page
2. Click on any word
3. That's it! Streak maintained for the day

### Other Quick Options
1. **Complete any drill** (even with 0% accuracy)
2. **Complete any kanji study session** (even with 0% accuracy)

## Error Handling & Validation

### Streak Validation
The system validates streaks against actual activity data:
- Cross-references with drill history
- Warns about mismatches in console
- Option for auto-correction (disabled by default)

### Edge Cases Handled
- **Timezone changes**: Normalized date comparison
- **Clock manipulation**: Maintains streak on negative differences
- **Network issues**: Local storage ensures streak isn't lost
- **Multiple devices**: Intelligent conflict resolution

### Debugging Tools
- **Console logs**: Detailed logging for streak operations
- **`recalculateStreak()`**: Manual correction method
- **Validation warnings**: Automatic mismatch detection

## Performance Considerations

### Optimization Features
- **Local-first**: Always loads from localStorage first
- **Background sync**: Cloud sync doesn't block UI
- **Timeout protection**: 10-second sync timeout
- **Retry logic**: 2 retry attempts with exponential backoff

### Validation Performance
- **Limited scope**: Only validates last 30 days or streak length
- **Efficient grouping**: Uses Map for O(1) date lookups
- **Async operation**: Doesn't block streak updates

## Monitoring & Maintenance

### Console Monitoring
Watch for these log messages:
- `"Streak validation mismatch"` - Indicates potential corruption
- `"Streak merge: Both devices have recent activity"` - Cloud sync decision
- `"Negative day difference detected"` - Clock manipulation detected

### Manual Recovery
Use `StatsManager.recalculateStreak()` to fix corrupted streaks:
```typescript
const result = await StatsManager.recalculateStreak();
console.log(result.message); // Shows what was corrected
```

## Future Improvements

### Potential Enhancements
1. **Timezone-aware day boundaries**: Use user's local timezone
2. **Activity weighting**: Different activities could have different weights
3. **Streak milestones**: Special rewards for streak achievements
4. **Streak recovery**: Grace period for missed days
5. **Activity history**: Detailed view of streak-building activities

### Technical Improvements
1. **Batch validation**: Validate streaks less frequently
2. **Caching**: Cache validation results
3. **Background validation**: Run validation in background
4. **Metrics**: Track streak-related performance metrics

## Conclusion

The streak system is designed to encourage daily engagement while being robust and user-friendly. It handles edge cases gracefully and provides tools for monitoring and maintenance. The system balances motivation with forgiveness, making it easy for users to maintain streaks with minimal daily effort.
