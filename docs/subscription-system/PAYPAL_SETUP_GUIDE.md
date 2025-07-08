# 🅿️ PayPal Integration Setup Guide

## 🎯 Overview
Complete guide to set up PayPal donations for your Doshi Sensei app alongside Stripe payments.

## 📋 Prerequisites
- PayPal Developer Account
- Access to your hosting platform environment variables
- Domain configured (works with doshisensei.com)

## 🔧 PayPal Developer Setup

### 1. Create PayPal App
1. Go to [PayPal Developer Console](https://developer.paypal.com/developer/applications/)
2. Click **"Create App"**
3. Fill in details:
   - **App Name**: `Doshi Sensei Donations`
   - **Merchant**: Your PayPal business account
   - **Platform**: `Web`
   - **Intent**: `Capture`
4. **Features**: Check `Accept Payments`
5. Click **"Create App"**

### 2. Get API Credentials
After creating the app, you'll see:
- **Client ID** (public, safe to expose)
- **Client Secret** (private, keep secure)

### 3. Configure Sandbox vs Live
- **Sandbox**: Use for testing with fake money
- **Live**: Use for real payments in production

## ⚙️ Environment Variables

Add these to your hosting platform (Vercel/Netlify):

```bash
# PayPal API Credentials
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here

# PayPal Webhook ID (get this after setting up webhooks)
PAYPAL_WEBHOOK_ID=your_webhook_id_here
```

## 🔗 Webhook Setup

### 1. Create Webhook Endpoint
In PayPal Developer Console:
1. Go to your app → **"Features"** tab
2. Click **"Add Webhook"**
3. **Webhook URL**: `https://doshisensei.com/api/paypal-webhook`

### 2. Select Events
Choose these events:
- ✅ `CHECKOUT.ORDER.APPROVED`
- ✅ `PAYMENT.CAPTURE.COMPLETED`
- ✅ `PAYMENT.CAPTURE.DENIED`
- ✅ `PAYMENT.CAPTURE.REFUNDED`

### 3. Save Webhook ID
After saving, copy the **Webhook ID** and add it to your environment variables.

## 🧪 Testing Setup

### Sandbox Testing
1. Use Sandbox credentials in development
2. PayPal provides test buyer accounts
3. Use test credit card numbers

### Test Cards
PayPal provides test accounts, or use these test cards:
- **Visa**: 4111111111111111
- **Mastercard**: 5555555555554444
- **Amex**: 378282246310005

## 🚀 Production Deployment

### 1. Switch to Live Credentials
Replace sandbox credentials with live ones:
```bash
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
PAYPAL_WEBHOOK_ID=your_live_webhook_id
```

### 2. Update Webhook URL
In PayPal Live Dashboard:
- Update webhook URL to: `https://doshisensei.com/api/paypal-webhook`
- Verify all events are selected

### 3. Test Live Integration
1. Make a small real donation ($1.00)
2. Verify webhook receives events
3. Check PayPal dashboard for transaction

## 💡 Features Implemented

### ✅ Donation Flow
1. User selects amount in modal
2. Clicks "Donate via PayPal"
3. Redirects to PayPal Checkout
4. Returns with success/cancel status
5. Webhook processes completion

### ✅ Security Features
- Webhook signature verification
- Environment-based API URLs
- Secure credential handling
- Error handling and logging

### ✅ User Experience
- Professional PayPal branding
- App name shown in checkout
- User info pre-filled if logged in
- Mobile-optimized flow

## 🔍 Troubleshooting

### Common Issues

**Environment Variables Not Set:**
```
Error: PAYPAL_CLIENT_ID is undefined
```
Solution: Add all required environment variables

**Webhook Verification Failed:**
```
PayPal webhook signature verification failed
```
Solution: Check PAYPAL_WEBHOOK_ID matches your webhook

**Sandbox vs Live Mismatch:**
```
PayPal auth failed: invalid_client
```
Solution: Ensure credentials match environment (sandbox/live)

### Debug Steps

**1. Check API Endpoint:**
```bash
curl -X POST https://doshisensei.com/api/create-paypal-donation \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'
```

**2. Check Webhook Endpoint:**
```bash
curl -X POST https://doshisensei.com/api/paypal-webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type": "test"}'
```

**3. Check Environment Variables:**
- Verify all PayPal env vars are set
- Check sandbox vs live environment
- Confirm webhook ID is correct

## 📊 Monitoring

### PayPal Dashboard
- View transaction history
- Monitor webhook deliveries
- Check for failed payments

### Application Logs
- Webhook event processing
- API call success/failure
- Error details and debugging

## 🔒 Security Best Practices

### API Security
- Never expose Client Secret in frontend
- Use HTTPS for all webhook endpoints
- Verify webhook signatures in production

### Data Handling
- Don't store PayPal account details
- Log transactions for auditing
- Encrypt sensitive webhook data

## 📈 Analytics Integration

### Track Donations
- Monitor donation amounts
- Track conversion rates
- Analyze payment method preferences

### User Analytics
- Donation frequency
- Amount preferences
- Geographic distribution

## 🎉 Ready to Launch!

Once configured:
1. ✅ PayPal donations work alongside Stripe
2. ✅ Professional checkout experience
3. ✅ Secure webhook processing
4. ✅ Full error handling and logging
5. ✅ Works on doshisensei.com domain

**Your users can now support your app via both Stripe and PayPal!** 🚀💳

---

## 🆘 Support

Need help? Check:
- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal REST API Reference](https://developer.paypal.com/docs/api/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api/webhooks/)
