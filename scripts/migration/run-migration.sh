#!/bin/bash

# Simple migration script for 3 users
# Run with --live flag to actually modify data

set -e

echo "🚀 Doshi Sensei Review Hub - User Migration"
echo "==========================================="
echo ""

# Check if running in dry-run or live mode
if [[ "$1" == "--live" ]]; then
    echo "⚠️  LIVE MODE - Data will be modified!"
    echo "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5
    MODE="--live"
else
    echo "🔍 DRY RUN MODE - No data will be modified"
    echo "To run the actual migration, use: ./run-migration.sh --live"
    echo ""
    MODE=""
fi

# Check for Firebase service account file
if [ -f ../../firebase-service-account.json ]; then
    echo "✅ Found Firebase service account file"
else
    echo "⚠️  Firebase service account file not found at firebase-service-account.json!"
    exit 1
fi

# Create backup directory
mkdir -p ./backups
echo "✅ Backup directory ready"
echo ""

# Run the migration
echo "Starting migration..."
echo "--------------------"
npx tsx scripts/migration/migrate-users.ts $MODE

echo ""
echo "✅ Migration process completed!"
echo ""

# Show post-migration instructions
echo "📋 Post-Migration Checklist:"
echo "  1. Check the console output for any errors"
echo "  2. Verify data in Firebase Console:"
echo "     - Check 'review_hub' collection"
echo "     - Verify user migration status in 'users' collection"
echo "  3. Test the application with migrated users"
echo "  4. Keep the backup file for 30 days"
echo ""

if [[ "$1" != "--live" ]]; then
    echo "👉 Ready to migrate? Run: ./run-migration.sh --live"
fi