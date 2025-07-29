# URGENT: Production Stripe & Auth Issue Fix

## Problem Summary
1. Stripe checkout redirects to Netlify domain instead of doshisensei.com
2. Firebase Auth shows "domain not authorized" error
3. Payment goes through but account remains free

## Root Causes
1. Missing `NEXT_PUBLIC_APP_URL` environment variable
2. Firebase Auth needs doshisensei.netlify.app added to authorized domains
3. Stripe webhooks may not be firing correctly due to domain mismatch

## Immediate Actions Required

### 1. Add to Netlify Environment Variables
Go to Netlify Dashboard → Site Settings → Environment Variables and add:
```
NEXT_PUBLIC_APP_URL=https://doshisensei.com
```

### 2. Add Authorized Domain to Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/project/doshi-sensei/authentication/settings)
2. Click on "Authorized domains" tab
3. Add these domains:
   - `doshisensei.com`
   - `doshisensei.netlify.app`
   - `*.netlify.app` (if not already there)

### 3. Verify Stripe Webhook Configuration
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Check that webhook endpoint is set to:
   - `https://doshisensei.com/api/stripe-webhook`
3. Verify webhook is active and not failing

### 4. Deploy the Code Changes
The following files have been updated:
- `.env` - Added `NEXT_PUBLIC_APP_URL`
- `/src/app/api/create-checkout-session/route.ts` - Uses app URL for redirects
- `/src/app/api/create-portal-session/route.ts` - Uses app URL for redirects

Deploy these changes to production.

### 5. Manual Fix for Your Account
Since your payment went through but account is still free, run this in Firebase Console:

```javascript
// In Firebase Console → Firestore → Users → [your-user-id]
// Update the subscription field to:
{
  subscription: {
    userId: "YOUR_USER_ID",
    status: "active",
    plan: "monthly", // or "yearly" depending on what you purchased
    stripeCustomerId: "cus_XXXXX", // Check Stripe dashboard for your customer ID
    stripeSubscriptionId: "sub_XXXXX", // Check Stripe dashboard
    currentPeriodEnd: new Date("2025-08-29"), // One month from now
    cancelAtPeriodEnd: false,
    metadata: {
      source: "stripe",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}
```

## Prevention for Future
1. Always set `NEXT_PUBLIC_APP_URL` in production environments
2. Test Stripe flows in staging with real webhooks
3. Monitor webhook failures in Stripe dashboard
4. Set up alerts for failed payments/webhooks

## Testing After Fix
1. Try logging in again - should work without domain error
2. Check account page - should show premium status
3. Test creating a new subscription with test card
4. Verify webhooks are processing correctly

## Contact
If issues persist, check:
- Stripe webhook logs for failures
- Netlify function logs for errors
- Firebase Auth settings