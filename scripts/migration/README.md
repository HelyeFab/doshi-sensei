# Review Hub Migration Guide

## Overview

Simple migration scripts to move your 3 existing users to the new unified Review Hub system. The migration combines data from:
- Kanji Mastery progress
- Textbook Vocabulary
- Custom Flashcards

Into a single unified `review_hub` collection in Firebase.

## Prerequisites

1. **Firebase Admin Credentials** in `.env.local`:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

2. **Node.js 20+** installed
3. **Access to Firebase Console** to verify results

## Migration Process

### Step 1: Dry Run (Test First!)

Always start with a dry run to see what will happen:

```bash
cd scripts/migration
./run-migration.sh
```

This will:
- Connect to Firebase
- Find your 3 users
- Show what data will be migrated
- NOT modify any data

### Step 2: Review Output

Check the dry run output for:
- Number of users found
- Items to be migrated per user
- Any errors or warnings

### Step 3: Run Live Migration

When ready, run the actual migration:

```bash
./run-migration.sh --live
```

This will:
- Create a backup (in `./backups/`)
- Migrate all user data
- Update user records with migration status
- Verify the migration

### Step 4: Verify Migration

Check that everything worked:

```bash
npx tsx verify-migration.ts
```

This shows:
- Migration status per user
- Total items migrated
- Sample data
- Any potential issues

## Data Structure

### Before Migration
```
Firebase:
├── users/
│   └── {userId}/
├── kanjiProgress/
│   └── {userId}_items/
├── vocabulary/
│   └── {userId}_items/
└── flashcards/
    └── {userId}_cards/
```

### After Migration
```
Firebase:
├── users/
│   └── {userId}/
│       └── migration: { reviewHub: { completed: true, ... } }
└── review_hub/
    └── {unified_items}/
        ├── id: "kanji_userId_字"
        ├── userId: "..."
        ├── sourceType: "kanji_mastery"
        ├── content: { primary: "字", ... }
        ├── scheduling: { dueDate, interval, ... }
        └── statistics: { totalReviews, ... }
```

## Unified Item Schema

Each migrated item has:
- **Identity**: Unique ID, user ID, source type
- **Content**: Primary content, meanings, readings
- **Scheduling**: FSRS/SM2 algorithm parameters
- **Statistics**: Review counts, timestamps
- **Sync**: Version control for updates

## Rollback

If something goes wrong, you can rollback:

```bash
npx tsx verify-migration.ts --rollback
```

This will:
- Delete all items from `review_hub` collection
- Remove migration status from users
- You can then restore from backup if needed

## Manual Backup Restore

Backups are stored in `./backups/backup_[timestamp].json`

To restore manually:
1. Use Firebase Console to delete `review_hub` collection
2. Import backup JSON through Firebase Console
3. Re-run migration if needed

## Troubleshooting

### "No users found"
- Check that your Firebase credentials are correct
- Verify users exist in Firebase Console
- Check collection names match your setup

### "No data found for user"
- User might not have any review data
- Collection structure might be different
- Check Firebase Console directly

### "Permission denied"
- Ensure service account has proper permissions
- Check Firebase project ID matches

## Post-Migration

After successful migration:

1. **Test the app** with migrated users
2. **Monitor for issues** for 24-48 hours
3. **Keep backups** for at least 30 days
4. **Update app code** to use new `review_hub` collection

## Support

If you encounter issues:
1. Check the dry run output first
2. Verify Firebase credentials
3. Check Firebase Console for data structure
4. Review error messages in console

## Safety Notes

- Always run dry run first
- Migration creates backups automatically
- Original data is preserved (not deleted)
- Can rollback if needed
- Only affects 3 users (safe scope)