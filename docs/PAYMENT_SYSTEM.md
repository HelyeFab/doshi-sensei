# Doshi Sensei Payment System Documentation

**Last Updated**: August 26, 2025  
**Status**: Production Ready ✅

## Overview

Doshi Sensei uses a **Google Cloud Functions-based payment architecture** with Stripe for all subscription and payment processing. This ensures data consistency, prevents race conditions, and provides a single source of truth for all payment operations.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────┐
│   Client    │────▶│  Next.js API │────▶│ Cloud Functions │────▶│ Stripe │
│  (Browser)  │     │   (Proxy)    │     │   (Business     │     │  API   │
└─────────────┘     └──────────────┘     │     Logic)      │     └────────┘
                                          └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │    Firestore    │
                                          │   (User Data)   │
                                          └─────────────────┘
```

### Key Principles
1. **All Stripe operations go through Cloud Functions** - No direct Stripe SDK usage in Next.js
2. **Single webhook endpoint** - Only Cloud Functions process Stripe webhooks
3. **Idempotent operations** - Duplicate webhook events are detected and ignored
4. **Immediate status updates** - Refunds and cancellations take effect immediately

## Cloud Functions

All payment operations are handled by these Google Cloud Functions:

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `stripeWebhook` | Processes all Stripe webhook events | `https://stripewebhook-jtmxvmnera-uc.a.run.app` |
| `createCheckoutSession` | Creates new subscription checkout | Via Firebase SDK |
| `createPortalSession` | Opens customer billing portal | Via Firebase SDK |
| `cancelSubscription` | Cancels subscription at period end | Via Firebase SDK |
| `updateSubscription` | Changes subscription plan | Via Firebase SDK |

## API Routes

Next.js API routes act as **proxies only** - they authenticate users and forward requests to Cloud Functions:

| Route | Purpose | Delegates To |
|-------|---------|--------------|
| `/api/create-checkout-session` | Start subscription | `createCheckoutSession` |
| `/api/create-portal-session` | Manage subscription | `createPortalSession` |
| `/api/cancel-subscription` | Cancel subscription | `cancelSubscription` |
| `/api/update-subscription` | Change plan | `updateSubscription` |
| `/api/stripe-webhook` | **DISABLED** (returns 410) | N/A - Use Cloud Function URL |
| `/api/get-prices` | Fetch current prices | Direct Stripe (read-only) |

## Subscription Plans

### Price IDs (Production)
```env
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_1RubMXHdrJomitOwNNI4LmWB  # £8.99/month
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_1RubMxHdrJomitOwElEo6nys   # £89.99/year
```

### User Types
- `guest` - Not logged in (no subscription possible)
- `free` - Logged in, no active subscription
- `monthly` - Active monthly subscription
- `yearly` - Active yearly subscription

## Webhook Processing

### Events Handled
- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription activated
- `customer.subscription.updated` - Plan changed or status updated
- `customer.subscription.deleted` - Subscription ended
- `invoice.payment_succeeded` - Payment processed
- `invoice.payment_failed` - Payment failed

### Critical: Refund Handling
**When a refund is issued, the user's subscription status changes IMMEDIATELY:**
1. Stripe sends `charge.refunded` event
2. Cloud Function updates user to `free` status instantly
3. No grace period - access revoked immediately
4. This prevents refunded users from keeping premium access

## Data Structure

### Firestore User Document
```typescript
{
  subscription: {
    userId: string;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    plan: 'free' | 'monthly' | 'yearly';
    stripeCustomerId: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd: boolean;
    metadata: {
      source: 'stripe';
      createdAt: Date;
      updatedAt: Date;
    }
  },
  limits: {
    // Feature limits based on plan
  },
  currentUsage: {
    // Usage tracking
  }
}
```

### Subscription History
Each user has a `subscription_history` subcollection tracking all payment events with deduplication to prevent duplicate entries from webhook retries.

## Environment Variables

### Required for Next.js App
```env
# Stripe Keys (Production)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Price IDs
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_...

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Required for Cloud Functions
Same variables but without `NEXT_PUBLIC_` prefix for price IDs.

## Payment Flow

### New Subscription
1. User clicks "Subscribe" → `POST /api/create-checkout-session`
2. API route forwards to `createCheckoutSession` Cloud Function
3. Cloud Function creates Stripe checkout session
4. User redirected to Stripe Checkout
5. After payment, Stripe sends webhook to Cloud Function
6. Cloud Function updates Firestore with subscription data
7. User redirected back with premium access

### Subscription Cancellation
1. User clicks "Cancel" → `POST /api/cancel-subscription`
2. API route forwards to `cancelSubscription` Cloud Function
3. Cloud Function sets `cancel_at_period_end: true` in Stripe
4. User keeps access until `currentPeriodEnd`
5. At period end, webhook updates user to `free`

### Refund Processing
1. Admin issues refund in Stripe Dashboard
2. Stripe sends `charge.refunded` webhook
3. Cloud Function **immediately** updates user to `free`
4. User loses premium access instantly (no grace period)

## Security Measures

1. **Authentication Required**: All API routes require Firebase ID token
2. **Webhook Signature Verification**: All webhooks verified with signing secret
3. **Idempotency**: Duplicate webhook events detected and ignored
4. **Rate Limiting**: Cloud Functions have built-in rate limiting
5. **No Direct Access**: Stripe SDK only used in Cloud Functions, not client-side

## Testing

### Test Mode Keys (Development Only)
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Authentication Required: `4000 0025 0000 3155`

## Monitoring

### Health Checks
- Webhook health: `/api/webhook-health`
- Subscription analytics: Admin dashboard
- Cloud Function logs: Firebase Console

### Alert on These Errors
1. 410 responses from `/api/stripe-webhook` (means webhook URL not updated)
2. Failed webhook signature verification
3. Subscription update failures
4. Payment processing errors

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| User still has access after refund | Check Cloud Function logs for refund webhook processing |
| Duplicate charges | Verify only one webhook endpoint in Stripe Dashboard |
| Subscription not updating | Check Cloud Function logs for errors |
| 410 Gone on webhook | Update Stripe Dashboard to use Cloud Function URL |

### Emergency Contacts
- Stripe Dashboard: https://dashboard.stripe.com
- Firebase Console: https://console.firebase.google.com
- Cloud Function Logs: Check Firebase Functions logs

## Important Notes

1. **NEVER re-enable the Next.js webhook endpoint** - It will cause duplicate processing
2. **NEVER use Stripe SDK directly in API routes** - Always delegate to Cloud Functions
3. **Refunds revoke access immediately** - This is by design to prevent abuse
4. **Test mode is completely separate** - Test and production data never mix

## Support & Maintenance

For payment-related issues:
1. Check Cloud Function logs first
2. Verify webhook events in Stripe Dashboard
3. Ensure environment variables match between environments
4. Monitor the subscription_history collection for anomalies

---

**This is the single source of truth for the Doshi Sensei payment system.**