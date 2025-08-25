#!/bin/bash

echo "🔍 Monitoring Firebase Webhook..."
echo "================================================"
echo "Fetching recent logs and watching for new events..."
echo ""

# Monitor Firebase function logs (without --follow since it's not supported)
while true; do
  firebase functions:log --only stripeWebhook | tail -20
  echo ""
  echo "Refreshing in 5 seconds... (Press Ctrl+C to stop)"
  sleep 5
  clear
done