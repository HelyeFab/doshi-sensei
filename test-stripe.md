# Stripe Test Mode Quick Guide

## Test Cards for Payment
✅ **Success**: 4242 4242 4242 4242
❌ **Decline**: 4000 0000 0000 0002
💳 **Requires 3D Secure**: 4000 0025 0000 3155

**Use any:**
- CVC: Any 3 digits (e.g., 123)
- Expiry: Any future date (e.g., 12/34)
- ZIP: Any valid ZIP (e.g., 42424)

## Test Scenarios

### 1. Free User → Monthly Subscription
1. Create new account or logout/login
2. Go to /account or subscription page
3. Click "Subscribe Monthly"
4. Enter test card: 4242 4242 4242 4242
5. Complete checkout
6. Verify subscription active

### 2. Monthly → Yearly Upgrade
1. With monthly sub active
2. Click "Manage Billing"
3. In Stripe portal, switch to yearly
4. Confirm change
5. Verify upgrade in account

### 3. Cancel Subscription
1. Go to account page
2. Click "Cancel Subscription"
3. Confirm cancellation
4. Verify "Cancels at period end"

### 4. Check Payment History
1. Go to account page
2. Check subscription history section
3. Should show all test payments

## Monitoring Test Events
- Stripe Test Dashboard: https://dashboard.stripe.com/test/events
- Webhook Events: https://dashboard.stripe.com/test/webhooks/we_xxxxx

## Switch Between Environments

### To Test Mode:
```bash
cp .env.test .env.local
cp functions/.env.test functions/.env
npm run dev
```

### Back to Production:
```bash
cp .env.production .env.local
cp functions/.env.production functions/.env
npm run dev
```

## Important Notes
- Test mode is COMPLETELY SEPARATE from live mode
- No real charges occur in test mode
- Test customers don't appear in live mode
- You can test unlimited times