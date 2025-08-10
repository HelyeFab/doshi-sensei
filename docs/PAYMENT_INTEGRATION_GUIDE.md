# Payment Integration Guide - Adding PayPal, Google Pay, Apple Pay

## Overview
This guide lists all files that need modification when adding new payment methods like PayPal, Google Pay, or Apple Pay to the existing Stripe infrastructure.

## Current Payment Architecture
- **Primary Provider**: Stripe (handles subscriptions)
- **Webhook**: Firebase Function processes payment events
- **Database**: Firestore stores subscription status

## Files to Modify for New Payment Methods

### 1. Backend - Firebase Functions
**Primary Files:**
- `/functions/src/index.ts` - Main webhook handler
  - Add new webhook endpoints for PayPal/Google Pay
  - Add payment method mapping logic
  - Handle different event types from new providers

**Related Files:**
- `/functions/src/index-backup.ts` - Keep backup updated
- `/functions/src/index-clean.ts` - Clean version for reference
- `/functions/src/index-updated.ts` - Latest updates

**What to add:**
```typescript
// Example structure for new payment providers
export const paypalWebhook = https.onRequest(async (req, res) => {
  // Handle PayPal IPN/webhooks
});

export const googlePayWebhook = https.onRequest(async (req, res) => {
  // Handle Google Pay callbacks
});
```

### 2. Environment Variables
**Files:**
- `/.env` - Local environment
- `/.env.production` - Production environment (if exists)
- `/functions/.env` - Functions environment

**Variables to add:**
```bash
# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
PAYPAL_MONTHLY_PLAN_ID=xxx
PAYPAL_YEARLY_PLAN_ID=xxx

# Google Pay
GOOGLE_PAY_MERCHANT_ID=xxx
GOOGLE_PAY_ENVIRONMENT=PRODUCTION
```

### 3. Payment Configuration
**Create new file:**
- `/src/config/payment-providers.ts`

```typescript
export const PAYMENT_PROVIDERS = {
  stripe: {
    enabled: true,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
  },
  paypal: {
    enabled: false, // Toggle when ready
    monthlyPlanId: process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID,
    yearlyPlanId: process.env.NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID,
  },
  googlePay: {
    enabled: false,
    merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
  },
  applePay: {
    enabled: false,
    merchantId: process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID,
  }
};
```

### 4. Frontend - Payment UI Components
**Files to modify:**
- `/src/components/SubscriptionModal.tsx` - Add payment method selector
- `/src/components/PricingSection.tsx` - Show available payment options
- `/src/app/account/page.tsx` - Display payment method used

**New components to create:**
- `/src/components/payment/PayPalButton.tsx`
- `/src/components/payment/GooglePayButton.tsx`
- `/src/components/payment/ApplePayButton.tsx`
- `/src/components/payment/PaymentMethodSelector.tsx`

### 5. API Routes
**Files to modify/create:**
- `/src/app/api/create-checkout-session/route.ts` - Existing Stripe checkout
- `/src/app/api/paypal/create-order/route.ts` - New PayPal order creation
- `/src/app/api/paypal/capture-order/route.ts` - PayPal payment capture
- `/src/app/api/googlepay/process-payment/route.ts` - Google Pay processing

### 6. Subscription Management
**Files to modify:**
- `/src/types/subscription.ts` - Add payment provider field
```typescript
interface Subscription {
  // ... existing fields
  paymentProvider: 'stripe' | 'paypal' | 'googlepay' | 'applepay';
  providerSubscriptionId: string; // Provider-specific ID
  providerCustomerId?: string;
}
```

### 7. Database Schema Updates
**Firestore structure to update:**
```javascript
users/{userId}/subscription: {
  // ... existing fields
  paymentProvider: 'stripe', // or 'paypal', 'googlepay', 'applepay'
  stripeSubscriptionId: 'sub_xxx', // Keep for backward compatibility
  paypalSubscriptionId: 'I-XXX', // If using PayPal
  googlePayTransactionId: 'xxx', // If using Google Pay
  lastPaymentMethod: {
    type: 'card' | 'paypal' | 'googlepay' | 'applepay',
    last4: '4242', // For cards
    email: 'user@example.com' // For PayPal
  }
}
```

### 8. Webhook Processing
**Update webhook handler logic in:**
- `/functions/src/index.ts`

```typescript
// Add provider detection
function getPaymentProvider(event: any): string {
  if (event.type?.includes('stripe')) return 'stripe';
  if (event.event_type) return 'paypal'; // PayPal uses event_type
  if (event.googlePaymentId) return 'googlepay';
  return 'unknown';
}

// Route to appropriate handler
switch(getPaymentProvider(event)) {
  case 'stripe':
    await handleStripeEvent(event);
    break;
  case 'paypal':
    await handlePayPalEvent(event);
    break;
  case 'googlepay':
    await handleGooglePayEvent(event);
    break;
}
```

### 9. Documentation to Update
- `/docs/subscription-system/STRIPE_SETUP_GUIDE.md` - Keep existing
- `/docs/subscription-system/PAYPAL_SETUP_GUIDE.md` - Create new
- `/docs/subscription-system/GOOGLEPAY_SETUP_GUIDE.md` - Create new
- `/docs/subscription-system/PAYMENT_PROVIDERS.md` - Overview of all providers

### 10. Testing Files
**Create new test files:**
- `/scripts/test-paypal-webhook.js`
- `/scripts/test-googlepay-webhook.js`
- `/scripts/test-payment-providers.js`

### 11. Utilities
**Files to modify:**
- `/src/lib/stripe.ts` - Existing Stripe utilities
- `/src/lib/paypal.ts` - Create PayPal utilities
- `/src/lib/googlepay.ts` - Create Google Pay utilities

### 12. Security Considerations
**Files to review/update:**
- `/firestore.rules` - Ensure payment data is protected
- `/functions/src/middleware/verify-webhook.ts` - Create webhook verification for each provider

## Implementation Order

### Phase 1: Foundation
1. Create payment provider configuration file
2. Update environment variables
3. Update subscription types
4. Update database schema

### Phase 2: Backend
1. Create new webhook endpoints in Firebase Functions
2. Implement webhook verification for each provider
3. Create payment processing logic
4. Update subscription management logic

### Phase 3: Frontend
1. Create payment method selector UI
2. Implement provider-specific payment buttons
3. Update checkout flow
4. Update account management page

### Phase 4: Testing
1. Create test scripts for each provider
2. Test webhook processing
3. Test payment flows
4. Test subscription management

## Provider-Specific Notes

### PayPal
- Use PayPal Subscriptions API for recurring payments
- Implement IPN (Instant Payment Notification) handler
- Support PayPal Checkout SDK

### Google Pay
- Integrate with Google Pay API
- Handle one-time payments (subscriptions via Stripe/PayPal)
- Implement payment data decryption

### Apple Pay
- Requires Apple Developer account
- Domain verification needed
- Works through Stripe or as standalone

## Migration Considerations
- Existing Stripe subscriptions remain unchanged
- New subscriptions can choose payment method
- Consider grandfathering existing users
- Plan for payment method switching

## Monitoring & Analytics
**Files to update:**
- `/src/utils/analytics.ts` - Track payment method usage
- `/src/app/admin/page.tsx` - Show payment method breakdown
- `/src/utils/adminStats.ts` - Calculate revenue by provider

## Example Implementation Timeline
- Week 1: PayPal integration (most common alternative)
- Week 2: Google Pay integration
- Week 3: Apple Pay integration
- Week 4: Testing and refinement

## Resources
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [Google Pay Web Integration](https://developers.google.com/pay/api/web)
- [Apple Pay Web](https://developer.apple.com/apple-pay/)
- [Stripe Payment Methods](https://stripe.com/docs/payments/payment-methods)

## Notes
- Consider using Stripe's Payment Links which support multiple payment methods
- Google Pay and Apple Pay can work through Stripe (easier integration)
- PayPal requires separate integration for subscriptions
- Always test payment flows in sandbox/test environments first