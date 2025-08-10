# Stripe Price Update - August 10, 2025

## Summary
Successfully migrated from old test prices ($3.99/$39.99) to new LIVE prices (£8.99/£89.99) for production.

## Old Prices (ARCHIVED)
- Monthly: `price_1RakzXHdrJomitOwZc0HJC4J` ($3.99) - TEST MODE
- Yearly: `price_1RakzXHdrJomitOwE7B56erf` ($39.99) - TEST MODE

## New LIVE Prices (ACTIVE)
- **Monthly**: `price_1RubMXHdrJomitOwNNI4LmWB` (£8.99/month)
- **Yearly**: `price_1RubMxHdrJomitOwElEo6nys` (£89.99/year)
- **Product ID**: `prod_SqHvV6k5X9KQ85`

## Files Updated
1. **Environment Variables** (`.env`)
   - `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID`

2. **Firebase Functions** (`functions/src/index.ts`)
   - Updated price mapping in `handleSubscriptionUpdate` function
   - All backup files updated

3. **Documentation**
   - `docs/subscription-system/STRIPE_SETUP_GUIDE.md`

## Deployment Status
✅ Firebase function `stripeWebhook` deployed successfully
✅ Webhook URL: https://stripewebhook-jtmxvmnera-uc.a.run.app

## Archived Products
- `prod_SqGE0qGQu539BO` - Old yearly product (archived)
- `prod_SqGCp1boveL8Bp` - Old monthly product (archived)

## Testing Checklist
- [ ] Test new subscription with monthly price
- [ ] Test new subscription with yearly price
- [ ] Verify webhook receives correct price IDs
- [ ] Confirm subscription status updates in Firebase

## Important Notes
- Using LIVE mode keys for production
- Old test mode products/prices have been archived
- All new subscriptions will use GBP currency
- Webhook is configured to handle the new price IDs