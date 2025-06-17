# 🔄 Stripe Subscription System Guide

This guide covers setting up, testing, and managing the Stripe subscription system for Doshi Sensei.

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Stripe Setup](#stripe-setup)
- [Testing the System](#testing-the-system)
- [Webhook Management](#webhook-management)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

---

## 🎯 System Overview

### Subscription Plans
- **Free Plan**: 3 word lists, 3 drills/day, local storage only
- **Monthly Plan**: $3.99/month - Unlimited everything + cloud sync
- **Yearly Plan**: $39.99/year - All monthly features + 2 months free

### User Flow
1. User signs up → Free plan (3 lists, 3 drills/day)
2. Hits limits → Sees upgrade prompts
3. Clicks upgrade → Stripe checkout
4. Completes payment → Instant unlimited access
5. Can cancel → Automatically reverts to free plan

---

## ⚙️ Stripe Setup

### 1. Products & Prices
Already created via script:
- **Monthly**: `price_1RakzXHdrJomitOwZc0HJC4J` ($3.99)
- **Yearly**: `price_1RakzXHdrJomitOwE7B56erf` ($39.99)

### 2. Environment Variables
```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Product IDs
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_1RakzXHdrJomitOwZc0HJC4J
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_1RakzXHdrJomitOwE7B56erf

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Webhook Configuration
**Endpoint**: `https://doshi-sensei.netlify.app/api/stripe-webhook`

**Required Events**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 🧪 Testing the System

### Test Mode Setup
1. **Toggle Test Mode** in Stripe Dashboard (top right)
2. **Get Test Keys**:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. **Create Test Webhook** with test endpoint
4. **Update .env** with test keys temporarily

### Test Card Numbers

#### ✅ Successful Payments
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

#### ❌ Declined Payments
```
Card Number: 4000 0000 0000 0002
```

#### 🔐 Requires 3D Secure Authentication
```
Card Number: 4000 0025 0000 3155
```

### Testing Workflow
1. **Sign up** for account in app
2. **Use app** until hitting limits (3 drills/day)
3. **Click "Upgrade Plan"**
4. **Enter test card** details
5. **Complete checkout**
6. **Verify**:
   - ✅ Payment appears in Stripe Dashboard
   - ✅ Webhook events fired successfully
   - ✅ User subscription updated in Firebase
   - ✅ App shows unlimited access

### Verification Checklist
- [ ] Free user sees drill limit message after 3 drills
- [ ] Free user sees list creation limit after 3 lists
- [ ] Upgrade buttons lead to Stripe checkout
- [ ] Test payment completes successfully
- [ ] Webhook fires and processes correctly
- [ ] User immediately gets unlimited access
- [ ] Firebase subscription data updates
- [ ] User can access all features

---

## 🔗 Webhook Management

### Webhook Endpoint
`/api/stripe-webhook` handles these events:

#### Checkout Events
- `checkout.session.completed` → Logs successful checkout

#### Subscription Events
- `customer.subscription.created` → Upgrades user to paid plan
- `customer.subscription.updated` → Updates subscription status
- `customer.subscription.deleted` → Reverts user to free plan

#### Payment Events
- `invoice.payment_succeeded` → Confirms successful payment
- `invoice.payment_failed` → Handles payment failures

### Webhook Security
- Verifies signature using `STRIPE_WEBHOOK_SECRET`
- Rejects invalid/forged requests
- Logs all events for debugging

### Monitoring Webhooks
1. **Stripe Dashboard** → Webhooks → Your webhook
2. Check **"Request logs"** for event history
3. Monitor **success/failure rates**
4. Debug failed events with error details

---

## 🛠️ Troubleshooting

### Common Issues

#### Webhook Not Firing
- ✅ Check webhook URL is correct
- ✅ Verify webhook secret in `.env`
- ✅ Check Stripe webhook logs for errors
- ✅ Ensure endpoint is publicly accessible

#### Subscription Not Updating
- ✅ Check Firebase user document structure
- ✅ Verify webhook events are being processed
- ✅ Check console logs for errors
- ✅ Ensure subscription metadata includes `firebaseUID`

#### Payment Succeeds But No Upgrade
- ✅ Check if webhook fired (`customer.subscription.created`)
- ✅ Verify Firebase user data updated
- ✅ Check React context refreshes subscription state
- ✅ Look for JavaScript errors in browser console

#### Test Cards Not Working
- ✅ Ensure using Stripe test mode
- ✅ Check test card numbers are correct
- ✅ Verify test webhook endpoint
- ✅ Use test API keys, not live keys

### Debug Steps
1. **Check Stripe Dashboard** → Events → Recent events
2. **Monitor Webhook Logs** → Look for failed requests
3. **Check Browser Console** → JavaScript errors
4. **Verify Firebase Data** → User subscription document
5. **Test API Endpoints** → Manual webhook testing

---

## 🚀 Production Deployment

### Pre-Launch Checklist
- [ ] **Live Stripe keys** configured in production `.env`
- [ ] **Production webhook** pointing to live domain
- [ ] **Webhook secret** updated for production
- [ ] **Test complete user flow** with real cards (small amounts)
- [ ] **Monitor webhook delivery** for 24 hours
- [ ] **Verify subscription sync** works correctly
- [ ] **Test cancellation flow**
- [ ] **Check billing portal** integration

### Production Monitoring
- **Daily**: Check Stripe Dashboard for failed payments
- **Weekly**: Review webhook delivery success rates
- **Monthly**: Analyze subscription metrics and churn

### Security Considerations
- ✅ **Never expose** `STRIPE_SECRET_KEY` in client-side code
- ✅ **Always verify** webhook signatures
- ✅ **Use HTTPS** for all webhook endpoints
- ✅ **Validate** all webhook payloads
- ✅ **Log security events** for audit trails

---

## 📊 Subscription Analytics

### Key Metrics to Track
- **Conversion Rate**: Free → Paid users
- **Churn Rate**: Monthly/Yearly cancellations
- **Revenue**: MRR (Monthly Recurring Revenue)
- **Usage Patterns**: When users hit limits
- **Popular Plans**: Monthly vs Yearly preference

### Stripe Reporting
Access via **Stripe Dashboard** → **Reports**:
- Revenue reports
- Subscription analytics
- Failed payment tracking
- Customer lifetime value

---

## 🔄 System Architecture

### Components
```
User App → Stripe Checkout → Webhook → Firebase → User App
    ↑                                              ↓
    └─────────── Real-time Subscription Sync ──────┘
```

### Data Flow
1. **User** clicks upgrade → **Stripe Checkout**
2. **Payment** completes → **Webhook fired**
3. **Webhook** processes → **Firebase updated**
4. **User app** syncs → **Unlimited access**

### Files Modified
- `src/app/api/stripe-webhook/route.ts` - Webhook handler
- `src/contexts/SubscriptionContext.tsx` - Subscription state
- `src/components/SubscriptionPlans.tsx` - Upgrade UI
- `src/app/drill/page.tsx` - Usage enforcement
- `src/app/practice/page.tsx` - List creation limits
- `src/types/subscription.ts` - Type definitions

---

## 📞 Support & Resources

### Stripe Documentation
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Subscriptions API](https://stripe.com/docs/api/subscriptions)
- [Testing Guide](https://stripe.com/docs/testing)

### Firebase Integration
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security)
- [User Management](https://firebase.google.com/docs/auth)

### Need Help?
- Check Stripe Dashboard logs first
- Review webhook delivery status
- Monitor Firebase user documents
- Test with Stripe's test cards

---

*Last Updated: June 17, 2025*
*Version: 1.0*
