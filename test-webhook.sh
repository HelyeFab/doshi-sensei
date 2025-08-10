#!/bin/bash

# Replace with your actual Firebase UID
FIREBASE_UID="YOUR_FIREBASE_UID_HERE"

# Choose monthly or yearly
PLAN="monthly"  # Change to "yearly" to test yearly plan

# Set the price ID based on plan
if [ "$PLAN" = "yearly" ]; then
  PRICE_ID="price_1RubMxHdrJomitOwElEo6nys"
else
  PRICE_ID="price_1RubMXHdrJomitOwNNI4LmWB"
fi

# Create the webhook payload
PAYLOAD=$(cat <<EOF
{
  "id": "evt_test_$(date +%s)",
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_test_$(date +%s)",
      "object": "subscription",
      "status": "active",
      "customer": "cus_test_$(date +%s)",
      "current_period_end": $(date -d "+30 days" +%s),
      "cancel_at_period_end": false,
      "items": {
        "data": [{
          "price": {
            "id": "$PRICE_ID"
          }
        }]
      },
      "metadata": {
        "firebaseUID": "$FIREBASE_UID"
      }
    }
  }
}
EOF
)

echo "Testing $PLAN subscription..."
echo "Firebase UID: $FIREBASE_UID"
echo "Price ID: $PRICE_ID"
echo "---"

# Send the request
curl -X POST https://stripewebhook-jtmxvmnera-uc.a.run.app \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d "$PAYLOAD" \
  -v

echo ""
echo "Check your Firebase database at: users/$FIREBASE_UID"