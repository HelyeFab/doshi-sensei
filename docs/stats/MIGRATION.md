# 🔄 Stats System Migration Guide

## Migrating from Stats v1 to Stats v2

### Overview

The new stats system (v2) offers significant improvements:
- ✅ Integrated with storage system
- ✅ Real-time updates
- ✅ Proper date handling
- ✅ Event-driven architecture
- ✅ Better performance

### Migration Checklist

- [ ] Backup existing stats data
- [ ] Update imports in components
- [ ] Replace old tracking calls
- [ ] Run data migration
- [ ] Test thoroughly
- [ ] Clean up old code

---

## Step 1: Backup Existing Data

```typescript
// Run in browser console before migration
const backupStats = () => {
  const oldStats = localStorage.getItem('doshi_sensei_user_stats');
  const oldSessions = localStorage.getItem('doshi_sensei_drill_sessions');
  
  const backup = {
    stats: oldStats ? JSON.parse(oldStats) : null,
    sessions: oldSessions ? JSON.parse(oldSessions) : null,
    backupDate: new Date().toISOString(),
    version: 'v1'
  };
  
  // Save backup
  const blob = new Blob([JSON.stringify(backup, null, 2)], 
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stats-backup-${Date.now()}.json`;
  a.click();
  
  console.log('✅ Backup saved!');
};

backupStats();
```

---

## Step 2: Update Component Imports

### Old System (v1)
```typescript
// ❌ Old imports
import StatsManager from '@/utils/stats';

// ❌ Old usage
const stats = await StatsManager.getUserStats();
await StatsManager.recordDrillSession(10, 8, ['word1', 'word2']);
```

### New System (v2)
```typescript
// ✅ New imports
import { useStats } from '@/hooks/useStats';
import { trackDrillCompleted } from '@/lib/stats/trackingEvents';

// ✅ New usage
const { stats, loading } = useStats();
await trackDrillCompleted('conjugation', 10, 8, ['word1', 'word2']);
```

---

## Step 3: Update All Tracking Calls

### Component Migration Examples

#### Example 1: Drill Page
```typescript
// Old (v1)
const recordDrillSession = async (finalScore?: number) => {
  const actualScore = finalScore !== undefined ? finalScore : score;
  try {
    const wordsStudied = questions.map(q => q.word.id);
    await StatsManager.recordDrillSession(
      questions.length, 
      actualScore, 
      wordsStudied
    );
  } catch (err) {
    console.error('Error recording drill session:', err);
  }
};

// New (v2)
const recordDrillSession = async (finalScore?: number) => {
  const actualScore = finalScore !== undefined ? finalScore : score;
  try {
    const wordsStudied = questions.map(q => q.word.id);
    await trackDrillCompleted(
      'conjugation-drill',
      questions.length, 
      actualScore, 
      wordsStudied
    );
  } catch (err) {
    console.error('Error recording drill session:', err);
  }
};
```

#### Example 2: Story Page
```typescript
// Old (v1)
// No tracking in v1

// New (v2)
import { trackStoryRead } from '@/lib/stats/trackingEvents';

const completeStory = async () => {
  await trackStoryRead(
    story.id,
    story.title,
    readingTime
  );
};
```

#### Example 3: Kanji Browser
```typescript
// Old (v1)
await StatsManager.recordKanjiStudySession(
  questionsAnswered,
  correctAnswers,
  newKanjiLearned
);

// New (v2)
// Track each kanji individually
for (const kanji of studiedKanji) {
  await trackKanjiStudy(
    kanji.character,
    kanji.wasCorrect,
    'browser'
  );
}
```

---

## Step 4: Run Data Migration Script

Create and run this migration script:

```typescript
// src/utils/migrations/migrateStatsV1ToV2.ts
import { statsTracker } from '@/lib/stats/statsTracker';
import { db } from '@/utils/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function migrateStatsV1ToV2(userId: string) {
  console.log('🔄 Starting stats migration...');
  
  try {
    // 1. Load old stats from localStorage
    const oldStatsJson = localStorage.getItem('doshi_sensei_user_stats');
    const oldSessionsJson = localStorage.getItem('doshi_sensei_drill_sessions');
    
    if (!oldStatsJson) {
      console.log('No old stats found');
      return;
    }
    
    const oldStats = JSON.parse(oldStatsJson);
    const oldSessions = oldSessionsJson ? JSON.parse(oldSessionsJson) : [];
    
    console.log('Found old stats:', oldStats);
    console.log('Found sessions:', oldSessions.length);
    
    // 2. Reset new stats system
    await statsTracker.resetStats();
    
    // 3. Migrate drill sessions
    for (const session of oldSessions) {
      const date = new Date(session.date);
      
      // Create activity events for each session
      await statsTracker.trackActivity('drill', {
        total: session.questionsAnswered,
        correct: session.correctAnswers,
        itemId: session.wordsStudied?.join(','),
        // Backdate the activity
        _backdated: true,
        _originalDate: date.getTime()
      });
    }
    
    // 4. Migrate other activities from Firestore
    await migrateFirestoreActivities(userId);
    
    // 5. Force stats recalculation
    await statsTracker.forceSync();
    
    console.log('✅ Migration complete!');
    
    // 6. Optionally backup old data
    const migrationBackup = {
      oldStats,
      oldSessions,
      migrationDate: new Date().toISOString(),
      migratedTo: 'v2'
    };
    
    localStorage.setItem(
      'stats_migration_backup',
      JSON.stringify(migrationBackup)
    );
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function migrateFirestoreActivities(userId: string) {
  // Migrate story progress
  const storyProgress = await getDocs(
    query(collection(db, 'storyProgress'), 
    where('userId', '==', userId))
  );
  
  for (const doc of storyProgress.docs) {
    const data = doc.data();
    if (data.completed) {
      await statsTracker.trackActivity('story', {
        itemId: data.storyId,
        _backdated: true,
        _originalDate: data.completedAt?.toMillis() || Date.now()
      });
    }
  }
  
  // Add more activity migrations as needed...
}
```

### Running the Migration

```typescript
// In your app initialization or admin panel
import { migrateStatsV1ToV2 } from '@/utils/migrations/migrateStatsV1ToV2';

const runMigration = async () => {
  const { profile } = useUserProfile();
  
  if (!profile) {
    alert('Please login first');
    return;
  }
  
  if (confirm('Migrate stats to v2? This may take a few moments.')) {
    try {
      await migrateStatsV1ToV2(profile.uid);
      alert('Migration complete! Please refresh the page.');
      window.location.reload();
    } catch (error) {
      alert('Migration failed. See console for details.');
      console.error(error);
    }
  }
};
```

---

## Step 5: Update Stats Display Components

### Old Homepage Stats
```typescript
// ❌ Old implementation
const [stats, setStats] = useState<UserStats>({
  drillsCompleted: 0,
  accuracy: 0,
  streak: 0,
  // ...
});

useEffect(() => {
  loadStats();
}, []);

const loadStats = async () => {
  const userStats = await StatsManager.getUserStats();
  setStats({
    drillsCompleted: userStats.drillsCompleted,
    // ... manual mapping
  });
};
```

### New Homepage Stats
```typescript
// ✅ New implementation
import { StatsBar } from '@/components/stats/StatsBar';

// Simply use the component!
<StatsBar className="mb-8" />

// Or access stats directly
const { stats } = useStats();
// Auto-updates when activities are tracked!
```

---

## Step 6: Clean Up Old Code

### Files to Remove/Update

1. **Delete old stats manager:**
   ```bash
   rm src/utils/stats.ts
   ```

2. **Remove old imports:**
   ```bash
   # Find all files importing old stats
   grep -r "import.*StatsManager.*from.*@/utils/stats" src/
   ```

3. **Update tests:**
   - Replace `StatsManager` mocks with `statsTracker` mocks
   - Update test assertions for new data structure

### Environment Cleanup

```typescript
// After migration is confirmed working
const cleanupOldStats = () => {
  // Remove old localStorage keys
  localStorage.removeItem('doshi_sensei_user_stats');
  localStorage.removeItem('doshi_sensei_drill_sessions');
  
  // Keep backup for safety
  console.log('✅ Old stats cleaned up. Backup kept in stats_migration_backup');
};
```

---

## Verification Steps

### 1. Check Stats Loading
```typescript
// In browser console
const { stats } = await import('@/hooks/useStats');
console.log('New stats:', stats);
```

### 2. Test Activity Tracking
```typescript
// Track a test activity
await trackDrillCompleted('test', 5, 4);
// Check if stats updated
```

### 3. Verify Cloud Sync (Premium)
```typescript
// Force sync and check Firestore
await statsTracker.forceSync();
// Check Firebase Console > Firestore > userStats
```

### 4. Validate Historical Data
- Check if streak is correct
- Verify activity counts match
- Ensure dates are properly formatted

---

## Rollback Plan

If migration fails:

1. **Restore from backup:**
   ```typescript
   const backup = localStorage.getItem('stats_migration_backup');
   const { oldStats, oldSessions } = JSON.parse(backup);
   
   localStorage.setItem('doshi_sensei_user_stats', 
     JSON.stringify(oldStats));
   localStorage.setItem('doshi_sensei_drill_sessions', 
     JSON.stringify(oldSessions));
   ```

2. **Revert code changes:**
   ```bash
   git checkout -- src/app/drill/page.tsx
   git checkout -- src/app/page.tsx
   # ... revert other files
   ```

3. **Clear new stats:**
   ```typescript
   await statsTracker.resetStats();
   ```

---

## Post-Migration Checklist

- [ ] All pages load without errors
- [ ] Stats display correctly
- [ ] Activities track properly
- [ ] Streak calculation is accurate
- [ ] Cloud sync works (premium)
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Tests pass

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Review the troubleshooting guide
3. Use admin recovery tool
4. Contact support with:
   - Error messages
   - Browser/OS info
   - Migration backup file