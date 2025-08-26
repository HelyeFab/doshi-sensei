# Stripe Migration Implementation - Phase 1 Complete
**Date**: January 23, 2025
**Status**: Critical fixes implemented, ready for deployment

## 🚨 Critical Issues Resolved

### 1. Race Condition Eliminated
**Problem**: Two webhook endpoints processing the same events simultaneously
**Solution**: Disabled Next.js webhook endpoint, consolidated to Cloud Functions only

### 2. Data Consistency Fixed
**Problem**: Different data structures being written by each webhook
**Solution**: Single webhook endpoint with consistent flat structure

### 3. Idempotency Implemented
**Problem**: Duplicate event processing
**Solution**: Added idempotency checking with Firestore document tracking

---

## ✅ Changes Implemented

### 1. Next.js Webhook Endpoint Disabled
**File**: `/src/app/api/stripe-webhook/route.ts`
- POST requests now return 410 Gone status
- GET requests explain the migration
- Original code preserved as comments for reference
- Clear error messages guide users to update webhook URL

### 2. Cloud Function Enhanced
**File**: `/functions/src/index.ts`
- ✅ Added idempotency checking using `webhook_events` collection
- ✅ Added webhook event logging to `webhook_logs` collection
- ✅ Added deduplication for subscription history events
- ✅ Improved error handling and logging

### 3. Checkout Session Creation Migrated
**New Function**: `createCheckoutSession` in `/functions/src/admin-operations.ts`
- Full checkout session creation logic
- Customer creation/retrieval
- Metadata management
- Error handling with specific messages

**Updated Route**: `/src/app/api/create-checkout-session/route.ts`
- Now acts as a proxy to Cloud Function
- Requires Firebase ID token
- Maintains backward compatibility

### 4. Portal Session Enhanced
**Updated Function**: `createPortalSession` in `/functions/src/admin-operations.ts`
- Now creates actual portal sessions (not just returning customer ID)
- Integrated Stripe SDK
- Returns portal URL directly

### 5. Frontend Updated
**File**: `/src/hooks/useStripePayment.ts`
- Updated to pass Firebase ID token
- Handles both sessionUrl and sessionId responses
- Improved error handling

---

## 📋 Deployment Checklist

### Step 1: Deploy Cloud Functions
```bash
cd functions
npm run deploy
```

**Functions to deploy**:
- `stripeWebhook` - Enhanced webhook handler
- `createCheckoutSession` - New checkout function
- `createPortalSession` - Enhanced portal function

### Step 2: Update Stripe Dashboard
1. Go to Stripe Dashboard → Webhooks
2. Find the webhook pointing to your Next.js endpoint
3. Update the URL to: `https://[your-region]-[your-project].cloudfunctions.net/stripeWebhook`
4. Keep the same events selected
5. Save changes

### Step 3: Test the Migration
```bash
# Test webhook endpoint status
curl https://your-app.com/api/stripe-webhook

# Should return:
# {
#   "status": "DISABLED - Webhook processing moved to Cloud Functions",
#   "message": "...",
#   "migrationDate": "2025-01-23"
# }
```

### Step 4: Monitor for Issues
- Check Cloud Functions logs for webhook processing
- Monitor Firestore `webhook_logs` collection
- Watch for any 410 errors in Next.js logs (indicates missed webhook URL update)

---

## 🔄 Rollback Plan (If Needed)

If issues occur, you can quickly rollback:

1. **Re-enable Next.js webhook** (temporarily):
   - Uncomment the original code in `/src/app/api/stripe-webhook/route.ts`
   - Deploy Next.js app

2. **Update Stripe webhook URL** back to Next.js endpoint

3. **Investigate issues** in Cloud Functions logs

---

## 📊 Migration Benefits

### Immediate Benefits
- ✅ No more race conditions
- ✅ Consistent data structure
- ✅ Proper idempotency
- ✅ Better error logging
- ✅ Centralized Stripe operations

### Future Benefits (Next Phases)
- 🔜 Google Secret Manager for secure secrets
- 🔜 Retry logic for failed webhooks
- 🔜 Rate limiting on all endpoints
- 🔜 Dead letter queue for failed events
- 🔜 Complete removal of Next.js Stripe dependencies

---

## ⚠️ Important Notes

### Environment Variables Required
Make sure these are set in Cloud Functions environment:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://doshisensei.com
```

### Price IDs to Update
Currently hardcoded in `/functions/src/index.ts` lines 217-220:
```typescript
const planMap: { [key: string]: 'monthly' | 'yearly' } = {
  'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',  // £8.99/month (LIVE)
  'price_1RubMxHdrJomitOwElEo6nys': 'yearly'    // £89.99/year (LIVE)
};
```
**TODO**: Move these to configuration file or environment variables

### Firestore Indexes Needed
The following composite indexes may be needed:
1. `users/{userId}/subscription_history`:
   - Fields: `type` (ASC), `timestamp` (DESC)
   - Used for: Deduplication queries

2. `webhook_events`:
   - No composite index needed (single field queries only)

---

## 📈 Next Steps (Phase 2)

1. **Security Hardening**:
   - Move secrets to Google Secret Manager
   - Add API key rotation

2. **Reliability**:
   - Implement retry logic with exponential backoff
   - Add dead letter queue for failed events
   - Circuit breakers for Stripe API calls

3. **Performance**:
   - Add caching for price fetching
   - Optimize Firestore queries
   - Implement connection pooling

4. **Cleanup**:
   - Remove old Next.js Stripe routes completely
   - Archive old webhook processing code
   - Update documentation

---

## 🎉 Success Metrics

After deployment, monitor these metrics:
- **Webhook success rate**: Should be > 99.9%
- **Duplicate events**: Should be 0
- **Processing time**: < 500ms average
- **Error rate**: < 0.1%

---

**Migration performed by**: Stripe Migration Agent
**Review required by**: DevOps Team
**Approval required for**: Production deployment