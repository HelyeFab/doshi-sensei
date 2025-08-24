# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Critical Fixes Applied (Aug 24, 2025)

### 1. ✅ Invoice Saving Fix
**File**: `functions/src/index.ts`
- Fixed Firestore error with undefined values (tax, subtotal, etc.)
- Now properly filters out undefined values before saving
- Invoices will appear in payment history

### 2. ✅ User Type Detection Fix  
**File**: `src/lib/subscriptions/manager.ts`
- **CRITICAL**: Changed from checking `status === 'active'` to using plan type directly
- Premium users now keep benefits even with `past_due`, `trialing`, etc. status
- Affects ALL features - games, AI stories, YouTube shadowing, etc.

### 3. ✅ Subscription History Deduplication
**File**: `functions/src/index.ts`
- Removed redundant "Updated to monthly" entries
- New subscriptions only show "Payment successful"
- Clear cancellation flag for new subscriptions

### 4. ✅ Cancel Subscription Fix
**File**: `src/app/api/cancel-subscription/route.ts`
- Removed client-side Firestore update (caused permission errors)
- Webhook handles all Firestore updates server-side

### 5. ✅ Checkout Transparency
**File**: `src/app/api/create-checkout-session/route.ts`
- Prevents silent subscription upgrades
- Forces checkout UI when upgrading from canceled plan

### 6. ✅ Admin Dashboard Fixes
**Files**: 
- `src/app/admin/user-entitlements/UserEntitlementsPage.tsx`
- `src/app/admin/kpi-dashboard/KPIDashboardPage.tsx`
- `src/app/api/stripe-webhook/route.ts`
- Now correctly counts users by plan, not status

## Deployment Steps

### 1. Environment Setup
```bash
# Switch to production environment
cp .env.prod .env

# Verify production keys are loaded
grep "pk_live" .env  # Should show production Stripe key
```

### 2. Build Application
```bash
# Build Next.js
npm run build

# Build Firebase Functions
cd functions && npm run build && cd ..
```

### 3. Deploy Firebase Functions (CRITICAL)
```bash
# Deploy the webhook with all fixes
firebase use doshi-sensei
firebase deploy --only functions:stripeWebhook

# Verify deployment
firebase functions:log --only stripeWebhook
```

### 4. Deploy Next.js to Netlify
```bash
# Push to main branch (triggers auto-deploy)
git push origin pwa-complete-implementation:main

# OR manual deploy
netlify deploy --prod
```

### 5. Verify Stripe Webhook Endpoint
1. Go to https://dashboard.stripe.com/webhooks
2. Find the production webhook endpoint
3. Verify it points to: `https://stripewebhook-jtmxvmnera-uc.a.run.app`
4. Check "Signing secret" matches `STRIPE_WEBHOOK_SECRET` in Firebase Functions

### 6. Test Production Payment Flow
1. Create a test customer account
2. Subscribe with test card: `4242 4242 4242 4242`
3. Verify:
   - ✅ Invoice appears in payment history
   - ✅ Subscription shows correct plan
   - ✅ No duplicate entries
   - ✅ Features show unlimited access
4. Test cancellation:
   - ✅ No console errors
   - ✅ Shows "will cancel at period end"
   - ✅ Still has access until period end

## Post-Deployment Verification

### Check Firebase Functions Logs
```bash
firebase functions:log --only stripeWebhook --lines 50
```

Look for:
- "Successfully saved invoice to subscription history"
- "NEW SUBSCRIPTION - will clear any previous cancellation flags"
- NO "ERROR saving invoice" messages

### Check User Access
1. Log in as a premium user
2. Go to YouTube Shadowing
3. Should show "Unlimited" not "3 uses remaining"

### Monitor Error Rates
```bash
# Check for any 500 errors
firebase functions:log --only stripeWebhook | grep "ERROR"
```

## Rollback Plan (If Needed)

### Quick Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy previous function version
firebase functions:rollback stripeWebhook
```

### Environment Rollback
```bash
# Switch back to test environment
cp .env.test .env
```

## Critical Production Settings

### Stripe Dashboard
- Webhook endpoint: Active ✅
- Webhook events subscribed:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### Firebase Security Rules
- Users can read their own subscription data
- Only Cloud Functions can write subscription data
- Admin can read all data

### Environment Variables Required
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxx
```

## Success Metrics

After deployment, verify:
1. **Payment Success Rate**: Should be >95%
2. **Invoice Generation**: 100% of payments should generate invoices
3. **User Type Accuracy**: Premium users should have unlimited access
4. **No Permission Errors**: Cancel subscription should work without errors
5. **No Duplicate Entries**: Each subscription event appears once

## Support Contacts

If issues arise:
1. Check Firebase Functions logs first
2. Verify Stripe webhook is receiving events
3. Check browser console for client-side errors
4. Review this guide for missed steps

---

**Last Updated**: Aug 24, 2025
**Deployed By**: [Your Name]
**Version**: Production v2.0 with Stripe Fixes