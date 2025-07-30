#!/bin/bash

echo "🧪 Stripe Webhook Test Commands"
echo "==============================="
echo ""

# Test 1: Check if webhook is alive
echo "1️⃣ Test if webhook is accessible:"
echo "curl https://doshisensei.com/.netlify/functions/api-stripe-webhook"
echo ""

# Test 2: Send a POST (will fail auth but shows it's working)
echo "2️⃣ Test POST (will fail auth - that's expected):"
echo "curl -X POST https://doshisensei.com/.netlify/functions/api-stripe-webhook \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"type\":\"test\",\"data\":{}}'"
echo ""

echo "3️⃣ To test with Stripe Dashboard:"
echo "   1. Go to https://dashboard.stripe.com/test/webhooks"
echo "   2. Click on your webhook (exquisite-victory)"
echo "   3. In the top right, click 'Send test webhook'"
echo "   4. Choose an event type (e.g., 'customer.subscription.created')"
echo "   5. Click 'Send test webhook'"
echo ""
echo "   The response will show in Stripe Dashboard"
echo "   Check Netlify logs for detailed processing info"
echo ""

echo "4️⃣ Required Netlify Environment Variables:"
echo "   ✓ STRIPE_SECRET_KEY"
echo "   ✓ STRIPE_WEBHOOK_SECRET (from Stripe webhook page)"
echo "   ✓ FIREBASE_SERVICE_ACCOUNT"
echo "   ✓ NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "   ✓ NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID"