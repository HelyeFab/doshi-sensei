#!/bin/bash

# Deploy Firebase Functions for Notifications
echo "🚀 Deploying Firebase Functions for Notification System..."

# Navigate to functions directory
cd "$(dirname "$0")"

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Deploy only notification functions
echo "☁️ Deploying notification functions to Firebase..."
firebase deploy --only functions:sendStudyReminders,functions:sendReviewReminders,functions:sendStreakReminders,functions:cleanupNotificationLogs

echo "✅ Notification functions deployed successfully!"
echo ""
echo "📋 Deployed functions:"
echo "  - sendStudyReminders (runs hourly)"
echo "  - sendReviewReminders (runs every 30 minutes)"
echo "  - sendStreakReminders (runs daily at 8 PM UTC)"
echo "  - cleanupNotificationLogs (runs weekly)"
echo ""
echo "🔗 View in Firebase Console:"
echo "  https://console.firebase.google.com/project/doshi-sensei/functions"