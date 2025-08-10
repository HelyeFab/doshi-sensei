#\!/bin/bash

# Set Stripe configuration for Firebase Functions
echo "Setting up Firebase Functions configuration..."

# You'll need to replace these with your actual values
firebase functions:config:set \
  stripe.secret_key="YOUR_STRIPE_SECRET_KEY" \
  stripe.webhook_secret="YOUR_STRIPE_WEBHOOK_SECRET"

echo "Configuration set\! Run 'firebase deploy --only functions' to deploy."
