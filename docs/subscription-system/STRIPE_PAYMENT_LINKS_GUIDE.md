# 🔗 Stripe Payment Links Integration Guide

## Overview

Stripe Payment Links provide a simpler way to accept payments with **automatic support for multiple payment methods** including:
- ✅ **Credit/Debit Cards** (all major brands)
- ✅ **Google Pay** (automatically shown on Android/Chrome)
- ✅ **Apple Pay** (automatically shown on iOS/Safari)
- ✅ **Link** (Stripe's 1-click checkout)
- ✅ **Klarna, Affirm** (Buy now, pay later - if enabled)

**No additional code required** - Stripe automatically detects and shows the appropriate payment methods!

## Benefits vs Traditional Checkout

| Traditional Stripe Checkout | Stripe Payment Links |
|---------------------------|---------------------|
| Complex API integration | Simple URL redirect |
| Manual payment method configuration | Automatic payment method detection |
| Separate Google Pay/Apple Pay setup | Built-in support |
| Custom success/cancel handling | Built-in redirect handling |
| More control over UI | Less customization but faster setup |

## Setup Instructions

### Step 1: Create Payment Links in Stripe Dashboard

1. **Login to Stripe Dashboard**
   - Go to [dashboard.stripe.com](https://dashboard.stripe.com)
   - Ensure you're in the correct mode (Test or Live)

2. **Navigate to Payment Links**
   - Go to **Product catalog** → **Payment Links**
   - Click **"+ New payment link"**

3. **Create Monthly Subscription Link**
   - **Product**: Select your existing Monthly subscription (£8.99/month)
   - **Payment methods**: 
     - ✅ Card
     - ✅ Google Pay
     - ✅ Apple Pay
     - ✅ Link
   - **After payment**: 
     - Select "Redirect to your website"
     - URL: `https://doshisensei.com/account?payment=success&session_id={CHECKOUT_SESSION_ID}`
   - **Advanced options**:
     - ✅ Collect email address
     - ✅ Allow promotion codes (optional)
     - Custom fields: Add `client_reference_id` for user tracking
   - Click **"Create link"**
   - **Copy the URL** (looks like: `https://buy.stripe.com/aEU4h2abc123def456`)

4. **Create Yearly Subscription Link**
   - Repeat the process for your Yearly subscription (£89.99/year)
   - Use the same settings as Monthly
   - **Copy the URL**

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Payment Links
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY=https://buy.stripe.com/YOUR_MONTHLY_LINK
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY=https://buy.stripe.com/YOUR_YEARLY_LINK

# Keep existing Stripe configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 3: Update Your Code

The implementation is already prepared in:
- `/src/config/stripe-payment-links.ts` - Configuration
- `/src/components/UpgradeSlideUpModalPaymentLinks.tsx` - Updated modal

To activate Payment Links:

1. **Update the main upgrade modal** to use the Payment Links version:

```typescript
// In files that import UpgradeSlideUpModal
import { UpgradeSlideUpModalPaymentLinks as UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModalPaymentLinks';
```

Or update the original file to check for Payment Links:

```typescript
// In UpgradeSlideUpModal.tsx
import { getPaymentLink, isUsingPaymentLinks } from '@/config/stripe-payment-links';

const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
  // Check if Payment Links are configured
  if (isUsingPaymentLinks()) {
    const paymentUrl = getPaymentLink(plan, user?.uid, user?.email);
    window.location.href = paymentUrl;
  } else {
    // Fall back to traditional checkout
    await createCheckoutSession(priceId);
  }
};
```

### Step 4: Handle Success/Cancel Pages

Update your `/account` page to handle the return from Payment Links:

```typescript
// In /app/account/page.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const sessionId = params.get('session_id');
  
  if (payment === 'success' && sessionId) {
    // Payment successful
    // The webhook will handle subscription activation
    showSuccessMessage('Payment successful! Your subscription is being activated...');
    
    // Clean up URL
    window.history.replaceState({}, '', '/account');
  } else if (payment === 'cancelled') {
    // Payment cancelled
    showMessage('Payment cancelled. You can upgrade anytime.');
    
    // Clean up URL
    window.history.replaceState({}, '', '/account');
  }
}, []);
```

### Step 5: Webhook Configuration

Your existing webhook at `/api/stripe-webhook` will continue to work! 

Payment Links trigger the same webhook events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`

The `client_reference_id` will contain the user's Firebase UID for matching.

## Testing Payment Links

### Test Mode
1. Create Payment Links in **Test mode**
2. Use test cards:
   - `4242 4242 4242 4242` - Success
   - `4000 0000 0000 0002` - Decline

### Testing Different Payment Methods

#### Google Pay Testing
- Open link in Chrome on Android or desktop Chrome
- Google Pay button appears automatically if available
- Use test cards in Google Pay test mode

#### Apple Pay Testing  
- Open link in Safari on Mac or iOS
- Apple Pay button appears automatically if configured
- Requires Apple Pay sandbox setup

## Customization Options

### Branding
In Stripe Dashboard → Settings → Branding:
- Upload logo
- Set brand colors
- Customize receipt emails

### Payment Link Settings
Each Payment Link can have:
- Custom success URL
- Adjustable quantities
- Promotion codes
- Tax collection
- Custom fields

## Migration Checklist

- [ ] Create Payment Links in Stripe Dashboard
- [ ] Copy Payment Link URLs
- [ ] Add URLs to environment variables
- [ ] Deploy updated code
- [ ] Test with a small payment
- [ ] Monitor webhook processing
- [ ] Update user documentation

## Troubleshooting

### Payment Link Not Working
- Check you're using the correct mode (Test/Live)
- Verify the link hasn't expired
- Ensure product is active in Stripe

### Google Pay/Apple Pay Not Showing
- **Google Pay**: Requires HTTPS and compatible browser
- **Apple Pay**: Requires domain verification in Stripe
- Both require user to have payment methods saved

### Webhook Not Receiving Events
- Verify webhook endpoint is configured for Payment Links
- Check webhook signing secret matches
- Monitor Stripe Dashboard → Webhooks → Logs

## Best Practices

1. **Always test in Test mode first**
2. **Monitor first few transactions closely**
3. **Keep traditional checkout as fallback** during transition
4. **Clear communication** about available payment methods
5. **Update help docs** to mention Google Pay/Apple Pay support

## FAQ

**Q: Can I customize the Payment Link checkout page?**
A: Limited customization via Stripe Dashboard (logo, colors). For full control, use traditional Checkout.

**Q: Do Payment Links support subscriptions?**
A: Yes! They work perfectly with recurring subscriptions.

**Q: What about PayPal?**
A: PayPal is not available through Stripe. Would need separate PayPal integration.

**Q: Can I track conversions?**
A: Yes, through URL parameters and webhook data. Google Analytics can track the redirect.

**Q: Is it PCI compliant?**
A: Yes, Stripe handles all payment data securely.

## Support

- [Stripe Payment Links Docs](https://stripe.com/docs/payment-links)
- [Stripe Support](https://support.stripe.com)
- Doshi Sensei Admin: Check webhook logs at `/admin`

---

*Last Updated: January 2025*