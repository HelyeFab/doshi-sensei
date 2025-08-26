#!/bin/bash

# Test refund webhook with proper signature
echo "📤 Sending test refund event to webhook..."

# Use Stripe CLI to trigger a test event
stripe trigger charge.refunded --live

echo ""
echo "📋 Now checking Firebase logs for processing..."
echo ""

# Check logs
firebase functions:log --only stripeWebhook | tail -20