# 🎯 Stripe Domain Update Guide: doshisensei.com

## ✅ Current Status
Your Stripe integration code is **already domain-ready**! The checkout sessions automatically adapt to any domain using `request.nextUrl.origin`.

## 🔧 Required Stripe Dashboard Updates

### 1. **Update Webhook Endpoint** (CRITICAL)

**Steps:**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Find your existing webhook endpoint
3. Click **"Edit"** or **"..."** → **"Update details"**
4. Update **Endpoint URL** to: `https://doshisensei.com/api/stripe-webhook`
5. Ensure these events are selected:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. **Save changes**

**⚠️ IMPORTANT:** Copy the new webhook signing secret and update your environment variable:
```bash
STRIPE_WEBHOOK_SECRET=whsec_new_secret_here
```

### 2. **Domain Verification** (Recommended)

**Steps:**
1. Go to **Settings → Account settings → Security**
2. Find **"Domain verification"** section
3. Add `doshisensei.com` as a verified domain
4. This helps prevent fraud and ensures checkout security

### 3. **Update Return URLs** (Automatic)

✅ **Already configured!** Your code automatically uses the correct domain:
- Success URL: `https://doshisensei.com/account?success=true`
- Cancel URL: `https://doshisensei.com/account?canceled=true`

## 🧪 Testing Checklist

### Test 1: Webhook Endpoint
```bash
curl -X POST https://doshisensei.com/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```
Expected: Should return 400 (invalid signature) - this means endpoint is working

### Test 2: Checkout Session Creation
1. Log into your app at `https://doshisensei.com`
2. Go to Account page
3. Try to upgrade to Premium
4. Verify you're redirected to Stripe Checkout
5. Check that return URLs point to `doshisensei.com`

### Test 3: Webhook Processing
1. Complete a test purchase (use Stripe test cards)
2. Check your application logs
3. Verify user subscription status updates correctly

## 🔒 Security Considerations

### Environment Variables to Update:
```bash
# Update these in your hosting platform (Vercel/Netlify)
STRIPE_WEBHOOK_SECRET=whsec_new_secret_from_updated_webhook
NEXT_PUBLIC_SITE_URL=https://doshisensei.com
```

### Stripe Test vs Live Mode:
- **Test Mode**: Use test webhook endpoint during development
- **Live Mode**: Use production webhook endpoint for real customers

## 🚀 Deployment Steps

### Option A: Gradual Migration
1. Keep old webhook active
2. Add new webhook for `doshisensei.com`
3. Test thoroughly
4. Remove old webhook

### Option B: Direct Switch
1. Update existing webhook URL
2. Update environment variables
3. Deploy immediately

## 🔍 Troubleshooting

### Common Issues:

**Webhook Not Receiving Events:**
- Check webhook URL is exactly: `https://doshisensei.com/api/stripe-webhook`
- Verify webhook secret is updated in environment variables
- Check webhook endpoint returns 200 for valid events

**Checkout Sessions Failing:**
- Ensure environment variables are updated
- Check that return URLs resolve correctly
- Verify Stripe keys are for correct mode (test/live)

**Domain Redirects:**
- If using www.doshisensei.com, ensure consistency
- Update webhook URL to match your canonical domain

### Debug Commands:

**Test webhook endpoint:**
```bash
node scripts/test-stripe-domain.js
```

**Check webhook events in Stripe Dashboard:**
1. Go to Webhooks section
2. Click on your webhook
3. View **"Events"** tab for delivery status

## ✅ Final Verification

Once updated, verify these work:
- [ ] Webhook endpoint responds at new domain
- [ ] Checkout sessions redirect to correct domain
- [ ] Subscription updates process correctly
- [ ] Cancel/success pages work properly
- [ ] Email notifications contain correct links

## 🎉 You're All Set!

Your Stripe integration will work seamlessly with `doshisensei.com` once you update the webhook URL in Stripe Dashboard. The rest of the configuration is already domain-agnostic!

**Need help?** Check the webhook delivery logs in Stripe Dashboard for any issues.
