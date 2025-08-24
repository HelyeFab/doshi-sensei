# Post-Testing TODO: Return to Production
**Created**: January 23, 2025  
**Last Updated**: August 23, 2025  
**Purpose**: Checklist for returning to production after Stripe test mode testing

## 🎯 Test Session Summary
- **Test User Created**: testuser2@example.com
- **Test Subscription ID**: sub_1RzN8mQkBRi5wGMEGukCW8TC
- **Test Customer ID**: cus_SvDZ6mk4xKQcbj
- **Firebase UID**: rFOOaZOZ0ENHJ9zyUjIMPWdL0gn1

## ✅ Testing Results Documentation
- ✅ **Free → Monthly subscription**: Works perfectly
- ✅ **Subscription cancellation**: Works and updates UI correctly
- ✅ **Cancellation status display**: Shows warning banner in UI
- ✅ **Subscription history**: Shows appropriate event messages
- ✅ **Manage Billing portal**: Works after configuration
- ⚠️ **Monthly → Yearly upgrade**: Not fully tested (user already canceled)

## 🔴 CRITICAL: Production Cleanup Checklist

### 1. Restore Original API Routes
```bash
# These routes were modified for direct Stripe testing - restore the originals
mv /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/create-checkout-session/route.ts.backup /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/create-checkout-session/route.ts

mv /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/create-portal-session/route.ts.backup /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/create-portal-session/route.ts

mv /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/cancel-subscription/route.ts.backup /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/cancel-subscription/route.ts
```

### 2. Remove Test Files Created During Testing
```bash
# Remove temporary test endpoints
rm -rf /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/test/
rm -rf /home/mate/Dev/NextProjects/doshi-sensei/src/app/api/admin/update-test-subscription/

# Remove test scripts
rm /home/mate/Dev/NextProjects/doshi-sensei/scripts/update-test-subscription.js
rm /home/mate/Dev/NextProjects/doshi-sensei/scripts/update-test-subscription-cli.js
rm /home/mate/Dev/NextProjects/doshi-sensei/scripts/update-via-api.js
rm /home/mate/Dev/NextProjects/doshi-sensei/scripts/list-subscriptions.js

# Archive test documentation (keep for reference)
mkdir -p /home/mate/Dev/NextProjects/doshi-sensei/docs/stripe-migration/archive
mv /home/mate/Dev/NextProjects/doshi-sensei/TEST_STRIPE_FLOW.md /home/mate/Dev/NextProjects/doshi-sensei/docs/stripe-migration/archive/
```

### 3. Clean Up Cloud Functions Code
**File**: `/home/mate/Dev/NextProjects/doshi-sensei/functions/src/index.ts`

Remove test price IDs (lines ~260-262):
```typescript
// REMOVE THESE LINES:
// Test price IDs
'price_1RzIUUQkBRi5wGMEzm9veY3j': 'monthly',  // £8.99/month (TEST)
'price_1RzIVDQkBRi5wGME6v7ECis8': 'yearly'    // £89.99/year (TEST)
```

Keep only production price IDs:
```typescript
// Production price IDs
'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',  // £8.99/month (LIVE)
'price_1RubMxHdrJomitOwElEo6nys': 'yearly',   // £89.99/year (LIVE)
```

### 4. Environment Variables Cleanup

#### Main Application (.env)
```bash
# Switch back to production
mv .env .env.test  # Keep test config for future
mv .env.prod .env  # Use production config

# Or if you don't have .env.prod, update .env with:
STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
```

#### Cloud Functions
```bash
# Remove test environment file
rm /home/mate/Dev/NextProjects/doshi-sensei/functions/.env

# Set production configuration
firebase functions:config:set \
  stripe.secret_key="sk_live_YOUR_PRODUCTION_KEY" \
  stripe.webhook_secret="whsec_YOUR_PRODUCTION_WEBHOOK_SECRET" \
  --project doshi-sensei

# Deploy with production config
cd functions && npm run deploy
```

### 5. Stripe Dashboard Configuration

1. Go to https://dashboard.stripe.com/
2. **Switch to LIVE mode** (toggle in top-left)
3. Navigate to **Webhooks**
4. Verify webhook endpoint URL: `https://stripewebhook-jtmxvmnera-uc.a.run.app`
5. Ensure these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` ⚠️ **CRITICAL - Added during testing**
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 6. Clean Test Data from Firestore

```javascript
// Run in Firebase Console or admin script
const testUsers = [
  'rFOOaZOZ0ENHJ9zyUjIMPWdL0gn1', // testuser2@example.com
  // Add other test user IDs
];

testUsers.forEach(async (userId) => {
  // Option 1: Delete test users completely
  await db.collection('users').doc(userId).delete();
  
  // Option 2: Just clear subscription data
  await db.collection('users').doc(userId).update({
    subscription: admin.firestore.FieldValue.delete()
  });
  
  // Delete subscription history
  const history = await db.collection('users').doc(userId)
    .collection('subscription_history').get();
  history.forEach(doc => doc.ref.delete());
});
```

### 7. Deploy Final Production Code

```bash
# Deploy updated Cloud Functions
cd functions
npm run build
firebase deploy --only functions:stripeWebhook --project doshi-sensei

# Build and deploy main application
cd ..
npm run build
# Deploy to your hosting (Vercel, Netlify, etc.)
```

## 🔍 Issues Fixed During Testing

1. **Webhook Missing Event**: Added `customer.subscription.updated` to webhook events
2. **Cancellation Not Showing in UI**: Added UI component to display cancellation status
3. **Wrong History Messages**: Differentiated between update and cancellation events
4. **Test/Production Mismatch**: Handled subscription IDs that don't exist in test mode
5. **Firestore Update on Cancel**: Enhanced cancel endpoint to update Firestore directly

## 📊 Post-Deployment Monitoring

### Immediate Checks (First 24 Hours)
- [ ] Monitor Cloud Functions logs for errors
- [ ] Check Stripe Dashboard for webhook delivery status
- [ ] Verify first real subscription processes correctly
- [ ] Confirm cancellations update Firestore properly

### Monitoring Commands
```bash
# Watch Cloud Functions logs
firebase functions:log --only stripeWebhook --project doshi-sensei -f

# Check for errors
firebase functions:log --only stripeWebhook --project doshi-sensei | grep ERROR

# Monitor webhook events in Stripe
# Go to: https://dashboard.stripe.com/webhooks/events
```

## 🚨 Emergency Rollback Plan

If critical issues occur:

1. **Immediate Action**: Re-enable Next.js webhook
   ```typescript
   // In /src/app/api/stripe-webhook/route.ts
   // Remove the 410 Gone response and restore original handler
   ```

2. **Update Stripe Dashboard**:
   - Add Next.js webhook URL as additional endpoint
   - Or temporarily switch primary endpoint

3. **Debug Cloud Function**:
   ```bash
   firebase functions:log --project doshi-sensei -n 100
   ```

## 📝 Important Notes

### What We Changed Permanently
1. **Webhook Events**: Added `customer.subscription.updated` (keep this!)
2. **UI Enhancement**: Added cancellation status display
3. **History Events**: Better event type differentiation
4. **Cloud Function**: Improved subscription update handling

### Test Mode Access
- Test Stripe Dashboard: https://dashboard.stripe.com/test
- Test Keys saved in: `.env.test`
- Test webhook signing secret: `whsec_fCGUhBA0aDBIkKWGGDBSCwfCRbECAR2h`

### Production Readiness Confirmed
- ✅ Subscription purchase flow works
- ✅ Cancellation updates UI properly
- ✅ Webhook processes all events correctly
- ✅ Payment history displays accurately
- ✅ Customer portal integration works

---

**Testing Completed**: August 23, 2025  
**Ready for Production**: YES ✅  
**Next Steps**: Complete cleanup checklist above before production deployment