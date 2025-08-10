#!/bin/bash

# Script to delete unused files found by find-unused-files.js
# Generated on: $(date)
# 
# IMPORTANT: Review this list carefully before running!
# Some files might be:
# - Used by external tools (Sentry, analytics, etc.)
# - Referenced in ways the script couldn't detect
# - Needed for future features
#
# To run this script:
# chmod +x scripts/delete-unused-files.sh
# ./scripts/delete-unused-files.sh

echo "🗑️  Unused Files Deletion Script"
echo "================================"
echo ""
echo "This script will delete files identified as unused by find-unused-files.js"
echo ""
echo "⚠️  WARNING: This action cannot be undone!"
echo "Make sure you have:"
echo "  ✓ Reviewed the file list"
echo "  ✓ Committed any pending changes"
echo "  ✓ Have a backup if needed"
echo ""
read -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Deletion cancelled."
    exit 0
fi

echo ""
echo "📋 Files to be deleted:"
echo ""

# Counter for deleted files
deleted_count=0
skipped_count=0

# Function to safely delete a file
delete_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "  ✓ Deleting: $file"
        rm -f "$file"
        ((deleted_count++))
    else
        echo "  ⚠️  File not found: $file"
        ((skipped_count++))
    fi
}

# Function to safely delete a directory
delete_dir() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo "  ✓ Deleting directory: $dir"
        rm -rf "$dir"
        ((deleted_count++))
    else
        echo "  ⚠️  Directory not found: $dir"
        ((skipped_count++))
    fi
}

echo "🧪 Test files (you may want to keep these):"
echo "-------------------------------------------"
# Uncomment the lines below if you want to delete test files
# delete_file "__tests__/subscription-system-v2.test.tsx"
# delete_file "__tests__/cache/adjectiveCache.test.ts"
# delete_file "__tests__/cache/audioCache.test.ts"
# delete_file "__tests__/cache/integration.test.tsx"
# delete_file "__tests__/cache/kanjiCache.test.ts"
# delete_file "__tests__/cache/resourceCacheManager.test.ts"
# delete_file "__tests__/cache/useResourceCache.test.tsx"
# delete_file "__tests__/cache/verbCache.test.ts"
# delete_file "__tests__/integration/conjugation-flow.test.tsx"
# delete_file "src/app/__tests__/page.test.tsx"
# delete_file "src/app/drill/__tests__/page.test.tsx"
# delete_file "src/hooks/__tests__/useEviction.test.tsx"
# delete_file "src/lib/__tests__/firebase-admin-safe.test.ts"
# delete_file "src/lib/cache/__tests__/articleCache.eviction.test.ts"
# delete_file "src/lib/cache/eviction/__tests__/integration.test.ts"
# delete_file "src/lib/cache/eviction/__tests__/lruEvictionEngine.test.ts"
# delete_file "src/lib/cache/eviction/__tests__/storageLimits.test.ts"
# delete_file "src/lib/sync/__tests__/firebaseSyncAdapter.test.ts"
# delete_file "src/lib/sync/__tests__/premiumSync.integration.test.ts"
# delete_file "src/lib/sync/__tests__/sync-eviction.integration.test.ts"
# delete_file "src/utils/__tests__/api.test.ts"
# delete_file "src/utils/__tests__/conjugation.test.ts"
# delete_file "src/utils/__tests__/newsScraper.test.ts"
echo "  ℹ️  Test files are commented out by default. Uncomment to delete."
echo ""

echo "🧩 Unused components:"
echo "--------------------"
delete_file "src/components/BottomNavigation.tsx"
delete_file "src/components/ErrorBoundarySubscription.tsx"
delete_file "src/components/FeatureGate.tsx"
delete_file "src/components/MobileHome.tsx"
delete_file "src/components/UsageLimitDisplay.tsx"
delete_file "src/components/audio/ImprovedArticleAudioPlayer.tsx"
echo ""

echo "📚 Example files:"
echo "----------------"
delete_dir "src/examples/"
delete_file "src/lib/access/example-usage.tsx"
echo ""

echo "🪝 Unused hooks:"
echo "---------------"
delete_file "src/hooks/useAppSettings.ts"
delete_file "src/hooks/usePremiumSync3.ts"
echo ""

echo "🛠️  Unused utilities:"
echo "-------------------"
delete_file "src/utils/apiTest.ts"
delete_file "src/utils/bookmarkManager.ts"
delete_file "src/utils/clearTTSCache.ts"
delete_file "src/utils/debugBookmarks.ts"
delete_file "src/utils/edgeTTS.ts"
delete_file "src/utils/guestMigration.ts"
delete_file "src/utils/kanjiDistributionAnalysis.ts"
delete_file "src/utils/searchTest.ts"
delete_file "src/utils/sentenceListManager.ts"
delete_file "src/utils/spacedRepetitionReading.ts"
delete_file "src/utils/storageDemo.ts"
delete_file "src/utils/subscriptionLogger.ts"
delete_file "src/utils/testBookmarkSystem.ts"
delete_file "src/utils/testFirebaseStorage.ts"
echo ""

echo "📦 Unused lib files:"
echo "-------------------"
delete_file "src/lib/features/sync-feature.ts"
delete_file "src/lib/sync/syncDataAdapter.ts"
echo ""

echo "📝 Unused type definitions:"
echo "--------------------------"
delete_file "src/types/edge-tts.d.ts"
delete_file "src/types/jest-dom.d.ts"
delete_file "src/types/kuromoji.d.ts"
echo ""

echo "🔧 Old/unused scripts:"
echo "---------------------"
delete_file "scripts/addTestData.js"
delete_file "scripts/check-article-content.js"
delete_file "scripts/check-user-subscriptions.js"
delete_file "scripts/compare-env-files.js"
delete_file "scripts/create-clean-env-backup.js"
delete_file "scripts/diagnose-articles.js"
delete_file "scripts/ensure-complete-subscription.js"
delete_file "scripts/eviction-rollout.js"
delete_file "scripts/fix-admin-subscription.js"
delete_file "scripts/prepare-deploy.js"
delete_file "scripts/rescrape-article.js"
delete_file "scripts/setup-stripe-products.js"
delete_file "scripts/test-stripe-domain.js"
delete_file "scripts/test-sync.js"
delete_file "scripts/upgrade-user-premium.js"
delete_file "src/scripts/fix-premium-subscription.js"
echo ""

echo "🌐 Generated/old public files:"
echo "-----------------------------"
delete_file "public/fallback-XObZRaQnd3N3SA2XOysnK.js"
delete_file "public/worker-XObZRaQnd3N3SA2XOysnK.js"
echo ""

echo "📄 Next.js generated files:"
echo "--------------------------"
# Note: next-env.d.ts is auto-generated by Next.js
# It's safe to delete as it will be regenerated
delete_file "next-env.d.ts"
echo ""

echo ""
echo "📊 Summary:"
echo "==========="
echo "  ✓ Files deleted: $deleted_count"
echo "  ⚠️  Files skipped: $skipped_count"
echo ""

if [ $deleted_count -gt 0 ]; then
    echo "✅ Cleanup complete!"
    echo ""
    echo "🔄 Next steps:"
    echo "  1. Run 'npm install' to ensure everything still works"
    echo "  2. Run 'npm run build' to verify the build"
    echo "  3. Test the application"
    echo "  4. Commit the changes"
else
    echo "ℹ️  No files were deleted."
fi