#!/bin/bash

# Test Stripe Refund Flow
# This script tests the complete refund flow using Stripe CLI

echo "================================"
echo "  Stripe Refund Flow Tester"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if email is provided
EMAIL=${1:-"test@example.com"}

echo -e "${YELLOW}Testing refund for user: $EMAIL${NC}"
echo ""

# Option 1: Test with local webhook simulation
echo -e "${GREEN}Option 1: Local Webhook Simulation${NC}"
echo "Run this to simulate a refund webhook locally:"
echo -e "${YELLOW}node scripts/test-refund-webhook.js $EMAIL${NC}"
echo ""

# Option 2: Test with Stripe CLI (using test mode)
echo -e "${GREEN}Option 2: Stripe CLI Test Event${NC}"
echo "This will send a real test webhook from Stripe to your production endpoint:"
echo ""

# Trigger a test refund event
echo "Triggering test refund event..."
stripe trigger charge.refunded \
  --add "data.object.billing_details.email=$EMAIL" \
  --add "data.object.receipt_email=$EMAIL" \
  --add "data.object.amount=999" \
  --add "data.object.refunded=true" \
  --add "data.object.amount_refunded=999"

echo ""
echo -e "${GREEN}Option 3: Manual Test in Stripe Dashboard${NC}"
echo "1. Go to https://dashboard.stripe.com/test/payments"
echo "2. Find a test payment or create one"
echo "3. Click on the payment and select 'Refund payment'"
echo "4. Process the refund"
echo "5. Check webhook logs at: https://dashboard.stripe.com/test/webhooks"
echo ""

echo -e "${YELLOW}Verification Steps:${NC}"
echo "1. Check function logs:"
echo "   firebase functions:log --project doshi-sensei | grep refund"
echo ""
echo "2. Check user's subscription in Firebase:"
echo "   - Go to Firebase Console > Firestore"
echo "   - Find user by email: $EMAIL"
echo "   - Verify subscription.plan = 'free'"
echo ""
echo "3. Test in app:"
echo "   - Login as the user"
echo "   - Try accessing premium features"
echo "   - Should be blocked with upgrade prompt"
echo ""