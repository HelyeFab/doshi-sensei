#!/bin/bash

# Trigger a test subscription creation event
echo "🚀 Triggering test subscription creation..."

# Create a test subscription with metadata
stripe trigger customer.subscription.created \
  --add customer:metadata.firebaseUID=test_user_stripe_cli_$(date +%s) \
  --add subscription:metadata.firebaseUID=test_user_stripe_cli_$(date +%s)

echo ""
echo "✅ Test event triggered!"
echo ""
echo "Check the webhook logs to see if it was processed correctly."